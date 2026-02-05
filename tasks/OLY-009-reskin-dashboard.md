# Task OLY-009: Reskin OLYMPUS Dashboard

**Agent:** ATLAS (Frontend Engineer)  
**Priority:** HIGH  
**Status:** IN PROGRESS  
**Assigned:** 2026-02-04  
**Type:** Visual Reskin (kein Rebuild)

---

## Objective
Bestehendes OLYMPUS Frontend vom generischen SaaS-Design auf Premium Command Center Aesthetic umstylen. **Data Layer und Routing bleiben unverändert** — nur Visual Layer ersetzen.

## Design Reference
**File:** `OlympusDashboard.jsx` (Inline-Styles Mockup)  
**Aesthetic:** Dark Command Center, Gold/Amber Accents

### Color Palette
| Element | Value |
|---------|-------|
| Background | `#0a0a0e` |
| Surface | `#16161c` / `#0e0e12` |
| Primary Accent | `#a88e57` (Gold/Amber) |
| Success | `#22c55e` |
| Error | `#ef4444` |
| Text Primary | `#e5e5e5` |
| Text Secondary | `#9ca3af` |
| Text Muted | `#6b7280` / `#4b5563` |
| Border | `rgba(255,255,255,0.04)` - `0.06` |

### Typography
- **Headers/Labels:** JetBrains Mono (uppercase, wide letter-spacing)
- **Body:** Inter (bestehend)
- **Sizes:** 9px-11px für Labels, 16px-20px für Headers

### Key Visual Elements

#### 1. Header
```
OLYMPUS
Command of the Gods
```
- Logo: Gold/Amber (#a88e57)
- Tagline: Muted gray, JetBrains Mono
- Status Indicator: "SYSTEM ONLINE" mit grünem Glow-Dot
- Clock: HH:MM:SS in JetBrains Mono

#### 2. Navigation Tabs
```
OVERVIEW | TASK BOARD | AGENTS | ACTIVITY
```
- Active: Gold underline + Gold text
- Inactive: Muted gray
- Letter-spacing: 0.12em

#### 3. Atmospheric Effects
- **Radial Gradient:** `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(168,142,87,0.06) 0%, transparent 60%)`
- **Scan Lines:** `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.008) 2px, rgba(255,255,255,0.008) 4px)`
- Beide als `position: fixed`, `pointer-events: none`

#### 4. Agent Cards
- Gradient Background: `linear-gradient(135deg, rgba(22,22,28,0.9) 0%, rgba(18,18,22,0.95) 100%)`
- Border: Subtle `rgba(255,255,255,0.06)`
- Selected State: Gold-tinted gradient + Gold border
- Active Indicator: Top border glow `linear-gradient(90deg, transparent, #a88e57, transparent)`
- Status Dot: Green glow für active
- Fonts: JetBrains Mono für Name/Model/Heartbeat

#### 5. Task Cards
- Background: `rgba(22,22,28,0.8)`
- Border: `rgba(255,255,255,0.05)`
- Hover: Gold border tint
- Priority Badges:
  - High: Red `rgba(239,68,68,0.15)` bg
  - Normal: Gold `rgba(168,142,87,0.15)` bg
  - Low: Gray `rgba(107,114,128,0.15)` bg

#### 6. System Metrics Bar
- 5 Spalten Grid
- Background: `rgba(255,255,255,0.03)` mit Border
- Values: Große JetBrains Mono Zahlen
- Labels: Uppercase, letter-spacing 0.1em

#### 7. Activity Feed
- Timeline-Dots mit Farbcodierung:
  - success: #22c55e
  - task: #a88e57
  - heartbeat: #374151
  - review: #8b5cf6
  - blocked: #ef4444
- Zeitstempel: JetBrains Mono
- Agent-Name: JetBrains Mono, bold

### Layout Structure (aus Mockup)
```
┌─────────────────────────────────────────────────────┐
│ OLYMPUS - Command of the Gods    [SYSTEM ONLINE]  ⏰ │
├─────────────────────────────────────────────────────┤
│ OVERVIEW | TASK BOARD | AGENTS | ACTIVITY           │
├─────────────────────────────────────────────────────┤
│ [Metrics: Agents | Tasks | Completed | Avg | Cost]  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  The Pantheon        │  Activity Feed              │
│  [Agent Cards Grid]  │  [Timeline]                 │
│                      │                             │
│  Active Tasks        │                             │
│  [Task Cards]        │                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Fonts (Google Fonts)
```html
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

---

## Implementation Notes

### Was bleibt (nicht ändern)
- React Router Routes
- Data Fetching Logic (TanStack Query)
- State Management
- Component Structure
- API Calls

### Was wird ersetzt
- **index.css:** Neue Tailwind Config mit Gold/Amber Palette
- **Tailwind Config:** Custom colors, fonts
- **App.tsx:** Header, Navigation, Layout Wrapper
- **Page Components:** Dashboard.tsx, TaskBoard.tsx, AgentStatus.tsx, ActivityFeed.tsx
- **Component Styles:** Tailwind Klassen durch neue Palette ersetzen

### CSS Approach
**Option A (Recommended):** Tailwind mit Custom Config
- `tailwind.config.js` erweitern mit `colors.olympus` keys
- Utility-Klassen nutzen wo möglich

**Option B:** CSS-in-JS für komplexe Gradients
- Inline Styles für atmosphärische Effekte
- Tailwind für Layout/Spacing

---

## Acceptance Criteria
- [ ] Header zeigt "OLYMPUS - Command of the Gods" in Gold/Amber
- [ ] Radial Gradient + Scan Line Effekte sichtbar
- [ ] Agent Cards zeigen Status Glow (obere Border)
- [ ] Alle technischen Texte in JetBrains Mono
- [ ] Navigation Tabs haben Gold Active-State
- [ ] System Metrics Bar mit 5 Spalten
- [ ] Farbpalette durchgehend Gold/Amber statt Blau/Lila
- [ ] Keine visuellen Regressions in Funktionalität

## API Domain Change
- **Old:** `olyp.onioko.com`
- **New:** `olympus-api.onioko.com`
- Update in `vite.config.ts` Proxy Config
- Update in API client base URL

---

## Files to Modify
1. `/frontend/tailwind.config.js` — Color Palette
2. `/frontend/src/index.css` — Global Styles, Fonts
3. `/frontend/src/App.tsx` — Header, Navigation, Layout
4. `/frontend/vite.config.ts` — API Domain
5. `/frontend/src/pages/Dashboard.tsx` — Overview Tab
6. `/frontend/src/pages/TaskBoard.tsx` — Task Board Tab
7. `/frontend/src/pages/AgentStatus.tsx` — Agents Tab
8. `/frontend/src/pages/ActivityFeed.tsx` — Activity Tab

## Reference
Siehe `OlympusDashboard.jsx` (Juan's Mockup) für exakte Farbwerte, Spacing, und Effekte.

**Estimated Time:** 2-3 hours  
**Dependencies:** None (purely visual)
