# Attendance PWA — Project Condition Report
**Generated:** 2026-02-25 | **Status:** SaaS Backend Added, Pending Database & Deployment

---

## 1. Project Overview

| Property | Value |
|---|---|
| Project Name | Student Attendance Tracker |
| Type | Progressive Web App (PWA) + Serverless SaaS Backend |
| Frontend Stack | Vanilla HTML / CSS / JavaScript |
| Backend Stack | Node.js Serverless Functions (Vercel) |
| Database | Supabase PostgreSQL (schema written, not yet deployed) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Payments | Razorpay (integration code complete) |
| Deployment Target | Vercel |

---

## 2. File Structure — Current State

```
/Attendance project
├── index.html              ✅ Existing — main PWA app (untouched)
├── style.css               ✅ Existing — full design system + logout btn appended
├── app.js                  ✅ Existing — PWA logic + auth guard + logout btn injected
├── login.html              ✅ New — JWT login page (matches design)
├── register.html           ✅ New — registration page (matches design)
├── manifest.json           ✅ Existing — PWA manifest
├── service-worker.js       ⚠️  Existing — needs update (see §5)
├── package.json            ✅ New — npm dependencies defined
├── package-lock.json       ✅ Auto-generated — node_modules installed
├── vercel.json             ✅ New — Vercel serverless config
├── .env.example            ✅ New — environment variable template
├── supabase_schema.sql     ✅ New — full DB schema (NOT yet run in Supabase)
│
├── /api
│   ├── register.js         ✅ New — POST /api/register
│   ├── login.js            ✅ New — POST /api/login
│   ├── attendance.js       ✅ New — GET & POST /api/attendance
│   ├── create-order.js     ✅ New — POST /api/create-order (Razorpay)
│   └── webhook.js          ✅ New — POST /api/webhook (HMAC verified)
│
├── /lib
│   ├── supabaseClient.js   ✅ New — Supabase singleton (service role)
│   └── authMiddleware.js   ✅ New — JWT Bearer validator
│
├── /assets
│   ├── logo-new.jpg        ✅ In use
│   ├── logo.jpg            ✅ Backup
│   ├── icon-192.png        ✅ PWA icon
│   ├── icon-512.png        ✅ PWA icon
│   └── logo.png            ✅ Backup
│
├── /node_modules           ✅ 53 packages installed, 0 vulnerabilities
│
├── app_backup.js           🗑️  Old backup — safe to delete
├── index_backup.html       🗑️  Old backup — safe to delete
├── style_backup.css        🗑️  Old backup — safe to delete
├── start_server.bat        🗑️  Legacy local server script — no longer needed
├── INSTRUCTIONS.md         📄  Existing docs
└── README.md               📄  Existing docs
```

---

## 3. Backend — Feature Completion

| Feature | File | Status |
|---|---|---|
| User registration + bcrypt hashing | `api/register.js` | ✅ Complete |
| 2-day free trial on registration | `api/register.js` | ✅ Complete |
| JWT login (7-day token) | `api/login.js` | ✅ Complete |
| Attendance GET (subscription-gated) | `api/attendance.js` | ✅ Complete |
| Attendance POST/upsert (subscription-gated) | `api/attendance.js` | ✅ Complete |
| Subscription expiry 403 guard | `api/attendance.js` | ✅ Complete |
| Razorpay order creation | `api/create-order.js` | ✅ Complete |
| Razorpay webhook HMAC SHA256 verify | `api/webhook.js` | ✅ Complete |
| Subscription extension on payment | `api/webhook.js` | ✅ Complete — extends from current expiry |
| JWT middleware | `lib/authMiddleware.js` | ✅ Complete |
| Supabase client | `lib/supabaseClient.js` | ✅ Complete |

---

## 4. Frontend Auth — Feature Completion

