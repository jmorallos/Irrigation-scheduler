---
name: orchestrate
description: >-
  Parent coordination loop for unc-irrigation-scheduler multi-step work.
  Delegates planner → implementer|ui-forms → verifier → debugger on failure.
  Use when the user invokes /orchestrate or asks to run a client brief across
  Prog, Valves, Sched, or Sum without the parent implementing large changes alone.
disable-model-invocation: false
---

# Orchestrate — Irrigation Scheduler

Parent agent coordinates; specialists do the work. Do **not** implement large multi-file changes yourself.

## Invoke

- Slash: `/orchestrate` with the brief or checklist
- Custom Mode: **Alt+Enter** (Windows/Linux) or **Option+Enter** (macOS), then run this skill
- Specialists: `/planner`, `/implementer`, `/ui-forms`, `/verifier`, `/debugger` (or Task → those subagents)

## Loop

```
planner (readonly)
  → for each step in dependency order:
      implementer  OR  ui-forms (forms/layout only)
      → verifier (readonly)
      → if FAIL: debugger → verifier again
  → after TWO failed verify rounds on the same step: STOP and report the gap
```

### Parallelism

- Independent steps (no shared file writes) **may** run in parallel.
- Colliding edits (same file, or Prog schedule utils + ProgramForm together) must be **sequential**.
- Typical collision hubs: `ProgramForm.jsx`, `programSchedule.js`, `Zones.jsx`/`ZoneForm.jsx`, `WeeklySchedule.jsx`, `Dashboard.jsx`/`summaryLabels.js`.

### Who does what

| Agent | Role |
|-------|------|
| `planner` | Map brief → real paths; ordered steps; verify criteria. No app code. |
| `implementer` | Smallest logic/UI change matching existing style. |
| `ui-forms` | Create Program / Zone form field order, validation, portrait, labels. |
| `verifier` | Prove with `npm test` / build / wired UI+data flow. Never "should work". |
| `debugger` | Root-cause only after a real failure; then re-verify. |

## Repo anchors

- Stack: React 19 + Vite 8 + Tailwind v4 PWA (`npm run dev` → http://localhost:5173)
- Tabs: Prog `/programs` · Valves `/valves` · Sched `/schedule` · Sum `/summary`
- Tests: `npm test` → `scripts/verify-features.mjs`
- Domain: Programs own dates/times; Valves/Sched/Sum display derived data

## Parent responsibilities

1. Call `planner` first; do not skip.
2. Dispatch one step at a time (or safe parallel groups).
3. Pass verifier failures to `debugger` with the exact failure text.
4. Stop after two failed verify rounds; report: step, evidence, gap, suggested human click-test.
5. Final user report: shipped vs deferred, verifier matrix, click-test steps.
6. Do not commit unless the user asked.

## Anti-patterns

- Parent coding the whole brief alone
- Skipping planner or verifier
- Parallel agents editing `ProgramForm.jsx` + `programSchedule.js` at once
- Debugger without a failing assert / verifier item
- Accepting "should work" from any specialist
