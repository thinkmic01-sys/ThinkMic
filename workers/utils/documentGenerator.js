const PDFDocument = require('pdfkit');
const {
    Document, Packer, Paragraph, TextRun, ImageRun,
    Table, TableRow, TableCell, WidthType, ShadingType,
    ExternalHyperlink, BorderStyle, AlignmentType
} = require('docx');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const r2StorageService = require('../../backend/services/r2StorageService');

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

// Noto Sans Arabic is bundled (not a system font) so Urdu text has a font with the right
// glyphs on any host. It's a Naskh-style font, not the calligraphic Nastaliq used in the
// live transcript UI - deliberate choice, since neither PDFKit nor docx.js run a real Arabic
// text-shaping engine (no letter joining/contextual forms), and Naskh-style isolated glyphs
// stay far more legible than Nastaliq's without shaping. Expect Urdu text to still read a
// little disconnected compared to a properly shaped renderer (e.g. a browser or Word's own
// engine) - this is a known limitation, not a bug.
const FONT_DIR = path.join(__dirname, 'fonts');
const ARABIC_REGULAR_PATH = path.join(FONT_DIR, 'NotoSansArabic-Regular.ttf');
const ARABIC_BOLD_PATH = path.join(FONT_DIR, 'NotoSansArabic-Bold.ttf');
// The bundled Arabic font has zero Latin glyphs (verified: NotoSansArabic-Regular has no
// A-Z/a-z coverage), so font/alignment choice must be decided per piece of text, not once
// for the whole document - an Urdu-language report still contains plenty of plain English
// (URLs, the verbatim transcript appendix, proper nouns) that must stay on Helvetica or it
// renders as blank/missing glyphs. Range covers Arabic + Arabic Supplement + Presentation Forms.
const ARABIC_SCRIPT_RE = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
const containsArabicScript = (text) => ARABIC_SCRIPT_RE.test(text || '');

// Generates (and memoizes per-document) a small QR PNG buffer for a URL so printed copies of
// the report can be scanned to open the link. Cache is per generatePDF/generateDOCX call -
// the same source URL is often cited more than once in one report.
async function getQrBuffer(url, cache) {
    if (cache.has(url)) return cache.get(url);
    let buffer = null;
    try {
        buffer = await QRCode.toBuffer(url, { type: 'png', width: 96, margin: 1, color: { dark: '#181c22', light: '#FFFFFF' } });
    } catch (error) {
        console.error(`QR generation failed for ${url}:`, error.message);
    }
    cache.set(url, buffer);
    return buffer;
}

// Pulls the distinct link URLs out of a set of parsed inline tokens (paragraphs/list items)
const linksFromTokens = (tokens) => [...new Set(tokens.filter((t) => t.link).map((t) => t.link))];

// Best-effort mirror of a generated report buffer into R2. Never throws - if R2 upload
// fails, the local copy (already written to disk) remains the source of truth.
const mirrorToR2 = async (key, buffer, contentType) => {
    if (!r2StorageService.isR2Configured()) return undefined;
    try {
        await r2StorageService.uploadR2Buffer(key, buffer, contentType);
        return key;
    } catch (error) {
        console.error(`R2 mirror upload failed for ${key}:`, error.message);
        return undefined;
    }
};

const COLORS = {
    navy: '#222777',
    cyan: '#00C2CB',
    dark: '#181c22',
    slate: '#464651',
    muted: '#777682',
    templateBadgeBg: '#e6fbfc',
    templateBadgeText: '#006e73',
    templateBadgeBorder: '#6bf6ff',
    badgeBg: '#eef0f9',
    badgeBorder: '#c7c5d3',
    divider: '#e0e2eb',
    quoteBg: '#f8f9fc',
    tableHeaderBg: '#f1f3fc',
    tableBorder: '#e0e2eb',
    tableAltRow: '#fbfbfd'
};

const TEMPLATE_LABELS = { academic: 'Standard Academic', executive: 'Executive Brief', standard: 'Data Dense' };
const SECTION_LABELS = { summary: 'Executive Summary', research: 'Research Findings', transcript: 'Transcripts', sources: 'Sources' };

