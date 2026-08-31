import fs from 'fs/promises';
import path from 'path';
import nodemailer from 'nodemailer';
import MailComposer from 'nodemailer/lib/mail-composer/index.js';
import { ImapFlow } from 'imapflow';

const EMAIL_SUBJECT = 'Introducing Storefindy — An Affordable Store Locator for Your Website';

let cachedHtml = null;

async function getEmailHtml() {
    if (cachedHtml) return cachedHtml;

    const templatePath = path.join(process.cwd(), 'public', 'email-template.html');
    let html = await fs.readFile(templatePath, 'utf8');
    html = html.replace(/\s*```\s*$/, '').trim();

    cachedHtml = html;
    return html;
}

function getCredentials() {
    const user = process.env.SUPPORT_EMAIL;
    const pass = process.env.SUPPORT_EMAIL_PASSWORD;

    if (!user || !pass) {
        throw new Error('Support email credentials are not configured.');
    }

    return { user, pass };
}

function getSmtpConfig() {
    const { user, pass } = getCredentials();

    return {
        host: process.env.SUPPORT_SMTP_HOST || 'smtpout.secureserver.net',
        port: Number(process.env.SUPPORT_SMTP_PORT || 465),
        secure: process.env.SUPPORT_SMTP_SECURE !== 'false',
        auth: { user, pass },
    };
}

function getImapConfig() {
    const { user, pass } = getCredentials();

    return {
        host: process.env.SUPPORT_IMAP_HOST || 'imap.secureserver.net',
        port: Number(process.env.SUPPORT_IMAP_PORT || 993),
        secure: true,
        auth: { user, pass },
        logger: false,
    };
}

function buildRawMessage(mailOptions) {
    return new Promise((resolve, reject) => {
        const composer = new MailComposer(mailOptions);
        composer.compile().build((error, message) => {
            if (error) reject(error);
            else resolve(message);
        });
    });
}

async function appendToSentFolder(rawMessage) {
    const sentFolder = process.env.SUPPORT_IMAP_SENT_FOLDER || 'Sent';
    const client = new ImapFlow(getImapConfig());

    try {
        await client.connect();
        await client.append(sentFolder, rawMessage, ['\\Seen']);
    } finally {
        await client.logout();
    }
}

export async function sendSupportEmail(to) {
    const from = process.env.SUPPORT_EMAIL;
    const html = await getEmailHtml();

    const mailOptions = {
        from: `"Storefindy Support" <${from}>`,
        to,
        subject: EMAIL_SUBJECT,
        html,
        replyTo: from,
    };

    const rawMessage = await buildRawMessage(mailOptions);
    const transporter = nodemailer.createTransport(getSmtpConfig());

    await transporter.sendMail(mailOptions);
    await appendToSentFolder(rawMessage);
}
