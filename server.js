const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

async function readScores(){
  try{
    const res = await fetch(`${UPSTASH_URL}/get/scores`, {
      headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
    });
    const data = await res.json();
    return data.result ? JSON.parse(data.result) : [];
  }catch(err){
    console.error('readScores failed', err);
    return [];
  }
}

async function writeScores(list){
  await fetch(`${UPSTASH_URL}/set/scores`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` },
    body: JSON.stringify(list),
  });
}

const server = http.createServer((req, res) => {
  // ---- API: leaderboard ----
  if (req.url === '/leaderboard' && req.method === 'GET') {
    readScores().then(list => {
      list.sort((a, b) => a.time - b.time || a.moves - b.moves);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(list.slice(0, 10)));
    });
    return;
  }

  if (req.url === '/score' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try{
        const entry = JSON.parse(body);
        if (typeof entry.name !== 'string' || typeof entry.time !== 'number' || typeof entry.moves !== 'number') {
          res.writeHead(400); res.end('Invalid entry'); return;
        }
        entry.name = entry.name.slice(0, 18);
        entry.time = Math.max(0, Math.floor(entry.time));
        entry.moves = Math.max(0, Math.floor(entry.moves));

        const list = await readScores();
        list.push(entry);
        await writeScores(list);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      }catch(err){
        res.writeHead(400); res.end('Bad request');
      }
    });
    return;
  }

  // ---- static files ----
  let filePath = req.url === '/' ? '/index.html' : req.url;
  filePath = path.join(ROOT, filePath);

  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Puzzle running on port ${PORT}`);
});