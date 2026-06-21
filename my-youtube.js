// ─── CONFIG ─────────────────────────────────────────────
const API_KEY       = 'AIzaSyCkzxnGe4KeX34xBTlR4WxlxpJ89ZuDVgQ';
const VIDEOS_PER_CH = 3;
const PL_PREVIEW    = 3;   // videos shown in collapsed playlist preview
const PL_EXPANDED   = 12;  // videos fetched when expanded
const CACHE_TTL_MS  = 60 * 60 * 1000;
// ────────────────────────────────────────────────────────

const STORAGE_KEY    = 'yt_channels';
const VISITED_KEY    = 'yt_visited';
const CACHE_KEY      = 'yt_video_cache';
const PL_STORAGE_KEY = 'yt_playlists';
const PL_CACHE_KEY   = 'yt_pl_cache';

const COLORS = ['#c0392b','#8e44ad','#2980b9','#16a085','#d35400','#27ae60','#2c3e50','#e74c3c'];

const listEl        = document.getElementById('list');
const statsEl       = document.getElementById('stats');
const statusEl      = document.getElementById('refresh-status');
const videosGrid    = document.getElementById('videos-grid');
const videosStatus  = document.getElementById('videos-status');
const plListEl      = document.getElementById('playlists-list');
const plStatusEl    = document.getElementById('playlists-status');
const overlay       = document.getElementById('modal-overlay');
const plOverlay     = document.getElementById('pl-modal-overlay');
const confirmOverlay= document.getElementById('confirm-overlay');
const confirmTitle  = document.getElementById('confirm-title');
const confirmMessage= document.getElementById('confirm-message');
const confirmOk     = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
const searchEl      = document.getElementById('search-input');
const inputName     = document.getElementById('input-name');
const inputUrl      = document.getElementById('input-url');
const plInputName   = document.getElementById('pl-input-name');
const plInputUrl    = document.getElementById('pl-input-url');
const refreshBtn    = document.getElementById('refresh-btn');
const addBtn        = document.getElementById('add-btn');
const searchBar     = document.getElementById('search-bar');

const DEFAULTS = [
  { name: 'Content Machine',        url: 'https://www.youtube.com/@content_machine' },
  { name: 'Desanthi Ripathippagam', url: 'https://www.youtube.com/@desanthiripathippagam' },
  { name: 'Empty Hand Ajith Sri',   url: 'https://www.youtube.com/@emptyhandajithsri' },
  { name: 'Galatta Plus',           url: 'https://www.youtube.com/@galattaplus' },
  { name: 'Gameranx',               url: 'https://www.youtube.com/@gameranx' },
  { name: 'Makkal Pechu',           url: 'https://www.youtube.com/@makkalpechu' },
  { name: 'Moneypechu',             url: 'https://www.youtube.com/@Moneypechu' },
  { name: 'Moto Wagon',             url: 'https://www.youtube.com/@motowagon' },
  { name: 'Mr GK Tamil',            url: 'https://www.youtube.com/@mrgktamil' },
  { name: 'Muzhumai Arivu',         url: 'https://www.youtube.com/@muzhumaiarivu' },
  { name: 'Parithabangal',          url: 'https://www.youtube.com/@parithabangal' },
  { name: 'Patrick Boyle',          url: 'https://www.youtube.com/@pboyle' },
  { name: 'Plip Plip',              url: 'https://www.youtube.com/@plipplip' },
  { name: 'Polymatter',             url: 'https://www.youtube.com/@polymatter' },
  { name: 'Tiruppur Bulls',         url: 'https://www.youtube.com/@tiruppurbulls' },
  { name: 'Vikatan Web TV',         url: 'https://www.youtube.com/@Vikatanwebtv' },
];

