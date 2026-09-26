/* ============================================================
   tracker.js — kirim data visitor ke /api/track
   Hasil: 1 file JSON per visitor di Vercel Blob
   File: visitors/{timestamp}-{random}.json
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Skip kondisi ---------- */
  // Jangan track kalau lagi admin mode
  try {
    const adminExp = parseInt(localStorage.getItem('sv_admin_exp') || '0', 10);
    if (adminExp > Date.now()) return;
  } catch {}

  // Jangan track 2x di session yang sama
  try {
    if (sessionStorage.getItem('sv_tracked') === '1') return;
  } catch {}

  // Skip bot / headless / lighthouse
  const ua = navigator.userAgent || '';
  if (/bot|crawler|spider|headless|lighthouse|pagespeed|prerender/i.test(ua)) return;

  /* ---------- Kumpulin data ---------- */
  const payload = {
    // Halaman & navigation
    path: location.pathname + location.hash,
    url: location.href,
    referer: document.referrer || null,
    title: document.title,

    // Device info (client-side)
    screen: `${screen.width}x${screen.height}`,
    viewport: `${innerWidth}x${innerHeight}`,
    pixelRatio: window.devicePixelRatio || 1,
    colorDepth: screen.colorDepth || null,
    touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
    platform: navigator.platform || null,
    language: navigator.language || null,
    languages: navigator.languages || null,
    timezone: (() => {
      try { return Intl.DateTimeFormat().resolvedOptions().timeZone; }
      catch { return null; }
    })(),
    timezoneOffset: new Date().getTimezoneOffset(),

    // Performance & connection
    connection: navigator.connection ? {
      effectiveType: navigator.connection.effectiveType || null,
      downlink: navigator.connection.downlink || null,
      rtt: navigator.connection.rtt || null,
    } : null,

    // Hardware
    cores: navigator.hardwareConcurrency || null,
    memory: navigator.deviceMemory || null,

    // Preferences
    cookiesEnabled: navigator.cookieEnabled,
    doNotTrack: navigator.doNotTrack === '1',
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',

    // Session
    sessionStart: Date.now(),
    clientTs: new Date().toISOString(),
  };

  /* ---------- Kirim ---------- */
  const send = () => {
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((r) => {
        if (r.ok) {
          try { sessionStorage.setItem('sv_tracked', '1'); } catch {}
        }
      })
      .catch(() => { /* silent */ });
  };

  // Kirim saat idle biar gak ganggu load
  if ('requestIdleCallback' in window) {
    requestIdleCallback(send, { timeout: 3000 });
  } else {
    setTimeout(send, 1500);
  }
})();