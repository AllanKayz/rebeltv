# FEATURES_ROADMAP

This roadmap organises planned work for REBELTV 2.0. Items are grouped into phases. Markers show IMPLEMENTED / PARTIALLY IMPLEMENTED / PLANNED.

## Phase 1 — UI / UX (PRIORITY)
Status: Partially implemented
- Audit (completed)
- Design system (initial tokens & CSS added)
- App shell (sidebar + mobile header modernisation) — incremental improvements
- Homepage layout scaffolding (channel grid, loading skeletons)
- ChannelCard refactor (extract generator + consistent CSS)
- Accessibility baseline (focus states, ARIA plan)

## Phase 2 — Streaming & Player
Status: Planned
- Player polish: loading, error, retry, fallback stream selection
- Keyboard controls, PiP, fullscreen improvements
- Source selector UX & automatic fallback
- Stream error states & helpful messages

## Phase 3 — Personalisation
Status: Planned
- Favorites UI improvements and dedicated Favorites page
- Recently Watched / Continue Watching persisted to localStorage
- Toasts for add/remove actions
- My TV shell

## Phase 4 — Discovery & Search
Status: Planned
- Debounced global search with grouped results (Channels / Countries / Categories)
- Filter drawer (desktop popover, mobile full-screen)
- Discover page: Trending / Popular / New (UI only — no fake metrics)

## Phase 5 — TV Guide / EPG
Status: Planned / Conditional
- Build TV Guide component if EPG/guide data present
- Horizontal schedule UI and accessible navigation
- Otherwise: scaffold only, do not fabricate schedules

## Phase 6 — Mobile / PWA
Status: Planned
- Dedicated mobile navigation & bottom bar
- PWA readiness: installability, icons, service worker shell improvements
- Mobile player UX & touch targets

## Phase 7 — Performance & Observability
Status: Planned
- Lazy-loading, route-splitting, image optimisation
- Virtualisation for very large lists (if needed)
- Instrumentation and basic analytics

## Phase 8 — Future / Admin
Status: Planned
- Recommendation engine (phase-separated)
- Admin tools for stream management and moderation

---

Notes:
- No fake data will be added.
- Work will proceed incrementally; each commit will preserve existing functionality.
