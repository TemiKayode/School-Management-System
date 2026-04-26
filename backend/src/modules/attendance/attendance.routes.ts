import { Router } from 'express';
import * as ctrl from './attendance.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'TEACHER'), ctrl.markBulk);
router.get('/summary', ctrl.summary);
router.put('/:id', authorize('ADMIN', 'TEACHER'), ctrl.update);

export default router;
