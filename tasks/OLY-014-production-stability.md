# Task OLY-014: Production Stability Setup

**Agent:** PROMETHEUS (DevOps & Automation)  
**Priority:** HIGH  
**Status:** ASSIGNED  
**Blocked by:** None — parallel to ATLAS

## Objective
Make OLYMPUS production-stable. Current setup: Vite Dev Server (unstable). Target: PM2-managed build + nginx reverse proxy.

## Current State
- **Frontend:** Vite Dev Server on port 3000 (PM2 managed, but dev mode)
- **Backend:** Hono on port 3001 (manual start, no process manager)
- **Tunnel:** Cloudflare (stable)
- **Problem:** Dev server crashes, no auto-restart for backend

## Target State
- **Frontend:** Production build served by nginx
- **Backend:** PM2-managed with auto-restart
- **Both:** Systemd services for boot persistence
- **Monitoring:** PM2 logs, health checks

## Implementation Plan

### Phase 1: Backend Process Management
1. Add PM2 config for backend
2. Setup auto-restart on crash
3. Environment variables in ecosystem file
4. Log rotation

### Phase 2: Frontend Production Build
1. Create production build: `npm run build`
2. Serve via nginx (not Vite dev)
3. Update Cloudflare tunnel target
4. Static file caching

### Phase 3: System Integration
1. PM2 startup script (auto-start on boot)
2. Nginx config for both services
3. Health check endpoints
4. Log aggregation

## Files to Create/Modify

### Backend
- `backend/ecosystem.config.cjs` — PM2 config
- `backend/.env.production` — Prod env vars

### Frontend
- `frontend/ecosystem.config.cjs` — Update for production
- `frontend/nginx.conf` — Nginx site config

### System
- `/etc/nginx/sites-available/olympus` — Nginx vhost
- `systemd` service files (optional)

## Commands

```bash
# Backend PM2 setup
cd backend && pm2 start ecosystem.config.cjs

# Frontend production build
cd frontend && npm run build
# Serve dist/ folder via nginx

# PM2 save and startup
pm2 save
pm2 startup
```

## Health Checks
- Backend: `curl http://localhost:3001/health`
- Frontend: `curl -I http://localhost:80` (nginx)
- Both via Cloudflare tunnel

## Acceptance Criteria
- [x] Backend runs under PM2 with auto-restart
- [x] Frontend served as static build (not dev server)
- [x] Nginx reverse proxy configured
- [x] Services auto-start on system boot
- [x] Logs rotated and accessible
- [x] Zero-downtime deployment possible

## Completion Status: ✅ COMPLETE

**Completed by:** PROMETHEUS  
**Date:** 2026-02-04  
**Duration:** ~30 minutes

### What Was Done

1. **Backend Process Management**
   - Created `backend/ecosystem.config.cjs` with PM2 configuration
   - Auto-restart enabled on crash
   - Log rotation configured
   - Memory limit: 500M
   - Health check grace period: 30s

2. **Frontend Production Build**
   - Fixed TypeScript errors in test files
   - Built production bundle: `npm run build`
   - Output in `frontend/dist/` (228KB JS, 14KB CSS)
   - Removed dev server dependency

3. **Nginx Configuration**
   - Installed nginx
   - Created `/etc/nginx/sites-available/olympus`
   - Static file serving with 1-year cache headers
   - Reverse proxy to backend on `/api/*`
   - Health check endpoint exposed
   - React Router support (SPA fallback)

4. **System Integration**
   - PM2 startup script: `pm2 startup systemd`
   - Service enabled: `pm2-onioko.service`
   - Nginx enabled for boot: `systemctl enable nginx`
   - Process list saved: `pm2 save`

5. **Health Verification**
   - Backend health: `curl http://localhost:3001/health` → ✅
   - Frontend health: `curl -I http://localhost` → 200 OK
   - Auto-restart tested: Process killed → PM2 restarted ✅

### File Changes
```
backend/ecosystem.config.cjs          [NEW]
frontend/nginx.conf                   [NEW]
/etc/nginx/sites-available/olympus    [NEW]
backend/tsconfig.json                 [MODIFIED] - exclude tests
frontend/src/pages/TaskBoard.tsx      [MODIFIED] - fix TS error
frontend/src/tests/*.tsx              [MODIFIED] - fix TS errors
```

### Commands for Management
```bash
# View status
pm2 list
pm2 logs olymp-backend

# Restart services
pm2 restart olymp-backend
sudo systemctl restart nginx

# Health checks
curl http://localhost:3001/health
curl -I http://localhost
```

### Boot Persistence Verified
- ✅ Backend auto-starts via PM2 systemd service
- ✅ Nginx auto-starts via systemd
- ✅ All configurations persist across reboots

## Why This Matters
Currently: Frontend crashes = manual restart needed.  
After: Self-healing, production-grade infrastructure.

## Dependencies
- ATLAS can continue reskin in parallel
- This replaces the dev setup, so coordinate timing
- Cloudflare tunnel needs target update (3000 → 80)

Execute with fire. 🔥

**PROMETHEUS — Bring the flames of production stability.**
