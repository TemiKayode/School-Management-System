import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import { initSentry, setupSentryErrorHandler } from './utils/sentry';
import { gdprHeaders, auditConsent } from './middleware/gdpr';
import { metricsMiddleware, metricsHandler } from './utils/metrics';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';

// Routes
import authRoutes from './modules/auth/auth.routes';
import oauthRoutes from './modules/auth/oauth.routes';
import studentRoutes from './modules/students/student.routes';
import teacherRoutes from './modules/teachers/teacher.routes';
import classRoutes from './modules/classes/class.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import examRoutes from './modules/exams/exam.routes';
import feeRoutes from './modules/fees/fee.routes';
import assignmentRoutes from './modules/assignments/assignment.routes';
import timetableRoutes from './modules/timetable/timetable.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import libraryRoutes from './modules/library/library.routes';
import transportRoutes from './modules/transport/transport.routes';
import reportRoutes from './modules/reports/report.routes';
import messageRoutes from './modules/messages/message.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import announcementRoutes from './modules/announcements/announcement.routes';
import elearningRoutes from './modules/elearning/elearning.routes';
import parentRoutes from './modules/parent/parent.routes';
import pushRoutes from './modules/push/push.routes';
import gdprRoutes from './modules/gdpr/gdpr.routes';

const app = express();

// Sentry must be first
initSentry(app);

// Security headers (GDPR + helmet)
app.use(helmet({ contentSecurityPolicy: process.env.NODE_ENV === 'production' }));
app.use(gdprHeaders);
const allowedOrigins = [
  ...(process.env.FRONTEND_URL || 'http://localhost:3000').split(','),
  ...(process.env.MOBILE_ORIGIN ? [process.env.MOBILE_ORIGIN] : []),
  // always allow localhost variants in development
  ...(process.env.NODE_ENV !== 'production'
    ? ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://127.0.0.1:3000']
    : []),
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // allow requests with no origin (curl, mobile apps, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

// Body parsing & compression
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// HTTP cache headers — GET list/detail endpoints cache for 60s in browser, 2 min on CDN
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/v1/auth')) {
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
  } else {
    res.setHeader('Cache-Control', 'no-store');
  }
  next();
});

// Logging + metrics
app.use(morgan('combined'));
app.use(metricsMiddleware);
app.use(auditConsent);

// Health & metrics
app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/metrics', metricsHandler);

// API routes
const api = '/api/v1';
app.use(`${api}/auth`, authRoutes);
app.use(`${api}/auth/oauth`, oauthRoutes);
app.use(`${api}/students`, studentRoutes);
app.use(`${api}/teachers`, teacherRoutes);
app.use(`${api}/classes`, classRoutes);
app.use(`${api}/attendance`, attendanceRoutes);
app.use(`${api}/exams`, examRoutes);
app.use(`${api}/fees`, feeRoutes);
app.use(`${api}/assignments`, assignmentRoutes);
app.use(`${api}/timetable`, timetableRoutes);
app.use(`${api}/notifications`, notificationRoutes);
app.use(`${api}/push`, pushRoutes);
app.use(`${api}/library`, libraryRoutes);
app.use(`${api}/transport`, transportRoutes);
app.use(`${api}/reports`, reportRoutes);
app.use(`${api}/messages`, messageRoutes);
app.use(`${api}/dashboard`, dashboardRoutes);
app.use(`${api}/announcements`, announcementRoutes);
app.use(`${api}/elearning`, elearningRoutes);
app.use(`${api}/parent`, parentRoutes);
app.use(`${api}/gdpr`, gdprRoutes);

// Sentry v8 error handler (must be before custom error handler)
setupSentryErrorHandler(app);
app.use(notFound);
app.use(errorHandler);

export default app;
