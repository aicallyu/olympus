# Claude Code — Mission Brief

Read the attached document `ONIOKO-QUALITY-GATE-SYSTEM.md` completely before writing a single line of code.

This document describes a verification and quality gate system for our AI agent team. Your job is to implement it inside the OLYMP repo (`aicallyu/olympus`).

## Rules

- This is Vite + React + react-router-dom + TypeScript STRICT + Tailwind. NOT Next.js.
- Use `@/components`, `@/lib` path aliases.
- No `any` types. No `@ts-ignore`.
- Before writing any new component, read 2-3 existing components to match their patterns.
- Do NOT skip phases. Do NOT jump to Phase 6 before Phases 1-5 are done.
- After each phase: tell me what you did, what files you changed, and confirm it builds (`npm run build` + `npx tsc --noEmit`).

## Execution Order

**Start with Phase 1 only.** Do not proceed to Phase 2 until I confirm.

### Phase 1: Database & Core
1. Check the current codebase — `src/` structure, existing components, how Supabase client is set up
2. Run the SQL migration from the doc (projects table, updated task statuses, gate_status, verifications table, triggers)
3. Seed the 3 project configs (OLYMP, DevStackX, Onioko)
4. Find and fix the broken Task Creation button — it currently does nothing on click. Debug it, check Supabase client init, check onClick handler, fix it.
5. Add acceptance_criteria as a required field in the task creation form, with the templates from the doc

After Phase 1: Report what you found, what was broken, what you fixed. Run build + typecheck. Wait for my go.

The full implementation plan (Phases 2-6) is in the document. We go phase by phase. No rushing.
