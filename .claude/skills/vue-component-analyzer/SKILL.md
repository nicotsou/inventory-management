---
name: vue-component-analyzer
description: Analyze Vue 3 component structure in client/src and report performance and code-reuse optimization opportunities. Use when asked to audit, review, or optimize .vue files, views, or components for performance or duplication.
---

# Vue Component Structure Analyzer

Audits `client/src/views/*.vue` and `client/src/components/*.vue` for performance issues and
missed reuse opportunities, and produces a prioritized, file:line-referenced report. This skill
is analysis-only — it does not edit files itself. Follow the **MANDATORY RULE** in CLAUDE.md and
delegate any resulting `.vue` changes to the `vue-expert` subagent.

## Workflow

1. **Scope the audit.** Default scope is all files under `client/src/views/` and
   `client/src/components/`. If the user names specific files or a feature area, scope to those
   instead.
2. **Read every in-scope `.vue` file in full** (not excerpts — reactivity bugs and duplication
   only show up when you see the whole `<script setup>` block and template together).
3. **Check each file against the categories below.** Note concrete findings with file:line.
4. **Cross-file pass.** Compare templates/logic across files to find duplication (category 4)
   that a single-file read can't reveal.
5. **Report findings** grouped by category, each with file:line, a one-line explanation of the
   concrete cost (re-renders, wasted computation, drift risk), and a specific fix.
6. **If the user asks you to apply fixes**, delegate the actual `.vue` edits to the `vue-expert`
   subagent per CLAUDE.md's mandatory rule — pass it this report as context so it doesn't
   re-derive the analysis.

## Analysis Categories

### 1. Reactivity correctness (performance-relevant bugs, highest priority)

- `v-for` keyed on array `index` instead of a stable id (`sku`, `id`, `month`, etc.) — per
  CLAUDE.md's own "Common Issues" list. This forces full re-renders/re-mounts of list items on
  reorder or filter changes instead of Vue's keyed patching. (Known offender in this repo:
  `views/Reports.vue` — `quarterlyData`/`monthlyData` loops use `:key="index"`.)
- Derived values computed inline in the `<template>` or recomputed inside a `v-for` body instead
  of being hoisted into a `computed()` — recalculates on every render pass instead of only when
  dependencies change.
- Raw filter/API data stored in a `computed()` instead of a `ref`, or vice versa — check against
  CLAUDE.md's stated pattern: raw data in refs (`allOrders`, `inventoryItems`), derived data in
  computed properties. A computed that itself holds mutable state, or a ref that's manually kept
  in sync with another ref via a watcher where a computed would do, are both red flags.
- `watch()` with `{ deep: true }` on a large array/object where a more targeted watch (specific
  field, or a computed source) would avoid diffing the whole structure on every mutation.
- Watchers that duplicate work a computed already does, or that exist only to copy one ref's
  value into another.

### 2. Expensive work in the render path

- `.filter()`/`.map()`/`.sort()`/`.reduce()` chains over large arrays (inventory items, orders,
  transactions) that aren't wrapped in `computed()` — recomputes on every parent re-render.
- Multiple separate `computed()` properties that each independently filter/iterate the same
  source array (e.g. several computeds each doing `allOrders.value.filter(...)`) — candidate to
  merge into one pass or derive from a shared intermediate computed.
- Formatting/parsing work (date parsing, currency formatting, string building) done inline in the
  template per list item instead of once in a computed or a memoized helper.

### 3. Component boundaries and props/emit hygiene

- Large view files (`views/*.vue`) that mix multiple visual sections with independent state —
  candidates to split into child components so unrelated sections don't re-render together.
- Props passed through 2+ levels unchanged ("prop drilling") where `provide`/`inject` or a
  shared composable would remove the relay.
- Components accepting broad object props (e.g. a whole `order` or `item`) when only 1-2 fields
  are used — widens the re-render trigger surface to any change on the object.
- Missing `defineProps`/`defineEmits` typing that would make reuse across views safer.

### 4. Code reuse / duplication across components

- Near-identical `<script setup>` logic repeated across views/components (e.g. similar filter-
  application logic, similar modal open/close state, similar date/currency formatting) that
  should be extracted into a `composables/` function (e.g. `useFilters()`, `useCurrency()`).
- Repeated template structures (e.g. the modal pattern shared by `*DetailModal.vue` components,
  or repeated stat-card/table markup across views) that could become a shared component or slot-
  based wrapper.
- Copy-pasted styles in `<style scoped>` blocks that duplicate rules already in `App.vue`'s
  design system (colors, status badges) instead of reusing shared classes.

### 5. Lifecycle and cleanup

- `onMounted` that fetches data without a matching check for component unmount/re-fetch races
  (e.g. filter changes firing overlapping requests).
- Event listeners, timers, or watchers set up without corresponding `onUnmounted` cleanup.

## Report Format

For each finding:

```
[Category] file:line — one-sentence description of the concrete cost
  Fix: specific, actionable change
```

Order findings by category (1 → 5), and within a category by impact (list-heavy views like
Orders/Inventory/Dashboard first, since they hold the largest datasets in this app). Skip
categories with no findings rather than noting "none found."

## Notes specific to this codebase

- The app has no build-time bundle-size concerns to check (no route-level code splitting is used
  today) — focus on runtime reactivity/render cost, not bundle size.
- `client/src/views/*.vue` are the pages most likely to hold large lists (`inventoryItems`,
  `allOrders`) — prioritize these over `components/*.vue` for performance findings.
- `client/src/components/*DetailModal.vue` (Backlog, Cost, Inventory, Product, Profile) are the
  most promising target for category 4 (shared modal composable/wrapper) — read all of them
  together before concluding they duplicate structure.
- Do not flag anything already called out in CLAUDE.md's "Common Issues" as if it were new —
  cite it as a known, still-unfixed issue instead.
