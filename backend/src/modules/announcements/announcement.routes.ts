import { Router } from 'express';
import * as ctrl from './announcement.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'TEACHER'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', authorize('ADMIN', 'TEACHER'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);
router.post('/:id/pin', authorize('ADMIN'), ctrl.togglePin);

export default router;
