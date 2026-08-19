import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'cooperativa_db.json');

app.use(express.json({ limit: '10mb' }));

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Get local IPv4 addresses for local network hosting display
function getLocalNetworkAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

// Read database from file
function readDatabase(): any | null {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return null;
}

// Write database to file safely
function writeDatabase(data: any): boolean {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    return false;
  }
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Network Info for Local Wi-Fi / LAN hosting
app.get('/api/network-info', (req, res) => {
  const ips = getLocalNetworkAddresses();
  res.json({
    port: PORT,
    localIPs: ips,
    primaryUrl: ips.length > 0 ? `http://${ips[0]}:${PORT}` : `http://localhost:${PORT}`,
    allUrls: ips.map((ip) => `http://${ip}:${PORT}`),
    hostname: os.hostname(),
  });
});

// Get Database State
app.get('/api/data', (req, res) => {
  const db = readDatabase();
  res.json({ success: true, data: db });
});

// Save Entire Database State
app.post('/api/data', (req, res) => {
  const state = req.body;
  if (!state) {
    return res.status(400).json({ success: false, error: 'Dados inválidos' });
  }
  state.lastUpdated = new Date().toISOString();
  const success = writeDatabase(state);
  res.json({ success, lastUpdated: state.lastUpdated });
});

// Reset Database to Fresh State
app.post('/api/reset-data', (req, res) => {
  try {
    if (fs.existsSync(DB_FILE)) {
      fs.unlinkSync(DB_FILE);
    }
    res.json({ success: true, message: 'Banco resetado com sucesso' });
  } catch (err) {
    res.status(500).json({ success: false, error: String(err) });
  }
});

// Export Database Backup JSON
app.get('/api/backup', (req, res) => {
  const db = readDatabase();
  if (!db) {
    return res.status(404).json({ error: 'Nenhum dado encontrado para backup' });
  }
  res.setHeader('Content-Disposition', `attachment; filename=backup_cooperativa_pizzahut_${Date.now()}.json`);
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(db, null, 2));
});

// Restore Database Backup JSON
app.post('/api/restore', (req, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.drivers || !backupData.records) {
    return res.status(400).json({ success: false, error: 'Arquivo de backup inválido' });
  }
  backupData.lastUpdated = new Date().toISOString();
  writeDatabase(backupData);
  res.json({ success: true, data: backupData });
});

async function startServer() {
  // Setup Vite middleware for development or serve dist for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    const ips = getLocalNetworkAddresses();
    console.log(`====================================================`);
    console.log(`🍕 PIZZA HUT - COOPERATIVA DE ENTREGADORES`);
    console.log(`🚀 Servidor rodando em: http://localhost:${PORT}`);
    ips.forEach((ip) => {
      console.log(`📱 Acesso na Rede Local (WiFi/LAN): http://${ip}:${PORT}`);
    });
    console.log(`====================================================`);
  });
}

startServer();
