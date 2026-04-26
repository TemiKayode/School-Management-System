import axios from 'axios';
import logger from './logger';

// ─── PayPal ───────────────────────────────────────────────────────────────────

const PP_BASE = process.env.PAYPAL_ENV === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalToken(): Promise<string> {
  const res = await axios.post(
    `${PP_BASE}/v1/oauth2/token`,
    'grant_type=client_credentials',
    {
      auth: { username: process.env.PAYPAL_CLIENT_ID!, password: process.env.PAYPAL_CLIENT_SECRET! },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }
  );
  return res.data.access_token;
}

export async function createPayPalOrder(amount: number, currency = 'USD', metadata: Record<string, string> = {}) {
  const token = await getPayPalToken();
  const res = await axios.post(
    `${PP_BASE}/v2/checkout/orders`,
    {
      intent: 'CAPTURE',
      purchase_units: [{ amount: { currency_code: currency, value: amount.toFixed(2) }, custom_id: JSON.stringify(metadata) }],
    },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data; // { id, status, links }
}

export async function capturePayPalOrder(orderId: string) {
  const token = await getPayPalToken();
  const res = await axios.post(
    `${PP_BASE}/v2/checkout/orders/${orderId}/capture`,
    {},
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
  );
  return res.data;
}

// ─── Flutterwave (Mobile Money / Card) ────────────────────────────────────────

const FW_BASE = 'https://api.flutterwave.com/v3';
const FW_KEY = process.env.FLUTTERWAVE_SECRET_KEY!;

export async function initFlutterwavePayment(opts: {
  amount: number;
  currency: string;
  email: string;
  name: string;
  phone?: string;
  txRef: string;
  redirectUrl: string;
  meta?: Record<string, string>;
}) {
  const res = await axios.post(
    `${FW_BASE}/payments`,
    {
      tx_ref: opts.txRef,
      amount: opts.amount,
      currency: opts.currency,
      redirect_url: opts.redirectUrl,
      customer: { email: opts.email, name: opts.name, phonenumber: opts.phone },
      meta: opts.meta,
      customizations: { title: 'School Fee Payment', logo: process.env.SCHOOL_LOGO_URL },
    },
    { headers: { Authorization: `Bearer ${FW_KEY}` } }
  );
  return res.data.data; // { link } — redirect user to this URL
}

export async function verifyFlutterwavePayment(transactionId: string) {
  const res = await axios.get(`${FW_BASE}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${FW_KEY}` },
  });
  return res.data.data; // { status: 'successful' | 'failed', ... }
}
