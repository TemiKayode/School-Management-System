import { Router } from 'express';
import * as ctrl from './fee.controller';
import { authenticate } from '../../middleware/auth';
import { authorize } from '../../middleware/rbac';

const router = Router();
router.use(authenticate);

router.get('/', ctrl.list);
router.get('/my', ctrl.listMyPayments);
router.post('/', authorize('ADMIN'), ctrl.create);
router.get('/payments', ctrl.listPayments);
router.post('/payments', ctrl.recordPayment);
router.post('/payments/stripe-webhook', ctrl.stripeWebhook);
router.post('/payments/paypal/create', ctrl.createPayPalOrder);
router.post('/payments/paypal/capture', ctrl.capturePayPalOrder);
router.post('/payments/paypal/webhook', ctrl.paypalWebhook);
router.post('/payments/flutterwave/init', ctrl.initFlutterwave);
router.get('/payments/flutterwave/verify', ctrl.verifyFlutterwave);
router.get('/payments/:studentId/statement', ctrl.getStatement);

export default router;
