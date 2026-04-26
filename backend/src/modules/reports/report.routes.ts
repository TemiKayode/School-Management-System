import { Router } from 'express';
import * as ctrl from './report.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate, authorize('ADMIN', 'TEACHER'));

router.get('/academic', ctrl.academicReport);
router.get('/attendance', ctrl.attendanceReport);
router.get('/financial', ctrl.financialReport);

export default router;