// ─── STORAGE ────────────────────────────────────────────
function loadChannels()  { try { const s = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (s?.length) return s; } catch {} saveChannels(DEFAULTS); return DEFAULTS; }
function saveChannels(c) { localStorage.setItem(STORAGE_KEY, JSON.stringify(c)); }
function loadVisited()   { try { return JSON.parse(localStorage.getItem(VISITED_KEY)) || {}; } catch { return {}; } }
function markVisited(u)  { const v = loadVisited(); v[u] = Date.now(); localStorage.setItem(VISITED_KEY, JSON.stringify(v)); }
function loadCache()     { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } }
function saveCache(c)    { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); }
function loadPlaylists() { try { const s = JSON.parse(localStorage.getItem(PL_STORAGE_KEY)); if (s?.length) return s; } catch {} return []; }
function savePlaylists(p){ localStorage.setItem(PL_STORAGE_KEY, JSON.stringify(p)); }
function loadPlCache()   { try { return JSON.parse(localStorage.getItem(PL_CACHE_KEY)) || {}; } catch { return {}; } }
function savePlCache(c)  { localStorage.setItem(PL_CACHE_KEY, JSON.stringify(c)); }

// ─── HELPERS ────────────────────────────────────────────
function sorted(ch)  { return [...ch].sort((a,b) => a.name.localeCompare(b.name)); }
function handleFromUrl(url) { const m = url.match(/@([\w_]+)/); return m ? '@'+m[1] : ''; }
function normalizeUrl(raw) {
  raw = raw.trim();
  if (raw.startsWith('http')) return raw;
  if (raw.startsWith('@')) return 'https://www.youtube.com/' + raw;
  return 'https://www.youtube.com/@' + raw;
}
function colorFor(name) { let h=0; for (let c of name) h=(h*31+c.charCodeAt(0))&0xffff; return COLORS[h%COLORS.length]; }
function initials(name) { return name.trim().split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2); }
function avatarUrl(handle) { return `https://unavatar.io/youtube/${handle.replace('@','')}`; }
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60)+'m ago';
  if (diff < 86400) return Math.floor(diff/3600)+'h ago';
  if (diff < 604800) return Math.floor(diff/86400)+'d ago';
  if (diff < 2592000) return Math.floor(diff/604800)+'w ago';
  return Math.floor(diff/2592000)+'mo ago';
}
function thumbUrl(videoId) { return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`; }
function isStale(entry)    { return !entry?.refreshedAt || (Date.now() - entry.refreshedAt) > CACHE_TTL_MS; }

function extractPlaylistId(raw) {
  raw = raw.trim();
  // Full URL: ?list=PLxxxxxx
  const m = raw.match(/[?&]list=([\w-]+)/);
  if (m) return m[1];
  // Bare ID (starts with PL, UU, FL, RD, etc.)
  if (/^[A-Za-z]{2}[\w-]{10,}$/.test(raw)) return raw;
  return null;
}

function playlistYtUrl(plId) { return `https://www.youtube.com/playlist?list=${plId}`; }

// ─── YOUTUBE API ─────────────────────────────────────────
async function resolveChannel(handle) {
  const h = handle.replace('@','');
  const res = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&forHandle=${encodeURIComponent(h)}&key=${API_KEY}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const item = data.items?.[0];
  if (!item) throw new Error('Channel not found');
  return { channelId: item.id, uploadsId: item.contentDetails.relatedPlaylists.uploads };
}

async function fetchPlaylistVideos(uploadsId, maxResults) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsId)}&maxResults=${maxResults}&key=${API_KEY}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return (data.items || []).map(item => ({
    videoId:     item.snippet.resourceId.videoId,
    title:       item.snippet.title,
    publishedAt: item.snippet.publishedAt,
  }));
}

