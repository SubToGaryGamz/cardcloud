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
- ✅ JWT email/password auth (register/login/me/logout)
- ✅ Emergent Google OAuth flow with /auth/callback + AuthCallback handling location.hash
- ✅ Object storage for card images + user avatars, owner-scoped file access
- ✅ Cards CRUD + stats + CSV export/import
- ✅ Search/filter by name, year, status, sport, and tag; `q` searches name/tags/sport
- ✅ Dashboard with 4 stat cards, color-coded profit
- ✅ Bento card grid with image thumbnails, sport badges, tag chips, status badges, per-card profit
- ✅ Dark sporty theme with Barlow Condensed + DM Sans
- ✅ Quick Sell per-card action
- ✅ Purchased/Sold date fields + time-range filter (All/30d/90d/1y)
- ✅ Charts: profit-over-time (area) + cards-by-year (bar)
- ✅ **Sport field** (Baseball, Basketball, Football, Hockey, Soccer, Golf, Tennis, Boxing/MMA, Wrestling, Racing, Pokemon, Other)
- ✅ **Tags** (free-form, lowercase-normalized, click-to-filter, tag cloud, /cards/tags aggregation)
- ✅ **Watchlist** page: target cards + notes + target price; one-click "Acquired" converts into a collection card
- ✅ **User Profile** page with editable name + avatar upload
- ✅ **CardCloud rebrand** with cloud logo + unified SiteHeader nav

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
