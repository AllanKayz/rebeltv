---
## Audit & Implementation Plan (summary)

Recent audit highlights:

- Technology: vanilla JavaScript + Tailwind CSS. No SPA framework. Player: video.js + hls.js (CDNs).
- Data: Uses iptv-org public JSON endpoints (channels, streams, logos, countries, categories, languages, blocklist).
- State: Single-file app state (app.js) with localStorage for favorites and custom streams.
- Current UI: Desktop sidebar + mobile header, channel grid, player overlay.

What has been changed so far:

- Added src/design-system.css — dark-first design tokens, card/button and skeleton styles.
- Added Inter + Manrope web fonts and linked design-system.css in index.html.
- Added FEATURES_ROADMAP.md with a phased plan for REBELTV 2.0.

Short-term plan (next commits):

1. Add README audit & implementation plan (this section).
2. Replace current placeholder loading boxes with CSS-based skeleton components.
3. Extract ChannelCard markup into a generator and use consistent CSS classes.
4. Add the Hero section and Live Now scaffold (UI-only using real data).
5. Improve player UX (loading / retry / fallback) and accessibility improvements.

Development notes:

- Tailwind build: `npm run dev` (watch) and `npm run build` (production) — these generate `dist/output.css` from `src/input.css`.
- The app runs by opening `index.html` (CDNs used for runtime libs). No backend changes required to preserve current functionality.

See FEATURES_ROADMAP.md for the full roadmap.
