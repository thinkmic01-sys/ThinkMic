const nodemailer = require('nodemailer');

const BRAND = {
    navy: '#222777',
    cyan: '#00C2CB',
    dark: '#181c22',
    muted: '#777682',
    bg: '#f9f9ff'
};

const isSmtpConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;
const getTransporter = () => {
    if (!isSmtpConfigured()) return null;
    if (!transporter) {
        const port = Number(process.env.SMTP_PORT) || 587;
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port,
            secure: port === 465, // 465 = implicit TLS; 587 upgrades via STARTTLS below
            requireTLS: port !== 465, // enforce STARTTLS on 587 (Gmail rejects plaintext AUTH otherwise)
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            // Without these, a blocked/unreachable SMTP port (common on PaaS platforms that
            // restrict outbound SMTP) hangs the connection attempt indefinitely, which hangs
            // the whole HTTP request (e.g. register) since these ports have no OS-level cap.
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000,
            // Railway's containers have no outbound IPv6 route, but Node still resolves
            // smtp.gmail.com's AAAA record first and tries that address, failing fast with
            // ENETUNREACH before ever reaching Gmail. Force IPv4 resolution to avoid it.
            family: 4
        });
    }
    return transporter;
};

// Verifies the SMTP connection/auth without sending anything - used by the
// standalone test script and safe to call from a health-check route later.
async function verifySmtpConnection() {
    const client = getTransporter();
    if (!client) {
        return { ok: false, configured: false, message: 'SMTP is not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing).' };
    }
    try {
        await client.verify();
        return { ok: true, configured: true, message: 'SMTP connection & authentication verified.' };
    } catch (error) {
        return {
            ok: false,
            configured: true,
            message: error.message,
            code: error.code,
            responseCode: error.responseCode,
            response: error.response,
            command: error.command
        };
    }
}

// Always prints the OTP prominently in cyan, regardless of whether SMTP is
// configured or the send succeeds - so local development is never blocked
// waiting on real mail delivery (spam filters, slow delivery, SMTP outages, etc).
function logOtpBoxToTerminal(to, code) {
    const cyan = '\x1b[36m';
    const bold = '\x1b[1m';
    const reset = '\x1b[0m';

    const rows = ['ThinkMic OTP', `To:   ${to}`, `Code: ${code}`];
    const width = Math.max(...rows.map((r) => r.length)) + 4;
    const line = '─'.repeat(width);
    // Pads based on the PLAIN text length, then wraps the desired part in ANSI codes
    // afterward - padding on an already-ANSI-wrapped string would count the escape
    // codes as visible characters and break the box's alignment.
    const row = (plainText, highlightStart) => {
        const padded = `  ${plainText}`.padEnd(width);
        if (highlightStart === undefined) return padded;
        const offset = 2 + highlightStart;
        return `${padded.slice(0, offset)}${bold}${padded.slice(offset).trimEnd()}${reset}${padded.slice(offset).match(/\s*$/)[0]}`;
    };

    console.log(`\n${cyan}┌${line}┐${reset}`);
    console.log(`${cyan}│${reset}${row('ThinkMic OTP', 0)}${cyan}│${reset}`);
    console.log(`${cyan}├${line}┤${reset}`);
    console.log(`${cyan}│${reset}${row(`To:   ${to}`)}${cyan}│${reset}`);
    console.log(`${cyan}│${reset}${row(`Code: ${code}`, 6)}${cyan}│${reset}`);
    console.log(`${cyan}└${line}┘${reset}\n`);
}

// Dev fallback: print the email content to the terminal in a readable box so
// local testing works immediately without waiting on SMTP credentials.
function logToTerminal({ to, subject, code, link }) {
    const line = '='.repeat(64);
    console.log(`\n${line}`);
    console.log(`  [ThinkMic Dev Mail] ${subject}`);
    console.log(line);
    console.log(`  To:      ${to}`);
    if (code) console.log(`  Code:    ${code}`);
    if (link) console.log(`  Link:    ${link}`);
    console.log(`${line}\n`);
}