| Feature | Status |
|---|---|
| `login.html` — design matches existing theme | ✅ Complete |
| `register.html` — design matches existing theme | ✅ Complete |
| Free trial badge on register page | ✅ Complete |
| Dark mode support on auth pages | ✅ Complete |
| JWT stored in `localStorage` after login | ✅ Complete |
| Redirect to `index.html` after login | ✅ Complete |
| Redirect to `login.html` after register | ✅ Complete |
| Auth guard in `app.js` (unauthenticated → login.html) | ✅ Complete |
| Logout button in app header (SVG icon-btn style) | ✅ Complete |
| Logout clears token + redirects to `login.html` | ✅ Complete |

---

## 5. Known Issues & Gaps

### 🔴 Critical (blocks production)

| # | Issue | File | Fix Needed |
|---|---|---|---|
| 1 | **Supabase DB not created** | `supabase_schema.sql` | Run schema in Supabase SQL Editor |
| 2 | **No `.env` / environment vars set** | `.env.example` | Copy to `.env.local` and fill all 6 secrets |
| 3 | **Not deployed to Vercel** | — | Run `vercel --prod` after env vars are set |
| 4 | **Razorpay webhook URL not configured** | — | Add `https://your-domain.vercel.app/api/webhook` in Razorpay dashboard |

### 🟡 Important (affects functionality)

| # | Issue | File | Fix Needed |
|---|---|---|---|
| 5 | **Service worker caches old pages** | `service-worker.js` | Add `login.html` and `register.html` to `ASSETS` array and bump cache version to `v6` |
| 6 | **`attendance.js` still uses `localStorage`** | `app.js` | Frontend attendance GET/POST not yet wired to `/api/attendance` — still reading/writing `localStorage` |
| 7 | **PWA manifest uses JPEG icons** | `manifest.json` | Browsers prefer PNG for PWA icons; `icon-192.png` and `icon-512.png` exist but are unused |
| 8 | **`manifest.json` start_url is `"."`** | `manifest.json` | Should be `"./login.html"` now that auth is required |

### 🟢 Minor / Housekeeping

| # | Issue | Action |
|---|---|---|
| 9 | `app_backup.js`, `index_backup.html`, `style_backup.css` exist | Delete (obsolete backups) |
| 10 | `start_server.bat` is a legacy local script | Delete (Vercel dev server replaces this) |
| 11 | `node_modules` will be ignored by Vercel (good) | No action needed |
| 12 | `package.json` declares `node: 18.x` but local Node is v22 | No action needed — Vercel uses 18.x |

---

## 6. Subscription Plans

| Plan | Price | Duration | Status |
|---|---|---|---|
| Trial | Free | 2 days | ✅ Auto-created on registration |
| Monthly | ₹10 (1000 paise) | 30 days | ✅ Available via Razorpay |
| Semester | ₹29 (2900 paise) | 180 days | ✅ Available via Razorpay |

---

## 7. Security Audit (Passed)

| Check | Status |
|---|---|
| All secrets via `process.env` | ✅ |
| Passwords hashed with bcrypt (12 rounds) | ✅ |
| JWT validated on every protected route | ✅ |
| Razorpay webhook HMAC SHA256 verified before any DB write | ✅ |
| Subscription expiry checked server-side before attendance access | ✅ |
| No secrets hardcoded anywhere | ✅ |

---

## 8. Next Steps (Priority Order)

```
Step 1 → Create Supabase project and run supabase_schema.sql
Step 2 → Fill .env.local with all 6 keys (Supabase + JWT + Razorpay)
Step 3 → vercel --prod (deploy)
Step 4 → Add Razorpay webhook URL in Razorpay dashboard
Step 5 → Update service-worker.js (add login.html, register.html to cache, bump to v6)
Step 6 → Update manifest.json (use PNG icons, change start_url to "./login.html")
Step 7 → Wire frontend app.js attendance read/write to /api/attendance
Step 8 → Delete backup files
```

---

## 9. Installed npm Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@supabase/supabase-js` | ^2.39.0 | Supabase DB client |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `jsonwebtoken` | ^9.0.2 | JWT sign & verify |
| `razorpay` | ^2.9.2 | Payment order creation |

> **53 packages total, 0 vulnerabilities** (last checked 2026-02-25)

---

*Report generated by Antigravity AI — 2026-02-25 15:04 IST*
