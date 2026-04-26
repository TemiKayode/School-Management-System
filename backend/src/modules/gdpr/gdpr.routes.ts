import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import { exportMyData, deleteMyData } from '../../middleware/gdpr';

const router = Router();
router.use(authenticate);

router.get('/export', exportMyData);
router.delete('/erase', deleteMyData);

export default router;
