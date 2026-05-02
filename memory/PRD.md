# CardCloud — Sports Card Collection Tracker (PRD)

## Brand
Name: **CardCloud** (previously CardVault). Logo: Cloud icon over red gradient badge.

## Original Problem Statement
Build me a website in which I can track my sports card collection. I want to be able to input
1. the card year
2. the card name
3. where I bought the card
4. how much I paid for the card
5. how much I sold the card for
6. any expenses such as shipping, fees, etc.

Make a page that shows 1. total sales 2. total price paid 3. profit.

## User Choices (gathered Feb 2026)
- Auth: JWT email/password + Emergent-managed Google login
- Card images: optional per card
- Card status: In Collection / Sold (profit only on sold cards)
- Design: Modern dark sporty + clean minimal — designer chose dark luxury-athletic
- Extras: Search/filter by name and year, CSV export

## Architecture
- Backend: FastAPI + Motor (MongoDB), JWT (PyJWT) + bcrypt, Emergent Auth + Object Storage
- Frontend: React 19, React Router, Tailwind, Shadcn UI, Axios, Sonner, Lucide
- DB collections: users, user_sessions, cards, files

## User Personas
- The flipper: buys cards, sells them, needs to know real profit (subtracting fees and shipping)
- The collector: tracks what they own and what they paid

## Core Requirements (static)
- CRUD per card: year, name, where_bought, price_paid, price_sold, expenses, status, image (optional)
- Stats: total_paid (all), total_sales (sold), total_expenses (all), profit (sold sales − sold paid − sold expenses)
- Search by name, filter by year, filter by status
- CSV export
- Multi-user, isolated data

