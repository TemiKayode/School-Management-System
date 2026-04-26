export interface NotificationJob {
  type: 'announcement' | 'fee_reminder' | 'attendance_alert' | 'grade_published' | 'assignment_due' | 'custom';
  channel: 'email' | 'sms' | 'push';
  recipient: {
    userId?: string;
    email?: string;
    phone?: string;
    pushEndpoint?: string;
    pushP256dh?: string;
    pushAuth?: string;
  };
  payload: {
    title: string;
    body: string;
    url?: string;
    data?: Record<string, unknown>;
  };
  scheduledAt?: string; // ISO date — for future use with delayed jobs
}
