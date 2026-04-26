import { Router } from 'express';
import * as ctrl from './dashboard.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/teacher', ctrl.getTeacherStats);
router.get('/', ctrl.getStats);

export default router;