## Implemented (Feb 2026)
- ✅ **Public Landing page at `/`** — hero, features grid, how-it-works, **pricing section (Starter $0 vs Pro $6/mo)**, showcase callout, CTAs (auth-aware: "Get started" → "Open my vault")
- ✅ JWT email/password auth + Emergent Google OAuth
- ✅ Object storage for card images + user avatars
- ✅ Cards CRUD + stats + CSV export/import
- ✅ Search/filter by name, year, status, sport, tag, **condition**
- ✅ Dashboard with 4 stat cards, color-coded profit
- ✅ Charts: profit-over-time + cards-by-year
- ✅ Quick Sell, Purchased/Sold dates, time-range filter
- ✅ Sport field + Tags
- ✅ Watchlist + Acquire flow
- ✅ User Profile + avatar
- ✅ Multi-image per card + Lightbox
- ✅ Public Showcase (per-card share link + public vault)
- ✅ Watchlist price suggestions (eBay sold comps + AI estimate via Claude)
- ✅ **Condition** (Raw/PSA/BGS/SGC/CGC/Other) + **Grade** (1.0–10.0)
- ✅ **Best Flip of the Month** dashboard tile (red gradient, image + profit)
- ✅ **Card tile button layout fixed**: Quick Sell full-width row + Edit/Share equal 50/50 row
- ✅ **Stripe Pro tier ($6/mo)** with checkout, gating CSV import/export and IRS Form 8949 tax export
- ✅ **Light/Dark theme toggle** in header
- ✅ **Keyboard shortcuts**: n=new card, /=focus search, 1/2=jump to In Collection / Sold sections
- ✅ **Pro upsell banner** on Vault dashboard (only shown to free users)
- ✅ **Light-mode polish**: gradient stops (best flip card, sold tiles, image placeholders) properly themed for light mode
- ✅ **Logo click → Landing while signed-in** (token preserved; Landing renders auth-aware "Open my vault")
- ✅ **iOS App Store readiness** — Capacitor wrapper added (`@capacitor/core` + `ios`/`splash-screen`/`status-bar`/`keyboard`), `capacitor.config.ts` (`com.cardcloud.app`), iOS Xcode project scaffolded at `frontend/ios/`, App Icon (1024×1024) + Splash assets generated from Cloud logo, Info.plist privacy strings (camera/photos), iOS safe-area CSS, PWA manifest + meta tags, `/privacy` + `/terms` pages, Pro upgrade automatically gated when running on native (App Store IAP compliance, Option A). Build guide at `/app/IOS_BUILD.md`.
- ✅ **Logout error overlay fix** — request interceptor cancels protected requests when no token (no more in-flight 401 blob errors); response interceptor strips stale token on 401; `index.html` global handlers swallow cross-origin "Script error." and axios blob `responseText` DOMException + `unhandledrejection` for `CanceledError`.
- ✅ **Pro tier gating expanded** — Watchlist (full lockdown: nav lock icon + paywall page with eBay/AI feature pitch + upgrade CTA, native shows "Upgrade on web" copy); Tags now limited to 1/card on Free vs unlimited on Pro (backend enforces with 402 + descriptive error, frontend `TagInput` shows yellow upgrade hint when limit reached); existing watchlist data preserved server-side across upgrade/downgrade. `/api/billing/me` now returns `limits.tags_per_card`.
- ✅ **Annual Pro plan ($65/yr) + 7-day free trial** — Monthly/Yearly toggle on Landing pricing (~~$72~~ $65/yr badge "Save $7/yr · 1 month free"), Profile page split-button (Monthly trial button + Yellow Yearly button), backend `PACKAGES` adds `pro_yearly`, expiry calc uses 365 days for yearly + +7 days TRIAL for first-time monthly subscribers, `ever_pro` flag prevents trial double-dip.
- ✅ **AI price estimates removed** — `/api/watchlist/{id}/estimate` endpoint deleted, "AI estimate" button + display gone from Watchlist tiles, all "AI" copy stripped from Pricing/Profile/Dashboard upsell. eBay sold-comp links remain as the watchlist value.
- ✅ **OG / Twitter social meta on public showcase** — New backend endpoints `/api/share/c/{token}` and `/api/share/v/{token}` serve crawler-friendly HTML with `og:title/description/image/url` + Twitter card tags, then JS-redirect real browsers to the SPA route. Uses `X-Forwarded-Proto/Host` headers for correct public URLs, omits `og:image` cleanly when card has no image. Share-link copy in CollectionCard + Profile vault now points to these URLs. iMessage/Twitter/Discord/Slack now show full card preview.
- ✅ **CardCloud watermark + Track-Yours CTA on public pages** — `<CardCloudStamp>` overlay (bottom-right of every public card image) + `<TrackYoursCTA>` red gradient button. PublicCard shows it under the card, PublicVault shows it in the header AND footer for max viral lift.
- ✅ **Public pages respect viewer's system theme** — New `usePublicTheme` hook reads `prefers-color-scheme: light` and updates live; PublicCard + PublicVault now have full light + dark variants (header, body, image placeholders, tag pills, dividers, owner badge).
- ✅ **Mobile bottom nav** — `<MobileBottomNav>` (`md:hidden`, fixed bottom, safe-area padding) with 4 tabs: Vault · Watchlist (locked icon for free users) · Add (red FAB) · Profile. Active-tab indicator (red bar + bold label). Mounted on Dashboard, Watchlist, Profile. Top-nav links hide on `<md` so we don't double up. Add button dispatches `cardcloud:open-add-card` event when on /dashboard, otherwise navigates to `/dashboard?add=1` and Dashboard's effect opens the modal.
- ✅ **Swipe-left to Quick Sell** — `CollectionCard` listens to `touchstart/move/end`; swiping the tile left (≥60px) reveals a green "Quick Sell" underlay and triggers the existing Quick Sell modal flow. Disabled for sold cards. Vertical-scroll vs horizontal-swipe disambiguation via dx/dy comparison.
- ✅ **AI Photo Intake (Vision LLM)** — New `POST /api/cards/scan-image` endpoint accepts JPEG/PNG/WEBP up to 8 MB, sends it to Claude Sonnet 4.5 via `emergentintegrations.LlmChat` with `ImageContent(image_base64=...)`, returns structured `{year, name, sport, set, tags[], condition_suggestion, confidence}`. Frontend Add Card modal has a yellow "AI SCAN" callout with "Scan with AI" button (uses `capture="environment"` for direct camera capture on mobile). Pre-fills year, name, sport, and tags; toast shows confidence %; success badge "✓ filled N fields". Verified end-to-end with the LeBron 2003 Topps RC image: 98% confidence, 7-second roundtrip, all fields correctly extracted (year=2003, name="LeBron James", sport="Basketball", tags=[cavaliers, rookie, draft pick #1, topps, lebron james]).
- ✅ **LeBron RC demo image** uploaded to demo account's "2003 LeBron James Topps RC" card, so the public showcase URL now renders the real card art (and OG previews include it for shared links).
- ✅ **Beta tester invite codes** — new `POST /api/billing/redeem-code` accepts a code and grants `BETA_DAYS` (default 90) of Pro instantly, idempotent across re-redeems (stacks from current expiry). Codes configurable via `BETA_INVITE_CODES` env (default `"beta"`, comma-separated for more). New `<BetaCodeDialog>` intercepts both "Start 7-day free trial" buttons (Profile + Landing pricing CTA): user can enter a code or skip to Stripe checkout. Sets `is_beta:true` flag in `/api/billing/me`. Verified live: `beta` ✓, `BETA` (case-insensitive) ✓, invalid → 400, empty → 400. After redemption, the Pro badge appears in header, Watchlist becomes accessible.
- ✅ **AI scan "BETA" badge** — small blue pill next to the "AI SCAN" label in the Add Card modal callout, signaling beta-stage feature transparency.

## Known Notes
- EMERGENT_LLM_KEY has a small budget cap in dev. If AI estimates return 502, top up in Profile → Universal Key → Add Balance.

## Backlog (Prioritised)
- P1: User profile + avatar upload
- P2: Multi-image per card (front/back/raw vs slabbed)
- P2: PSA/grading details, set/manufacturer fields, cost-basis FIFO/average
- P2: Mobile-optimized cards layout refinements
- P3: Tags/notes, public read-only share link for a card
- P3: Per-user currency setting (USD default)

## Test Credentials
See `/app/memory/test_credentials.md`

## Next Action Items
- Add charts and time-series stats
- Add per-card "sold date" + "purchased date"
- Optional: bulk CSV import
