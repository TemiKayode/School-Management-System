import { Router } from 'express';
import * as ctrl from './parent.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate, authorize('PARENT', 'ADMIN'));

router.get('/children', ctrl.getChildren);
router.get('/children/:studentId/overview', ctrl.getChildOverview);
router.get('/children/:studentId/attendance', ctrl.getChildAttendance);
router.get('/children/:studentId/grades', ctrl.getChildGrades);
router.get('/children/:studentId/fees', ctrl.getChildFees);
router.get('/children/:studentId/assignments', ctrl.getChildAssignments);
router.get('/children/:studentId/timetable', ctrl.getChildTimetable);

export default router;
