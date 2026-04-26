import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail({ to, subject, html, text }: EmailOptions) {
  if (process.env.NODE_ENV === 'test') return;
  await sgMail.send({
    to,
    from: process.env.EMAIL_FROM || 'noreply@school.com',
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ''),
  });
}

export async function sendSMS(to: string, body: string) {
  if (process.env.NODE_ENV === 'test') return;
  const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  await twilio.messages.create({ body, from: process.env.TWILIO_PHONE_NUMBER, to });
}
