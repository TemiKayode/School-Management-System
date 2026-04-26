import { Router } from 'express';
import * as ctrl from './push.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.post('/subscribe', ctrl.subscribe);
router.delete('/unsubscribe', ctrl.unsubscribe);
router.post('/send', authorize('ADMIN'), ctrl.sendPush);
router.get('/vapid-key', ctrl.getVapidKey);

export default router;