// Fetch playlist metadata (title, item count, thumbnail)
async function fetchPlaylistMeta(plId) {
  const res = await fetch(`https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${encodeURIComponent(plId)}&key=${API_KEY}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const item = data.items?.[0];
  if (!item) throw new Error('Playlist not found');
  const thumbs = item.snippet.thumbnails;
  const thumb  = (thumbs.medium || thumbs.default || {}).url || null;
  return {
    title:      item.snippet.title,
    itemCount:  item.contentDetails.itemCount,
    thumb,
    channelTitle: item.snippet.channelTitle,
  };
}

// ─── REFRESH ────────────────────────────────────────────
let activeTab = 'channels';

async function refreshAll() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = '⟳';
  setStatus('Refreshing…', 'info');

  if (activeTab === 'channels' || activeTab === 'videos') {
    await refreshChannels();
  } else if (activeTab === 'playlists') {
    await refreshPlaylists();
  }

  refreshBtn.disabled = false;
  refreshBtn.textContent = '⟳ Refresh';
}

async function refreshChannels() {
  const channels = loadChannels();
  const cache    = loadCache();
  let updated = 0, skipped = 0, errors = 0;

  for (const ch of channels) {
    const handle = handleFromUrl(ch.url);
    if (!handle) { errors++; continue; }
    if (!cache[ch.url]) cache[ch.url] = {};
    const entry = cache[ch.url];
    try {
      if (!entry.uploadsId) {
        const info = await resolveChannel(handle);
        entry.channelId = info.channelId;
        entry.uploadsId = info.uploadsId;
      }
      if (isStale(entry)) {
        const videos = await fetchPlaylistVideos(entry.uploadsId, VIDEOS_PER_CH);
        entry.videos = videos; entry.latestVideo = videos[0] || null;
        entry.refreshedAt = Date.now(); updated++;
      } else { skipped++; }
    } catch(e) { console.error(`Error fetching ${ch.name}:`, e.message); errors++; }
  }

  saveCache(cache);
  renderChannels();
  if (activeTab === 'videos') renderVideos();

  if (errors === 0)
    setStatus(`Updated ${updated} channels${skipped ? `, ${skipped} from cache` : ''}`, 'success');
  else
    setStatus(`Updated ${updated}, ${skipped} cached, ${errors} failed`, 'error');
  setTimeout(() => setStatus('', ''), 5000);
}

async function refreshPlaylists() {
  const pls   = loadPlaylists();
  const cache = loadPlCache();
  let updated = 0, skipped = 0, errors = 0;

  for (const pl of pls) {
    if (!cache[pl.id]) cache[pl.id] = {};
    const entry = cache[pl.id];
    try {
      // Fetch/refresh metadata
      if (!entry.meta || isStale(entry)) {
        const meta = await fetchPlaylistMeta(pl.id);
        entry.meta = meta;
      }
      // Fetch preview videos
      if (isStale(entry)) {
        const videos = await fetchPlaylistVideos(pl.id, PL_PREVIEW);
        entry.previewVideos = videos;
        entry.refreshedAt   = Date.now();
        updated++;
      } else { skipped++; }
    } catch(e) { console.error(`Error fetching playlist ${pl.id}:`, e.message); errors++; }
  }

  savePlCache(cache);
  renderPlaylists();

  if (errors === 0)
    setStatus(`Updated ${updated} playlists${skipped ? `, ${skipped} from cache` : ''}`, 'success');
  else
    setStatus(`Updated ${updated}, ${skipped} cached, ${errors} failed`, 'error');
  setTimeout(() => setStatus('', ''), 5000);
}

function setStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className   = type || '';
}

// ─── CONFIRM MODAL ──────────────────────────────────────
let confirmCallback = null;

function showConfirm({ title, message, okLabel = 'Remove', onConfirm }) {
  confirmTitle.textContent   = title || 'Remove?';
  confirmMessage.innerHTML   = message;
  confirmOk.textContent      = okLabel;
  confirmCallback            = onConfirm;
  confirmOverlay.classList.add('open');
  // Focus cancel by default for safer interaction
  setTimeout(() => confirmCancel.focus(), 0);
}

function closeConfirm() {
  confirmOverlay.classList.remove('open');
  confirmCallback = null;
}

function doConfirm() {
  const cb = confirmCallback;
  closeConfirm();
  if (typeof cb === 'function') cb();
}

confirmOk.addEventListener('click', doConfirm);
confirmCancel.addEventListener('click', closeConfirm);
confirmOverlay.addEventListener('click', e => { if (e.target === confirmOverlay) closeConfirm(); });

// ─── CHANNELS ────────────────────────────────────────────
function newVideoCount(chUrl, latestVideo) {
  if (!latestVideo) return 0;
  const lastVisit = loadVisited()[chUrl];
  if (!lastVisit) return 1;
  return new Date(latestVideo.publishedAt).getTime() > lastVisit ? 1 : 0;
}

function renderChannels() {
  const query    = searchEl.value.trim().toLowerCase();
  const all      = sorted(loadChannels());
  const cache    = loadCache();
  const filtered = query ? all.filter(ch => ch.name.toLowerCase().includes(query)) : all;

  statsEl.textContent = query
    ? `${filtered.length} of ${all.length} channels`
    : `${all.length} channel${all.length !== 1 ? 's' : ''}`;

  listEl.innerHTML = '';

  if (filtered.length === 0) {
    listEl.innerHTML = all.length === 0
      ? `<div id="empty"><span>📺</span>No channels yet.<br>Tap <strong>+ Add</strong> to get started.</div>`
      : `<div class="no-results"><span>🔍</span>No channels matching "<strong>${query}</strong>"</div>`;
    return;
  }

  filtered.forEach(ch => {
    const handle   = handleFromUrl(ch.url);
    const entry    = cache[ch.url] || {};
    const latest   = entry.latestVideo || null;
    const newCount = newVideoCount(ch.url, latest);

    const row = document.createElement('a');
    row.className = 'channel-row'; row.href = ch.url; row.rel = 'noopener';
    row.addEventListener('click', () => { markVisited(ch.url); renderChannels(); });

    const img = document.createElement('img');
    img.className = 'channel-icon'; img.alt = ch.name;
    img.src = avatarUrl(handle);
    img.onerror = function() {
      const fb = document.createElement('div');
      fb.className = 'channel-icon-fallback';
      fb.style.background = colorFor(ch.name);
      fb.textContent = initials(ch.name);
      this.replaceWith(fb);
    };

    const info = document.createElement('div');
    info.className = 'channel-info';

    const top = document.createElement('div');
    top.className = 'channel-top';
    top.innerHTML = `<span class="channel-name">${ch.name}</span>`;
    if (newCount > 0) {
      const badge = document.createElement('span');
      badge.className = 'new-badge'; badge.textContent = `${newCount} new`;
      top.appendChild(badge);
    }

    const meta = document.createElement('div');
    meta.className = 'channel-meta';
    meta.innerHTML = `<span class="channel-handle">${handle}</span>`;
    info.appendChild(top); info.appendChild(meta);

    if (latest) {
      const vLink = document.createElement('a');
      vLink.className = 'latest-video';
      vLink.href = `https://www.youtube.com/watch?v=${latest.videoId}`;
      vLink.rel  = 'noopener';
      vLink.addEventListener('click', e => { e.stopPropagation(); markVisited(ch.url); });
      vLink.innerHTML = `▶ ${latest.title} <span class="video-age">${timeAgo(latest.publishedAt)}</span>`;
      info.appendChild(vLink);
    } else {
      const hint = document.createElement('span');
      hint.className = 'latest-video'; hint.style.color = '#444';
      hint.textContent = 'Hit Refresh to load videos';
      info.appendChild(hint);
    }

    const del = document.createElement('button');
    del.className = 'delete-btn'; del.title = 'Remove'; del.textContent = '✕';
    del.setAttribute('aria-label', `Remove ${ch.name}`);
    del.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      showConfirm({
        title: 'Remove channel?',
        message: `Remove <strong>${ch.name}</strong> from your channels? This will also clear its cached videos.`,
        okLabel: 'Remove',
        onConfirm: () => {
          const all = loadChannels();
          const idx = all.findIndex(c => c.url === ch.url);
          if (idx > -1) {
            all.splice(idx, 1);
            saveChannels(all);
            // Clean cached videos for this channel
            const cache = loadCache();
            if (cache[ch.url]) { delete cache[ch.url]; saveCache(cache); }
            renderChannels();
            if (activeTab === 'videos') renderVideos();
          }
        }
      });
    });

    row.appendChild(img); row.appendChild(info); row.appendChild(del);
    listEl.appendChild(row);
  });
}