// ============================================================
// Shared HTML block/inline tokenizer.
// The AI report prompt (openaiService.generateReport) is contractually restricted to
// exactly this tag set, so a small dedicated tokenizer is sufficient - no need for a
// general-purpose HTML parser.
// ============================================================

const stripTags = (s) => (s || '').replace(/<[^>]+>/g, '');

const decodeEntities = (s) => (s || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ');

const isUrl = (text) => /^https?:\/\/\S+$/i.test((text || '').trim());

// Splits the report's HTML into an ordered list of top-level blocks.
function parseBlocks(html) {
    const blocks = [];
    const blockRegex = /<(h1|h2|h3|p|ul|blockquote|table)[^>]*>([\s\S]*?)<\/\1>/gi;
    let match;
    while ((match = blockRegex.exec(html)) !== null) {
        blocks.push({ tag: match[1].toLowerCase(), inner: match[2] });
    }
    return blocks;
}

// Splits a block's inner HTML into an ordered list of styled inline runs:
// { text, bold?, italic?, link? }
function parseInline(html) {
    const tokens = [];
    const re = /<strong>([\s\S]*?)<\/strong>|<em>([\s\S]*?)<\/em>|<a\s+href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
    let lastIndex = 0;
    let match;

    const pushText = (raw) => {
        const decoded = decodeEntities(raw);
        if (decoded.trim().length > 0) tokens.push({ text: decoded });
    };

    while ((match = re.exec(html)) !== null) {
        if (match.index > lastIndex) pushText(html.slice(lastIndex, match.index));
        if (match[1] !== undefined) tokens.push({ text: decodeEntities(stripTags(match[1])), bold: true });
        else if (match[2] !== undefined) tokens.push({ text: decodeEntities(stripTags(match[2])), italic: true });
        else if (match[3] !== undefined) {
            const label = decodeEntities(stripTags(match[4]));
            tokens.push({ text: label || match[3], link: match[3] });
        }
        lastIndex = re.lastIndex;
    }
    if (lastIndex < html.length) pushText(html.slice(lastIndex));

    if (tokens.length) {
        tokens[0].text = tokens[0].text.replace(/^\s+/, '');
        tokens[tokens.length - 1].text = tokens[tokens.length - 1].text.replace(/\s+$/, '');
    }
    return tokens.filter((t) => t.text.length > 0);
}

function parseTableRows(innerHtml) {
    const rowRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
    const rows = [];
    let rowMatch;
    while ((rowMatch = rowRe.exec(innerHtml)) !== null) {
        const cellRe = /<(th|td)[^>]*>([\s\S]*?)<\/\1>/gi;
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRe.exec(rowMatch[1])) !== null) {
            cells.push({ tag: cellMatch[1].toLowerCase(), html: cellMatch[2] });
        }
        if (cells.length) rows.push(cells);
    }
    return rows;
}

// ============================================================
// PDF rendering (PDFKit)
// ============================================================

function ensureSpace(doc, height) {
    const maxY = doc.page.height - doc.page.margins.bottom;
    if (doc.y + height > maxY) {
        doc.addPage();
    }
}

function fontFor(bold, italic, useArabic) {
    if (useArabic) return bold ? 'NotoArabic-Bold' : 'NotoArabic';
    if (bold && italic) return 'Helvetica-BoldOblique';
    if (bold) return 'Helvetica-Bold';
    if (italic) return 'Helvetica-Oblique';
    return 'Helvetica';
}

// Registers the bundled Arabic font under PDFKit's own font-name registry (idempotent -
// PDFKit allows re-registering the same name harmlessly) so fontFor()'s 'NotoArabic'/
// 'NotoArabic-Bold' names resolve. Only called when a report actually needs it.
function registerArabicFonts(doc) {
    if (fs.existsSync(ARABIC_REGULAR_PATH)) doc.registerFont('NotoArabic', ARABIC_REGULAR_PATH);
    if (fs.existsSync(ARABIC_BOLD_PATH)) doc.registerFont('NotoArabic-Bold', ARABIC_BOLD_PATH);
}

