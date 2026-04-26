import twilio from 'twilio';
import { NotificationJob } from '../types';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

export async function sendSMSNotification(job: NotificationJob) {
  const { phone } = job.recipient;
  if (!phone) throw new Error('Missing recipient phone');

  await client.messages.create({
    body: `${job.payload.title}: ${job.payload.body}`,
    from: process.env.TWILIO_PHONE_NUMBER!,
    to: phone,
  });
}
