import { Router } from 'express';
import * as ctrl from './transport.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listRoutes);
router.post('/', authorize('ADMIN'), ctrl.createRoute);
router.put('/:id', authorize('ADMIN'), ctrl.updateRoute);
router.get('/routes', ctrl.listRoutes);
router.post('/routes', authorize('ADMIN'), ctrl.createRoute);
router.put('/routes/:id', authorize('ADMIN'), ctrl.updateRoute);
router.post('/routes/:id/assign', authorize('ADMIN'), ctrl.assignStudent);

export default router;
