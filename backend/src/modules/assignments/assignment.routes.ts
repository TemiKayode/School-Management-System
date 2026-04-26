import { Router } from 'express';
import * as ctrl from './assignment.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.post('/', authorize('ADMIN', 'TEACHER'), ctrl.create);
router.get('/:id', ctrl.getOne);
router.put('/:id', authorize('ADMIN', 'TEACHER'), ctrl.update);
router.delete('/:id', authorize('ADMIN', 'TEACHER'), ctrl.remove);
router.post('/:id/submit', authorize('STUDENT'), ctrl.submit);
router.get('/:id/submissions', authorize('ADMIN', 'TEACHER'), ctrl.listSubmissions);
router.put('/:id/submissions/:subId/grade', authorize('ADMIN', 'TEACHER'), ctrl.gradeSubmission);

export default router;