// ─── VIDEOS ──────────────────────────────────────────────
function renderVideos() {
  const channels = loadChannels();
  const cache    = loadCache();
  const allVideos = [];
  channels.forEach(ch => {
    (cache[ch.url]?.videos || []).forEach(v => allVideos.push({ ...v, channelName: ch.name, channelUrl: ch.url }));
  });

  videosGrid.innerHTML = '';

  if (allVideos.length === 0) {
    videosGrid.innerHTML = `<div class="videos-empty"><span>🎬</span>No videos loaded yet.<br>Tap <strong>⟳ Refresh</strong> to fetch videos.</div>`;
    videosStatus.textContent = ''; return;
  }

  allVideos.sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const staleCount = channels.filter(ch => isStale(cache[ch.url])).length;
  videosStatus.textContent = staleCount > 0
    ? `${staleCount} channel${staleCount>1?'s':''} need a refresh`
    : `All up to date · ${allVideos.length} videos`;

  allVideos.forEach(v => {
    const card = document.createElement('a');
    card.className = 'video-card';
    card.href = `https://www.youtube.com/watch?v=${v.videoId}`; card.rel = 'noopener';
    card.addEventListener('click', () => markVisited(v.channelUrl));

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'video-thumb-wrap';
    const thumb = document.createElement('img');
    thumb.className = 'video-thumb'; thumb.alt = v.title;
    thumb.src = thumbUrl(v.videoId); thumb.loading = 'lazy';
    thumb.onerror = function() {
      const fb = document.createElement('div'); fb.className = 'video-thumb-fallback'; fb.textContent = '▶';
      this.replaceWith(fb);
    };
    thumbWrap.appendChild(thumb);

    const body = document.createElement('div');
    body.className = 'video-body';
    body.innerHTML = `<div class="video-title">${v.title}</div><div class="video-channel">${v.channelName}</div><div class="video-age">${timeAgo(v.publishedAt)}</div>`;

    card.appendChild(thumbWrap); card.appendChild(body);
    videosGrid.appendChild(card);
  });
}

