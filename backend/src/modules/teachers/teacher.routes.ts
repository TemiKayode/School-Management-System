import { Router } from 'express';
import * as ctrl from './teacher.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/stats', authorize('ADMIN'), ctrl.getStats);
router.get('/', authorize('ADMIN'), ctrl.list);
router.post('/', authorize('ADMIN'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', authorize('ADMIN'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);
router.get('/:id/classes', ctrl.getClasses);
router.get('/:id/timetable', ctrl.getTimetable);

export default router;
