const PDFDocument = require('pdfkit');
const {
    Document, Packer, Paragraph, TextRun, ImageRun,
    Table, TableRow, TableCell, WidthType, ShadingType,
    ExternalHyperlink, BorderStyle, AlignmentType
} = require('docx');
const fs = require('fs');
const path = require('path');
const r2StorageService = require('../../backend/services/r2StorageService');

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

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

function fontFor(bold, italic) {
    if (bold && italic) return 'Helvetica-BoldOblique';
    if (bold) return 'Helvetica-Bold';
    if (italic) return 'Helvetica-Oblique';
    return 'Helvetica';
}

// Renders a sequence of styled inline tokens as one flowing, wrapped paragraph -
// PDFKit's `continued` text mode lets each run carry its own font/color/link while
// staying on the same flowed line(s).
function renderRuns(doc, tokens, { size = 10.5, color = COLORS.dark, align, x, width, lineGap = 2 } = {}) {
    if (!tokens.length) return;
    if (x !== undefined) doc.x = x;

    tokens.forEach((token, i) => {
        const isFirst = i === 0;
        const isLast = i === tokens.length - 1;

        doc.font(fontFor(token.bold, token.italic)).fontSize(size).fillColor(token.link ? COLORS.cyan : color);

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

    doc.font('Helvetica-Bold').fontSize(24).fillColor(COLORS.navy)
        .text(title || 'Research Report', { align: 'center' });

    if (subtitle) {
        doc.moveDown(0.3);
        doc.font('Helvetica').fontSize(13).fillColor(COLORS.muted).text(subtitle, { align: 'center' });
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
    const size = level === 1 ? 18 : level === 2 ? 16 : 13;
    doc.font('Helvetica-Bold').fontSize(size).fillColor(COLORS.navy).text(text, { align: 'left' });

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

function drawParagraph(doc, innerHtml) {
    const tokens = parseInline(innerHtml);
    if (!tokens.length) return;
    ensureSpace(doc, 20);
    renderRuns(doc, tokens, { size: 10.5, color: COLORS.dark, align: 'justify', lineGap: 3 });
    doc.moveDown(0.6);
    doc.x = doc.page.margins.left;
}

function drawList(doc, innerHtml) {
    const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    let match;
    while ((match = itemRe.exec(innerHtml)) !== null) {
        const tokens = parseInline(match[1]);
        if (!tokens.length) continue;
        ensureSpace(doc, 20);

        const bulletX = doc.page.margins.left + 15;
        const rightEdge = doc.page.width - doc.page.margins.right;
        tokens[0] = { ...tokens[0], text: `•  ${tokens[0].text}` };
        renderRuns(doc, tokens, { size: 10.5, color: COLORS.dark, x: bulletX, width: rightEdge - bulletX, lineGap: 2 });
        doc.moveDown(0.35);
    }
    doc.x = doc.page.margins.left;
}

function drawBlockquote(doc, innerHtml) {
    const text = decodeEntities(stripTags(innerHtml)).trim();
    if (!text) return;

    const padding = 10;
    const barWidth = 3.5;
    const contentX = doc.page.margins.left;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const textWidth = contentWidth - barWidth - padding * 2;

    doc.font('Helvetica-Oblique').fontSize(10.5);
    const textHeight = doc.heightOfString(text, { width: textWidth, lineGap: 2 });
    const boxHeight = textHeight + padding * 2;

    ensureSpace(doc, boxHeight + 20);
    const boxY = doc.y;

    doc.roundedRect(contentX, boxY, contentWidth, boxHeight, 4).fill(COLORS.quoteBg);
    doc.rect(contentX, boxY, barWidth, boxHeight).fill(COLORS.cyan);

    doc.font('Helvetica-Oblique').fontSize(10.5).fillColor(COLORS.slate)
        .text(text, contentX + barWidth + padding, boxY + padding, { width: textWidth, lineGap: 2 });

    doc.y = boxY + boxHeight + 14;
    doc.x = contentX;
}

function drawTable(doc, innerHtml) {
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

    ensureSpace(doc, 40);
    doc.moveDown(0.3);

    rows.forEach((row, rowIndex) => {
        const header = isHeaderRow(row);

        doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5);
        const cellHeights = row.map((cell, i) => {
            const plain = decodeEntities(stripTags(cell.html)).trim();
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

            doc.font(header ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5)
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

const generatePDF = async (reportId, title, content, subtitle, template = 'standard', sections = {}) => {
    return new Promise((resolve, reject) => {
        try {
            const reportsDir = path.join(__dirname, '../../backend/uploads/reports');
            ensureDirectoryExists(reportsDir);

            const fileName = `report_${reportId}.pdf`;
            const filePath = path.join(reportsDir, fileName);
            const doc = new PDFDocument({ margin: 50, bufferPages: true });

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));

            drawCover(doc, { title, subtitle, template, sections });

            const blocks = parseBlocks(content || '');
            if (blocks.length === 0) {
                const plainText = decodeEntities(stripTags(content || '')).trim();
                if (plainText) {
                    renderRuns(doc, [{ text: plainText }], { size: 10.5, color: COLORS.dark, align: 'justify' });
                }
            } else {
                blocks.forEach((block) => {
                    switch (block.tag) {
                        case 'h1': drawHeading(doc, 1, block.inner); break;
                        case 'h2': drawHeading(doc, 2, block.inner); break;
                        case 'h3': drawHeading(doc, 3, block.inner); break;
                        case 'p': drawParagraph(doc, block.inner); break;
                        case 'ul': drawList(doc, block.inner); break;
                        case 'blockquote': drawBlockquote(doc, block.inner); break;
                        case 'table': drawTable(doc, block.inner); break;
                        default: break;
                    }
                });
            }

            drawFooters(doc);
            doc.end();

            stream.on('finish', async () => {
                const localPath = `/uploads/reports/${fileName}`;
                const r2Key = await mirrorToR2(`reports/${reportId}.pdf`, Buffer.concat(chunks), 'application/pdf');
                resolve({ localPath, r2Key });
            });
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
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

function buildHeadingParagraph(level, innerHtml) {
    const text = decodeEntities(stripTags(innerHtml)).trim();
    const size = level === 1 ? 36 : level === 2 ? 32 : 26;
    return new Paragraph({
        children: [new TextRun({ text, color: '222777', bold: true, size })],
        spacing: { before: 300, after: 150 },
        border: level <= 2 ? { bottom: { color: 'E0E2EB', space: 4, style: BorderStyle.SINGLE, size: 6 } } : undefined
    });
}

function buildParagraphBlock(innerHtml) {
    const tokens = parseInline(innerHtml);
    if (!tokens.length) return null;
    return new Paragraph({
        children: buildRuns(tokens, { size: 21, color: '181c22' }),
        spacing: { after: 200, line: 360 },
        alignment: AlignmentType.JUSTIFIED
    });
}

function buildListParagraphs(innerHtml) {
    const itemRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
    const paragraphs = [];
    let match;
    while ((match = itemRe.exec(innerHtml)) !== null) {
        const tokens = parseInline(match[1]);
        if (!tokens.length) continue;
        paragraphs.push(new Paragraph({
            children: [new TextRun({ text: '•  ', color: '181c22', size: 21 }), ...buildRuns(tokens, { size: 21, color: '181c22' })],
            spacing: { after: 120 },
            indent: { left: 360 }
        }));
    }
    return paragraphs;
}

function buildBlockquoteParagraph(innerHtml) {
    const text = decodeEntities(stripTags(innerHtml)).trim();
    if (!text) return null;
    return new Paragraph({
        children: [new TextRun({ text, italics: true, color: '464651', size: 21 })],
        spacing: { before: 150, after: 200 },
        indent: { left: 200 },
        shading: { type: ShadingType.CLEAR, fill: 'F8F9FC' },
        border: { left: { color: '00C2CB', size: 28, style: BorderStyle.SINGLE, space: 8 } }
    });
}

function buildDocxTable(innerHtml) {
    const rows = parseTableRows(innerHtml);
    if (!rows.length) return null;

    const numCols = Math.max(...rows.map((r) => r.length));
    const colWidthPct = numCols === 2 ? [38, 62] : Array(numCols).fill(Math.floor(100 / numCols));
    const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: 'E0E2EB' };
    const borders = { top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder };

    const tableRows = rows.map((row) => {
        const isHeader = row.every((c) => c.tag === 'th');
        return new TableRow({
            children: row.map((cell, i) => {
                const plain = decodeEntities(stripTags(cell.html)).trim();
                const linkMatch = cell.html.match(/<a\s+href=["']([^"']*)["']/i);
                const url = linkMatch ? linkMatch[1] : (isUrl(plain) ? plain : null);

                const runChildren = url
                    ? [new ExternalHyperlink({ link: url, children: [new TextRun({ text: plain, color: '00C2CB', underline: {}, size: 19 })] })]
                    : [new TextRun({ text: plain, bold: isHeader, color: isHeader ? '222777' : '181c22', size: 19 })];

                return new TableCell({
                    children: [new Paragraph({ children: runChildren })],
                    width: { size: colWidthPct[i], type: WidthType.PERCENTAGE },
                    shading: isHeader ? { type: ShadingType.CLEAR, fill: 'F1F3FC' } : undefined,
                    borders,
                    margins: { top: 100, bottom: 100, left: 100, right: 100 }
                });
            })
        });
    });

    return new Table({ rows: tableRows, width: { size: 100, type: WidthType.PERCENTAGE } });
}

const generateDOCX = async (reportId, title, content, subtitle, template = 'standard', sections = {}) => {
    try {
        const reportsDir = path.join(__dirname, '../../backend/uploads/reports');
        ensureDirectoryExists(reportsDir);

        const fileName = `report_${reportId}.docx`;
        const filePath = path.join(reportsDir, fileName);

        const blocks = parseBlocks(content || '');
        const bodyElements = [];

        if (blocks.length === 0) {
            const plainText = decodeEntities(stripTags(content || '')).trim();
            plainText.split('\n').filter((p) => p.trim() !== '').forEach((line) => {
                bodyElements.push(new Paragraph({
                    children: [new TextRun({ text: line, color: '181c22', size: 22 })],
                    spacing: { after: 200 }
                }));
            });
        } else {
            blocks.forEach((block) => {
                switch (block.tag) {
                    case 'h1': bodyElements.push(buildHeadingParagraph(1, block.inner)); break;
                    case 'h2': bodyElements.push(buildHeadingParagraph(2, block.inner)); break;
                    case 'h3': bodyElements.push(buildHeadingParagraph(3, block.inner)); break;
                    case 'p': { const p = buildParagraphBlock(block.inner); if (p) bodyElements.push(p); break; }
                    case 'ul': bodyElements.push(...buildListParagraphs(block.inner)); break;
                    case 'blockquote': { const bq = buildBlockquoteParagraph(block.inner); if (bq) bodyElements.push(bq); break; }
                    case 'table': {
                        const t = buildDocxTable(block.inner);
                        if (t) {
                            bodyElements.push(t);
                            bodyElements.push(new Paragraph({ text: '', spacing: { after: 200 } }));
                        }
                        break;
                    }
                    default: break;
                }
            });
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