// ─── PLAYLISTS ───────────────────────────────────────────
function renderPlaylists() {
  const pls   = loadPlaylists();
  const cache = loadPlCache();
  plListEl.innerHTML = '';

  if (pls.length === 0) {
    plListEl.innerHTML = `<div class="playlists-empty"><span>▶</span>No playlists yet.<br>Tap <strong>+ Add</strong> to save one.</div>`;
    plStatusEl.textContent = ''; return;
  }

  const staleCount = pls.filter(pl => isStale(cache[pl.id])).length;
  plStatusEl.textContent = staleCount > 0
    ? `${staleCount} playlist${staleCount>1?'s':''} need a refresh`
    : `${pls.length} playlist${pls.length>1?'s':''}`;

  pls.forEach(pl => {
    const entry    = cache[pl.id] || {};
    const meta     = entry.meta || {};
    const preview  = entry.previewVideos || [];
    const firstVid = preview[0];

    const card = document.createElement('div');
    card.className = 'playlist-card';

    // ── Header ──
    const header = document.createElement('div');
    header.className = 'playlist-header';

    // Thumbnail
    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'playlist-thumb-wrap';
    if (meta.thumb || firstVid) {
      const img = document.createElement('img');
      img.className = 'playlist-thumb';
      img.src = meta.thumb || thumbUrl(firstVid.videoId);
      img.alt = pl.name;
      img.onerror = function() {
        const fb = document.createElement('div'); fb.className = 'playlist-thumb-fallback'; fb.textContent = '▶';
        this.replaceWith(fb);
      };
      thumbWrap.appendChild(img);
    } else {
      const fb = document.createElement('div'); fb.className = 'playlist-thumb-fallback'; fb.textContent = '▶';
      thumbWrap.appendChild(fb);
    }
    if (meta.itemCount) {
      const cnt = document.createElement('div');
      cnt.className = 'playlist-count-badge';
      cnt.textContent = meta.itemCount;
      thumbWrap.appendChild(cnt);
    }

    // Info
    const info = document.createElement('div');
    info.className = 'playlist-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'playlist-title-row';
    titleRow.innerHTML = `<span class="playlist-name">${pl.name}</span>`;

    const metaDiv = document.createElement('div');
    metaDiv.className = 'playlist-meta';
    metaDiv.textContent = meta.channelTitle
      ? `by ${meta.channelTitle}${meta.itemCount ? ' · ' + meta.itemCount + ' videos' : ''}`
      : (meta.itemCount ? `${meta.itemCount} videos` : (isStale(entry) ? 'Hit Refresh to load' : ''));

    info.appendChild(titleRow);
    info.appendChild(metaDiv);

    if (firstVid) {
      const latest = document.createElement('div');
      latest.className = 'playlist-latest';
      latest.textContent = `▶ ${firstVid.title}`;
      info.appendChild(latest);
    }

    // Actions
    const actions = document.createElement('div');
    actions.className = 'playlist-actions';

    const openBtn = document.createElement('a');
    openBtn.className = 'pl-open-btn'; openBtn.textContent = '▶ Open';
    openBtn.href = playlistYtUrl(pl.id); openBtn.rel = 'noopener';
    openBtn.title = 'Open on YouTube';

    const expandBtn = document.createElement('button');
    expandBtn.className = 'pl-expand-btn'; expandBtn.title = 'Show videos';
    expandBtn.textContent = '▾';

    const delBtn = document.createElement('button');
    delBtn.className = 'pl-del-btn'; delBtn.title = 'Remove'; delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `Remove ${pl.name}`);
    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      showConfirm({
        title: 'Remove playlist?',
        message: `Remove <strong>${pl.name}</strong> from your playlists? This will also clear its cached videos.`,
        okLabel: 'Remove',
        onConfirm: () => {
          const all = loadPlaylists();
          const idx = all.findIndex(p => p.id === pl.id);
          if (idx > -1) {
            all.splice(idx, 1);
            savePlaylists(all);
            // Clean playlist cache
            const pc = loadPlCache();
            if (pc[pl.id]) { delete pc[pl.id]; savePlCache(pc); }
            renderPlaylists();
          }
        }
      });
    });

    actions.appendChild(openBtn);
    actions.appendChild(expandBtn);
    actions.appendChild(delBtn);

    header.appendChild(thumbWrap);
    header.appendChild(info);
    header.appendChild(actions);

    // ── Expanded videos ──
    const videosDiv = document.createElement('div');
    videosDiv.className = 'playlist-videos';

    let expanded = false;
    let fullLoaded = false;

    expandBtn.addEventListener('click', async e => {
      e.stopPropagation();
      expanded = !expanded;
      expandBtn.classList.toggle('open', expanded);
      expandBtn.textContent = expanded ? '▴' : '▾';
      videosDiv.classList.toggle('open', expanded);

      if (expanded && !fullLoaded) {
        videosDiv.innerHTML = `<div class="pl-loading">Loading…</div>`;
        try {
          const videos = await fetchPlaylistVideos(pl.id, PL_EXPANDED);
          fullLoaded = true;
          renderPlaylistVideos(videosDiv, videos, pl.id);
        } catch(err) {
          videosDiv.innerHTML = `<div class="pl-loading" style="color:#ff4444">Failed to load: ${err.message}</div>`;
        }
      }
    });

    // Clicking header (not buttons) also toggles
    header.addEventListener('click', e => {
      if (e.target.closest('a,button')) return;
      expandBtn.click();
    });

    card.appendChild(header);
    card.appendChild(videosDiv);
    plListEl.appendChild(card);
  });
}

