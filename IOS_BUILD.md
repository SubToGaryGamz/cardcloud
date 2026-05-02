# CardCloud iOS — Build & Submission Guide

You now have a Capacitor-based iOS project that wraps your existing React app. This guide is everything you need to take it from this repository to a live App Store listing.

> **You can't build iOS binaries on Linux/Windows.** You need a Mac with Xcode. The steps below run **on your Mac**, after you copy/clone this repo there (or run it from this same Emergent-mounted volume on a Mac if you have access).

---

## 0) One-time prerequisites (on your Mac)

1. **Install Xcode** — Mac App Store, latest stable (≥ 15.x).
2. **Install Xcode command-line tools**: `xcode-select --install`
3. **Install Node 20+ and Yarn 1.22+** (e.g. via `nvm install 20 && npm i -g yarn`).
4. **Install CocoaPods**: `sudo gem install cocoapods` (or `brew install cocoapods`).
5. **Apple Developer Program enrollment** — https://developer.apple.com/programs/ (US$99/year, individual or organization). Until enrolled you can run on the simulator and on your own iPhone in dev mode, but you cannot submit to the App Store.

---

## 1) Configure the app for your domain

The iOS app is a thin native shell around the same React build. The webview talks to your existing backend at `REACT_APP_BACKEND_URL`.

Edit `/app/frontend/.env` (or set on Mac) so the bundle points at your **production** backend URL (the same one users hit on web):

```bash
REACT_APP_BACKEND_URL=https://cardprofitlog.preview.emergentagent.com
```

> When you deploy to your custom domain (e.g. `https://cardcloud.app`), update this value before building, then re-run the build + sync steps below.

If you're using a real custom domain, also update the iOS bundle ID and team in Xcode (step 4).

---

## 2) Install JS deps & build the React app

```bash
cd /app/frontend
yarn install
yarn build           # outputs to build/ — Capacitor copies this into iOS
```

---

## 3) Sync into iOS

```bash
npx cap sync ios     # copies build/ + plugins into ios/App/App/public, runs pod install
```

This step requires CocoaPods (see prerequisites). If `pod install` fails, try:

```bash
cd ios/App && pod install --repo-update && cd ../..
```

---

## 4) Open in Xcode and configure signing

```bash
npx cap open ios
```

Xcode opens `ios/App/App.xcworkspace`. In the project navigator:

1. Select the **App** target → **Signing & Capabilities** tab.
2. **Team**: pick your Apple Developer team.
3. **Bundle Identifier**: `com.cardcloud.app` (already set in `capacitor.config.ts`). If that ID is taken, pick something unique like `com.<yourname>.cardcloud`.
4. **Display Name**: `CardCloud` (already set in `Info.plist`).
5. **Marketing Version**: e.g. `1.0.0`. **Build**: `1`.
6. Make sure **"Automatically manage signing"** is checked.

### App icons
Already wired up. Located at:
`ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png` (1024×1024 master).

### Splash screen
Already wired up at `ios/App/App/Assets.xcassets/Splash.imageset/`.

### Privacy permissions (Info.plist)
Already added:
- `NSCameraUsageDescription`
- `NSPhotoLibraryUsageDescription`
- `NSPhotoLibraryAddUsageDescription`
- `ITSAppUsesNonExemptEncryption=false` (skips the export compliance prompt)

---

## 5) Run on a simulator (sanity check)

In Xcode: pick a simulator (e.g. iPhone 15) from the toolbar → press ▶︎ Run.

You should see the splash screen, then the app loads. Sign in flows hit the same backend as your website.

---

## 6) Run on a real iPhone (free, dev-only)

1. Plug your iPhone into your Mac.
2. Trust the computer on the phone.
3. In Xcode toolbar, pick your iPhone as the target → Run.
4. On the phone: Settings → General → VPN & Device Management → trust your developer profile.

---

## 7) App Store submission

### a) Create the App Store record
1. Go to https://appstoreconnect.apple.com.
2. **My Apps** → **+** → **New App**.
3. Platform: iOS. Name: **CardCloud**. Primary Language: English. Bundle ID: `com.cardcloud.app`. SKU: `cardcloud-ios`.
4. Fill in:
   - **Privacy Policy URL**: `https://cardprofitlog.preview.emergentagent.com/privacy` (or your custom domain `/privacy`)
   - **Support URL**: same domain `/` is fine, or a `/support` page if you add one.
   - **Marketing URL** (optional): your landing page.
   - **App description**: short pitch + features (use the landing-page copy as a base).
   - **Keywords**: `sports cards, collection, tracker, profit, flips, ebay, watchlist, vault`
   - **Screenshots**: required for iPhone 6.7" (1290×2796) and iPhone 6.5" (1242×2688). Use the in-app screens — Vault, charts, Best Flip, Public showcase, Profile/Pro page.
   - **App icon**: 1024×1024 (use `/app/frontend/public/icons/icon-1024.png`).
