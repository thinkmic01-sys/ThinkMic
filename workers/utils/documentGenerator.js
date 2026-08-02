const PDFDocument = require('pdfkit');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun } = require('docx');
const fs = require('fs');
const path = require('path');

const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
};

const generatePDF = async (reportId, title, content, subtitle) => {
    return new Promise((resolve, reject) => {
        try {
            const reportsDir = path.join(__dirname, '../../backend/uploads/reports');
            ensureDirectoryExists(reportsDir);
            
            const fileName = `report_${reportId}.pdf`;
            const filePath = path.join(reportsDir, fileName);
            const doc = new PDFDocument({ margin: 50 });
            
            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);
            
            // Logo Header
            const logoPath = path.join(__dirname, 'logo.jpg');
            if (fs.existsSync(logoPath)) {
                // Center the logo (A4 width 595.28 - 60) / 2
                doc.image(logoPath, 267.64, 50, { width: 60 });
                doc.moveDown(5);
            }
            
            doc.fontSize(24).font('Helvetica-Bold').fillColor('#222777').text(title || 'Research Report', { align: 'center' });
            if (subtitle) {
                doc.moveDown(0.2);
                doc.fontSize(14).font('Helvetica').fillColor('#777682').text(subtitle, { align: 'center' });
            }
            doc.moveDown(0.5);
            doc.fontSize(10).font('Helvetica').fillColor('#00C2CB').text('THINKMIC AI RESEARCH HUB', { align: 'center', characterSpacing: 2 });
            doc.moveDown(2);
            
            // Content Parsing
            const regex = /<(h[1-6]|p|div|li)[^>]*>(.*?)<\/\1>/gi;
            let match;
            let hasBlocks = false;
            while ((match = regex.exec(content.replace(/\n/g, ' '))) !== null) {
                hasBlocks = true;
                const tag = match[1].toLowerCase();
                const text = match[2].replace(/<[^>]+>/g, '').trim();
                if (!text) continue;
                
                if (tag.startsWith('h')) {
                    doc.moveDown(1);
                    doc.fontSize(tag === 'h1' ? 18 : (tag === 'h2' ? 16 : 14)).font('Helvetica-Bold').fillColor('#222777').text(text, { align: 'left' });
                    doc.moveDown(0.5);
                } else {
                    doc.fontSize(12).font('Helvetica').fillColor('#181c22').text(text, { align: 'justify' });
                    doc.moveDown(0.5);
                }
            }
            if (!hasBlocks) {
                const plainText = content.replace(/<[^>]+>/g, '');
                doc.fontSize(12).font('Helvetica').fillColor('#181c22').text(plainText, { align: 'justify' });
            }
            
            doc.end();
            
            stream.on('finish', () => resolve(`/uploads/reports/${fileName}`));
            stream.on('error', reject);
        } catch (error) {
            reject(error);
        }
    });
};

const generateDOCX = async (reportId, title, content, subtitle) => {
    try {
        const reportsDir = path.join(__dirname, '../../backend/uploads/reports');
        ensureDirectoryExists(reportsDir);

        const fileName = `report_${reportId}.docx`;
        const paragraphs = [];
        const regex = /<(h[1-6]|p|div|li)[^>]*>(.*?)<\/\1>/gi;
        let match;
        while ((match = regex.exec(content.replace(/\n/g, ' '))) !== null) {
            const tag = match[1].toLowerCase();
            const text = match[2].replace(/<[^>]+>/g, '').trim();
            if (!text) continue;
            
            if (tag.startsWith('h')) {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({ text, color: "222777", size: tag === 'h1' ? 36 : (tag === 'h2' ? 32 : 28), bold: true })],
                    spacing: { before: 300, after: 100 }
                }));
            } else {
                paragraphs.push(new Paragraph({
                    children: [new TextRun({ text, color: "181c22", size: 24 })], // 24 half-pts = 12pt
                    spacing: { after: 200 }
                }));
            }
        }
        
        if (paragraphs.length === 0) {
            const plainText = content.replace(/<[^>]+>/g, '');
            paragraphs.push(...plainText.split('\n').filter(p => p.trim() !== '').map(text => 
                new Paragraph({
                    children: [new TextRun({ text, color: "181c22", size: 24 })],
                    spacing: { after: 200 }
                })
            ));
        }

        const logoPath = path.join(__dirname, 'logo.jpg');
        const headerElements = [];
        
        if (fs.existsSync(logoPath)) {
            headerElements.push(
                new Paragraph({
                    children: [
                        new ImageRun({
                            data: fs.readFileSync(logoPath),
                            transformation: { width: 60, height: 60 }
                        })
                    ],
                    alignment: "center",
                    spacing: { after: 200 }
                })
            );
        }

        headerElements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: title || 'Research Report', color: "222777", size: 48, bold: true })
                ],
                alignment: "center",
                spacing: { after: subtitle ? 100 : 200 }
            })
        );
        
        if (subtitle) {
            headerElements.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: subtitle, color: "777682", size: 28 })
                    ],
                    alignment: "center",
                    spacing: { after: 200 }
                })
            );
        }

        headerElements.push(
            new Paragraph({
                children: [
                    new TextRun({ text: 'THINKMIC AI RESEARCH HUB', color: "00C2CB", size: 20 })
                ],
                alignment: "center",
                spacing: { after: 400 }
            })
        );

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    ...headerElements,
                    ...paragraphs
                ],
            }],
        });

        const buffer = await Packer.toBuffer(doc);
        fs.writeFileSync(filePath, buffer);
        
        return `/uploads/reports/${fileName}`;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    generatePDF,
    generateDOCX
};