function renderPlaylistVideos(container, videos, plId) {
  container.innerHTML = '';
  if (!videos.length) {
    container.innerHTML = `<div class="pl-loading">No videos found</div>`;
    return;
  }
  videos.forEach(v => {
    const card = document.createElement('a');
    card.className = 'video-card';
    card.href = `https://www.youtube.com/watch?v=${v.videoId}`; card.rel = 'noopener';

    const tw = document.createElement('div'); tw.className = 'video-thumb-wrap';
    const img = document.createElement('img');
    img.className = 'video-thumb'; img.src = thumbUrl(v.videoId); img.alt = v.title; img.loading = 'lazy';
    img.onerror = function() { const fb = document.createElement('div'); fb.className = 'video-thumb-fallback'; fb.textContent = '▶'; this.replaceWith(fb); };
    tw.appendChild(img);

    const body = document.createElement('div');
    body.className = 'video-body';
    body.innerHTML = `<div class="video-title">${v.title}</div><div class="video-age">${timeAgo(v.publishedAt)}</div>`;

    card.appendChild(tw); card.appendChild(body);
    container.appendChild(card);
  });
}

// ─── TABS ────────────────────────────────────────────────
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    activeTab = btn.dataset.tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`panel-${activeTab}`).classList.add('active');

    if (activeTab === 'channels') {
      searchBar.style.display = ''; addBtn.style.display = ''; statsEl.style.display = '';
      searchEl.placeholder = '🔍  Search channels…';
      addBtn.textContent = '+ Add';
      addBtn.onclick = openModal;
      renderChannels();
    } else if (activeTab === 'videos') {
      searchBar.style.display = 'none'; addBtn.style.display = 'none'; statsEl.style.display = 'none';
      renderVideos();
    } else if (activeTab === 'playlists') {
      searchBar.style.display = 'none';
      statsEl.style.display = 'none';
      addBtn.style.display = '';
      addBtn.textContent = '+ Add';
      addBtn.onclick = openPlModal;
      renderPlaylists();
    }
  });
});

