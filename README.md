# Rex-Doom Tracker

Lead tracking for admins and tellycallers — import leads, assign callers, qualify on mobile, export results.

## Publish (Render + MongoDB Atlas)

### 1. MongoDB Atlas (database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free M0 cluster.
2. **Database Access** → add a database user with password.
3. **Network Access** → add `0.0.0.0/0` (required for Render).
4. **Connect** → Drivers → copy the connection string.
5. Replace `<password>` with your user password and append the database name:
   `mongodb+srv://USER:PASS@cluster.mongodb.net/rex_doom?retryWrites=true&w=majority`

### 2. GitHub (source code)

```bash
cd rex-doom-tracker
git init -b main
git add -A
git commit -m "Initial Rex-Doom Tracker release"
```

Create a repo on GitHub and push:

```bash
git remote add origin https://github.com/YOUR_USER/rex-doom-tracker.git
git push -u origin main
```

### 3. Render (hosting)

1. Go to [render.com](https://render.com) → **New** → **Blueprint**.
2. Connect your GitHub repo (Render reads `render.yaml`).
3. Set these environment variables when prompted:
   - `MONGO_URL` — Atlas connection string from step 1
   - `ADMIN_USERNAME` — your admin login (e.g. `admin`)
   - `ADMIN_PASSWORD` — strong password (only used on first deploy to seed admin)
   - `CORS_ORIGINS` — your Render URL, e.g. `https://rex-doom-tracker.onrender.com`
4. Deploy. First build takes ~5–10 minutes (Docker builds frontend + backend).

Your live URL will be `https://rex-doom-tracker.onrender.com` (or the name you chose).

### 4. After deploy

- Sign in with your `ADMIN_USERNAME` / `ADMIN_PASSWORD`.
- Create caller accounts under **Callers**.
- Import leads under **Lead bank** → **Import leads**.
- Click **Distribute queue** to assign leads to callers.

## Local development

Requires Node 20+ and Python 3.12+.

```bash
# Backend
cd backend
cp .env.example .env   # fill in values; set COOKIE_SECURE=false for local HTTP
pip install -r requirements.txt
uvicorn server:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
# Point API at local backend
echo VITE_BACKEND_URL=http://localhost:8000 > .env.local
npm run dev
```

Open http://localhost:5173

## Environment variables

| Variable | Description |
|----------|-------------|
| `MONGO_URL` | MongoDB connection string |
| `DB_NAME` | Database name (default: `rex_doom`) |
| `JWT_SECRET` | Random secret for session tokens |
| `ADMIN_USERNAME` | Initial admin username (seeded once) |
| `ADMIN_PASSWORD` | Initial admin password (seeded once) |
| `CORS_ORIGINS` | Comma-separated allowed origins |
| `COOKIE_SECURE` | `true` for HTTPS production, `false` for local dev |

## Notes

- Free Render tier sleeps after inactivity; first visit may take ~30s to wake.
- Phone numbers are hidden from callers until they tap **Reveal & call**.
- Change admin password after first login (password-change UI is on the backlog).
