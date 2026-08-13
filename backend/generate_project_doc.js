const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');

const doc = new Document({
    creator: "ThinkMic Auto-Generator",
    title: "ThinkMic Project Overview",
    description: "Detailed overview of the ThinkMic platform's features, architecture, and value proposition.",
    sections: [
        {
            properties: {},
            children: [
                new Paragraph({
                    text: "ThinkMic: AI-Powered Audio & Research Platform",
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                }),
                new Paragraph({
                    text: "Comprehensive Project Overview & Feature Documentation",
                    heading: HeadingLevel.HEADING_2,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 },
                }),

                // Section 1
                new Paragraph({
                    text: "1. The Problem ThinkMic Solves",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                }),
                new Paragraph({
                    children: [
                        new TextRun("In modern professional and academic workflows, meetings, lectures, and interviews generate massive amounts of unstructured audio data. Manual transcription and note-taking are slow, tedious, and prone to human error. Users struggle to quickly extract actionable insights, structured reports, and key takeaways from raw conversational data. Furthermore, existing solutions often lack native multi-lingual support, dynamic formatting templates, and a seamless integrated ecosystem for exporting finished research.")
                    ],
                }),

                // Section 2
                new Paragraph({
                    text: "2. What ThinkMic Provides (Core Value Proposition)",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                }),
                new Paragraph({
                    text: "ThinkMic is a seamless, end-to-end SaaS platform for audio ingestion, high-accuracy AI transcription, and intelligent summarization. It empowers users by providing:",
                    spacing: { after: 100 },
                }),
                new Paragraph({ text: "• Dynamic AI Summarization: Utilizes advanced LLMs to transform raw transcripts into concise summaries, structured action items, and professional reports.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Automated Document Generation: Exports finished research directly into polished PDF and Word (DOCX) formats, ready for publication.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Real-Time Web Research: Deepens insights by enriching generated summaries with live web search data.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Multilingual Capabilities: First-class support for multiple languages including English and Urdu (ur-PK).", bullet: { level: 0 } }),
                new Paragraph({ text: "• Reward Ecosystem: Built-in referral network and virtual 'Coin' currency to incentivize user growth and platform engagement.", bullet: { level: 0 } }),

                // Section 3
                new Paragraph({
                    text: "3. Key Features & Functionality",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                }),
                
                new Paragraph({
                    children: [new TextRun({ text: "Robust Authentication & Security", bold: true })],
                    spacing: { before: 200 },
                }),
                new Paragraph({ text: "• Secure Email/OTP Verification & Google OAuth single sign-on (SSO).", bullet: { level: 0 } }),
                new Paragraph({ text: "• Advanced cross-origin session management (SameSite=None JWT cookies, secure silent token refresh).", bullet: { level: 0 } }),
                new Paragraph({ text: "• Enterprise-grade rate limiting and reverse proxy protections to mitigate brute-force attacks.", bullet: { level: 0 } }),

                new Paragraph({
                    children: [new TextRun({ text: "High-Performance Background Processing Engine", bold: true })],
                    spacing: { before: 200 },
                }),
                new Paragraph({ text: "• Asynchronous task queuing using BullMQ and Redis for non-blocking API performance.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Dedicated background worker engines for Transcription (Whisper API), Summarization, Web Search, and Document Generation.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Real-time Socket.IO WebSocket connections pushing live progress bars directly to the user's dashboard.", bullet: { level: 0 } }),

                new Paragraph({
                    children: [new TextRun({ text: "Cloud-Native Storage Infrastructure", bold: true })],
                    spacing: { before: 200 },
                }),
                new Paragraph({ text: "• Cloudflare R2 integration utilizing presigned URLs for highly secure, low-latency audio file uploads and document downloads directly from the browser.", bullet: { level: 0 } }),

                new Paragraph({
                    children: [new TextRun({ text: "Comprehensive Admin & Management Suite", bold: true })],
                    spacing: { before: 200 },
                }),
                new Paragraph({ text: "• User & Role Management: Role-Based Access Control (RBAC) separating features for Admins, Managers, and standard Users.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Schema Builder: A dynamic tool for admins to visually define custom JSON schemas that dictate how AI summaries are structured and formatted for end-users.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Support Inbox: Integrated real-time ticketing system for direct user-to-admin support via WebSockets.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Referral & Coin Management: Dedicated dashboards for admins to review, approve, and audit virtual currency transactions and user referrals.", bullet: { level: 0 } }),

                // Section 4
                new Paragraph({
                    text: "4. Technology Stack & Infrastructure",
                    heading: HeadingLevel.HEADING_2,
                    spacing: { before: 400, after: 200 },
                }),
                new Paragraph({ text: "• Frontend: React.js (Vite), SPA Architecture, TailwindCSS for a highly responsive, modern interface.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Backend API: Node.js, Express.js.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Database: MongoDB Atlas (Mongoose ORM).", bullet: { level: 0 } }),
                new Paragraph({ text: "• Caching & Queues: Redis, BullMQ.", bullet: { level: 0 } }),
                new Paragraph({ text: "• Real-time Engine: Socket.IO.", bullet: { level: 0 } }),
                new Paragraph({ text: "• AI Integrations: OpenAI API (Whisper-1, GPT).", bullet: { level: 0 } }),
                new Paragraph({ text: "• Storage: Cloudflare R2 (S3-compatible API).", bullet: { level: 0 } }),
                new Paragraph({ text: "• Deployment & Hosting: Vercel (Frontend SPA) and Railway (Backend API & Background Worker Node).", bullet: { level: 0 } }),
            ],
        },
    ],
});

Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("ThinkMic_Project_Overview.docx", buffer);
    console.log("Successfully created ThinkMic_Project_Overview.docx");
}).catch(console.error);
