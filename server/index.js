import express from 'express';
import cors from 'cors';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';

import { restaurantsRouter, loadRestaurants } from './routes/restaurants.js';
import { sessionsRouter } from './routes/sessions.js';
import { registerSocketHandlers } from './socket/handlers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'restaurants.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3000;
const isDev = process.env.NODE_ENV !== 'production';

loadRestaurants(DATA_PATH);

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/restaurants', restaurantsRouter);
app.use('/api/sessions', sessionsRouter);

if (!isDev && fs.existsSync(PUBLIC_DIR)) {
  app.use(express.static(PUBLIC_DIR));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return next();
    res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
  });
}

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: '*' },
});
registerSocketHandlers(io);

function getLanIPs() {
  const ifaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) ips.push(iface.address);
    }
  }
  return ips;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\nLunchSpin server listening on port ${PORT}`);
  console.log(`Mode: ${isDev ? 'development' : 'production'}`);
  console.log('Local URLs:');
  console.log(`  http://localhost:${PORT}`);
  for (const ip of getLanIPs()) console.log(`  http://${ip}:${PORT}`);
  if (isDev) console.log(`\nDev: open Vite at http://localhost:5173 (proxies /api and /socket.io here)\n`);
});
