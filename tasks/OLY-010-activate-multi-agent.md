# Task OLY-010: Activate Multi-Agent Routing

**Agent:** ARGOS (Orchestrator) → Coordination
**Priority:** HIGH
**Status:** IN PROGRESS

## Objective
OLYMPUS von "Single-Agent-Mode" (nur ARGOS) auf "Multi-Agent-Mode" umstellen. Tasks werden automatisch an spezialisierte Agents geroutet.

## Agent Capabilities Map

| Agent | Domain | Handles |
|-------|--------|---------|
| ATLAS | Frontend | React, TypeScript, CSS, UI, Vite |
| HERCULOS | Backend | API, Database, Hono, Node.js |
| PROMETHEUS | DevOps | Docker, CI/CD, Deployment, Cloud |
| ATHENA | QA | Testing, Code Review, Quality Assurance |
| APOLLO | Design | UI/UX Concepts, Mockups, Visual Design |
| HERMES | Docs | READMEs, Documentation, API Docs |
| ARGOS | Orchestration | Task Assignment, Coordination, Decisions |

## Implementation

### 1. Task Router Logic
```
Incoming Task → Analyze Domain → Route to Agent
```

Keywords für Routing:
- **ATLAS:** "frontend", "react", "css", "ui", "component", "vite", "tailwind"
- **HERCULOS:** "backend", "api", "database", "server", "endpoint", "sql"
- **PROMETHEUS:** "docker", "deploy", "ci/cd", "pipeline", "cloud", "infrastructure"
- **ATHENA:** "test", "qa", "review", "quality", "check", "validate"
- **APOLLO:** "design", "mockup", "ui/ux", "visual", "aesthetic", "color"
- **HERMES:** "docs", "documentation", "readme", "guide", "explain"
- **ARGOS:** "decide", "coordinate", "plan", "strategy", "assign"

### 2. Task Assignment Flow
1. Task comes in (from Juan or system)
2. ARGOS analyzes and categorizes
3. ARGOS assigns to appropriate Agent
4. Agent executes on next heartbeat
5. Agent reports completion
6. ARGOS validates and closes task

### 3. Dashboard Integration
Tasks sollen sichtbar machen:
- Which agent is working on what
- Current status per agent
- Completed tasks per agent
- Agent uptime/heartbeat status
- Model usage per agent

## Acceptance Criteria
- [ ] Routing logic active
- [ ] First tasks assigned to each agent
- [ ] Dashboard shows agent-specific activities
- [ ] Completion tracking works

## Dependencies
- Dashboard needs activity feed enhancement (OLY-011)