// ─── CHANNEL MODAL ───────────────────────────────────────
function openModal()  { overlay.classList.add('open'); inputName.focus(); }
function closeModal() {
  overlay.classList.remove('open');
  inputName.value = ''; inputUrl.value = '';
  inputName.style.borderColor = '#444'; inputUrl.style.borderColor = '#444';
}
function saveChannel() {
  const name = inputName.value.trim(), raw = inputUrl.value.trim();
  if (!name) { inputName.style.borderColor = '#ff4444'; return; }
  if (!raw)  { inputUrl.style.borderColor  = '#ff4444'; return; }
  const channels = loadChannels();
  channels.push({ name, url: normalizeUrl(raw) });
  saveChannels(channels); closeModal(); renderChannels();
}

addBtn.addEventListener('click', openModal);
document.getElementById('cancel-btn').addEventListener('click', closeModal);
document.getElementById('save-btn').addEventListener('click', saveChannel);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

// ─── PLAYLIST MODAL ──────────────────────────────────────
function openPlModal()  { plOverlay.classList.add('open'); plInputName.focus(); }
function closePlModal() {
  plOverlay.classList.remove('open');
  plInputName.value = ''; plInputUrl.value = '';
  plInputName.style.borderColor = '#444'; plInputUrl.style.borderColor = '#444';
}
function savePlaylist() {
  const name = plInputName.value.trim(), raw = plInputUrl.value.trim();
  if (!name) { plInputName.style.borderColor = '#ff4444'; return; }
  if (!raw)  { plInputUrl.style.borderColor  = '#ff4444'; return; }
  const plId = extractPlaylistId(raw);
  if (!plId) { plInputUrl.style.borderColor = '#ff4444'; plInputUrl.placeholder = 'Could not parse playlist ID'; return; }
  const pls = loadPlaylists();
  if (pls.find(p => p.id === plId)) { closePlModal(); return; } // already added
  pls.push({ name, id: plId });
  savePlaylists(pls); closePlModal(); renderPlaylists();
}

