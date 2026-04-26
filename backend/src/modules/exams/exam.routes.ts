import { Router } from 'express';
import * as ctrl from './exam.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/my-results', ctrl.getMyResults);
router.post('/', authorize('ADMIN', 'TEACHER'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', authorize('ADMIN', 'TEACHER'), ctrl.update);
router.delete('/:id', authorize('ADMIN'), ctrl.remove);
router.post('/:id/results', authorize('ADMIN', 'TEACHER'), ctrl.addResults);
router.get('/:id/results', ctrl.getResults);
router.get('/:id/report-card', ctrl.generateReportCard);

export default router;