// Renders a sequence of styled inline tokens as one flowing, wrapped paragraph -
// PDFKit's `continued` text mode lets each run carry its own font/color/link while
// staying on the same flowed line(s). Font is chosen per-token from that token's own text
// (not a blanket document-wide flag) since the Arabic font has no Latin glyphs at all - a
// run of plain English inside an otherwise-Urdu paragraph must still use Helvetica.
function renderRuns(doc, tokens, { size = 10.5, color = COLORS.dark, align, x, width, lineGap = 2 } = {}) {
    if (!tokens.length) return;
    if (x !== undefined) doc.x = x;

    tokens.forEach((token, i) => {
        const isFirst = i === 0;
        const isLast = i === tokens.length - 1;

        doc.font(fontFor(token.bold, token.italic, containsArabicScript(token.text))).fontSize(size).fillColor(token.link ? COLORS.cyan : color);

        // PDFKit carries text-state options (underline, link) forward across
        // `continued` fragments unless each one explicitly overrides them - so
        // every run must set `underline`/`link` explicitly, not just the link runs.
        const runOpts = { continued: !isLast, lineGap, underline: !!token.link, link: token.link || undefined };
        if (isFirst) {
            if (align) runOpts.align = align;
            if (width !== undefined) runOpts.width = width;
        }
        doc.text(token.text, runOpts);
    });
}

function measureBadgeWidth(doc, text) {
    doc.font('Helvetica-Bold').fontSize(9);
    return doc.widthOfString(text) + 20;
}

function drawBadge(doc, x, y, text, { bg, border, textColor }) {
    const w = measureBadgeWidth(doc, text);
    const h = 20;
    doc.lineWidth(1).roundedRect(x, y, w, h, 10).fillAndStroke(bg, border);
    doc.fillColor(textColor).font('Helvetica-Bold').fontSize(9)
        .text(text, x, y + 6, { width: w, align: 'center' });
    return w;
}

// Lays out a centered row (or wrapped rows) of badge pills.
function drawBadgeRow(doc, badges) {
    if (!badges.length) return;
    const gap = 8;
    const rowHeight = 20;
    const contentX = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    const widths = badges.map((b) => measureBadgeWidth(doc, b.text));
    const rows = [];
    let current = [];
    let currentWidth = 0;

    badges.forEach((b, i) => {
        const w = widths[i];
        const prospective = current.length ? currentWidth + gap + w : w;
        if (prospective > contentWidth && current.length) {
            rows.push({ items: current, width: currentWidth });
            current = [];
            currentWidth = 0;
        }
        current.push({ ...b, w });
        currentWidth = current.length === 1 ? w : currentWidth + gap + w;
    });
    if (current.length) rows.push({ items: current, width: currentWidth });

    rows.forEach(({ items, width }) => {
        ensureSpace(doc, rowHeight + 6);
        let x = contentX + Math.max(0, (contentWidth - width) / 2);
        const y = doc.y;
        items.forEach((b) => {
            drawBadge(doc, x, y, b.text, b);
            x += b.w + gap;
        });
        doc.y = y + rowHeight + 6;
    });
    doc.x = contentX;
}

function drawCover(doc, { title, subtitle, template, sections }) {
    const logoPath = path.join(__dirname, 'logo.jpg');
    if (fs.existsSync(logoPath)) {
        const logoSize = 50;
        doc.image(logoPath, (doc.page.width - logoSize) / 2, doc.y, { width: logoSize });
        doc.y += logoSize + 15;
    } else {
        doc.moveDown(1);
    }

    doc.font(fontFor(true, false, containsArabicScript(title))).fontSize(24).fillColor(COLORS.navy)
        .text(title || 'Research Report', { align: 'center' });

    if (subtitle) {
        doc.moveDown(0.3);
        doc.font(fontFor(false, false, containsArabicScript(subtitle))).fontSize(13).fillColor(COLORS.muted).text(subtitle, { align: 'center' });
    }

    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.cyan)
        .text('THINKMIC AI RESEARCH HUB', { align: 'center', characterSpacing: 2 });

    doc.moveDown(0.8);

    const badges = [{
        text: TEMPLATE_LABELS[template] || template || 'Standard',
        bg: COLORS.templateBadgeBg,
        border: COLORS.templateBadgeBorder,
        textColor: COLORS.templateBadgeText
    }];
    Object.entries(SECTION_LABELS).forEach(([key, label]) => {
        if (sections && sections[key]) {
            badges.push({ text: label, bg: COLORS.badgeBg, border: COLORS.badgeBorder, textColor: COLORS.navy });
        }
    });
    drawBadgeRow(doc, badges);

    doc.moveDown(1);
    const dividerY = doc.y;
    doc.moveTo(doc.page.margins.left, dividerY).lineTo(doc.page.width - doc.page.margins.right, dividerY)
        .lineWidth(1).strokeColor(COLORS.divider).stroke();
    doc.moveDown(1.5);
    doc.x = doc.page.margins.left;
}

