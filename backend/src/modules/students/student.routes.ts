import { Router } from 'express';
import * as ctrl from './student.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', authorize('ADMIN', 'TEACHER'), ctrl.list);
router.post('/', authorize('ADMIN', 'TEACHER'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', authorize('ADMIN'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);
router.get('/:id/grades', ctrl.getGrades);
router.get('/:id/attendance', ctrl.getAttendance);
router.get('/:id/fees', ctrl.getFees);
router.get('/:id/assignments', ctrl.getAssignments);

export default router;
