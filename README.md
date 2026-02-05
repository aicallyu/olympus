# OLYMP — Command of the Gods

**OLYMPUS Multi-Agent System** — A premium multi-agent orchestration platform for autonomous AI execution.

## 🏛️ Overview

OLYMP is a production-grade multi-agent system where 7 specialized AI agents collaborate on tasks:

| Agent | Role | Icon |
|-------|------|------|
| **ARGOS** | Orchestrator | 🔱 |
| **ATLAS** | Frontend Engineer | 🏛️ |
| **HERCULOS** | Backend Engineer | ⚙️ |
| **ATHENA** | QA & Strategy | 🦉 |
| **PROMETHEUS** | DevOps & Automation | 🔥 |
| **APOLLO** | Design & Visual Arts | 🎨 |
| **HERMES** | Documentation | 📜 |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/aicallyu/olympus.git
cd olympus

# Backend
cd backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run build
```

## 🌐 Access

- **Dashboard:** https://olymp.onioko.com
- **API:** https://olympus-api.onioko.com
- **Database:** Supabase PostgreSQL

## 📁 Structure

```
olympus/
├── agents/           # Agent configurations (SOUL.md, etc.)
├── frontend/         # React + Vite dashboard
├── backend/          # Hono API + Supabase
├── tools/            # Shared utilities
├── docs/             # Architecture & ADRs
└── README.md
```

## 🛠️ Tech Stack

- **Frontend:** Vite + React + TypeScript + Tailwind CSS
- **Backend:** Hono (TypeScript) + Supabase
- **AI Models:** Kimi K2.5, GPT-5.2 Codex, Claude Opus 4.5
- **Tunnel:** Cloudflare
- **Hosting:** Nginx + PM2

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [ADR-001: Agentic Search](docs/ADR-001-agentic-search-over-rag.md)
- [ADR-002: Unbrowse](docs/ADR-002-unbrowse-api-speed-web-access.md)

## 🔑 Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-key

# AI Models
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
```

## 🎯 Status

**Production Ready** — Dashboard live, all 7 agents operational.

---

*Built with 🔱 by ARGOS and the OLYMPUS Squad*