function drawHeading(doc, level, innerHtml) {
    ensureSpace(doc, 60);
    doc.moveDown(0.9);
    const text = decodeEntities(stripTags(innerHtml)).trim();
    const headingIsArabic = containsArabicScript(text);
    const size = level === 1 ? 18 : level === 2 ? 16 : 13;
    doc.font(fontFor(true, false, headingIsArabic)).fontSize(size).fillColor(COLORS.navy).text(text, { align: headingIsArabic ? 'right' : 'left' });

    if (level <= 2) {
        doc.moveDown(0.25);
        const y = doc.y;
        doc.moveTo(doc.page.margins.left, y).lineTo(doc.page.width - doc.page.margins.right, y)
            .lineWidth(1).strokeColor(COLORS.divider).stroke();
        doc.moveDown(0.6);
    } else {
        doc.moveDown(0.35);
    }
    doc.x = doc.page.margins.left;
}

// Draws a compact row of QR thumbnails (one per unique link) below a block, so a printed
// copy of the report can be scanned to open each cited URL - "beside" the link in spirit,
// placed just under it since PDFKit can't mix an inline image into a flowed text run.
async function drawQrRow(doc, urls, qrCache) {
    if (!urls.length) return;
    const size = 34;
    const gap = 14;
    const contentX = doc.page.margins.left;

    for (const url of urls) {
        const buffer = await getQrBuffer(url, qrCache);
        if (!buffer) continue;

        ensureSpace(doc, size + 6);
        const y = doc.y;
        doc.image(buffer, contentX, y, { width: size, height: size });
        const label = url.length > 60 ? `${url.slice(0, 57)}...` : url;
        doc.font('Helvetica').fontSize(7.5).fillColor(COLORS.muted)
            .text('Scan to open', contentX + size + 8, y + 2, { width: doc.page.width - doc.page.margins.right - contentX - size - 8 })
            .text(label, contentX + size + 8, y + 13, { width: doc.page.width - doc.page.margins.right - contentX - size - 8, lineGap: 1 });
        doc.y = Math.max(doc.y, y + size) + gap - 8;
        doc.x = contentX;
    }
}

async function drawParagraph(doc, innerHtml, qrCache) {
    const tokens = parseInline(innerHtml);
    if (!tokens.length) return;
    ensureSpace(doc, 20);
    const blockIsArabic = tokens.some((t) => containsArabicScript(t.text));
    renderRuns(doc, tokens, { size: 10.5, color: COLORS.dark, align: blockIsArabic ? 'right' : 'justify', lineGap: 3 });
    doc.moveDown(0.6);
    doc.x = doc.page.margins.left;
    await drawQrRow(doc, linksFromTokens(tokens), qrCache);
}

async function drawList(doc, innerHtml, qrCache) {
    const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    const allLinks = [];
    while ((match = itemRe.exec(innerHtml)) !== null) {
        const tokens = parseInline(match[1]);
        if (!tokens.length) continue;
        ensureSpace(doc, 20);

        const bulletX = doc.page.margins.left + 15;
        const rightEdge = doc.page.width - doc.page.margins.right;
        tokens[0] = { ...tokens[0], text: `•  ${tokens[0].text}` };
        renderRuns(doc, tokens, { size: 10.5, color: COLORS.dark, x: bulletX, width: rightEdge - bulletX, lineGap: 2 });
        doc.moveDown(0.35);
        allLinks.push(...linksFromTokens(tokens));
    }
    doc.x = doc.page.margins.left;
    await drawQrRow(doc, [...new Set(allLinks)], qrCache);
}

