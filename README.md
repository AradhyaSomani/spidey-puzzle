# Spider-Man Containment Puzzle — Campus Quest 5.0

A 3×3 sliding puzzle with a timer, move counter, a "Web-Vision" hint power-up
(+10s penalty), and a shared leaderboard backed by a tiny Node server.

## Before deploying

1. Put your artwork at `assets/spiderman.jpeg` (this repo does not include it —
   add your own event image).
2. No dependencies to install — `server.js` only uses Node's built-in `http`
   and `fs` modules.

## Run locally

```bash
node server.js
```

Open http://localhost:3000

## Deploy — Render.com (recommended, free tier)

1. Push this folder to a GitHub repo.
2. Go to https://render.com → New → Web Service → connect the repo.
3. Settings:
   - **Environment:** Node
   - **Build Command:** (leave blank — no dependencies)
   - **Start Command:** `node server.js`
4. Deploy. Render gives you a public URL like `https://spidey-puzzle.onrender.com`.

Notes:
- Render's free tier spins the service down after inactivity and wipes the
  filesystem on redeploy — `scores.json` will reset when that happens. Fine
  for a single-day event; if you need the leaderboard to survive long-term,
  swap `scores.json` for Render's free PostgreSQL add-on later.
- Free tier also "sleeps" after ~15 min idle — the first visitor after a
  quiet spell will see a ~30s cold start. Worth testing right before the
  event, or upgrading to a paid instance for the day if that's disruptive.

## Deploy — Railway.app (alternative, also free-tier friendly)

1. https://railway.app → New Project → Deploy from GitHub repo.
2. Railway auto-detects Node and runs `node server.js` — no config needed.
3. Under Settings → Networking, click "Generate Domain" for a public URL.

## Deploy — your own VPS / campus server

```bash
git clone <your-repo-url>
cd spidey-puzzle
nohup node server.js &
```

Put it behind Nginx/Caddy with a domain + HTTPS if you want a clean link to
hand out at the event.

## What's NOT included

The security/anti-cheat backend discussed earlier (session-based server-side
timing, rate limiting, input validation middleware) is a separate, larger
upgrade — this deploy is the straightforward client + simple leaderboard
version. Say the word if you want that layered in before the event.
