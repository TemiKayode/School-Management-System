import { Router } from 'express';
import * as ctrl from './class.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/my', ctrl.listMy);
router.get('/', ctrl.list);
router.post('/', authorize('ADMIN'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', authorize('ADMIN'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);
router.get('/:id/students', ctrl.getStudents);
router.get('/:id/timetable', ctrl.getTimetable);
router.get('/:id/subjects', ctrl.getSubjects);

export default router;