document.getElementById('pl-cancel-btn').addEventListener('click', closePlModal);
document.getElementById('pl-save-btn').addEventListener('click', savePlaylist);
plOverlay.addEventListener('click', e => { if (e.target === plOverlay) closePlModal(); });

// ─── MISC ────────────────────────────────────────────────
refreshBtn.addEventListener('click', refreshAll);
searchEl.addEventListener('input', renderChannels);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeConfirm();
    closeModal();
    closePlModal();
    if (typeof closeNav === 'function') closeNav();
  }
  if (e.key === 'Enter') {
    if (confirmOverlay.classList.contains('open')) { doConfirm(); return; }
    if (overlay.classList.contains('open')) saveChannel();
    if (plOverlay.classList.contains('open')) savePlaylist();
  }
});
inputName.addEventListener('input', () => inputName.style.borderColor = '#444');
inputUrl.addEventListener('input',  () => inputUrl.style.borderColor  = '#444');
plInputName.addEventListener('input', () => plInputName.style.borderColor = '#444');
plInputUrl.addEventListener('input',  () => plInputUrl.style.borderColor  = '#444');


// ─── HASH INTAKE HANDLER ─────────────────────────────────
function handleHashIntake() {
  const hash = location.hash.slice(1); // strip leading #
  if (!hash) return;

  const params = Object.fromEntries(new URLSearchParams(hash));

  if (params['add-channel']) {
    const handle = params['add-channel'].startsWith('@')
      ? params['add-channel'] : '@' + params['add-channel'];
    const name = decodeURIComponent(params.name || handle);
    const url  = 'https://www.youtube.com/' + handle;
    const chs  = loadChannels();
    if (!chs.find(c => c.url === url)) {
      chs.push({ name, url });
      saveChannels(chs);
      showIntakeToast(`✔ Channel added: ${name}`);
    } else {
      showIntakeToast(`Already saved: ${name}`);
    }
    renderChannels();
  }

  if (params['add-playlist']) {
    const plId = params['add-playlist'];
    const name = decodeURIComponent(params.name || plId);
    const pls  = loadPlaylists();
    if (!pls.find(p => p.id === plId)) {
      pls.push({ name, id: plId });
      savePlaylists(pls);
      showIntakeToast(`✔ Playlist added: ${name}`);
    } else {
      showIntakeToast(`Already saved: ${name}`);
    }
    // Switch to playlists tab so user sees it
    document.querySelector('.tab-btn[data-tab="playlists"]').click();
  }

  // Clean the URL so refreshing doesn't re-add
  history.replaceState(null, '', location.pathname);
}

function showIntakeToast(msg) {
  let t = document.getElementById('intake-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'intake-toast';
    t.style.cssText = `
      position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
      background:#27ae60; color:#fff; padding:10px 20px; border-radius:24px;
      font-size:0.85rem; font-weight:600; z-index:999;
      box-shadow:0 4px 16px rgba(0,0,0,0.4);
      transition: opacity 0.4s;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = '1';
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}

// ─── INIT ────────────────────────────────────────────────
addBtn.style.display = '';
addBtn.onclick = openModal;
renderChannels();
handleHashIntake();