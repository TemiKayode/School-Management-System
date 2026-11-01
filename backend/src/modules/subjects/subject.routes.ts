import { Router } from 'express';
import * as ctrl from './subject.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', authorize('ADMIN'), ctrl.create);

export default router;