function drawBlockquote(doc, innerHtml) {
    const text = decodeEntities(stripTags(innerHtml)).trim();
    if (!text) return;
    const quoteIsArabic = containsArabicScript(text);

    const padding = 10;
    const barWidth = 3.5;
    const contentX = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const textWidth = contentWidth - barWidth - padding * 2;

    doc.font(fontFor(false, true, quoteIsArabic)).fontSize(10.5);
    const textHeight = doc.heightOfString(text, { width: textWidth, lineGap: 2 });
    const boxHeight = textHeight + padding * 2;

    ensureSpace(doc, boxHeight + 20);
    const boxY = doc.y;

    doc.roundedRect(contentX, boxY, contentWidth, boxHeight, 4).fill(COLORS.quoteBg);
    doc.rect(contentX, boxY, barWidth, boxHeight).fill(COLORS.cyan);

    doc.font(fontFor(false, true, quoteIsArabic)).fontSize(10.5).fillColor(COLORS.slate)
        .text(text, contentX + barWidth + padding, boxY + padding, { width: textWidth, lineGap: 2 });

    doc.y = boxY + boxHeight + 14;
    doc.x = contentX;
}

async function drawTable(doc, innerHtml, qrCache) {
    const rows = parseTableRows(innerHtml);
    if (!rows.length) return;

    const contentX = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const numCols = Math.max(...rows.map((r) => r.length));
    const colWidths = numCols === 2
        ? [contentWidth * 0.38, contentWidth * 0.62]
        : Array(numCols).fill(contentWidth / numCols);

    const cellPadding = 6;
    const isHeaderRow = (row) => row.every((c) => c.tag === 'th');
    const tableLinks = [];

    ensureSpace(doc, 40);
    doc.moveDown(0.3);

    rows.forEach((row, rowIndex) => {
        const header = isHeaderRow(row);

        // Each cell may be a different script, so height must be measured with that
        // cell's own font, not one font picked for the whole row.
        const cellHeights = row.map((cell, i) => {
            const plain = decodeEntities(stripTags(cell.html)).trim();
            doc.font(fontFor(header, false, containsArabicScript(plain))).fontSize(9.5);
            return doc.heightOfString(plain || ' ', { width: colWidths[i] - cellPadding * 2 });
        });
        const rowHeight = Math.max(...cellHeights) + cellPadding * 2;

        ensureSpace(doc, rowHeight);
        const rowY = doc.y;

        if (header) {
            doc.rect(contentX, rowY, contentWidth, rowHeight).fill(COLORS.tableHeaderBg);
        } else if (rowIndex % 2 === 0) {
            doc.rect(contentX, rowY, contentWidth, rowHeight).fill(COLORS.tableAltRow);
        }

        let cellX = contentX;
        row.forEach((cell, i) => {
            const w = colWidths[i];
            doc.lineWidth(0.5).strokeColor(COLORS.tableBorder).rect(cellX, rowY, w, rowHeight).stroke();

            const plain = decodeEntities(stripTags(cell.html)).trim();
            const linkMatch = cell.html.match(/<a\s+href=["']([^"']*)["']/i);
            const url = linkMatch ? linkMatch[1] : (isUrl(plain) ? plain : null);
            if (url && !header) tableLinks.push(url);

            doc.font(fontFor(header, false, containsArabicScript(plain))).fontSize(9.5)
                .fillColor(header ? COLORS.navy : (url ? COLORS.cyan : COLORS.dark));

            const textOpts = { width: w - cellPadding * 2 };
            if (url && !header) {
                textOpts.link = url;
                textOpts.underline = true;
            }
            doc.text(plain, cellX + cellPadding, rowY + cellPadding, textOpts);

            cellX += w;
        });

        doc.y = rowY + rowHeight;
    });

    doc.moveDown(0.8);
    doc.x = contentX;

    // QR codes for every cited source in this table, so a printed copy can be scanned open
    await drawQrRow(doc, [...new Set(tableLinks)], qrCache);
}

function drawFooters(doc) {
    const range = doc.bufferedPageRange();
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        const originalBottomMargin = doc.page.margins.bottom;
        // Drawing inside the margin zone would otherwise trip PDFKit's automatic
        // page-break check (it thinks the content overflowed the page).
        doc.page.margins.bottom = 0;

        const pageLabel = `ThinkMic AI Research Hub • Page ${i - range.start + 1} of ${range.count}`;
        doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
            .text(pageLabel, doc.page.margins.left, doc.page.height - 35, {
                width: contentWidth,
                align: 'center',
                lineBreak: false
            });

        doc.page.margins.bottom = originalBottomMargin;
    }
}

