(() => {
  'use strict';

  /* ============================================================
     ADMIN CONFIG — ganti password di sini
     ============================================================ */
  const ADMIN_PASSWORD = 'xs0ciety-whoami';        // ← ganti password lu
  const ADMIN_TTL = 24 * 60 * 60 * 1000;    // 24 jam
  const ADMIN_KEY = 'sv_admin_exp';

  /* ============================================================
     PERF
     ============================================================ */
  const PERF = (() => {
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isSmallScreen = window.innerWidth < 768;
    let level = 'high';
    if (prefersReduced || cores <= 2 || mem <= 2) level = 'low';
    else if (isMobile || isSmallScreen || cores <= 4) level = 'medium';
    document.body.dataset.perf = level;
    return { level, isMobile, isSmallScreen, prefersReduced };
  })();

  /* ============================================================
     STORAGE
     ============================================================ */
  const STORAGE = {
    KEY: 'snippet_vault_v1',
    load() {
      try { const raw = localStorage.getItem(this.KEY); return raw ? JSON.parse(raw) : null; }
      catch { return null; }
    },
    save(data) {
      try { localStorage.setItem(this.KEY, JSON.stringify(data)); return true; }
      catch { return false; }
    },
    loadAdminExp() {
      try { return parseInt(localStorage.getItem(ADMIN_KEY) || '0', 10); }
      catch { return 0; }
    },
    saveAdminExp(ts) {
      try { localStorage.setItem(ADMIN_KEY, String(ts)); } catch {}
    },
    clearAdmin() {
      try { localStorage.removeItem(ADMIN_KEY); } catch {}
    }
  };

  /* ============================================================
     STATE
     ============================================================ */
  const state = {
    snippets: [],
    filtered: [],
    activeLang: 'all',
    query: '',
    favoritesOnly: false,
    route: '/',
    currentDetailId: null,
    searchFocusIdx: -1,
    searchResults: [],
    _initialized: false,
    isAdmin: STORAGE.loadAdminExp() > Date.now()
  };

  const LANG_META = {
    javascript: { label: 'JavaScript', icon: '🟨' },
    html:       { label: 'HTML',       icon: '🟧' },
    css:        { label: 'CSS',        icon: '🟦' },
    python:     { label: 'Python',     icon: '🐍' },
    php:        { label: 'PHP',        icon: '🐘' },
    json:       { label: 'JSON',       icon: '📦' },
    bash:       { label: 'Bash',       icon: '⌨️' },
    other:      { label: 'Other',      icon: '📄' }
  };

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const uid = () => 'sn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const timeAgo = (ts) => {
    const d = Date.now() - ts;
    const m = 60000, h = 60 * m, day = 24 * h;
    if (d < m) return 'baru aja';
    if (d < h) return Math.floor(d / m) + ' menit lalu';
    if (d < day) return Math.floor(d / h) + ' jam lalu';
    if (d < 30 * day) return Math.floor(d / day) + ' hari lalu';
    return new Date(ts).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };
  const debounce = (fn, w = 200) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), w); }; };

  /* ============================================================
     ADMIN
     ============================================================ */
  function applyAdminVisibility() {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.hidden = !state.isAdmin;
    });
    const badge = document.getElementById('adminBadge');
    if (badge) badge.hidden = !state.isAdmin;
    const panel = document.getElementById('adminPanel');
    if (panel) panel.hidden = !state.isAdmin;
  }

  async function unlockAdmin() {
    const pwd = prompt('🔒 Masukkan password admin:');
    if (pwd === null) return false;
    if (pwd === ADMIN_PASSWORD) {
      state.isAdmin = true;
      STORAGE.saveAdminExp(Date.now() + ADMIN_TTL);
      // Seed localStorage dari data.js kalau belum ada
      Store.init();
      Toast.show('✓ Admin mode aktif', 'success');
      location.hash = '#/';
      applyAdminVisibility();
      Router.navigate();
      return true;
    } else {
      Toast.show('✕ Password salah', 'error');
      location.hash = '#/';
      return false;
    }
  }

  function lockAdmin() {
    if (!confirm('Keluar dari admin mode?')) return;
    state.isAdmin = false;
    STORAGE.clearAdmin();
    Toast.show('Admin mode dimatikan', 'info');
    location.hash = '#/';
    Store.init();
    applyAdminVisibility();
    Router.navigate();
  }

  function exportJSON() {
    const clean = state.snippets.map(s => ({
      id: s.id,
      title: s.title,
      description: s.description,
      language: s.language,
      tags: s.tags,
      filename: s.filename,
      code: s.code,
      favorite: s.favorite,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      views: s.views
    }));
    const json = 'window.SNIPPET_DATA = ' + JSON.stringify(clean, null, 2) + ';';
    navigator.clipboard.writeText(json).then(() => {
      Toast.show('✓ JSON dicopy! Paste ke data.js di GitHub', 'success', 4000);
    }).catch(() => {
      // Fallback: download file
      const blob = new Blob([json], { type: 'application/javascript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'data.js';
      document.body.appendChild(a);
      a.click();
      a.remove();
      Toast.show('✓ File data.js didownload', 'success');
    });
  }

  function resetToDefault() {
    if (!confirm('Reset semua snippet ke versi data.js?\nSemua perubahan local akan hilang.')) return;
    STORAGE.save({ snippets: JSON.parse(JSON.stringify(window.SNIPPET_DATA || [])) });
    Toast.show('✓ Reset ke data.js', 'success');
    Store.init();
    Router.navigate();
  }

  /* ============================================================
     HIGHLIGHT
     ============================================================ */
  const HIGHLIGHT = (() => {
    const KW = {
      javascript: ['const','let','var','function','return','if','else','for','while','class','new','async','await','try','catch','throw','import','export','from','default','typeof','instanceof','this','null','undefined','true','false'],
      python: ['def','class','return','if','elif','else','for','while','in','not','and','or','import','from','as','with','try','except','finally','raise','yield','lambda','pass','None','True','False','async','await'],
      php: ['function','class','return','if','else','elseif','foreach','for','while','echo','print','new','public','private','protected','static','use','namespace','try','catch','throw','null','true','false'],
      bash: ['if','then','else','elif','fi','for','while','do','done','case','esac','function','echo','exit','return','export','local','readonly'],
      json: ['true','false','null'],
      css: [], html: [], other: []
    };
    const esc = (s) => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    function tokenize(code, lang) {
      return code.split('\n').map(line => {
        let out = esc(line);
        if (['javascript', 'css', 'php', 'other'].includes(lang)) out = out.replace(/(\/\/[^\n]*)/g, '<span class="tok-cm">$1</span>');
        if (['python', 'bash'].includes(lang)) out = out.replace(/(#[^\n]*)/g, '<span class="tok-cm">$1</span>');
        out = out.replace(/('[^']*?'|"[^"]*?")/g, '<span class="tok-str">$1</span>');
        const kws = KW[lang] || [];
        if (kws.length) out = out.replace(new RegExp('\\b(' + kws.join('|') + ')\\b', 'g'), '<span class="tok-kw">$1</span>');
        out = out.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="tok-num">$1</span>');
        return out;
      });
    }
    return { tokenize };
  })();

  /* ============================================================
     STORE
     — Admin: pakai localStorage (bisa edit/create/delete)
     — Visitor: SELALU dari data.js (read-only)
     ============================================================ */
  const Store = {
    init() {
      if (state.isAdmin) {
        const saved = STORAGE.load();
        if (saved && Array.isArray(saved.snippets) && saved.snippets.length) {
          state.snippets = saved.snippets;
        } else {
          state.snippets = window.SNIPPET_DATA ? JSON.parse(JSON.stringify(window.SNIPPET_DATA)) : [];
          this.persist();
        }
      } else {
        // Visitor — selalu fresh dari data.js
        state.snippets = window.SNIPPET_DATA ? JSON.parse(JSON.stringify(window.SNIPPET_DATA)) : [];
      }
    },
    persist() {
      if (!state.isAdmin) return false;
      return STORAGE.save({ snippets: state.snippets });
    },
    get(id) { return state.snippets.find(s => s.id === id) || null; },
    add(data) {
      if (!state.isAdmin) return null;
      const now = Date.now();
      const s = {
        id: uid(), title: data.title.trim(),
        description: (data.description || '').trim(),
        language: data.language || 'other', tags: data.tags || [],
        code: data.code,
        filename: (data.filename || '').trim() || defaultFilename(data.title, data.language),
        favorite: false, createdAt: now, updatedAt: now, views: 0
      };
      state.snippets.unshift(s);
      this.persist();
      return s;
    },
    update(id, data) {
      if (!state.isAdmin) return null;
      const i = state.snippets.findIndex(s => s.id === id);
      if (i < 0) return null;
      const s = state.snippets[i];
      state.snippets[i] = { ...s, ...data, title: data.title?.trim() || s.title, description: data.description?.trim() ?? s.description, tags: data.tags ?? s.tags, updatedAt: Date.now() };
      this.persist();
      return state.snippets[i];
    },
    remove(id) {
      if (!state.isAdmin) return;
      state.snippets = state.snippets.filter(s => s.id !== id);
      this.persist();
    },
    toggleFav(id) {
      const s = this.get(id);
      if (!s) return;
      s.favorite = !s.favorite;
      this.persist();
      return s.favorite;
    },
    incrementViews(id) { const s = this.get(id); if (s) { s.views = (s.views || 0) + 1; if (state.isAdmin) this.persist(); } }
  };

  function defaultFilename(title, lang) {
    const ext = { javascript: 'js', html: 'html', css: 'css', python: 'py', php: 'php', json: 'json', bash: 'sh', other: 'txt' }[lang] || 'txt';
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) || 'snippet';
    return base + '.' + ext;
  }

  /* ============================================================
     FILTER
     ============================================================ */
  const Filter = {
    apply() {
      const q = state.query.trim().toLowerCase();
      let list = state.snippets.slice();
      if (state.favoritesOnly) list = list.filter(s => s.favorite);
      if (state.activeLang !== 'all') list = list.filter(s => s.language === state.activeLang);
      if (q) list = list.filter(s =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.language.toLowerCase().includes(q) ||
        s.tags.some(t => t.toLowerCase().includes(q))
      );
      state.filtered = list;
      return list;
    },
    quickSearch(q) {
      const query = q.trim().toLowerCase();
      if (!query) return [];
      return state.snippets.filter(s =>
        s.title.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.language.toLowerCase().includes(query) ||
        s.tags.some(t => t.toLowerCase().includes(query)) ||
        s.code.toLowerCase().includes(query)
      ).slice(0, 8);
    }
  };

  /* ============================================================
     TOAST
     ============================================================ */
  const Toast = {
    show(msg, type = 'info', dur = 2400) {
      const stack = $('#toastStack');
      const el = document.createElement('div');
      el.className = 'toast';
      el.dataset.type = type;
      const icons = { success: '✓', error: '✕', info: 'ℹ' };
      el.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span><span>' + escapeHtml(msg) + '</span>';
      stack.appendChild(el);
      setTimeout(() => { el.classList.add('is-out'); setTimeout(() => el.remove(), 260); }, dur);
    }
  };

  /* ============================================================
     RENDER
     ============================================================ */
  const Render = {
    card(s, index = 0) {
      const lang = LANG_META[s.language] || LANG_META.other;
      const preview = s.code.split('\n').slice(0, 4).join('\n');
      const hi = HIGHLIGHT.tokenize(preview, s.language).join('\n');
      return '<article class="snippet-card card-reveal" data-id="' + s.id + '" data-lang="' + s.language + '" data-idx="' + index + '">' +
        '<div class="card-head">' +
          '<span class="lang-badge" data-lang="' + s.language + '">' + lang.icon + ' ' + lang.label + '</span>' +
          '<button class="fav-btn ' + (s.favorite ? 'is-fav' : '') + '" data-action="fav" data-id="' + s.id + '" aria-label="Favorite">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>' +
          '</button>' +
        '</div>' +
        '<h3 class="card-title">' + escapeHtml(s.title) + '</h3>' +
        '<p class="card-desc">' + escapeHtml(s.description || 'Tanpa deskripsi.') + '</p>' +
        '<div class="card-code"><pre>' + hi + '</pre></div>' +
        (s.tags.length ? '<div class="card-tags">' + s.tags.map(t => '<span class="tag">#' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
        '<div class="card-foot">' +
          '<span class="card-meta">' + timeAgo(s.updatedAt) + ' · ' + (s.views || 0) + ' views</span>' +
          '<div class="card-actions">' +
            '<button class="icon-btn" data-action="copy" data-id="' + s.id + '" aria-label="Copy code">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
            '</button>' +
            '<button class="icon-btn" data-action="view" data-id="' + s.id + '" aria-label="View detail">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</article>';
    },

    emptyState(container, { icon, title, text, action }) {
      const showAction = action && state.isAdmin;
      container.innerHTML = '<div class="state-block">' +
        '<div class="state-icon">' + icon + '</div>' +
        '<h3>' + escapeHtml(title) + '</h3>' +
        '<p>' + escapeHtml(text) + '</p>' +
        (showAction ? '<button class="btn btn-primary" data-action="' + action + '">+ Create Snippet</button>' : '') +
      '</div>';
    },

    homeGrid() {
      const grid = $('#homeGrid');
      if (!grid) return;
      const latest = state.snippets.slice(0, 6);
      if (!latest.length) return this.emptyState(grid, { icon: '✨', title: 'Vault masih kosong', text: 'Belum ada snippet.', action: 'create' });
      grid.innerHTML = latest.map((s, i) => this.card(s, i)).join('');
      Interactions.observeReveal(grid);
      applyAdminVisibility();
    },

    snippetGrid() {
      const grid = $('#snippetGrid');
      const stateEl = $('#snippetState');
      if (!grid || !stateEl) return;
      const list = Filter.apply();
      if (!list.length) {
        grid.innerHTML = '';
        const searching = state.query || state.activeLang !== 'all' || state.favoritesOnly;
        stateEl.hidden = false;
        stateEl.innerHTML = '<div class="state-block">' +
          '<div class="state-icon">' + (searching ? '🔍' : '📭') + '</div>' +
          '<h3>' + (searching ? 'Gak ketemu' : 'Belum ada snippet') + '</h3>' +
          '<p>' + (searching ? 'Coba kata kunci lain atau reset filter.' : 'Belum ada snippet.') + '</p>' +
          (searching ? '<button class="btn btn-ghost" data-action="reset-filter">Reset Filter</button>' : '') +
        '</div>';
        applyAdminVisibility();
        return;
      }
      stateEl.hidden = true;
      grid.innerHTML = list.map((s, i) => this.card(s, i)).join('');
      Interactions.observeReveal(grid);
      applyAdminVisibility();
    },

    filterBar() {
      const bar = $('#filterBar');
      if (!bar) return;
      const langs = ['all', ...Object.keys(LANG_META)];
      let html = langs.map(l => {
        const meta = LANG_META[l];
        const label = l === 'all' ? 'All' : meta.icon + ' ' + meta.label;
        return '<button class="chip ' + (state.activeLang === l ? 'is-active' : '') + '" data-lang="' + l + '">' + label + '</button>';
      }).join('');
      html += '<button class="chip ' + (state.favoritesOnly ? 'is-active' : '') + '" data-fav="1">⭐ Favorites</button>';
      bar.innerHTML = html;
    },

    catGrid() {
      const grid = $('#catGrid');
      if (!grid) return;
      const counts = {};
      state.snippets.forEach(s => counts[s.language] = (counts[s.language] || 0) + 1);
      grid.innerHTML = Object.entries(LANG_META).map(([k, m]) => {
        const c = counts[k] || 0;
        return '<div class="cat-card" data-cat="' + k + '">' +
          '<div class="cat-icon">' + m.icon + '</div>' +
          '<div class="cat-name">' + m.label + '</div>' +
          '<div class="cat-count">' + c + ' snippet' + (c !== 1 ? 's' : '') + '</div>' +
        '</div>';
      }).join('');
    },

    stats() {
      const total = state.snippets.length;
      const langs = new Set(state.snippets.map(s => s.language)).size;
      const favs = state.snippets.filter(s => s.favorite).length;
      const views = state.snippets.reduce((sum, s) => sum + (s.views || 0), 0);
      const setNum = (key, val) => {
        const el = document.querySelector('[data-stat="' + key + '"]');
        if (!el) return;
        const t0 = performance.now();
        const step = (now) => {
          const p = Math.min((now - t0) / 800, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(val * eased).toLocaleString('id-ID');
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      setNum('total', total);
      setNum('languages', langs);
      setNum('favorites', favs);
      setNum('views', views);
    },

    detail(s) {
      const lang = LANG_META[s.language] || LANG_META.other;
      const lines = HIGHLIGHT.tokenize(s.code, s.language);
      const codeHtml = lines.map((line, i) =>
        '<div class="code-line"><span class="ln">' + (i + 1) + '</span><span class="lc">' + (line || ' ') + '</span></div>'
      ).join('');

      const adminActions = state.isAdmin
        ? '<button class="btn btn-ghost" data-action="detail-edit" data-id="' + s.id + '">Edit</button>' +
          '<button class="btn btn-danger" data-action="detail-delete" data-id="' + s.id + '">Hapus</button>'
        : '';

      return '<div class="detail-head">' +
          '<div class="detail-meta">' +
            '<span class="lang-badge" data-lang="' + s.language + '">' + lang.icon + ' ' + lang.label + '</span>' +
            '<span class="card-meta">' + timeAgo(s.updatedAt) + ' · ' + (s.views || 0) + ' views</span>' +
          '</div>' +
          '<h1 class="detail-title">' + escapeHtml(s.title) + '</h1>' +
          (s.description ? '<p class="detail-desc">' + escapeHtml(s.description) + '</p>' : '') +
          (s.tags.length ? '<div class="detail-tags">' + s.tags.map(t => '<span class="tag">#' + escapeHtml(t) + '</span>').join('') + '</div>' : '') +
        '</div>' +
        '<div class="detail-actions">' +
          '<button class="btn btn-primary" data-action="detail-copy" data-id="' + s.id + '">Copy Code</button>' +
          '<button class="btn btn-ghost" data-action="detail-download" data-id="' + s.id + '">Download</button>' +
          adminActions +
        '</div>' +
        '<div class="code-block">' +
          '<div class="code-head">' +
            '<span class="file-name">' +
              '<span class="dots"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></span>' +
              escapeHtml(s.filename) +
            '</span>' +
            '<span>' + s.code.split('\n').length + ' lines</span>' +
          '</div>' +
          '<div class="code-body"><pre>' + codeHtml + '</pre></div>' +
        '</div>';
    }
  };

  /* ============================================================
     ROUTER
     ============================================================ */
  const Router = {
    parse() {
      const hash = window.location.hash.replace(/^#/, '') || '/';
      if (hash.startsWith('/detail/')) return { path: '/detail', id: hash.slice(8) };
      return { path: hash, id: null };
    },
    navigate() {
      const { path, id } = this.parse();

      // Admin route
      if (path === '/admin') {
        if (state.isAdmin) lockAdmin();
        else unlockAdmin();
        return;
      }

      state.route = path;
      $$('.nav-link, .mobile-link').forEach(a => a.classList.toggle('is-active', a.dataset.route === path));
      $$('.view').forEach(v => v.classList.remove('is-active'));

      if (path === '/detail' && id) {
        const s = Store.get(id);
        if (!s) { Toast.show('Snippet gak ketemu', 'error'); location.hash = '#/snippets'; return; }
        Store.incrementViews(id);
        state.currentDetailId = id;
        $('#detailContent').innerHTML = Render.detail(s);
        $('.view-detail').classList.add('is-active');
        window.scrollTo({ top: 0, behavior: 'instant' });
        applyAdminVisibility();
        return;
      }

      const map = { '/': 'home', '/snippets': 'snippets', '/categories': 'categories', '/about': 'about' };
      const view = map[path] || 'home';
      const el = document.querySelector('.view[data-view="' + view + '"]');
      if (el) el.classList.add('is-active');

      if (view === 'home') { Render.homeGrid(); Render.stats(); }
      else if (view === 'snippets') { Render.filterBar(); Render.snippetGrid(); }
      else if (view === 'categories') { Render.catGrid(); }

      if (state._initialized) window.scrollTo({ top: 0, behavior: 'smooth' });
      state._initialized = true;
      applyAdminVisibility();
    }
  };

  /* ============================================================
     INTERACTIONS
     ============================================================ */
  const Interactions = {
    _revealObserver: null,

    init() {
      this.initRipple();
      this.initCardDelegation();
      this.initToolbar();
      this.initModals();
      this.initSearchOverlay();
      this.initMobileMenu();
      this.initKeyboard();
      this.initGlobalDelegation();
      this.initScrollGuard();
      this.initAdminPanel();
    },

    initAdminPanel() {
      const badge = document.getElementById('adminBadge');
      badge?.addEventListener('click', () => lockAdmin());

      const exportBtn = document.getElementById('adminExport');
      exportBtn?.addEventListener('click', () => exportJSON());

      const resetBtn = document.getElementById('adminReset');
      resetBtn?.addEventListener('click', () => resetToDefault());
    },

    initRipple() {
      document.addEventListener('pointerdown', (e) => {
        const btn = e.target.closest('.btn, .chip, .icon-btn, .cat-card');
        if (!btn || PERF.prefersReduced) return;
        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 650);
      }, { passive: true });
    },

    initCardDelegation() {
      if (PERF.isMobile || PERF.isSmallScreen || PERF.level === 'low') return;
      let raf = null, currentCard = null;
      document.addEventListener('pointermove', (e) => {
        const card = e.target.closest('.snippet-card');
        if (!card) {
          if (currentCard) {
            currentCard.style.transform = '';
            currentCard.style.removeProperty('--mx');
            currentCard.style.removeProperty('--my');
            currentCard = null;
          }
          return;
        }
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          currentCard = card;
          const r = card.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          const cx = r.width / 2, cy = r.height / 2;
          const rotX = ((y - cy) / cy) * -5;
          const rotY = ((x - cx) / cx) * 5;
          card.style.setProperty('--mx', x + 'px');
          card.style.setProperty('--my', y + 'px');
          card.style.transform = 'perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateZ(6px)';
        });
      }, { passive: true });
    },

    initToolbar() {
      const searchInput = $('#searchInput');
      const clearBtn = $('#clearSearch');
      const bar = $('#filterBar');
      if (searchInput) {
        const onSearch = debounce((v) => { state.query = v; clearBtn.hidden = !v; Render.snippetGrid(); }, 180);
        searchInput.addEventListener('input', (e) => onSearch(e.target.value));
      }
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          searchInput.value = ''; state.query = ''; clearBtn.hidden = true;
          Render.snippetGrid(); searchInput.focus();
        });
      }
      if (bar) {
        bar.addEventListener('click', (e) => {
          const chip = e.target.closest('.chip');
          if (!chip) return;
          if (chip.dataset.fav) state.favoritesOnly = !state.favoritesOnly;
          else if (chip.dataset.lang) state.activeLang = chip.dataset.lang;
          Render.filterBar(); Render.snippetGrid();
        });
      }
    },

    initModals() {
      const editor = $('#editorModal');
      $('#editorForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!state.isAdmin) { Toast.show('Gak punya akses', 'error'); return; }
        const id = $('#editId').value;
        const data = {
          title: $('#fTitle').value, description: $('#fDesc').value,
          language: $('#fLang').value,
          tags: $('#fTags').value.split(',').map(t => t.trim()).filter(Boolean),
          code: $('#fCode').value, filename: $('#fFile').value
        };
        if (!data.title.trim() || !data.code.trim()) { Toast.show('Title dan Code wajib', 'error'); return; }
        if (id) { Store.update(id, data); Toast.show('Snippet updated!', 'success'); }
        else { Store.add(data); Toast.show('Snippet created!', 'success'); }
        this.closeModal(editor);
        Router.navigate();
      });
      $('#confirmOk').addEventListener('click', () => {
        const id = $('#confirmOk').dataset.id;
        if (id && state.isAdmin) {
          Store.remove(id);
          Toast.show('Snippet dihapus', 'success');
          this.closeModal($('#confirmModal'));
          if (state.route === '/detail') location.hash = '#/snippets';
          else Router.navigate();
        }
      });
    },

    openEditor(snippet = null) {
      if (!state.isAdmin) { Toast.show('Gak punya akses', 'error'); return; }
      const modal = $('#editorModal');
      if (snippet) {
        $('#editorTitle').textContent = 'Edit Snippet';
        $('#editId').value = snippet.id;
        $('#fTitle').value = snippet.title;
        $('#fDesc').value = snippet.description;
        $('#fLang').value = snippet.language;
        $('#fTags').value = snippet.tags.join(', ');
        $('#fCode').value = snippet.code;
        $('#fFile').value = snippet.filename;
      } else {
        $('#editorTitle').textContent = 'Create Snippet';
        $('#editId').value = '';
        $('#editorForm').reset();
      }
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      setTimeout(() => $('#fTitle').focus(), 100);
    },

    closeModal(modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    },

    openConfirm(id, title, msg) {
      const modal = $('#confirmModal');
      $('#confirmTitle').textContent = title;
      $('#confirmMsg').textContent = msg;
      $('#confirmOk').dataset.id = id;
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
    },

    initGlobalDelegation() {
      document.addEventListener('click', (e) => {
        const actionEl = e.target.closest('[data-action]');
        if (!actionEl) {
          const card = e.target.closest('.snippet-card');
          if (card) {
            if (PERF.isMobile || PERF.isSmallScreen) {
              card.classList.add('is-tapped');
              setTimeout(() => card.classList.remove('is-tapped'), 180);
            }
            location.hash = '#/detail/' + card.dataset.id;
            return;
          }
          const cat = e.target.closest('.cat-card');
          if (cat) {
            state.activeLang = cat.dataset.cat;
            state.query = '';
            location.hash = '#/snippets';
          }
          return;
        }
        const action = actionEl.dataset.action;
        const id = actionEl.dataset.id;
        switch (action) {
          case 'create': e.preventDefault(); e.stopPropagation(); this.openEditor(); break;
          case 'close-modal': e.preventDefault(); this.closeModal($('#editorModal')); break;
          case 'close-confirm': e.preventDefault(); this.closeModal($('#confirmModal')); break;
          case 'back': e.preventDefault(); history.back(); break;
          case 'copy': e.stopPropagation(); this.copyCode(id, actionEl); break;
          case 'view': e.stopPropagation(); location.hash = '#/detail/' + id; break;
          case 'fav': e.stopPropagation(); this.toggleFav(id, actionEl); break;
          case 'detail-copy': this.copyCode(id, actionEl); break;
          case 'detail-download': this.downloadSnippet(id); break;
          case 'detail-edit': this.openEditor(Store.get(id)); break;
          case 'detail-fav': this.toggleFav(id); Router.navigate(); break;
          case 'detail-delete': this.openConfirm(id, 'Hapus snippet?', 'Tindakan ini tidak bisa dibatalkan.'); break;
          case 'reset-filter':
            state.query = ''; state.activeLang = 'all'; state.favoritesOnly = false;
            const inp = $('#searchInput'); if (inp) inp.value = '';
            Render.filterBar(); Render.snippetGrid();
            break;
        }
      });
    },

    async copyCode(id, btnEl = null) {
      const s = Store.get(id);
      if (!s) return;
      try {
        await navigator.clipboard.writeText(s.code);
        Toast.show('Kode dicopy!', 'success');
        if (btnEl && btnEl.classList.contains('icon-btn')) {
          btnEl.classList.add('copied');
          setTimeout(() => btnEl.classList.remove('copied'), 1200);
        }
        if (btnEl && btnEl.classList.contains('btn')) {
          const orig = btnEl.innerHTML;
          btnEl.textContent = 'Copied!';
          setTimeout(() => { btnEl.innerHTML = orig; }, 1400);
        }
      } catch {
        const ta = document.createElement('textarea');
        ta.value = s.code; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); Toast.show('Kode dicopy!', 'success'); }
        catch { Toast.show('Gagal copy', 'error'); }
        ta.remove();
      }
    },

    downloadSnippet(id) {
      const s = Store.get(id);
      if (!s) return;
      const blob = new Blob([s.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = s.filename || 'snippet.txt';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      Toast.show('Download dimulai', 'success');
    },

    toggleFav(id, btnEl = null) {
      const isFav = Store.toggleFav(id);
      if (btnEl) btnEl.classList.toggle('is-fav', isFav);
      Toast.show(isFav ? 'Ditambahkan ke favorites' : 'Dihapus dari favorites', 'info');
    },

    initSearchOverlay() {
      const overlay = $('#searchOverlay');
      const input = $('#searchOverlayInput');
      const results = $('#searchResults');
      const closeBtn = $('#closeSearch');
      const openBtn = $('#openSearch');
      const open = () => { overlay.classList.add('is-open'); overlay.setAttribute('aria-hidden', 'false'); setTimeout(() => input.focus(), 100); };
      const close = () => { overlay.classList.remove('is-open'); overlay.setAttribute('aria-hidden', 'true'); input.value = ''; results.innerHTML = ''; state.searchResults = []; state.searchFocusIdx = -1; };
      openBtn?.addEventListener('click', open);
      closeBtn?.addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      const render = (list) => {
        state.searchResults = list;
        state.searchFocusIdx = -1;
        if (!list.length) { results.innerHTML = '<div class="state-block" style="padding:30px 20px;"><div class="state-icon">🔍</div><p>Gak ada hasil</p></div>'; return; }
        results.innerHTML = list.map((s, i) => {
          const lang = LANG_META[s.language] || LANG_META.other;
          return '<div class="search-result" data-id="' + s.id + '" data-idx="' + i + '">' +
            '<span class="lang-badge" data-lang="' + s.language + '">' + lang.icon + '</span>' +
            '<div style="flex:1;min-width:0;">' +
              '<div class="sr-title">' + escapeHtml(s.title) + '</div>' +
              '<div class="sr-meta">' + lang.label + ' · ' + s.tags.slice(0, 2).map(t => '#' + t).join(' ') + '</div>' +
            '</div>' +
          '</div>';
        }).join('');
      };
      const search = debounce(() => render(Filter.quickSearch(input.value)), 120);
      input.addEventListener('input', search);
      input.addEventListener('keydown', (e) => {
        const items = $$('.search-result', results);
        if (e.key === 'ArrowDown') { e.preventDefault(); state.searchFocusIdx = Math.min(state.searchFocusIdx + 1, items.length - 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); state.searchFocusIdx = Math.max(state.searchFocusIdx - 1, 0); }
        else if (e.key === 'Enter') {
          e.preventDefault();
          const idx = state.searchFocusIdx >= 0 ? state.searchFocusIdx : 0;
          const target = state.searchResults[idx];
          if (target) { location.hash = '#/detail/' + target.id; close(); }
        } else if (e.key === 'Escape') close();
        items.forEach((el, i) => el.classList.toggle('is-focused', i === state.searchFocusIdx));
        if (state.searchFocusIdx >= 0 && items[state.searchFocusIdx]) items[state.searchFocusIdx].scrollIntoView({ block: 'nearest' });
      });
      results.addEventListener('click', (e) => {
        const item = e.target.closest('.search-result');
        if (item) { location.hash = '#/detail/' + item.dataset.id; close(); }
      });
    },

    initMobileMenu() {
      const burger = $('#burgerBtn');
      const menu = $('#mobileMenu');
      const overlay = $('#mobileOverlay');
      const toggle = (open) => {
        const isOpen = open ?? !menu.classList.contains('is-open');
        menu.classList.toggle('is-open', isOpen);
        overlay.classList.toggle('is-open', isOpen);
        burger.classList.toggle('is-open', isOpen);
        burger.setAttribute('aria-expanded', isOpen);
      };
      burger?.addEventListener('click', () => toggle());
      overlay?.addEventListener('click', () => toggle(false));
      $$('.mobile-link, .mobile-create', menu).forEach(el => el.addEventListener('click', () => toggle(false)));
    },

    initKeyboard() {
      document.addEventListener('keydown', (e) => {
        const tag = document.activeElement?.tagName;
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
        if (e.key === '/' && !isTyping) { e.preventDefault(); $('#openSearch')?.click(); }
        else if (e.key === 'Escape') { $$('.modal.is-open').forEach(m => m.classList.remove('is-open')); $('#searchOverlay')?.classList.remove('is-open'); }
        else if (e.key === 'n' && !isTyping && !e.metaKey && !e.ctrlKey && state.isAdmin) { e.preventDefault(); this.openEditor(); }
      });
    },

    observeReveal(container) {
      if (!('IntersectionObserver' in window)) {
        $$('.card-reveal', container).forEach(el => el.classList.add('is-visible'));
        return;
      }
      if (this._revealObserver) this._revealObserver.disconnect();
      this._revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.idx || '0', 10);
            setTimeout(() => entry.target.classList.add('is-visible'), Math.min(idx * 40, 300));
            this._revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: '50px', threshold: 0.05 });
      $$('.card-reveal', container).forEach(el => this._revealObserver.observe(el));
    },

    initScrollGuard() {
      let t, s = false;
      window.addEventListener('scroll', () => {
        if (!s) { s = true; document.body.classList.add('is-scrolling'); }
        clearTimeout(t);
        t = setTimeout(() => { s = false; document.body.classList.remove('is-scrolling'); }, 150);
      }, { passive: true });
    }
  };

  /* ============================================================
     PARTICLES
     ============================================================ */
  function initParticles() {
    if (PERF.level === 'low' || PERF.prefersReduced) return;
    const container = $('#bgParticles');
    if (!container) return;
    const count = PERF.level === 'high' ? 14 : 6;
    let html = '';
    for (let i = 0; i < count; i++) {
      const left = Math.random() * 100;
      const dur = 14 + Math.random() * 14;
      const delay = Math.random() * -20;
      const size = 1 + Math.random() * 2;
      html += '<span class="particle" style="left:' + left + '%;width:' + size + 'px;height:' + size + 'px;animation-duration:' + dur + 's;animation-delay:' + delay + 's;"></span>';
    }
    container.innerHTML = html;
  }

  /* ============================================================
     INIT
     ============================================================ */
  function init() {
    Store.init();
    Interactions.init();
    initParticles();
    window.addEventListener('hashchange', () => Router.navigate());
    Router.navigate();
    applyAdminVisibility();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
