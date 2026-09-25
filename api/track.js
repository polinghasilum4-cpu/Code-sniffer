const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const ua = req.headers['user-agent'] || 'unknown';
    const referer = req.headers['referer'] || req.headers['referrer'] || 'direct';
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
            || req.headers['x-real-ip']
            || 'unknown';
    const country = req.headers['x-vercel-ip-country'] || '?';
    const region  = req.headers['x-vercel-ip-country-region'] || '?';
    const city    = req.headers['x-vercel-ip-city'] || '?';
    const lang    = req.headers['accept-language'] || '?';
    const body    = req.body || {};

    // Parse device info dari UA
    const uaLower = ua.toLowerCase();
    let device = 'desktop';
    let os = 'unknown';
    let browser = 'unknown';

    if (/mobile|android|iphone|ipod/.test(uaLower)) device = 'mobile';
    if (/ipad|tablet/.test(uaLower)) device = 'tablet';

    if (/windows/.test(uaLower)) os = 'Windows';
    else if (/android/.test(uaLower)) os = 'Android';
    else if (/iphone|ipad|ios/.test(uaLower)) os = 'iOS';
    else if (/mac os/.test(uaLower)) os = 'macOS';
    else if (/linux/.test(uaLower)) os = 'Linux';

    if (/edg\//.test(uaLower)) browser = 'Edge';
    else if (/opr\/|opera/.test(uaLower)) browser = 'Opera';
    else if (/chrome/.test(uaLower)) browser = 'Chrome';
    else if (/firefox/.test(uaLower)) browser = 'Firefox';
    else if (/safari/.test(uaLower)) browser = 'Safari';

    const entry = {
      ts: Date.now(),
      iso: new Date().toISOString(),
      ip,
      country,
      region,
      city,
      referer,
      lang,
      device,
      os,
      browser,
      userAgent: ua,
      path: body.path || '/',
      screen: body.screen || null,
      tz: body.tz || null,
    };

    // Simpan tiap visitor jadi file JSON sendiri
    const filename = `visitors/${entry.ts}-${Math.random().toString(36).slice(2, 8)}.json`;
    await put(filename, JSON.stringify(entry, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[track] Error:', e);
    res.status(500).json({ error: e.message });
  }
};