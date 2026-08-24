const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const ROOT = __dirname;
const SCORES_FILE = path.join(ROOT, 'scores.json');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function readScores(){
  try{
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf8'));
  }catch(err){
    return []; // file doesn't exist yet, or is empty
  }
}

function writeScores(list){
  fs.writeFileSync(SCORES_FILE, JSON.stringify(list, null, 2));
}

const server = http.createServer((req, res) => {
  // ---- API: leaderboard ----
  if (req.url === '/leaderboard' && req.method === 'GET') {
    const list = readScores().sort((a, b) => a.time - b.time || a.moves - b.moves);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(list.slice(0, 10)));
    return;
  }

  if (req.url === '/score' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try{
        const entry = JSON.parse(body);
        if (typeof entry.name !== 'string' || typeof entry.time !== 'number' || typeof entry.moves !== 'number') {
          res.writeHead(400); res.end('Invalid entry'); return;
        }
        entry.name = entry.name.slice(0, 18); // basic guardrail
        const list = readScores();
        list.push(entry);
        writeScores(list);
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
  const ext = path.extname(filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Puzzle running at http://localhost:${PORT}`);
});