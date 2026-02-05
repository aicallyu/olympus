# Task OLY-018: Responsive Design for Mobile

**Agent:** ATLAS (Frontend)
**Priority:** HIGH
**Status:** READY
**Blocked by:** OLY-016, OLY-017 (should include responsive)

## Objective
Make OLYMPUS Dashboard fully responsive: iPhone, iPad, Desktop, Laptop.

## Breakpoints
- **Mobile:** < 640px (iPhone primary)
- **Tablet:** 640px - 1024px (iPad)
- **Desktop:** > 1024px (current, already works)

## Mobile Adaptations (< 640px)

### Header
- Logo + "OLYMPUS" only (hide "Command of the Gods" subtext)
- Hamburger menu for navigation (or bottom tab bar)
- Clock smaller

### Overview Page
- Stats row: 2x2 grid instead of 5-column row
- Pantheon: Single column scroll (not 3x2 grid)
- Activity feed: Full-width below, not sidebar

### Task Board
- Single column scroll (Kanban doesn't work on mobile)
- Cards stack vertically by status
- Filter tabs instead of columns

### Agent Status
- Single column agent cards
- Full-width on click for profile

### Activity
- Timeline full width
- Simplified entries

## Technical
- Tailwind responsive classes: `sm:`, `md:`, `lg:`
- Touch-friendly: larger tap targets (min 44px)
- Mobile nav: Bottom tab bar or hamburger
- Test on actual iPhone dimensions (390x844)

## Acceptance
- [ ] Works on iPhone (390px width)
- [ ] Works on iPad (820px width)
- [ ] Desktop unchanged (> 1024px)
- [ ] No horizontal scroll on mobile
- [ ] Touch targets >= 44px
- [ ] Readable text (no zoom needed)

## Files to modify
- All page components need responsive classes
- Header.tsx (mobile nav)
- Layout adjustments