const generatePDF = async (reportId, title, content, subtitle, template = 'standard', sections = {}, language = null) => {
    const reportsDir = path.join(__dirname, '../../backend/uploads/reports');
    ensureDirectoryExists(reportsDir);

    const fileName = `report_${reportId}.pdf`;
    const filePath = path.join(reportsDir, fileName);
    const doc = new PDFDocument({ margin: 50, bufferPages: true });

    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));

    // Registered unconditionally (cheap) - font/alignment choice happens per piece of text
    // via containsArabicScript() below, not from this report's declared `language`, so Arabic
    // script renders correctly even if it shows up somewhere unexpected.
    registerArabicFonts(doc);
    const qrCache = new Map();

    drawCover(doc, { title, subtitle, template, sections });

    const blocks = parseBlocks(content || '');
    if (blocks.length === 0) {
        const plainText = decodeEntities(stripTags(content || '')).trim();
        if (plainText) {
            renderRuns(doc, [{ text: plainText }], { size: 10.5, color: COLORS.dark, align: containsArabicScript(plainText) ? 'right' : 'justify' });
        }
    } else {
        // Sequential (not Promise.all) - PDFKit draws directly onto one shared cursor/stream,
        // so blocks must be laid out in document order, one at a time.
        for (const block of blocks) {
            switch (block.tag) {
                case 'h1': drawHeading(doc, 1, block.inner); break;
                case 'h2': drawHeading(doc, 2, block.inner); break;
                case 'h3': drawHeading(doc, 3, block.inner); break;
                case 'p': await drawParagraph(doc, block.inner, qrCache); break;
                case 'ul': await drawList(doc, block.inner, qrCache); break;
                case 'blockquote': drawBlockquote(doc, block.inner); break;
                case 'table': await drawTable(doc, block.inner, qrCache); break;
                default: break;
            }
        }
    }

    drawFooters(doc);
    doc.end();

    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
    });

    const localPath = `/uploads/reports/${fileName}`;
    const r2Key = await mirrorToR2(`reports/${reportId}.pdf`, Buffer.concat(chunks), 'application/pdf');
    return { localPath, r2Key };
};

// ============================================================
// DOCX rendering (docx.js)
// ============================================================

function buildRuns(tokens, { size = 22, color = '181c22' } = {}) {
    return tokens.map((t) => {
        const run = new TextRun({
            text: t.text,
            bold: !!t.bold,
            italics: !!t.italic,
            color: t.link ? '00C2CB' : color,
            underline: t.link ? {} : undefined,
            size
        });
        return t.link ? new ExternalHyperlink({ link: t.link, children: [run] }) : run;
    });
}

// Appends inline QR image runs (with a small caption) for a set of link URLs onto an
// existing run array - Word (unlike PDFKit) freely mixes ImageRun/TextRun within one
// Paragraph, so the QR can sit genuinely beside the link text rather than on its own line.
async function appendQrRuns(runs, urls, qrCache) {
    for (const url of urls) {
        const buffer = await getQrBuffer(url, qrCache);
        if (!buffer) continue;
        runs.push(new TextRun({ text: '  ', size: 21 }));
        runs.push(new ImageRun({ data: buffer, transformation: { width: 30, height: 30 } }));
        runs.push(new TextRun({ text: '  (scan to open)', color: '777682', size: 15, italics: true }));
    }
    return runs;
}

function buildHeadingParagraph(level, innerHtml) {
    const text = decodeEntities(stripTags(innerHtml)).trim();
    const headingIsArabic = containsArabicScript(text);
    const size = level === 1 ? 36 : level === 2 ? 32 : 26;
    return new Paragraph({
        children: [new TextRun({ text, color: '222777', bold: true, size })],
        spacing: { before: 300, after: 150 },
        border: level <= 2 ? { bottom: { color: 'E0E2EB', space: 4, style: BorderStyle.SINGLE, size: 6 } } : undefined,
        alignment: headingIsArabic ? AlignmentType.RIGHT : undefined,
        bidirectional: headingIsArabic
    });
}