5. **Pricing**: Free (Pro is in-app via Stripe — see "Pro tier note" below).

### b) Archive & upload from Xcode
1. In Xcode toolbar, change the build target from a simulator to **"Any iOS Device (arm64)"**.
2. Menu **Product → Archive**. Wait for the build.
3. The Organizer window opens → **Distribute App** → **App Store Connect** → **Upload**.
4. Pick your team, automatic signing, default options. Upload.
5. After ~10 min, the build appears in App Store Connect → TestFlight tab.

### c) TestFlight (recommended)
1. Add yourself as an internal tester (Users and Access).
2. Install TestFlight on your iPhone, sign in, install CardCloud.
3. Smoke-test all flows on a real device.

### d) Submit for review
1. Back to App Store Connect → your app → **App Store** tab → **Prepare for Submission**.
2. Attach the build you uploaded. Fill in the required fields:
   - Sign-in info: provide your demo account `demo@example.com` / `demo1234` so reviewers can log in.
   - Notes: e.g. "Pro tier upgrade is processed via Stripe at $6/month outside the app, per Apple guideline 3.1.3(a) for **reader-style services**." (See Pro tier note below.)
3. Click **Submit for Review**.

Apple typically reviews within 24–48h.

---

## ⚠️ Pro tier note — IMPORTANT

Right now CardCloud uses **Stripe Checkout** for the Pro tier ($6/month). Apple's guideline 3.1.1 normally requires that digital goods/services consumed within the app use **In-App Purchase (IAP)**, paying Apple 15–30%.

You have **three** options. Pick one before submitting:

### Option A — Disable Pro upgrade in iOS only (safest, fastest approval)
Hide the "Upgrade to Pro" button when running inside the iOS app. Users can still upgrade by visiting your website on Safari. To detect, set a flag in `capacitor.config.ts` and check at runtime:

```js
import { Capacitor } from "@capacitor/core";
const isNative = Capacitor.isNativePlatform();
// hide upgrade button if isNative
```

This is the cleanest way to land your first build without IAP integration.

### Option B — Add Apple In-App Purchase
Implement RevenueCat or `@capacitor-community/in-app-purchases` to add a $6.99/month auto-renewing subscription product in App Store Connect. This is more work (1–2 extra days) but gives parity. Web users keep paying via Stripe.

### Option C — Argue "reader" exemption
If you can demonstrate CardCloud is a "reader" app (3.1.3(a)) that lets users access content they purchased elsewhere, you can keep external billing. This is risky for review and not recommended for a brand-new app.

**My recommendation: ship with Option A first, add Option B in a follow-up release.**

I've already left a `Capacitor.isNativePlatform()` check ready to wire up — just open `Profile.jsx`, `Dashboard.jsx`, and `Landing.jsx` and gate the Pro CTAs behind it. (If you want me to do that now, just say so.)

---

## 8) Updating the app after launch

Whenever you change React code:

```bash
cd /app/frontend
yarn build
npx cap sync ios
# in Xcode: bump build number, Product → Archive → Distribute → Upload
```

For pure server-side changes (backend `server.py`), no app store update is needed — the WebView fetches from your live backend.

---

## 9) Key files in this repo

- `frontend/capacitor.config.ts` — app id, name, plugins
- `frontend/public/manifest.json` — PWA manifest
- `frontend/public/icons/` — generated brand icons (rebuild via `python3 /tmp/gen_icons.py`)
- `frontend/ios/App/App/Info.plist` — privacy strings, app metadata
- `frontend/ios/App/App/Assets.xcassets/` — AppIcon + Splash assets
- `frontend/src/pages/Privacy.jsx` — `/privacy` page (App Store requirement)
- `frontend/src/pages/Terms.jsx` — `/terms` page

---

## 10) Quick checklist before "Submit for Review"

- [ ] Privacy Policy URL set in App Store Connect
- [ ] Reviewer test account provided (demo@example.com / demo1234)
- [ ] App icon 1024×1024 uploaded
- [ ] At least 3 screenshots per required size
- [ ] Bundle ID matches App Store Connect listing
- [ ] Marketing version + build number bumped
- [ ] Pro upgrade hidden in iOS (Option A) **OR** IAP wired up (Option B)
- [ ] Tested on a real iPhone via TestFlight
- [ ] No console errors, all critical flows work

That's it. Welcome to the App Store. 🚀
