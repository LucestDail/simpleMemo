const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const DATA_PATH = path.join(__dirname, 'data', 'memo.json');
const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, 'dist');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

let memoData = null;

const TAB_IDS = ['general', 'todo', 'links', 'ideas'];

function getDefaultMemo() {
  return {
    activeTab: 'general',
    tabs: {
      general: { content: '', bgColor: '#000000', textColor: '#ffffff' },
      todo: { content: '', bgColor: '#1a1a2e', textColor: '#ffff00' },
      links: { content: '', bgColor: '#0f0f0f', textColor: '#e0e0e0' },
      ideas: { content: '', bgColor: '#1a0a2e', textColor: '#90caf9' },
    },
    postIts: [],
  };
}

function ensureMemoShape() {
  if (!memoData.postIts) memoData.postIts = [];
  if (!memoData.tabs) memoData.tabs = getDefaultMemo().tabs;
  TAB_IDS.forEach((id) => {
    if (!memoData.tabs[id]) {
      memoData.tabs[id] = getDefaultMemo().tabs[id];
    }
  });
  if (!memoData.activeTab) memoData.activeTab = 'general';
}

async function loadMemo() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    memoData = JSON.parse(raw);
    ensureMemoShape();
    return memoData;
  } catch (e) {
    if (e.code === 'ENOENT') {
      memoData = getDefaultMemo();
      await saveMemo();
      return memoData;
    }
    throw e;
  }
}

async function saveMemo() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(memoData, null, 2), 'utf-8');
}

function applyMemoUpdate(body) {
  if (body.activeTab !== undefined) memoData.activeTab = body.activeTab;
  if (body.tabs) {
    Object.keys(body.tabs).forEach((key) => {
      if (!memoData.tabs[key]) {
        memoData.tabs[key] = { content: '', bgColor: '#000000', textColor: '#ffffff' };
      }
      const t = body.tabs[key];
      if (t.content !== undefined) memoData.tabs[key].content = t.content;
      if (t.bgColor !== undefined) memoData.tabs[key].bgColor = t.bgColor;
      if (t.textColor !== undefined) memoData.tabs[key].textColor = t.textColor;
    });
  }
  if (body.postIts !== undefined) {
    memoData.postIts = Array.isArray(body.postIts) ? body.postIts : memoData.postIts;
  }
  ensureMemoShape();
}

app.use(express.json());
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

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  res.sendFile(path.join(DIST_PATH, 'index.html'), (err) => {
    if (err) res.status(404).send('Not found — run `npm run build` first');
  });
});

io.on('connection', (socket) => {
  socket.emit('memo:update', memoData);

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
});

async function main() {
  await loadMemo();
  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`e202sa-board running at http://0.0.0.0:${PORT}`);
    console.log('  Controller: /');
    console.log('  Board:      /board');
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
