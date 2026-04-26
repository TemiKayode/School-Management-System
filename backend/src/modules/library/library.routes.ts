import { Router } from 'express';
import * as ctrl from './library.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/books', ctrl.listBooks);
router.post('/books', authorize('ADMIN'), ctrl.addBook);
router.put('/books/:id', authorize('ADMIN'), ctrl.updateBook);
router.post('/borrow', authorize('ADMIN', 'TEACHER'), ctrl.borrowBook);
router.post('/return/:id', authorize('ADMIN', 'TEACHER'), ctrl.returnBook);
router.get('/borrowings', ctrl.listBorrowings);

export default router;
