/**
 * Standalone SMTP / Gmail email delivery diagnostic.
 *
 * Verifies the SMTP connection using the credentials in backend/.env, then
 * sends a real test verification email (with a live OTP code) to prove
 * end-to-end delivery.
 *
 * Usage: node test-email-delivery.js [recipient@example.com]
 *        (defaults to SMTP_USER if no recipient is given)
 */
require('dotenv').config();
const emailService = require('./services/emailService');

const cyan = '\x1b[36m';
const green = '\x1b[32m';
const red = '\x1b[31m';
const bold = '\x1b[1m';
const reset = '\x1b[0m';

function section(title) {
    console.log(`\n${bold}${title}${reset}`);
}

async function run() {
    const recipient = process.argv[2] || process.env.SMTP_USER;

    console.log(`${bold}ThinkMic SMTP / Gmail Delivery Diagnostic${reset}`);
    console.log(`Recipient: ${recipient}\n`);

    section('1. Configuration');
    console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || '(not set)'}`);
    console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || '(not set)'}`);
    console.log(`  SMTP_USER: ${process.env.SMTP_USER || '(not set)'}`);
    console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '*'.repeat(process.env.SMTP_PASS.length) + ` (${process.env.SMTP_PASS.length} chars)` : '(not set)'}`);
    console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM || '(not set, falls back to SMTP_USER)'}`);

    if (!recipient) {
        console.error(`\n${red}No recipient available - pass one as an argument or set SMTP_USER.${reset}`);
        process.exit(1);
    }

    section('2. Connection & TLS handshake (transporter.verify)');
    const verifyResult = await emailService.verifySmtpConnection();

    if (!verifyResult.configured) {
        console.error(`${red}✘ SMTP is not configured: ${verifyResult.message}${reset}`);
        process.exit(1);
    }

    if (!verifyResult.ok) {
        console.error(`${red}✘ SMTP connection/authentication FAILED${reset}`);
        console.error(`  message:      ${verifyResult.message}`);
        console.error(`  error.code:   ${verifyResult.code}`);
        console.error(`  responseCode: ${verifyResult.responseCode}`);
        console.error(`  response:     ${verifyResult.response}`);
        console.error(`  command:      ${verifyResult.command}`);
        console.error(`\nCommon causes: wrong SMTP_USER/SMTP_PASS, a regular Gmail password instead of an`);
        console.error(`App Password (Gmail requires one when 2FA is enabled), or the account/App Password`);
        console.error(`being revoked. Generate one at https://myaccount.google.com/apppasswords`);
        process.exit(1);
    }

    console.log(`${green}✔ ${verifyResult.message}${reset}`);
    console.log(`${green}✔ TLS handshake succeeded (STARTTLS on port ${process.env.SMTP_PORT || 587})${reset}`);

    section('3. Sending a live test email');
    const testCode = String(Math.floor(100000 + Math.random() * 900000));
    const testUser = { email: recipient, fullName: 'Test User' };

    try {
        const result = await emailService.sendVerificationEmail(testUser, testCode);

        if (result.devMode) {
            console.log(`${red}✘ Sent in dev-mode fallback (SMTP not configured) - no real email was sent.${reset}`);
            process.exit(1);
        }

        console.log(`${green}✔ Email accepted by Gmail's SMTP server${reset}`);
        console.log(`  messageId: ${result.messageId}`);
        console.log(`  response:  ${result.response}`);
        console.log(`\n${cyan}Check ${recipient}'s inbox (and spam folder) for the OTP: ${bold}${testCode}${reset}`);
    } catch (error) {
        console.error(`${red}✘ Send FAILED${reset}`);
        console.error(`  message:       ${error.message}`);
        console.error(`  smtpCode:      ${error.smtpCode}`);
        console.error(`  smtpErrorCode: ${error.smtpErrorCode}`);
        process.exit(1);
    }

    section('Result');
    console.log(`${green}${bold}All checks passed - SMTP delivery is working end-to-end.${reset}\n`);
}

run();
