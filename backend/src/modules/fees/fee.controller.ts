import { Response, NextFunction } from 'express';
import Stripe from 'stripe';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../../middleware/auth';
import prisma from '../../config/database';
import { sendSuccess, sendError } from '../../utils/apiResponse';
import { getIO } from '../../config/socket';
import {
  createPayPalOrder as ppCreate,
  capturePayPalOrder as ppCapture,
  initFlutterwavePayment,
  verifyFlutterwavePayment,
} from '../../utils/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

export async function list(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fees = await prisma.fee.findMany({ orderBy: { createdAt: 'desc' } });
    return sendSuccess(res, fees);
  } catch (err) { next(err); }
}

export async function create(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const fee = await prisma.fee.create({ data: req.body });
    return sendSuccess(res, fee, 'Fee structure created', 201);
  } catch (err) { next(err); }
}

export async function listPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await prisma.feePayment.findMany({
      include: { student: true, fee: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    return sendSuccess(res, payments);
  } catch (err) { next(err); }
}

export async function listMyPayments(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user!.id },
      select: { id: true },
    });
    if (!student) return sendSuccess(res, []);

    const payments = await prisma.feePayment.findMany({
      where: { studentId: student.id },
      include: { fee: true },
      orderBy: { createdAt: 'desc' },
    });
    return sendSuccess(res, payments);
  } catch (err) { next(err); }
}

export async function recordPayment(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { studentId, feeId, amount, method } = req.body;

    let stripePaymentIntentId: string | undefined;
    if (method === 'STRIPE') {
      const intent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: 'usd',
        metadata: { studentId, feeId },
      });
      stripePaymentIntentId = intent.id;
    }

    const payment = await prisma.feePayment.create({
      data: { studentId, feeId, amount, method, stripePaymentIntentId, status: method === 'STRIPE' ? 'PENDING' : 'PAID' },
      include: { student: true },
    });

    // Notify via socket
    getIO().to(`user:${studentId}`).emit('fee:payment', payment);

    return sendSuccess(res, payment, 'Payment recorded', 201);
  } catch (err) { next(err); }
}

export async function stripeWebhook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const sig = req.headers['stripe-signature'] as string;
    const event = stripe.webhooks.constructEvent(
      (req as any).rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await prisma.feePayment.updateMany({
        where: { stripePaymentIntentId: intent.id },
        data: { status: 'PAID' },
      });
    }

    return res.json({ received: true });
  } catch (err) { next(err); }
}

// ─── PayPal ──────────────────────────────────────────────────────────────────

export async function createPayPalOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { studentId, feeId, amount } = req.body;
    const order = await ppCreate(amount, 'USD', { studentId, feeId });

    await prisma.feePayment.create({
      data: { studentId, feeId, amount, method: 'PAYPAL', paypalOrderId: order.id, status: 'PENDING' },
    });

    const approvalUrl = order.links.find((l: any) => l.rel === 'approve')?.href;
    return sendSuccess(res, { orderId: order.id, approvalUrl });
  } catch (err) { next(err); }
}

export async function capturePayPalOrder(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.body;
    const result = await ppCapture(orderId);

    if (result.status === 'COMPLETED') {
      await prisma.feePayment.updateMany({ where: { paypalOrderId: orderId }, data: { status: 'PAID' } });
      return sendSuccess(res, { status: 'PAID' }, 'Payment captured');
    }

    return sendError(res, 'Payment not completed', 402);
  } catch (err) { next(err); }
}

export async function paypalWebhook(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { event_type, resource } = req.body;
    if (event_type === 'CHECKOUT.ORDER.APPROVED') {
      await prisma.feePayment.updateMany({
        where: { paypalOrderId: resource.id },
        data: { status: 'PAID' },
      });
    }
    return res.json({ received: true });
  } catch (err) { next(err); }
}

// ─── Flutterwave ─────────────────────────────────────────────────────────────

export async function initFlutterwave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { studentId, feeId, amount, currency = 'NGN', email, name, phone } = req.body;
    const txRef = `SMS-${uuidv4()}`;

    const result = await initFlutterwavePayment({
      amount, currency, email, name, phone, txRef,
      redirectUrl: `${process.env.FRONTEND_URL}/fees/verify?ref=${txRef}`,
      meta: { studentId, feeId },
    });

    await prisma.feePayment.create({
      data: { studentId, feeId, amount, method: 'FLUTTERWAVE', flutterwaveRef: txRef, status: 'PENDING' },
    });

    return sendSuccess(res, { paymentLink: result.link, txRef });
  } catch (err) { next(err); }
}

export async function verifyFlutterwave(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const { transactionId } = req.query as { transactionId: string };
    const result = await verifyFlutterwavePayment(transactionId);

    if (result.status === 'successful') {
      const meta = result.meta;
      await prisma.feePayment.updateMany({
        where: { flutterwaveRef: result.tx_ref },
        data: { status: 'PAID', transactionRef: transactionId },
      });
      return sendSuccess(res, { status: 'PAID' }, 'Payment verified');
    }

    return sendError(res, 'Payment not successful', 402);
  } catch (err) { next(err); }
}

export async function getStatement(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const payments = await prisma.feePayment.findMany({
      where: { studentId: req.params.studentId },
      include: { fee: true },
      orderBy: { createdAt: 'desc' },
    });
    const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
    const totalPending = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
    return sendSuccess(res, { payments, totalPaid, totalPending });
  } catch (err) { next(err); }
}
