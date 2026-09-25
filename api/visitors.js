const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // Password protection
  const pwd = req.query.pwd;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'xs0ciety';
  if (pwd !== ADMIN_PASSWORD) {
    return res.status(401).json({
      error: 'Unauthorized. Tambahin ?pwd=PASSWORD di URL'
    });
  }

  try {
    const { blobs } = await list({ prefix: 'visitors/', limit: 1000 });

    // Sort dari terbaru
    const sorted = blobs.sort((a, b) => b.pathname.localeCompare(a.pathname));

    const limit = Math.min(parseInt(req.query.limit || '200', 10), 1000);
    const limited = sorted.slice(0, limit);

    // Fetch semua paralel
    const results = await Promise.all(
      limited.map(async (b) => {
        try {
          const r = await fetch(b.url);
          return await r.json();
        } catch { return null; }
      })
    );

    const entries = results.filter(Boolean);

    // Statistik ringkas
    const stats = {
      total: blobs.length,
      byDevice: {},
      byOS: {},
      byBrowser: {},
      byCountry: {},
      uniqueIPs: new Set(),
    };

    entries.forEach(v => {
      stats.byDevice[v.device] = (stats.byDevice[v.device] || 0) + 1;
      stats.byOS[v.os] = (stats.byOS[v.os] || 0) + 1;
      stats.byBrowser[v.browser] = (stats.byBrowser[v.browser] || 0) + 1;
      stats.byCountry[v.country] = (stats.byCountry[v.country] || 0) + 1;
      stats.uniqueIPs.add(v.ip);
    });
    stats.uniqueIPs = stats.uniqueIPs.size;

    res.status(200).json({
      stats,
      returned: entries.length,
      visitors: entries,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};