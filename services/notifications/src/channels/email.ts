import sgMail from '@sendgrid/mail';
import { NotificationJob } from '../types';

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmailNotification(job: NotificationJob) {
  const { email } = job.recipient;
  if (!email) throw new Error('Missing recipient email');

  await sgMail.send({
    to: email,
    from: process.env.EMAIL_FROM || 'noreply@school.com',
    subject: job.payload.title,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px">
        <div style="background:#2563eb;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px">
          <h2 style="color:#fff;margin:0">${job.payload.title}</h2>
        </div>
        <p style="color:#374151;font-size:15px;line-height:1.6">${job.payload.body}</p>
        ${job.payload.url ? `<a href="${job.payload.url}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px">View Details</a>` : ''}
        <p style="color:#9ca3af;font-size:12px;margin-top:32px">School Management System · Do not reply to this email</p>
      </div>
    `,
  });
}
