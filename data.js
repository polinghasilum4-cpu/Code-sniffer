window.SNIPPET_DATA = [
  {
    id: 'sn_dl_tiktok',
    title: 'TikTok Downloader — tikwm.com API',
    description: 'Ambil video TikTok tanpa watermark via tikwm.com. Support photo slideshow & audio terpisah.',
    language: 'javascript',
    tags: ['tiktok', 'downloader', 'api', 'scraper'],
    filename: 'tiktok-dl.js',
    code: `async function tiktokDl(url) {
  const res = await fetch(
    'https://www.tikwm.com/api/?url=' +
    encodeURIComponent(url) +
    '&count=12&cursor=0&web=1&hd=1',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Origin': 'https://www.tikwm.com',
        'Referer': 'https://www.tikwm.com/'
      }
    }
  );
  const json = await res.json();
  const data = json.data;
  if (!data) throw new Error('Gagal ambil data TikTok');

  let mediaData = [];
  if (data.duration == 0) {
    // Photo slideshow
    data.images.forEach(v => mediaData.push({ type: 'photo', url: v }));
  } else {
    // Video — 3 varian
    mediaData.push(
      { type: 'watermark', url: 'https://www.tikwm.com' + (data.wmplay || '') },
      { type: 'nowatermark', url: 'https://www.tikwm.com' + (data.play || '') },
      { type: 'nowatermark_hd', url: 'https://www.tikwm.com' + (data.hdplay || '') }
    );
  }

  return {
    title: data.title,
    taken_at: data.create_time,
    region: data.region,
    duration: data.duration,
    data: mediaData,
    music_info: {
      title: data.music_info?.title,
      author: data.music_info?.author,
      url: 'https://www.tikwm.com' + (data.music || data.music_info?.play || '')
    },
    stats: {
      views: data.play_count,
      likes: data.digg_count,
      comment: data.comment_count,
      share: data.share_count
    },
    author: {
      nickname: data.author?.nickname,
      fullname: data.author?.unique_id
    }
  };
}

// Usage
const info = await tiktokDl('https://vt.tiktok.com/ZSqvqv9rR/');
const videoUrl = info.data.find(e => e.type === 'nowatermark_hd').url;
console.log(videoUrl);`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 1,
    views: 3400
  },

  {
    id: 'sn_dl_instagram',
    title: 'Instagram Downloader — Vercel API',
    description: 'Download reels/foto Instagram via API Vercel sendiri. Auto-refresh token, support CORS.',
    language: 'javascript',
    tags: ['instagram', 'downloader', 'api', 'vercel'],
    filename: 'instagram-dl.js',
    code: `// ============================================================
// CLIENT SIDE — panggil API Vercel lu sendiri
// ============================================================
async function instagramDl(igUrl) {
  const apiUrl =
    'https://api-instagram-five.vercel.app/api/v2/instagram?url=' +
    encodeURIComponent(igUrl);

  const res = await fetch(apiUrl, {
    signal: AbortSignal.timeout(60000)
  });
  const result = await res.json();

  if (!result.status || !result.data) {
    throw new Error(result.error || 'Gagal ambil data Instagram');
  }

  const info = result.data;
  const resources = info.resources || [];
  if (!resources.length) throw new Error('Tidak ada media ditemukan');

  // Prioritas video mp4
  const video = resources.find(r => r.format === 'mp4');
  const chosen = video || resources[0];
  const ext = chosen.format || 'mp4';

  return {
    title: (info.title || 'Instagram Media').trim().slice(0, 100),
    likes: info.like_count || 0,
    comments: info.comment_count || 0,
    mediaUrl: chosen.download_url,
    ext: ext,
    isVideo: ext === 'mp4'
  };
}

// ============================================================
// SERVER SIDE — Vercel API route (api/v2/instagram.js)
// ============================================================
/*
const UA = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36';
const BASE = 'https://savefromins.com';
const TOKEN = '20250901majwlqo';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const igUrl = req.query.url;
  if (!igUrl) return res.status(400).json({ error: 'url wajib' });

  try {
    const body = new URLSearchParams({
      auth: TOKEN,
      domain: 'api-ak.savefromins.com',
      origin: 'source',
      link: igUrl
    });

    const r = await fetch(
      'https://api.savefromins.com/api/contentsite_api/media/parse',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          'origin': BASE,
          'referer': BASE + '/',
          'user-agent': UA
        },
        body: body.toString(),
        signal: AbortSignal.timeout(7000)
      }
    );

    const data = await r.json();
    if (data.status_code !== 'success') {
      return res.status(502).json({ error: 'parse failed' });
    }

    const info = data.data;
    let resources = info.resources || [];
    if (!resources.length && Array.isArray(info.media)) {
      for (const m of info.media) {
        if (Array.isArray(m.resources)) resources.push(...m.resources);
      }
    }

    const mapped = resources
      .filter(x => x.download_url && x.download_url.startsWith('http'))
      .map(x => ({
        download_url: x.download_url,
        format: (x.format || '').toLowerCase() ||
                (x.download_url.includes('.mp4') ? 'mp4' : 'jpg')
      }));

    mapped.sort((a, b) => (b.format === 'mp4' ? 1 : -1));

    res.status(200).json({
      status: true,
      data: {
        title: (info.title || 'Instagram Media').slice(0, 120),
        like_count: info.like_count || 0,
        comment_count: info.comment_count || 0,
        resources: mapped
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
*/`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 1,
    views: 2800
  },

  {
    id: 'sn_dl_youtube',
    title: 'YouTube Downloader — ytultra API',
    description: 'Download video/audio YouTube via api.ytultra.com. Support pilih kualitas MP4 & audio M4A.',
    language: 'javascript',
    tags: ['youtube', 'downloader', 'api', 'ytultra'],
    filename: 'youtube-dl.js',
    code: `async function youtubeDl(videoUrl, type = 'video') {
  const res = await fetch(
    'https://api.ytultra.com/ikool/youtube/download',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'origin': 'https://www.ytultra.com',
        'referer': 'https://www.ytultra.com/'
      },
      body: JSON.stringify({ url: videoUrl })
    }
  );

  const data = await res.json();
  if (data.code !== '0000' || !data.data) {
    throw new Error(data.msg || 'Gagal ambil data YouTube');
  }

  const info = data.data;
  const medias = info.medias || [];
  if (!medias.length) throw new Error('Format media tidak ditemukan');

  let selectedMedia;
  if (type === 'audio') {
    // Cari format m4a/audio
    selectedMedia =
      medias.find(m =>
        (m.format || '').includes('.m4a') ||
        (m.format || '').includes('audio')
      ) || medias[medias.length - 1];
  } else {
    // Cari format mp4
    selectedMedia =
      medias.find(m => (m.format || '').includes('mp4')) || medias[0];
  }

  if (!selectedMedia?.url) {
    throw new Error('Link unduhan tidak tersedia');
  }

  return {
    title: info.title,
    duration: info.duration
      ? Math.floor(info.duration / 60) + 'm ' +
        (info.duration % 60) + 's'
      : '?',
    format: selectedMedia.format,
    downloadUrl: selectedMedia.url
  };
}

// Usage
const video = await youtubeDl('https://youtu.be/jm9jkUmhrWU', 'video');
const audio = await youtubeDl('https://youtu.be/jm9jkUmhrWU', 'audio');
console.log('Video:', video.downloadUrl);
console.log('Audio:', audio.downloadUrl);`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 2,
    views: 1900
  },

  {
    id: 'sn_dl_soundcloud',
    title: 'SoundCloud Downloader — Vercel API',
    description: 'Download lagu SoundCloud via API Vercel sendiri. Client + server code included.',
    language: 'javascript',
    tags: ['soundcloud', 'downloader', 'api', 'vercel'],
    filename: 'soundcloud-dl.js',
    code: `// ============================================================
// CLIENT SIDE — panggil API Vercel
// ============================================================
async function soundcloudDl(scUrl) {
  if (!scUrl.includes('soundcloud.com')) {
    throw new Error('URL SoundCloud tidak valid');
  }

  const apiUrl =
    'https://api-soundcloud.vercel.app/api/v2/soundcloud?url=' +
    encodeURIComponent(scUrl);

  const res = await fetch(apiUrl);
  const data = await res.json();

  if (!data || !data.status || !data.data) {
    throw new Error('Gagal ambil data SoundCloud');
  }

  const info = data.data;
  return {
    title: info.title || 'soundcloud',
    author: 'SoundCloud',
    thumbnail: info.thumbnail || '',
    sizeMb: info.format || '-',
    duration: info.duration || '?',
    downloadUrl: info.downloadUrl,
    ext: info.ext || 'mp3'
  };
}

// ============================================================
// SERVER SIDE — Vercel API route (api/v2/soundcloud.js)
// ============================================================
/*
const HEADERS = {
  'accept': '*/*',
  'content-type': 'application/json',
  'origin': 'https://scload.com',
  'referer': 'https://scload.com/',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.query.url;
  if (!url) return res.status(400).json({ error: 'url wajib' });

  try {
    const r = await fetch('https://api.toolenium.com/v1/info', {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({ url })
    });

    const data = await r.json();
    if (!data || !data.formats || !data.formats.length) {
      return res.status(502).json({ error: 'Gagal ambil info' });
    }

    const fmt = data.formats[0];
    res.status(200).json({
      status: true,
      data: {
        title: data.title,
        duration: data.duration,
        thumbnail: data.thumbnail,
        format: fmt.format_id,
        ext: fmt.audio_ext || 'mp3',
        downloadUrl: fmt.url
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
*/`,
    favorite: false,
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 3,
    views: 1400
  },

  {
    id: 'sn_dl_spotify',
    title: 'Spotify Downloader — Vercel API',
    description: 'Download lagu Spotify MP3 via API Vercel sendiri. 3-step: info → get-id → download.',
    language: 'javascript',
    tags: ['spotify', 'downloader', 'api', 'vercel'],
    filename: 'spotify-dl.js',
    code: `// ============================================================
// CLIENT SIDE — panggil API Vercel
// ============================================================
async function spotifyDl(input) {
  const apiUrl =
    'https://api-spotify-tawny.vercel.app/api/v2/spotify?url=' +
    encodeURIComponent(input);

  const res = await fetch(apiUrl, {
    signal: AbortSignal.timeout(60000)
  });
  const data = await res.json();

  if (!data || !data.status || !data.data) {
    throw new Error(data.error || 'Gagal ambil data Spotify');
  }

  const d = data.data;
  return {
    title: d.title || 'Spotify Song',
    author: d.artist || 'Unknown Artist',
    thumbnail: d.thumbnail || '',
    sizeMb: (d.format || 'MP3').toUpperCase(),
    duration: d.duration || '?',
    downloadUrl: d.downloadUrl,
    ext: d.ext || 'mp3'
  };
}

// ============================================================
// SERVER SIDE — Vercel API route (api/v2/spotify.js)
// ============================================================
/*
const SAVER_HEADERS = {
  'accept': '*/*',
  'referer': 'https://spotsaver.net/results/',
  'origin': 'https://spotsaver.net',
  'content-type': 'application/json',
  'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
};

function extractTrackId(url) {
  const clean = String(url).split('?')[0].split('#')[0];
  const patterns = [
    /track\\/([a-zA-Z0-9]{22})/,
    /track\\/([a-zA-Z0-9]+)/,
    /spotify:track:([a-zA-Z0-9]+)/
  ];
  for (const p of patterns) {
    const m = clean.match(p);
    if (m) return m[1];
  }
  return null;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const spotifyUrl = req.query.url;
  const trackId = extractTrackId(spotifyUrl);
  if (!trackId) return res.status(400).json({ error: 'URL tidak valid' });

  try {
    // Step 1 — info track
    const infoRes = await fetch(
      'https://spotsaver.net/api/spotify/?url=' +
      encodeURIComponent('https://open.spotify.com/track/' + trackId),
      { headers: SAVER_HEADERS }
    );
    const infoData = await infoRes.json();
    const track = (infoData.items || [])[0];
    if (!track) throw new Error('Track tidak ditemukan');

    // Step 2 — cari YouTube video ID
    const idRes = await fetch('https://spotsaver.net/api/get-id/', {
      method: 'POST',
      headers: SAVER_HEADERS,
      body: JSON.stringify({
        title: track.title,
        artist: track.artist
      })
    });
    const idData = await idRes.json();
    const videoId = idData.videoId;
    const candidateIds = idData.candidateIds || [];
    if (!videoId) throw new Error('Gagal match di YouTube');

    // Step 3 — minta link download
    const dlRes = await fetch('https://spotsaver.net/api/download/', {
      method: 'POST',
      headers: SAVER_HEADERS,
      body: JSON.stringify({
        videoId,
        candidateIds,
        format: 'mp3',
        title: track.title + ' - ' + track.artist
      })
    });
    const dlData = await dlRes.json();
    const downloadUrl =
      dlData.downloadUrl || dlData.url || dlData.fileUrl;

    res.status(200).json({
      status: true,
      data: {
        title: track.title,
        artist: track.artist,
        thumbnail: track.thumbnail,
        duration: track.duration,
        format: 'mp3',
        ext: 'mp3',
        downloadUrl
      }
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
*/`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 1,
    views: 2200
  },

  {
    id: 'sn_dl_vercel_pkg',
    title: 'Vercel API — package.json & vercel.json',
    description: 'Config dasar buat deploy API downloader ke Vercel. Set region Singapore biar deket Indonesia.',
    language: 'json',
    tags: ['vercel', 'config', 'deploy', 'api'],
    filename: 'vercel-config.json',
    code: `// ============================================================
// package.json
// ============================================================
{
  "name": "api-downloader",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": "20.x" }
}

// ============================================================
// vercel.json — Region sin1 = Singapore (Hobby plan)
// ============================================================
{
  "version": 2,
  "regions": ["sin1"],
  "functions": {
    "api/**/*.js": {
      "memory": 1024,
      "maxDuration": 10
    }
  }
}

// ============================================================
// CATATAN:
// - Region "cgk1" (Jakarta) = PRO plan only, gak bisa di Hobby
// - "sin1" (Singapore) paling deket buat Indonesia
// - maxDuration: 10 = limit Hobby plan
// - Naikin ke 30-60 kalau upgrade ke Pro
// ============================================================`,
    favorite: false,
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000 * 1,
    views: 890
  },

  {
    id: 'sn_scraper_patterns',
    title: 'Scraper API Protection Patterns',
    description: 'Pola proteksi API yang sering ketemu saat scraping. Cheat sheet buat tau cara bypass.',
    language: 'javascript',
    tags: ['scraping', 'security', 'reference'],
    filename: 'api-protections.js',
    code: `// ============================================================
// POLA PROTEKSI API YANG SERING KETEMU
// ============================================================

/**
 * 1. HMAC SIGNATURE (paling umum)
 * ---------------------------------
 * Contoh field: _s, k_token, x-hmac-signature
 * 
 * Dibuat dari: HMAC-SHA256(secret, payload)
 * secret di-obfuscate di bundle JS
 * 
 * Solusi: Reverse-engineer JS / pakai Playwright
 */

/**
 * 2. CLOUDFLARE TURNSTILE
 * ------------------------
 * Contoh field: cf-turnstile-response, cftoken
 * 
 * Token di-issue Cloudflare, expired ~5 menit
 * Harus solved via browser atau captcha solver
 * 
 * Solusi: 2Captcha / CapSolver (berbayar) 
 *         atau Playwright (gratis, lambat)
 */

/**
 * 3. CSRF TOKEN + BROWSER FINGERPRINT
 * ------------------------------------
 * Contoh header: x-csrf-token, x-browser-fp
 * 
 * Token di-issue server setelah sesi valid
 * Fingerprint di-generate dari browser API
 * 
 * Solusi: Hampir mustahil tanpa browser asli
 */

/**
 * 4. STATIC TOKEN (paling gampang)
 * ---------------------------------
 * Contoh field: auth, api_key
 * 
 * Token di-hardcode di JS bundle
 * Bisa di-scrape otomatis
 * 
 * Solusi: Scrape dari bundle JS + cache
 */

/**
 * 5. CORS HEADER
 * ---------------
 * Server gak set Access-Control-Allow-Origin
 * Browser block request dari domain lain
 * 
 * Solusi: Proxy via backend sendiri (Vercel/Railway)
 */

/**
 * 6. IP BLOCK (datacenter)
 * -------------------------
 * Savefromins block IP Vercel/AWS
 * 
 * Solusi: Proxy Indonesia / region cgk1 (Pro plan)
 */

// ============================================================
// PRIORITAS SAAT SCRAPING:
// 1. Cari API yang gak ada proteksi (paling ideal)
// 2. Kalau ada, pakai library siap pakai (yt-dlp, ultra-igdl)
// 3. Kalau gak ada, scrape token statis
// 4. Fallback terakhir: Playwright / proxy
// ============================================================`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 1,
    views: 1531
  },

  {
    id: 'voice-changer_AI',
    title: 'Voice Changer AI',
    description: 'Tukar suara jadi suara orang via voice changer AI. Support 31 voice beda aksen (US/UK/AU).',
    language: 'javascript',
    tags: ['voicechanger', 'AI', 'api', 'murf'],
    filename: 'voicechanger.js',
    code: `/**
 * Voice Changer API — Murf.ai
 * 
 * POST /api/v2/voice-changer
 * Content-Type: multipart/form-data
 * Fields:
 *   - file      : audio file (max 3 menit / 180 detik)
 *   - voice_id  : voice ID dari list (default: en-US-natalie)
 */

const axios = require('axios');
const FormData = require('form-data');
const { formidable } = require('formidable');
const fs = require('fs');

module.exports.config = {
    api: { bodyParser: false, sizeLimit: '25mb' },
    maxDuration: 60,
};

const MURF_URL = 'https://api.murf.ai/v1/speech-to-speech/anonymous';

const VALID_VOICES = [
    'en-US-natalie','en-US-marcus','en-US-terrell','en-US-ariana','en-US-miles',
    'en-US-zion','en-US-amara','en-US-cooper','en-US-iris','en-US-daisy',
    'en-US-julia','en-US-daniel','en-US-ronnie','en-US-michelle','en-US-phoebe',
    'en-US-caleb','en-US-charlotte','en-US-dylan','en-US-lucas','en-US-edmund',
    'en-US-wayne','en-US-samantha','en-UK-benedict','en-UK-freddie','en-UK-hazel',
    'en-UK-hugo','en-UK-juliet','en-UK-ruby','en-AU-harper','en-AU-ivy','en-AU-jimm',
];

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Max-Age', '86400');
    if (req.method === 'OPTIONS') return res.status(204).end();

    if (req.method === 'GET') {
        return res.json({
            success: true,
            info: 'Voice Changer API — Murf.ai',
            usage: 'POST multipart with field "file" + optional "voice_id"',
            maxDuration: '180 seconds',
            voices: VALID_VOICES,
        });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ success: false, error: 'POST only' });
    }

    const startedAt = Date.now();

    try {
        // Parse multipart
        const form = formidable({
            maxFileSize: 25 * 1024 * 1024,
            multiples: false,
            filter: (part) => {
                return part.mimetype?.startsWith('audio/') ||
                       part.mimetype === 'application/octet-stream' ||
                       !part.mimetype;
            },
        });

        const { fields, files } = await new Promise((resolve, reject) => {
            form.parse(req, (err, fields, files) => {
                if (err) return reject(err);
                resolve({ fields, files });
            });
        });

        const fileField = files.file || files.audio || files.upload;
        const file = Array.isArray(fileField) ? fileField[0] : fileField;
        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Butuh file audio. Field: "file"',
            });
        }

        const voiceIdField = fields.voice_id || fields.voiceId || fields.voice;
        const voiceId = Array.isArray(voiceIdField) ? voiceIdField[0] : (voiceIdField || 'en-US-natalie');

        const buffer = fs.readFileSync(file.filepath);
        const filename = file.originalFilename || 'audio.mp3';
        const mimetype = file.mimetype || 'audio/mpeg';

        console.log('[vc] ' + filename + ' (' + (buffer.length / 1024).toFixed(1) + ' KB) voice=' + voiceId);

        // Forward ke Murf
        const murfForm = new FormData();
        murfForm.append('file', buffer, { filename, contentType: mimetype });
        murfForm.append('voice_id', voiceId);
        murfForm.append('format', 'MP3');
        murfForm.append('channel_type', 'MONO');

        const murfRes = await axios.post(MURF_URL, murfForm, {
            headers: {
                ...murfForm.getHeaders(),
                'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 ' +
                              '(KHTML, like Gecko) Chrome/153.0.0.0 Mobile Safari/537.36',
                'accept': 'application/json',
                'origin': 'https://murf.ai',
                'referer': 'https://murf.ai/',
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 55000,
            validateStatus: () => true,
        });

        console.log('[vc] Murf HTTP ' + murfRes.status);

        if (murfRes.status !== 200) {
            const errMsg = murfRes.data?.error_message ||
                           murfRes.data?.error ||
                           ('HTTP ' + murfRes.status);
            return res.status(500).json({
                success: false,
                error: errMsg,
                elapsedMs: Date.now() - startedAt,
            });
        }

        const data = murfRes.data;
        const audioUrl = data.audio_file;
        if (!audioUrl) {
            return res.status(500).json({
                success: false,
                error: 'Gak dapet audio_file dari Murf',
                raw: data,
            });
        }

        // Fetch audio buat preview base64
        let outputDataUrl = null;
        try {
            const dl = await axios.get(audioUrl, {
                responseType: 'arraybuffer',
                timeout: 30000,
                maxContentLength: Infinity,
            });
            const audioBuf = Buffer.from(dl.data);
            const ct = dl.headers['content-type'] || 'audio/wav';
            outputDataUrl = 'data:' + ct + ';base64,' + audioBuf.toString('base64');
        } catch (e) {
            console.log('[vc] fetch preview gagal: ' + e.message);
        }

        return res.json({
            success: true,
            data: {
                audioUrl,
                outputDataUrl,
                voiceId,
                filename,
                originalSize: buffer.length,
                elapsedMs: Date.now() - startedAt,
            },
        });
    } catch (err) {
        console.error('[vc]', err.message);
        return res.status(500).json({
            success: false,
            error: err.message || 'Voice changer gagal',
            elapsedMs: Date.now() - startedAt,
        });
    }
};
`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now(),
    views: 3.657
  },

  {
    id: 'sn_ai_faceswap',
    title: 'Face Swap AI — Remaker.ai via Vercel API',
    description: 'Tukar wajah 2 gambar via Remaker.ai. Client compress otomatis + server handle multipart upload, polling job, dan base64 output (bypass CDN protection).',
    language: 'javascript',
    tags: ['faceswap', 'ai', 'remaker', 'vercel', 'api'],
    filename: 'faceswap.js',
    code: `// ============================================================
// CLIENT SIDE — auto-compress + upload ke API Vercel
// ============================================================
async function faceSwap(sourceFile, targetFile) {
  // 1. Auto-compress biar gak kena limit Vercel 4.5 MB
  const [srcC, tgtC] = await Promise.all([
    compressImage(sourceFile),
    compressImage(targetFile),
  ]);

  // 2. Kirim ke API sebagai multipart
  const fd = new FormData();
  fd.append('source', srcC);
  fd.append('target', tgtC);

  const res = await fetch(
    'https://api-soundcloud.vercel.app/api/v2/faceswap',
    { method: 'POST', body: fd }
  );
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Face swap gagal');
  }
  return json.data;
}

function compressImage(file, maxDim = 1280, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob], 'compressed.jpg', { type: 'image/jpeg' }));
      }, 'image/jpeg', quality);
    };
    img.onerror = () => reject(new Error('Gagal load gambar'));
    img.src = url;
  });
}

// Usage
const result = await faceSwap(sourceInput.files[0], targetInput.files[0]);
document.querySelector('#preview').src =
  result.outputDataUrl || result.outputUrls[0];

// ============================================================
// SERVER SIDE — Vercel API route (api/v2/faceswap.js)
// ============================================================
/*
const axios = require('axios');
const FormData = require('form-data');
const { Readable } = require('stream');
const { formidable } = require('formidable');
const fs = require('fs');

module.exports.config = {
  api: { bodyParser: false, sizeLimit: '25mb' },
  maxDuration: 60,
};

const BASE_URL = 'https://api.remaker.ai';
const PRODUCT_CODE = '067003';
const PRODUCT_SERIAL = 'd0556055c62201b80a956de9c4ad7d37';
const MODEL_VERSION = '2';

function makeHeaders(extra = {}) {
  return Object.assign({
    'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
    'origin': 'https://remaker.ai',
    'referer': 'https://remaker.ai/',
    'product-code': PRODUCT_CODE,
    'product-serial': PRODUCT_SERIAL,
    'authorization': '',
  }, extra);
}

// CREATE JOB — multipart file upload (bukan URL!)
async function createJob(targetBuffer, swapBuffer) {
  const form = new FormData();
  form.append('target_image', Readable.from(targetBuffer), {
    filename: 'target.jpg', contentType: 'image/jpeg',
  });
  form.append('swap_image', Readable.from(swapBuffer), {
    filename: 'source.jpg', contentType: 'image/jpeg',
  });
  form.append('version', MODEL_VERSION); // WAJIB ada

  const res = await axios.post(
    BASE_URL + '/api/pai/v3/ai-facevary/appapi/create-job',
    form,
    {
      headers: Object.assign({}, form.getHeaders(), makeHeaders()),
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 60000,
    }
  );

  const data = res.data;
  if (data.code !== 100000 || !data.result?.job_id) {
    throw new Error('create-job gagal: ' + JSON.stringify(data).slice(0, 200));
  }
  return data.result.job_id;
}

// POLLING — 100002 & 300006 = masih proses
async function waitForJob(jobId, maxWaitMs = 55000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    await new Promise(r => setTimeout(r, 4000));
    const res = await axios.get(
      BASE_URL + '/api/pai/v3/ai-facevary/appapi/get-job/' + jobId,
      { headers: makeHeaders(), timeout: 30000 }
    );
    const d = res.data;
    const urls = d.result?.output_image_url;
    const msg = d.message?.en || '';

    if (urls && urls.length > 0) return urls;
    if (d.code === 100002 || d.code === 300006) continue;
    if (d.code === 100000 && !urls) continue;

    if (msg.includes('failed') || msg.includes('no face')) {
      throw new Error('Job gagal: ' + msg);
    }
    throw new Error('Job error (code ' + d.code + '): ' + msg);
  }
  throw new Error('Timeout ' + maxWaitMs + 'ms');
}

// FETCH OUTPUT — CDN Remaker blok hotlink, jadi fetch pakai Referer
async function fetchOutputAsDataUrl(url) {
  const res = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
    headers: {
      'Referer': 'https://remaker.ai/',
      'Origin': 'https://remaker.ai',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  const buf = Buffer.from(res.data);
  const ct = res.headers['content-type'] || 'image/png';
  return 'data:' + ct + ';base64,' + buf.toString('base64');
}

async function faceSwap(sourceBuffer, targetBuffer) {
  const jobId = await createJob(targetBuffer, sourceBuffer);
  const outputUrls = await waitForJob(jobId);
  const outputDataUrl = await fetchOutputAsDataUrl(outputUrls[0]);
  return { jobId, outputUrls, outputDataUrl };
}

// HANDLER
module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'POST only' });
  }

  try {
    const form = formidable({ maxFileSize: 15 * 1024 * 1024 });
    const { files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) return reject(err);
        resolve({ fields, files });
      });
    });

    const source = files.source ? fs.readFileSync(files.source[0].filepath) : null;
    const target = files.target ? fs.readFileSync(files.target[0].filepath) : null;
    if (!source || !target) {
      return res.status(400).json({ success: false, error: 'Butuh source + target' });
    }

    const result = await faceSwap(source, target);
    return res.json({
      success: true,
      data: {
        jobId: result.jobId,
        outputUrls: result.outputUrls,
        outputDataUrl: result.outputDataUrl,
      },
    });
  } catch (err) {
    console.error('[faceswap]', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
};
*/

// ============================================================
// CATATAN PENTING:
// 1. create-job TERIMA FILE LANGSUNG (multipart), bukan URL!
//    Field: target_image + swap_image + version='2'
// 2. Code 100002 & 300006 = MASIH PROSES, lanjut polling
// 3. Product-serial fixed: d0556055c62201b80a956de9c4ad7d37
// 4. CDN Remaker (cdn.rmimgs.com) BLOK hotlink — server
//    harus fetch hasil pakai Referer: https://remaker.ai/
//    lalu convert ke base64
// 5. Client WAJIB compress gambar < 4.5 MB total (limit Vercel)
// 6. maxDuration: 60s = limit Hobby plan Vercel
// ============================================================`,
    favorite: true,
    createdAt: Date.now() - 86400000 * 1,
    updatedAt: Date.now(),
    views: 2.813
  }
];