// Word (unlike PDFKit) shapes and displays any Unicode script fine regardless of the
// paragraph's declared font, so no font override is needed here for Arabic text - but the
// paragraph-level RTL flag (`bidirectional`) still must be decided per-block from that
// block's own content, or an all-English block (e.g. the transcript appendix) inside an
// Urdu-language report would incorrectly get flipped to right-to-left reading order.
async function buildParagraphBlock(innerHtml, qrCache) {
    const tokens = parseInline(innerHtml);
    if (!tokens.length) return null;
    const blockIsArabic = tokens.some((t) => containsArabicScript(t.text));
    const runs = buildRuns(tokens, { size: 21, color: '181c22' });
    await appendQrRuns(runs, linksFromTokens(tokens), qrCache);
    return new Paragraph({
        children: runs,
        spacing: { after: 200, line: 360 },
        alignment: blockIsArabic ? AlignmentType.RIGHT : AlignmentType.JUSTIFIED,
        bidirectional: blockIsArabic
    });
}

async function buildListParagraphs(innerHtml, qrCache) {
    const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const paragraphs = [];
    let match;
    while ((match = itemRe.exec(innerHtml)) !== null) {
        const tokens = parseInline(match[1]);
        if (!tokens.length) continue;
        const itemIsArabic = tokens.some((t) => containsArabicScript(t.text));
        const runs = [new TextRun({ text: '•  ', color: '181c22', size: 21 }), ...buildRuns(tokens, { size: 21, color: '181c22' })];
        await appendQrRuns(runs, linksFromTokens(tokens), qrCache);
        paragraphs.push(new Paragraph({
            children: runs,
            spacing: { after: 120 },
            indent: { left: 360 },
            alignment: itemIsArabic ? AlignmentType.RIGHT : undefined,
            bidirectional: itemIsArabic
        }));
    }
    return paragraphs;
}

function buildBlockquoteParagraph(innerHtml) {
    const text = decodeEntities(stripTags(innerHtml)).trim();
    if (!text) return null;
    const quoteIsArabic = containsArabicScript(text);
    return new Paragraph({
        children: [new TextRun({ text, italics: true, color: '464651', size: 21 })],
        spacing: { before: 150, after: 200 },
        indent: { left: 200 },
        shading: { type: ShadingType.CLEAR, fill: 'F8F9FC' },
        border: { left: { color: '00C2CB', size: 28, style: BorderStyle.SINGLE, space: 8 } },
        alignment: quoteIsArabic ? AlignmentType.RIGHT : undefined,
        bidirectional: quoteIsArabic
    });
}

async function buildDocxTable(innerHtml, qrCache) {
    const rows = parseTableRows(innerHtml);
    if (!rows.length) return null;

    const numCols = Math.max(...rows.map((r) => r.length));
    const colWidthPct = numCols === 2 ? [38, 62] : Array(numCols).fill(Math.floor(100 / numCols));
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'E0E2EB' };
    const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

    const tableRows = [];
    for (const row of rows) {
        const isHeader = row.every((c) => c.tag === 'th');
        const cells = [];
        for (let i = 0; i < row.length; i++) {
            const cell = row[i];
            const plain = decodeEntities(stripTags(cell.html)).trim();
            const cellIsArabic = containsArabicScript(plain);
            const linkMatch = cell.html.match(/<a\s+href=["']([^"']*)["']/i);
            const url = linkMatch ? linkMatch[1] : (isUrl(plain) ? plain : null);

            const runChildren = url
                ? [new ExternalHyperlink({ link: url, children: [new TextRun({ text: plain, color: '00C2CB', underline: {}, size: 19 })] })]
                : [new TextRun({ text: plain, bold: isHeader, color: isHeader ? '222777' : '181c22', size: 19 })];
            if (url && !isHeader) await appendQrRuns(runChildren, [url], qrCache);

            cells.push(new TableCell({
                children: [new Paragraph({ children: runChildren, alignment: cellIsArabic ? AlignmentType.RIGHT : undefined, bidirectional: cellIsArabic })],
                width: { size: colWidthPct[i], type: WidthType.PERCENTAGE },
                shading: isHeader ? { type: ShadingType.CLEAR, fill: 'F1F3FC' } : undefined,
                borders,
                margins: { top: 100, bottom: 100, left: 100, right: 100 }
            }));
        }
        tableRows.push(new TableRow({ children: cells }));
    }

    return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

