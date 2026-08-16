# REBELTV — Premium IPTV Browser

A lightweight, client-side IPTV browser that lets you discover, filter and watch live channels from iptv-org data sources. REBELTV is a dark-first, responsive single-page app built with plain JavaScript and Tailwind CSS, using video.js + hls.js for playback. No backend required — everything runs in the browser.

- Live demo (if deployed): see repository Vercel config (vercel.json)
- Data: pulls public JSON endpoints from iptv-org (channels, streams, logos, countries, categories, languages, blocklist)

## Features

- Browse thousands of channels sourced from iptv-org.
- Filters: category, country, language, search text.
- Favorites: mark channels to save them in localStorage.
- Custom streams: add your own .m3u8 or MP4 links.
- Lazy-loaded channel grid and logo images for performance.
- Premium player overlay built on video.js with hls.js fallback.
- PWA-friendly: includes a service worker (sw.js) and webmanifest.
- Accessibility-minded: keyboard support and ARIA attributes.
- Dark-first design with CSS design tokens in src/design-system.css.

## Technology / Stack

- Language: JavaScript (vanilla)
- Styling: Tailwind CSS (utility-first), custom design-system.css
- Player: video.js + hls.js (loaded via CDN)
- Build: Tailwind CLI (postcss & autoprefixer devDependencies)
- Data: iptv-org public JSON endpoints (no proprietary APIs)

Notable files:
- index.html — app entry and layout
- app.js — main application: data fetching, UI, filters, favorites
- app.player.js — player helpers and playback logic
- src/input.css, src/design-system.css — Tailwind input + custom design system
- dist/output.css — generated Tailwind output (built via npm scripts)
- FEATURES_ROADMAP.md — planned features and roadmap

## How it works (short)

On load, the app fetches iptv-org JSON (channels, streams, logos, blocklist, guides, feeds) and merges them into an in-memory channel list. The UI renders a hero area and a paginated, lazy-loaded grid of channel cards. Clicking a card opens a full-screen player overlay that uses video.js + hls.js to play the selected stream. User state (favorites and custom streams) is persisted to localStorage.

## Quickstart — run locally

1. Clone the repo
   git clone https://github.com/AllanKayz/rebeltv.git
   cd rebeltv

2. Install dev dependencies (only needed to run Tailwind build):
   npm install

3. Development (watch Tailwind and regenerate CSS):
   npm run dev
   This keeps dist/output.css updated while you edit src/input.css or other tailwind-using files.

4. Open the app:
   - Option A (quick): Open index.html in your browser. (Some browsers block fetches from file://; see option B.)
   - Option B (recommended): serve with a simple local HTTP server:
     - Using Node: npx http-server -c-1 .
     - Using Python 3: python -m http.server 8000
     Then visit http://localhost:8080 (or http://localhost:8000).

5. Production build (minified Tailwind):
   npm run build
   This generates dist/output.css for production.

Notes:
- No environment variables or backend required — the app fetches iptv-org public JSON endpoints directly from the browser.
- The service worker (sw.js) will register automatically when running over HTTP(S) and may cache assets.

## Usage

- Search and filter channels with the sidebar.
- Add custom streams from the sidebar's "Custom Streams" form.
- Click the heart icon to favorite channels (saved to localStorage).
- Click a channel card to open the player overlay. If a channel has multiple stream sources, choose the preferred source in the player.
- Toggle “Show Blocked” to include channels listed in the iptv-org blocklist.

## Development notes & conventions

- Main scripts:
  - "dev": watch Tailwind input and output to dist/output.css
  - "build": generate minified dist/output.css for production
- Tailwind configuration: tailwind.config.js
- Fonts and player CSS are loaded via CDN in index.html; design-system.css is included from src/.
- Keep logic organized in app.js (app-level state and UI) and app.player.js (playback helpers).
- Local state persisted in localStorage:
  - favorites: saved channel IDs
  - customStreams: list of custom streams

## Deployment

- The repository contains a Vercel configuration (vercel.json); static hosting platforms (Vercel, Netlify, GitHub Pages) are suitable.
- Ensure dist/output.css is built during your CI/deploy pipeline (npm run build).

## Roadmap and contribution pointers

See FEATURES_ROADMAP.md for the full roadmap. Short-term improvements planned include:
- Replace placeholder loading boxes with CSS skeleton components.
- Extract ChannelCard markup into a generator module for better reuse.
- Add a Hero / "Live Now" scaffold populated with real data.
- Improve player UX: loading indicators, retry logic, better fallback handling.
- Accessibility improvements.

Contributions welcome:
- Open an issue to discuss major changes.
- Send a PR with a clear description and a small, focused change.
- If modifying CSS, run the Tailwind build to update dist/output.css.

## Security & Legal / Disclaimer

- REBELTV uses third-party, community-maintained iptv-org data. The project does not endorse or guarantee stream legality, quality or availability.
- Users are responsible for ensuring they have the right to access content in their jurisdiction.
- Do not include private or copyrighted streams without permission.

## Troubleshooting

- Blank grid or CORS/fetch errors: ensure you serve index.html over HTTP(S) — some browsers restrict fetches on file://.
- Player fails to load HLS: check browser console; hls.js is used for non-native HLS playback. Some streams may be blocked or invalid.
- If Tailwind classes don’t apply: check dist/output.css is present and up-to-date (npm run dev or npm run build).

## License

This repository includes a LICENSE file. Review it for terms (LICENSE at project root).

## Acknowledgements

- iptv-org — public JSON feeds used as data source: https://github.com/iptv-org
- video.js and hls.js for playback
- Tailwind CSS for styling