function wrapperHtml({ heading, bodyHtml }) {
    return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; background:${BRAND.bg}; padding:32px;">
        <div style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; border:1px solid #e0e2eb;">
            <div style="background:${BRAND.navy}; padding:24px 32px;">
                <span style="color:#ffffff; font-size:20px; font-weight:700; letter-spacing:0.02em;">ThinkMic</span>
            </div>
            <div style="padding:32px;">
                <h2 style="color:${BRAND.navy}; font-size:20px; margin:0 0 16px;">${heading}</h2>
                ${bodyHtml}
            </div>
            <div style="padding:16px 32px; background:${BRAND.bg}; color:${BRAND.muted}; font-size:12px;">
                © ${new Date().getFullYear()} ThinkMic Systems. If you didn't request this, you can safely ignore this email.
            </div>
        </div>
    </div>`;
}

function otpBlockHtml(code) {
    return `
    <div style="text-align:center; margin:24px 0;">
        <span style="display:inline-block; font-size:32px; font-weight:700; letter-spacing:8px; color:${BRAND.navy}; background:${BRAND.bg}; padding:16px 24px; border-radius:8px; border:1px dashed ${BRAND.cyan};">${code}</span>
    </div>`;
}

function ctaButtonHtml(href, label) {
    return `
    <div style="text-align:center; margin:24px 0;">
        <a href="${href}" style="display:inline-block; background:${BRAND.cyan}; color:${BRAND.navy}; font-weight:700; text-decoration:none; padding:12px 28px; border-radius:8px; font-size:14px;">${label}</a>
    </div>`;
}

async function sendMail({ to, subject, html, code, link, attachments }) {
    // Always surface the OTP in the terminal - development is never blocked on
    // real mail delivery, spam filters, or SMTP outages.
    if (code) logOtpBoxToTerminal(to, code);

    const client = getTransporter();

    if (!client) {
        logToTerminal({ to, subject, code, link });
        if (attachments?.length) {
            console.log(`  [ThinkMic Dev Mail] Would attach: ${attachments.map((a) => a.filename).join(', ')}`);
        }
        return { delivered: false, devMode: true };
    }

    try {
        const info = await client.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            html,
            attachments
        });

        console.log(`[Email] Sent "${subject}" to ${to} - messageId=${info.messageId}, response="${info.response}", accepted=${JSON.stringify(info.accepted)}`);

        return { delivered: true, devMode: false, messageId: info.messageId, response: info.response };
    } catch (error) {
        // Exact SMTP diagnostics: error codes, server response text, and the failing command
        console.error(`[Email] FAILED to send "${subject}" to ${to}:`);
        console.error(`  error.code:         ${error.code}`);
        console.error(`  error.responseCode: ${error.responseCode}`);
        console.error(`  error.response:     ${error.response}`);
        console.error(`  error.command:      ${error.command}`);
        console.error(`  error.message:      ${error.message}`);

        // Also fall back to the readable console box so the OTP is still usable
        // even though delivery failed.
        logToTerminal({ to, subject, code, link });

        const friendlyError = new Error(`Failed to send email via SMTP: ${error.response || error.message}`);
        friendlyError.smtpCode = error.responseCode;
        friendlyError.smtpErrorCode = error.code;
        throw friendlyError;
    }
}

async function sendVerificationEmail(user, code) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    const link = `${clientUrl}/verify-email?email=${encodeURIComponent(user.email)}&code=${code}`;

    const html = wrapperHtml({
        heading: `Verify your email, ${user.fullName?.split(' ')[0] || 'there'}`,
        bodyHtml: `
            <p style="color:${BRAND.dark}; font-size:14px; line-height:1.6;">
                Use the code below to verify your ThinkMic account. This code expires in 24 hours.
            </p>
            ${otpBlockHtml(code)}
            <p style="color:${BRAND.muted}; font-size:13px; text-align:center;">Or click below for one-click verification:</p>
            ${ctaButtonHtml(link, 'Verify Email')}
        `
    });

    return sendMail({ to: user.email, subject: 'Verify your ThinkMic account', html, code, link });
}

async function sendPasswordResetEmail(user, code) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    const link = `${clientUrl}/reset-password?email=${encodeURIComponent(user.email)}&code=${code}`;

    const html = wrapperHtml({
        heading: 'Reset your password',
        bodyHtml: `
            <p style="color:${BRAND.dark}; font-size:14px; line-height:1.6;">
                We received a request to reset your ThinkMic password. Use the code below. This code expires in 10 minutes.
            </p>
            ${otpBlockHtml(code)}
            <p style="color:${BRAND.muted}; font-size:13px; text-align:center;">Or click below to reset directly:</p>
            ${ctaButtonHtml(link, 'Reset Password')}
        `
    });

    return sendMail({ to: user.email, subject: 'Reset your ThinkMic password', html, code, link });
}

// Sends a branded report email with the generated PDF attached.
// pdfPath must be an absolute filesystem path to the PDF to attach.
async function sendReportEmail(recipientEmail, { report, message, senderName, pdfPath }) {
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
    const reportLink = `${clientUrl}/app/reports/${report._id}/export`;
    const senderLabel = senderName ? `${senderName} via ThinkMic` : 'ThinkMic';

    const html = wrapperHtml({
        heading: `${senderLabel} shared a report with you`,
        bodyHtml: `
            ${message ? `<p style="color:${BRAND.dark}; font-size:14px; line-height:1.6; background:${BRAND.bg}; padding:12px 16px; border-radius:8px; border-left:3px solid ${BRAND.cyan};">${message}</p>` : ''}
            <p style="color:${BRAND.dark}; font-size:14px; line-height:1.6;">
                <strong>${report.title}</strong>${report.subtitle ? `<br/><span style="color:${BRAND.muted};">${report.subtitle}</span>` : ''}
            </p>
            <p style="color:${BRAND.muted}; font-size:13px; line-height:1.6;">
                The full report is attached as a PDF. You can also view it online:
            </p>
            ${ctaButtonHtml(reportLink, 'View Report Online')}
        `
    });

    const filename = `${(report.title || 'ThinkMic_Report').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
    const attachments = pdfPath ? [{ filename, path: pdfPath }] : [];

    return sendMail({
        to: recipientEmail,
        subject: `ThinkMic Report: ${report.title}`,
        html,
        link: reportLink,
        attachments
    });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail, verifySmtpConnection, sendReportEmail };
