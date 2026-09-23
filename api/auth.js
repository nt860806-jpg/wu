import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const COOKIE = 'site_session';
const maxAge = 60 * 60 * 24 * 7;

function sign(value, secret) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => {
    const index = part.indexOf('=');
    return index < 0 ? ['', ''] : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function readSession(req, secret) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token) return null;
  const [payload, supplied] = token.split('.');
  if (!payload || !supplied) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.exp > Date.now() ? session : null;
  } catch { return null; }
}

function writeSession(res, session, secret) {
  const payload = Buffer.from(JSON.stringify({ ...session, exp: Date.now() + maxAge * 1000 })).toString('base64url');
  const token = `${payload}.${sign(payload, secret)}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).json({ error: '不支援的請求' });
  const config = process.env.AUTH_USERS_JSON;
  if (!config) return res.status(503).json({ error: '登入服務尚未完成設定' });
  const secret = config;

  const session = readSession(req, secret);
  if (req.method === 'GET') {
    return res.status(200).json({ authenticated: !!session, user: session ? { email: session.email, role: session.role } : null });
  }

  const action = req.query.action;
  if (action === 'logout') {
    res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return res.status(200).json({ authenticated: false });
  }
  if (action === 'switch') {
    if (!session) return res.status(401).json({ error: '請先使用授權帳號登入' });
    const role = session.role === 'admin' ? 'fan' : 'admin';
    writeSession(res, { email: session.email, role }, secret);
    return res.status(200).json({ authenticated: true, user: { email: session.email, role } });
  }
  if (action !== 'login') return res.status(404).json({ error: '找不到此操作' });

  const { email = '', password = '' } = req.body || {};
  let accounts;
  try { accounts = JSON.parse(config); } catch { return res.status(503).json({ error: '登入服務設定錯誤' }); }
  const account = accounts.find((item) => item.email.toLowerCase() === String(email).trim().toLowerCase());
  const candidate = createHmac('sha256', secret).update(String(password)).digest('hex');
  const expected = createHmac('sha256', secret).update(account?.password || randomBytes(32)).digest('hex');
  const a = Buffer.from(candidate, 'hex');
  const b = Buffer.from(expected, 'hex');
  if (!account || a.length !== b.length || !timingSafeEqual(a, b)) return res.status(401).json({ error: '電子信箱或密碼不正確' });

  writeSession(res, { email: account.email, role: 'fan' }, secret);
  return res.status(200).json({ authenticated: true, user: { email: account.email, role: 'fan' } });
}
