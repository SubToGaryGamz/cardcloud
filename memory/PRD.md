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