const generateDOCX = async (reportId, title, content, subtitle, template = 'standard', sections = {}, language = null) => {
    try {
        const reportsDir = path.join(__dirname, '../../backend/uploads/reports');
        ensureDirectoryExists(reportsDir);

        const fileName = `report_${reportId}.docx`;
        const filePath = path.join(reportsDir, fileName);

        // Word shapes any Unicode script correctly on its own, so (unlike the PDF path) there's
        // no font substitution to worry about - but bidirectional/alignment is still decided
        // per-block from that block's own content, not this report's declared `language`, so a
        // plain-English block (e.g. the transcript appendix) in an Urdu report isn't flipped RTL.
        const qrCache = new Map();
        const blocks = parseBlocks(content || '');
        const bodyElements = [];

        if (blocks.length === 0) {
            const plainText = decodeEntities(stripTags(content || '')).trim();
            plainText.split('\n').filter((p) => p.trim() !== '').forEach((line) => {
                const lineIsArabic = containsArabicScript(line);
                bodyElements.push(new Paragraph({
                    children: [new TextRun({ text: line, color: '181c22', size: 22 })],
                    spacing: { after: 200 },
                    alignment: lineIsArabic ? AlignmentType.RIGHT : undefined,
                    bidirectional: lineIsArabic
                }));
            });
        } else {
            // Sequential - QR generation is async and blocks may share a memoized cache entry
            for (const block of blocks) {
                switch (block.tag) {
                    case 'h1': bodyElements.push(buildHeadingParagraph(1, block.inner)); break;
                    case 'h2': bodyElements.push(buildHeadingParagraph(2, block.inner)); break;
                    case 'h3': bodyElements.push(buildHeadingParagraph(3, block.inner)); break;
                    case 'p': { const p = await buildParagraphBlock(block.inner, qrCache); if (p) bodyElements.push(p); break; }
                    case 'ul': bodyElements.push(...(await buildListParagraphs(block.inner, qrCache))); break;
                    case 'blockquote': { const bq = buildBlockquoteParagraph(block.inner); if (bq) bodyElements.push(bq); break; }
                    case 'table': {
                        const t = await buildDocxTable(block.inner, qrCache);
                        if (t) {
                            bodyElements.push(t);
                            bodyElements.push(new Paragraph({ text: '', spacing: { after: 200 } }));
                        }
                        break;
                    }
                    default: break;
                }
            }
        }

        const logoPath = path.join(__dirname, 'logo.jpg');
        const headerElements = [];

        if (fs.existsSync(logoPath)) {
            headerElements.push(new Paragraph({
                children: [new ImageRun({ data: fs.readFileSync(logoPath), transformation: { width: 60, height: 60 } })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }));
        }

        headerElements.push(new Paragraph({
            children: [new TextRun({ text: title || 'Research Report', color: '222777', size: 48, bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: subtitle ? 100 : 200 }
        }));

        if (subtitle) {
            headerElements.push(new Paragraph({
                children: [new TextRun({ text: subtitle, color: '777682', size: 28 })],
                alignment: AlignmentType.CENTER,
                spacing: { after: 200 }
            }));
        }

        headerElements.push(new Paragraph({
            children: [new TextRun({ text: 'THINKMIC AI RESEARCH HUB', color: '00C2CB', size: 20 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 150 }
        }));

        const activeSectionLabels = Object.entries(SECTION_LABELS)
            .filter(([key]) => sections && sections[key])
            .map(([, label]) => label);
        const badgeLine = [TEMPLATE_LABELS[template] || template || 'Standard', ...activeSectionLabels].join('   •   ');
        headerElements.push(new Paragraph({
            children: [new TextRun({ text: badgeLine, color: '777682', size: 18, bold: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
            border: { bottom: { color: 'E0E2EB', space: 8, style: BorderStyle.SINGLE, size: 6 } }
        }));

        const doc = new Document({
            sections: [{
                properties: {},
                children: [...headerElements, ...bodyElements]
            }]
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);

        const localPath = `/uploads/reports/${fileName}`;
        const r2Key = await mirrorToR2(
            `reports/${reportId}.docx`,
            buffer,
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );

        return { localPath, r2Key };
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generatePDF,
    generateDOCX
};
