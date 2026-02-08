const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');

const DATA_PATH = path.join(__dirname, 'data', 'memo.json');
const PORT = process.env.PORT || 3000;
const DIST_PATH = path.join(__dirname, 'dist');
const PUBLIC_PATH = path.join(__dirname, 'public');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

let memoData = null;

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

function getDefaultMemo() {
  return {
    activeTab: 'general',
    tabs: {
      general: { content: '', bgColor: '#000000', textColor: '#ffffff' },
      todo: { content: '', bgColor: '#000000', textColor: '#ffff00' },
      links: { content: '', bgColor: '#000000', textColor: '#e0e0e0' },
      ideas: { content: '', bgColor: '#000000', textColor: '#90caf9' },
    },
    postIts: [],
  };
}

function ensureMemoShape() {
  if (!memoData.postIts) memoData.postIts = [];
  if (!memoData.tabs) memoData.tabs = getDefaultMemo().tabs;
  if (!memoData.activeTab) memoData.activeTab = 'general';
}

async function saveMemo() {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(memoData, null, 2), 'utf-8');
}

app.use(express.json());

// Vue 빌드(dist)가 있으면 우선 서빙, 없으면 public
app.use(express.static(DIST_PATH));
app.use(express.static(PUBLIC_PATH));

app.get('/api/memo', (req, res) => {
  res.json(memoData);
});

app.put('/api/memo', async (req, res) => {
  try {
    const body = req.body;
    if (body.activeTab !== undefined) memoData.activeTab = body.activeTab;
    if (body.tabs) {
      Object.keys(body.tabs).forEach((key) => {
        if (!memoData.tabs[key]) memoData.tabs[key] = { content: '', bgColor: '#000000', textColor: '#ffffff' };
        if (body.tabs[key].content !== undefined) memoData.tabs[key].content = body.tabs[key].content;
        if (body.tabs[key].bgColor !== undefined) memoData.tabs[key].bgColor = body.tabs[key].bgColor;
        if (body.tabs[key].textColor !== undefined) memoData.tabs[key].textColor = body.tabs[key].textColor;
      });
    }
    if (body.postIts !== undefined) memoData.postIts = Array.isArray(body.postIts) ? body.postIts : memoData.postIts || [];
    ensureMemoShape();
    await saveMemo();
    io.emit('memo:update', memoData);
    res.json(memoData);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// SPA 폴백: Vue 빌드 시 /, /board 등은 index.html로; 없으면 legacy public 페이지
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
  const indexPath = path.join(DIST_PATH, 'index.html');
  const legacyBoard = path.join(PUBLIC_PATH, 'board.html');
  const legacyIndex = path.join(PUBLIC_PATH, 'index.html');
  require('fs').access(indexPath, (err) => {
    if (!err) return res.sendFile(indexPath);
    if (req.path === '/board') return res.sendFile(legacyBoard);
    if (req.path === '/' || req.path === '') return res.sendFile(legacyIndex);
    next();
  });
});

io.on('connection', (socket) => {
  socket.emit('memo:update', memoData);

  socket.on('memo:save', async (payload) => {
    try {
      if (payload.activeTab !== undefined) memoData.activeTab = payload.activeTab;
      if (payload.tabs) {
        Object.keys(payload.tabs).forEach((key) => {
          if (!memoData.tabs[key]) memoData.tabs[key] = { content: '', bgColor: '#000000', textColor: '#ffffff' };
          if (payload.tabs[key].content !== undefined) memoData.tabs[key].content = payload.tabs[key].content;
          if (payload.tabs[key].bgColor !== undefined) memoData.tabs[key].bgColor = payload.tabs[key].bgColor;
          if (payload.tabs[key].textColor !== undefined) memoData.tabs[key].textColor = payload.tabs[key].textColor;
        });
      }
      if (payload.postIts !== undefined && Array.isArray(payload.postIts)) memoData.postIts = payload.postIts;
      ensureMemoShape();
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
    console.log('  Controller: GET /');
    console.log('  Board:      GET /board');
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
