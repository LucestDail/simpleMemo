const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const os = require('os');

const DATA_PATH = path.join(__dirname, 'data', 'memo.json');
const BACKUP_DIR = path.join(__dirname, 'data', 'backups');
const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, 'dist');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
  maxHttpBufferSize: 4e6,
});

let memoData = null;
let backupTimer = null;

const TAB_IDS = ['general', 'todo', 'links', 'ideas'];

function getDefaultSettings() {
  return {
    debounceMs: 300,
    offlineSync: true,
    theme: 'auto',
    boardFontSize: 16,
    autoFullscreen: false,
    backupIntervalHours: 24,
    backupKeep: 10,
  };
}

function getDefaultMemo() {
  return {
    activeTab: 'general',
    tabs: {
      general: { content: '', bgColor: '#1D1B20', textColor: '#E6E0E9' },
      todo:    { content: '', bgColor: '#1a1a2e', textColor: '#FFE082' },
      links:   { content: '', bgColor: '#0f1419', textColor: '#A5D6A7' },
      ideas:   { content: '', bgColor: '#1a0a2e', textColor: '#90CAF9' },
    },
    postIts: [],
    archive: [],
    settings: getDefaultSettings(),
  };
}

function ensureMemoShape() {
  if (!memoData || typeof memoData !== 'object') memoData = getDefaultMemo();
  if (!memoData.postIts) memoData.postIts = [];
  if (!Array.isArray(memoData.archive)) memoData.archive = [];
  if (!memoData.tabs) memoData.tabs = getDefaultMemo().tabs;
  TAB_IDS.forEach((id) => {
    if (!memoData.tabs[id]) {
      memoData.tabs[id] = getDefaultMemo().tabs[id];
    }
  });
  if (!memoData.activeTab) memoData.activeTab = 'general';
  memoData.settings = { ...getDefaultSettings(), ...(memoData.settings || {}) };

  // Normalize postit fields (backwards compat)
  const now = new Date().toISOString();
  memoData.postIts = memoData.postIts.map((p, i) => ({
    id: p.id || `pi-${Date.now()}-${i}`,
    tab: TAB_IDS.includes(p.tab) ? p.tab : 'general',
    x: Number.isFinite(p.x) ? p.x : 20,
    y: Number.isFinite(p.y) ? p.y : 20,
    width: Number.isFinite(p.width) ? p.width : 220,
    height: Number.isFinite(p.height) ? p.height : 160,
    title: p.title || '',
    content: p.content || '',
    color: p.color || '#FFF9C4',
    pinned: !!p.pinned,
    locked: !!p.locked,
    minimized: !!p.minimized,
    priority: ['none', 'low', 'mid', 'high'].includes(p.priority) ? p.priority : 'none',
    checklist: Array.isArray(p.checklist) ? p.checklist : null,
    zIndex: Number.isFinite(p.zIndex) ? p.zIndex : i,
    createdAt: p.createdAt || now,
    updatedAt: p.updatedAt || now,
  }));
  memoData.archive = memoData.archive.map((p) => ({
    ...p,
    archivedAt: p.archivedAt || now,
  }));
}

async function loadMemo() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    memoData = JSON.parse(raw);
  } catch (e) {
    if (e.code === 'ENOENT') {
      memoData = getDefaultMemo();
    } else {
      throw e;
    }
  }
  ensureMemoShape();
  await saveMemo();
  return memoData;
}

async function saveMemo() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(memoData, null, 2), 'utf-8');
}

async function createBackup() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(BACKUP_DIR, `memo-${stamp}.json`);
    await fs.writeFile(file, JSON.stringify(memoData, null, 2), 'utf-8');
    const keep = Math.max(1, Number(memoData.settings?.backupKeep) || 10);
    const entries = (await fs.readdir(BACKUP_DIR))
      .filter((f) => f.startsWith('memo-') && f.endsWith('.json'))
      .sort()
      .reverse();
    for (const extra of entries.slice(keep)) {
      await fs.unlink(path.join(BACKUP_DIR, extra)).catch(() => {});
    }
  } catch (e) {
    console.warn('backup failed:', e.message);
  }
}

function scheduleBackup() {
  if (backupTimer) clearInterval(backupTimer);
  const hours = Math.max(1, Number(memoData?.settings?.backupIntervalHours) || 24);
  backupTimer = setInterval(createBackup, hours * 3600 * 1000);
}

function applyMemoUpdate(body) {
  if (!body || typeof body !== 'object') return;
  if (body.activeTab !== undefined) memoData.activeTab = body.activeTab;
  if (body.tabs) {
    Object.keys(body.tabs).forEach((key) => {
      if (!memoData.tabs[key]) {
        memoData.tabs[key] = { content: '', bgColor: '#1D1B20', textColor: '#E6E0E9' };
      }
      const t = body.tabs[key] || {};
      if (t.content !== undefined) memoData.tabs[key].content = t.content;
      if (t.bgColor !== undefined) memoData.tabs[key].bgColor = t.bgColor;
      if (t.textColor !== undefined) memoData.tabs[key].textColor = t.textColor;
    });
  }
  if (Array.isArray(body.postIts)) memoData.postIts = body.postIts;
  if (Array.isArray(body.archive)) memoData.archive = body.archive;
  if (body.settings && typeof body.settings === 'object') {
    memoData.settings = { ...memoData.settings, ...body.settings };
  }
  ensureMemoShape();
}

function getLocalIp() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const ni of ifaces[name] || []) {
      if (ni.family === 'IPv4' && !ni.internal) return ni.address;
    }
  }
  return '127.0.0.1';
}

app.use(express.json({ limit: '4mb' }));
app.use(express.static(DIST_PATH));

app.get('/api/memo', (_req, res) => {
  res.json(memoData);
});

app.put('/api/memo', async (req, res) => {
  try {
    applyMemoUpdate(req.body);
    await saveMemo();
    io.emit('memo:update', memoData);
    res.json(memoData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/info', (_req, res) => {
  res.json({
    clients: io.engine.clientsCount,
    ip: getLocalIp(),
    port: PORT,
    url: `http://${getLocalIp()}:${PORT}`,
  });
});

app.post('/api/backup', async (_req, res) => {
  await createBackup();
  res.json({ ok: true });
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(DIST_PATH, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found — run `npm run build` first');
  });
});

function broadcastClients() {
  io.emit('info:clients', io.engine.clientsCount);
}

io.on('connection', (socket) => {
  socket.emit('memo:update', memoData);
  broadcastClients();

  socket.on('memo:save', async (payload) => {
    try {
      applyMemoUpdate(payload);
      await saveMemo();
      io.emit('memo:update', memoData);
    } catch (e) {
      socket.emit('memo:error', e.message);
    }
  });

  socket.on('board:refresh', () => {
    io.emit('board:refresh');
  });

  socket.on('disconnect', broadcastClients);
});

async function main() {
  await loadMemo();
  scheduleBackup();
  httpServer.listen(PORT, '0.0.0.0', () => {
    const ip = getLocalIp();
    console.log(`SimpleMemo running at http://${ip}:${PORT}`);
    console.log('  Controller: /');
    console.log('  Board:      /board');
    console.log('  Search:     /search');
    console.log('  Settings:   /settings');
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
