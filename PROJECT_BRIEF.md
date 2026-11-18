# shlonek.com (شلونك) — Project Brief

Sources: `shlonek.pdf` (brand/design deck, 6 pages) and `shlonek-developer-requirements.pdf` (requirements v1.0, 26 pages, 14 Nov 2026).
Stack: Next.js (App Router) · Prisma · Supabase (Postgres + Auth + Storage) · shadcn/ui · Tailwind CSS.

---

## 1. What the product is

An Arabic (Iraqi dialect), RTL, **interactive life-coaching platform**. Not "just a courses site": it helps people understand themselves, make conscious choices and live better.

"شلونك" is one Iraqi word meaning "how are you?" (كيف حالك). It is a single merged word; never split it in copy or branding.

---

## 0. Locked decisions (round 2, from Ahmed)

| Topic | Decision |
|---|---|
| Market and currency | Iraq only. **All prices in IQD** (whole numbers, no decimals). |
| Prices | **Admin sets every price** from the dashboard: single session, 4-session package, premium plans, and later courses. Nothing is hard-coded. |
| Payment gateway | **Wayl** (https://wayl.io/docs), one-off payment links. IQD only, minimum 1000 IQD per link. |
| Premium | A **one-off purchase of a fixed period** (e.g. 30 days). It works like a subscription but **never auto-renews**. To continue, the user buys again. |
| Fallback without a Wayl key | **Internal wallet.** The admin tops up a user's wallet balance by hand (after the user pays them outside the site). The user spends that balance from their profile on premium, consultations, and anything else. |
| Wallet top-ups | Handled **outside the site** between the owner and the user. The site needs no top-up request flow, only the admin "add balance" action. |
| Wallet + Wayl together | The wallet keeps working after Wayl is active. If the balance covers the price, the user can pay fully from the wallet. If not, they see the shortfall and pay the rest through Wayl (split payment, §4.6). |
| Minimum price | The admin can't set any price below **1,000 IQD** (Wayl minimum). |
| Coach | **One coach: the owner.** No multi-coach selection in the UI. The data model keeps a coach field so more can be added later. |
| Courses | **Not built in this round.** No course content, purchase or library until after launch and testing, when the owner is ready to record. |
| Not building yet | Wait for an explicit "start building" from Ahmed. |

Three pillars:

| Pillar | Meaning | Platform feature |
|---|---|---|
| اعرف نفسك (Know yourself) | Discover personality, beliefs, feelings, thinking patterns | Interactive **exercises** |
| اختار بوعي (Choose consciously) | Understand your options, make decisions that fit you | Exercises/tools + **consultations** |
| عيش حياتك (Live your life) | Turn self-understanding into daily steps | **Courses & workshops** |

**Visual identity:** pure black & white, clean lines, generous spacing, soft-edged cards, hand-drawn characters (5 students with backpacks: hijabi girl, girl with bun, surprised girl, curly-haired boy, worried boy). Logo `shlonek.com` / `شلونك.com`.

### Brand assets received (round 3)

| Asset | Source file | Details | Planned use | Target path in the app |
|---|---|---|---|---|
| Latin logo «shlonek.com» | `~/Downloads/full logo.svg` | Vector, 12 paths, viewBox `1832.73 × 232.62` (about 7.9 : 1). No fill set, so it renders black. 125 KB, almost all embedded metadata (C2PA). About 4 KB once cleaned. | Header logo (top right in RTL), footer, login modal, emails, OG image | `public/brand/logo-en.svg` |
| Five characters (group) | `~/Downloads/people.svg` | Vector, 58 paths, viewBox `1287.34 × 645.71` (about 2 : 1). Black only. The "white" areas are holes (transparent), not white fills. About 60 KB. | Home hero under the «احچيلي» box; about page; empty states | `public/brand/people.svg` |

**Implementation notes:**
- **Clean both files with SVGO** (remove metadata/XMP/C2PA, keep the viewBox) before adding them to the repo. The logo drops from 125 KB to about 4 KB.
- Render the **logo inline as a React component** with `fill="currentColor"` so it can be black on white or white on black (e.g. dark footer) from one file. Add an `aria-label="شلونك.com"` and a fixed height (e.g. 28px in the header) with automatic width.
- The **people illustration must sit on a white surface.** Its white areas are transparent, so on a dark or coloured background the shirts and faces would show that colour. The site is light-only (black on white), matching the brand. No dark mode in v1.
- Load the illustration with `next/image` (or `<img>`) using explicit width and height to avoid layout shift. Lazy-load it everywhere except the home hero, and add a descriptive Arabic `alt`.
- Single characters for other pages (the deck puts one character on each pillar: worried boy → اعرف نفسك, hijabi girl → اختار بوعي, the group → عيش حياتك) can be cut from `people.svg` into separate SVGs. Separate files from the designer are better if available.

### Typography (round 4)

| Use | Font | Notes |
|---|---|---|
| **Arabic (all UI and headings)** | **KunKun Arabic**, Indian Type Foundry (ITF) | Informal handwritten-style sans, lively. Comes in 3 styles plus a variable version. **Commercial font**: needs a **web licence** bought in the owner's name (MyFonts: about $80 per style, $150 for the family; variable from about $75). |
| Latin (numbers in English, emails, "shlonek.com" text) | TBD | The logo is an SVG, so it doesn't need a font. KunKun Arabic's own Latin glyphs don't connect. Ask the owner whether to use them or pair with another Latin font. |

**Implementation:**
- Self-host the licensed **WOFF2** files with `next/font/local` (no third-party CDN). Set `display: "swap"` and expose a CSS variable `--font-kunkun` mapped to Tailwind `font-sans`.
- Keep the font files in the repo only if the licence allows it. Otherwise load them from the owner's storage at build time.
- **Placeholder until the licence is bought:** a free rounded Arabic font from Google Fonts (suggested: **Baloo Bhaijaan 2**, similar friendly rounded feel). Swapping fonts later is a one-line change.
- Check Arabic digits vs Latin digits for prices (e.g. ٢٥٬٠٠٠ د.ع vs 25,000 IQD): to be decided with the owner.

**Still missing:** the Arabic logo «شلونك.com» as SVG, a favicon/app icon (square mark), the KunKun Arabic web licence and font files, the Latin font choice, and single-character SVGs (optional).

---

## 2. Users and roles

| Action | Visitor | Free account | Premium |
|---|---|---|---|
| Browse pages and public cards | ✅ | ✅ | ✅ |
| Read anonymous public posts | ✅ | ✅ | ✅ |
| Write in «احچيلي» | login required | ✅ | ✅ |
| Do a free exercise and save the result | login required | ✅ | ✅ |
| Do a 👑 premium exercise | needs subscription | needs subscription | ✅ while active |
| Book a single consultation or 4-session package | login required | separate purchase | separate purchase |
| Register for a free workshop | login required | ✅ | ✅ |
| Buy a paid course | login required | normal price | discounted price (if eligible) |
| Access paid course content | ❌ | after buying it | after buying it |
| See own history and results | ❌ | own data only | own data only |

- **Premium ≠ everything.** It unlocks 👑 exercises and gives a course discount. Consultations and courses are always bought separately.
- **Owner / admin:** manages content, prices, slots, posts, orders, member follow-up.
- Suggested: a separate **coach** role (sees only their own clients and bookings, not exercise answers).
- Permissions must be enforced on the server and in the DB, not only by hiding buttons.

Terms not to mix up: free account · premium subscription (time-based) · monthly consultation package (4 sessions, one per week, NOT premium) · course purchase (one-off, added to library).

---

## 3. Site map

**Main nav (5 pages, RTL, links on the right, login button top-left → becomes «حسابي» after login):**

1. **شلونك**: home + «احچيلي» + anonymous public posts
2. **الاستشارات** (Consultations): package → time slots → pay → confirm
3. **التمارين** (Exercises): library → answer → result → history
4. **الكورسات** (Courses): details → buy or free register → my library
5. **من إحنا** (About): team + contact

**Service pages, not in the nav:** login modal, حسابي (My account), subscription page, checkout/payment result, course/exercise details, privacy/terms/booking/payment policies.
**Admin dashboard:** a separate area, not part of the member UI.

---

## 4. Page by page

### 4.1 Home: شلونك + «احچيلي» (Tell me)
- Logo, illustrations, short welcome.
- **«احچيلي» textbox** with a send button. It expands into a multi-line area after login.
- **Anonymous public posts** show as bubbles/cards on the same page, with no names.
- Submit flow:
  1. Click the field. If not logged in, show the login prompt.
  2. Write: about 10–2000 characters, with a counter and a hint to avoid names and numbers.
  3. Optional checkbox, **unchecked by default**: «أوافق على عرض نصي بعد المراجعة بدون هوية» (I agree my text may be shown after review, without my identity).
  4. Send: validate, prevent double submit, sanitize.
  5. Success message «وصلت رسالتك» with a link to «مشاركاتي». It must not say the post is published.
  6. On error the text stays in the box and a retry button appears.
- Every post goes to the **owner dashboard**, linked to the account.
- No live chat, comments, public replies or AI replies in this version.

### 4.2 Anonymous public posts (privacy)
- Original private text → author consent → admin redacts/reviews → public version.
- The system stores **two texts**: the original (private) and the redacted public text.
- The public API returns only the redacted text plus a separate public id. It never returns the user id, account fields or the private post id.
- The owner can reject or hide a post. The user can withdraw consent from their account, which removes the post from public view and caches.
- Bubbles: a small number, calm motion, respect `prefers-reduced-motion`. If nothing is approved, show a welcome text. Fake examples must be clearly labelled.

### 4.3 Login (Google only)
- Google sign-in only, no passwords. Phone is an optional extra field and is never public.
- Flow: choose a service → login modal → Google → **return to the same service** without choosing it again.
- On first login, show the privacy notice and terms, and record the version accepted. Public-posting consent is separate.
- If Google is cancelled or fails: return to the page with a clear message and retry. No pending order or booking is created.
- Profile: stable internal id linked to the Google identity, name, email, optional phone, membership status (free/premium + dates), purchases and attempts.

### 4.4 Consultations (الاستشارات): two cards
| | Single consultation | Monthly package |
|---|---|---|
| Sessions | 1 | 4 |
| Spread | one slot the user picks | one session per week |
| Card shows | description, duration, price, «احجز جلسة» | description, 4 sessions, duration, price, «احجز الباقة» |
| Before payment | pick day + time | pick all 4 session slots |
| After payment | confirmed, added to حسابي | package + all 4 sessions shown in حسابي |
| Premium? | separate purchase | separate purchase |

- **Locked order:** choose type → choose slot(s) → review summary → pay → booking confirmed.
- The details page shows the session goal, coach (if more than one), duration, method (online/in-person) and final price.
- The admin sets working hours, holidays and closed slots.
- Session status: upcoming / completed / cancelled / rescheduled / no-show.
- The meeting link and instructions appear only after confirmation.

### 4.5 Calendar and booking
- Calendar shows available days, then available times. Timezone Asia/Baghdad, shown for users outside Iraq.
- **Temporary hold** when going to payment: about 10 minutes, configurable, with a visible expiry time.
- **No double booking:** the server prevents two people booking the same coach slot, even if both have the page open.
- If the hold expires, ask for a new slot before payment.
- **Monthly package (suggested):** the user picks session 1, the system suggests weeks 2–4 at the same time, the user reviews and adjusts, then pays once. All 4 are held and confirmed together.
- Rules: exactly 4 sessions, one per week. No full schedule, no sale. Changing one session keeps the others.

### 4.6 Payment and order confirmation

#### Round-2 design: Wayl + wallet

**Order is the single source of truth.** Every purchase (premium period, single session, 4-session package) creates one `Order` with a server-calculated, frozen IQD price. The order is then paid by one of two methods:

| Method | When available | How it completes |
|---|---|---|
| **Wayl** | `WAYL_API_KEY` is set and Wayl is enabled in admin settings | Server calls `POST https://api.thewayl.com/api/v1/links` with `referenceId` = our order id, `total`, `currency: "IQD"`, `lineItem`, `webhookUrl`, `webhookSecret`, `redirectionUrl` and `linkExpiresIn` (matching the slot hold, e.g. `"15m"`). The user is redirected to `data.url`. The order is marked paid **only** from the signed webhook (`x-wayl-signature-256`, HMAC-SHA256 of the raw body, compared in constant time), double-checked with `GET /api/v1/links/{referenceId}` (status `Complete`). Unpaid links are cancelled with `invalidate-if-pending` when the hold expires. |
| **Wallet** | Always available (it is the only method while there is no Wayl key) | In one DB transaction: check the balance is at least the price, write a `debit` ledger entry, and mark the order paid. Atomic, so a double click can't spend twice. |

**Wallet design:**
- An **append-only ledger** (`WalletTransaction`: `topup_admin`, `purchase_debit`, `refund_credit`, `adjustment`), each with amount, balance after, actor, reason and linked order. The balance is never edited directly without a ledger row.
- **Admin top-up:** find a user, enter an IQD amount and a note (e.g. "cash received" or "ZainCash transfer #…"), confirm. The action is audit-logged and the user gets an email.
- **User profile → محفظتي (My wallet):** balance, full history, and "how to top up" instructions (admin-editable text with contact info). Checkout shows "Pay from wallet" with the balance after payment, or "insufficient balance".
- **Refunds:** for wallet payments the admin refunds back to the wallet as a `refund_credit`. For Wayl payments, use `POST /api/v1/refunds` (reason 100–1500 chars, min 1000 IQD) or refund to the wallet, admin's choice.
- Later option: let users top up the wallet themselves through Wayl once the key exists.

**Split payment (wallet + Wayl):**
- Checkout shows: price, wallet balance, amount from wallet, **remaining to pay via Wayl**.
- Because Wayl needs at least 1,000 IQD: `waylAmount = max(price − balance, 1000)` and `walletAmount = price − waylAmount`. Example: price 25,000, balance 24,500 → 24,000 from the wallet + 1,000 via Wayl, and 500 stays in the wallet. The user never pays more than the price.
- When the Wayl link is created, the wallet part is **reserved** (a hold, not yet spent). On a verified Wayl webhook, the hold becomes a real debit and the order is paid. If the link fails, expires or is cancelled, the hold is released and the balance is back.
- The user can also skip the wallet and pay everything via Wayl (checkbox "use my wallet balance", on by default).

**Price rules:** IQD integers. When Wayl is the method, the order total must be at least 1000 IQD (admin UI warns if a price is set below this).

**Premium without auto-renew:** buying premium creates a `PremiumPeriod` (start, end). If the user is still active, the new period **starts at the current end date** (no lost days). An email reminder goes out N days before expiry, and the user renews by buying again. Admin-defined plans, e.g. 1 / 3 / 12 months, each with its own IQD price.

#### Original requirements
Order types: single consultation · 4-session package · premium subscription · paid course/workshop (courses deferred to after launch).
- Summary before payment: product, slots, base price, discount, total, currency, fees. The user accepts the policy.
- **The server computes the price.** Never trust the amount from the browser. The price is frozen at order creation.
- Create the order (user + product + hold), then redirect to the payment provider.
- **Activate only after the server verifies** the provider's confirmation (webhook). Landing on a "success" page is not enough.
- Pending: show "checking payment" with the order status. Never ask the user to pay again.
- Failed or cancelled: clear message and retry within the hold. No booking.
- Duplicate confirmations must be **idempotent**: no double booking, subscription or course access.
- Late success after the hold expired: record the payment, flag the order for review, offer another slot or a refund.
- Refunds are linked to the original order. No card data is stored.

### 4.7 Exercises (التمارين)
- Library cards: name, short description, **free** or 👑 **premium**, optionally duration and question count.
- Two named exercises at launch: **«الحب والخوف» (Love & Fear)** and **«الدوائر» (Circles)**. More can be added from admin without code.
- 👑 card for non-subscribers: show the intro and premium benefits, but never send the paid questions to the browser.
- Visitors can view intros but must log in to start, even for free exercises.
- Exercise screen: intro (goal, instructions, question count, start) → questions (text / single choice / scale, as defined by content) → next/back without losing answers → **autosaved private draft** → submit (check completeness, create an attempt, compute the result per the exercise version) → result + link to history + «أعد التمرين».
- **Retaking** starts fresh and never overwrites the earlier attempt.
- Which exercise is free or premium is set by the owner per exercise.

### 4.8 Love & Fear and Circles content
- **Love & Fear** (from the original deck): 1) «اكتب الفعل اللي دا تقوم بيه» (text) → 2) «باعتقادك الفعل هو...» love / fear (single choice) → 3) «ليش دا تسوي الفعل هذا؟» (text) → 4) «انطلق» submits.
  - Result screen example: title «الخوف» with a love↔fear axis.
  - **Do not invent a scoring formula.** Suggested starting point: save the answers and the user's own love/fear choice, then show a reflective summary that matches their choice. Label the result as a reflection of the user's answer, not a scientific assessment.
- **Circles:** only the name exists. Build the card and the content-entry structure, but don't publish it until the owner sends the questions, instructions, interaction, circles shape and result logic.

### 4.9 Results history
- Each completed attempt is a separate, permanent record. If the user retakes after a week, both results stay.
- Each attempt stores: user, exercise **version**, final answers, completion date/time, result + type + interpretation, and the scoring rules version.
- In حسابي: list of exercises done; inside each one, the attempts with dates and results. Open one to see its answers. Show the latest result vs earlier ones with a date filter, and a progress chart if there is a numeric score.
- Don't compare different exercises or different scoring versions on one axis.
- Premium expiry never deletes old results. History stays readable, but new paid attempts are blocked.
- Editing an exercise creates a new version. Exercises with attempts are archived, never hard-deleted.

### 4.10 Premium, prices and discounts
| Product | User gets | Pricing |
|---|---|---|
| Free account | free content, history, can buy | no fee |
| Premium | 👑 exercises while active + course discounts | price/duration/renewal **TBD** |
| Single session | 1 consultation slot after payment | TBD |
| 4-session package | 4 sessions, weekly | separate from premium |
| Paid course/workshop | in library | normal price + premium price or % |
| Free workshop | free registration | skip the payment gateway |

- Subscription page: benefits, price, currency, duration, manual or auto renewal, then accept and pay.
- Status and dates shown in حسابي. On expiry, 👑 access ends but data stays.
- Course discount: show the normal and member price. The server applies the right one at order time. Each course can have its own premium price or %. The discount doesn't require buying premium, and expiry doesn't revoke purchased courses. No stacked discounts without a policy.

### 4.11 Courses and workshops (الكورسات): DEFERRED, not in this round
> Round 2: courses are built **after launch and testing**, when the owner is ready to record. In this round the nav link can show a simple «قريباً» (Coming soon) page. No course models, purchase flow or library yet. The text below is kept for the later phase.
- Library of free and paid courses and workshops, with filters by type/access if there are many.
- Card: title, image/illustration, short description, type, price or "free", and the premium discount if any. Owned items show «ابدأ / تابع» (Start / Continue) instead of buy.
- Details page: content, who it's for, presenter, outline. Delivery is recorded, live or in-person, depending on the owner. Show duration, live date, seats, access period and final price.
- Flow: card → details → login → buy / free register → مكتبتي (My library).
- Recorded course: units and lessons, materials, saved progress (if approved). Live workshop: date, timezone, attendance link for registered users only.
- Purchases stay in the account. Access duration is set per item. Archiving stops new sales but keeps past purchases.

### 4.12 About (من إحنا)
- About text (life-coaching platform, the 3 pillars), team members with photos, bios and roles (if provided), phone, email, social links, and footer links to privacy, terms, booking and payment policies.
- Contact info is required. Live chat and a ticket system are **not** required.
- Optional contact form: name, email, subject, message, phone optional. Messages go to admin.
- Everything is editable from admin. No placeholder data in production.

### 4.13 حسابي (My account): member activity hub
| Section | Content |
|---|---|
| Overview | premium status, next session, latest exercises, course links |
| مشاركاتي (my posts) | private texts, dates, public status, withdraw consent |
| استشاراتي (my consultations) | upcoming/past bookings, package with 4 sessions, timezone, status, meeting link |
| تماريني ونتائجي (exercises & results) | all exercises, attempts, dates, results, answers, retake |
| كورساتي وورشاتي (courses & workshops) | owned/registered content, access status, start/continue, workshop instructions |
| اشتراكي (subscription) | plan, status, start/end, renew/cancel |
| طلباتي ومدفوعاتي (orders) | order no., product, amount, currency, discount, date, status, refunds, receipt |
| Profile & settings | Google name/email, add phone, contact preferences, logout, request account deletion |

- The account (database) is the source of truth, not the browser. Same data on any device.
- Empty states should guide the user, e.g. «ما عندك حجوزات بعد» (No bookings yet) with a link to consultations.

### 4.14 Admin: messages and follow-up
- **«احچيلي» inbox:** new and old posts with the account, date and read/follow status. Open the original text and the allowed contact info. Statuses: new / in follow-up / closed, plus internal notes.
- Manage the public version: author consent, redacted text, review status, publish/hide, rejection reason.
- Filter by date, status and member, with search for authorized staff.
- **Member file:** contact info, every exercise attempt with answers and results (compare attempts of the same exercise), consultation packages and bookings, courses and progress, private staff notes.
- Contact a member: minimum is showing contact info, an "open email" button and logging the follow-up. Automated SMS/WhatsApp only if approved later.
- Results, answers and notes are never public. Access is restricted and logged.

### 4.15 Admin: operations and content
| Module | Tasks |
|---|---|
| Dashboard | new posts, upcoming bookings, completed attempts, active subscribers, payments needing review |
| Consultations & calendar | consultation types, prices, durations, coaches, working hours, holidays, reschedule/cancel |
| Exercises | add an exercise: description, image, order, free/premium, questions and types, scoring and interpretation, draft/published/archived |
| Exercise versions | publish a new version without changing past attempts; block publishing incomplete content |
| Courses & workshops | content, prices (normal + premium), free/paid, materials, dates, seats, registrants |
| Premium | plans, durations, prices, benefits, subscription states, audited manual activation |
| Orders & payments | orders, payment result, provider events, receipts, refunds, resolve incomplete states without double activation |
| Public content | about text, team, contact info, policies, public posts review |
| Settings & roles | admin users and roles, timezone, currency, notification settings, integrations |

- Admins never edit an old attempt's score through content edits. Exceptional corrections are logged.
- Archive instead of delete when records depend on an item.
- Suggested: export of operational and financial reports for authorized staff, without sensitive answers by default.

---

## 5. Data model (logical, for Prisma)

User/identity · PrivatePost · PublicPost · SubscriptionPlan + Subscription · ConsultationType (single/package) · AvailabilitySlot + Hold · PackagePurchase + Session · Exercise + ExerciseVersion · Draft + Attempt · Course/Workshop · Enrollment/Ownership · Order + OrderItem + PaymentTransaction · Notification + AuditLog.

Key constraints: no double-booked coach slot · idempotent payment success · every attempt linked to a fixed exercise version · the public API never returns the internal link to a private post · a monthly package is one purchase with 4 sessions · a subscription is its own access record.

## 6. States

- PrivatePost: received → read → following → closed. Public publishing has its own state.
- PublicPost: not authorized / pending review / published / rejected / hidden or consent withdrawn.
- Order: created / awaiting payment / verifying / paid / failed / cancelled / fully or partly refunded.
- Booking: held / confirmed / hold expired / completed / cancelled / no-show. A reschedule keeps the trail.
- Subscription: awaiting payment / active / expired / cancelled.
- Attempt: draft / completed.
- Course access: active / expired / revoked by refund.

## 7. Notifications and integrations

- Emails: booking + payment confirmation, schedule change/cancel, course purchase, subscription confirmation, reminders before sessions/workshops, expiry warning, admin alerts. Emails never contain the post text or exercise answers, only a link that needs login.
- Integrations: **Google** (auth, production keys owned by the owner) · **payment gateway** (provider and currency TBD) · **email + meetings/video** (per delivery method). SMS and external calendar are not assumed.

## 8. Quality and security

Account isolation (RLS + server checks) · public API anonymity tests · server-verified payment, idempotent webhooks, no slot clashes, no card data · paid content and answers in protected storage (signed URLs) · separate admin access + audit log · input sanitization, rate limiting, no internal data in errors · backups + tested restore · privacy notice + retention policy, no sensitive text in analytics · mobile/tablet/desktop RTL incl. Arabic numerals, prices, timezones · performance: progressive loading, compressed images, main content within 3s on the agreed test environment.

## 9. Acceptance tests (A01–A22, short)

A01 visitor clicks احچيلي → login prompt, server rejects anonymous send · A02 Google login returns to the same service · A03 double-click send → one record · A04 no consent → not public · A05 public shows text only · A06 withdraw/hide → removed from public · A07 single consult: slot + summary + timezone before pay · A08 two members, same slot → one wins · A09 monthly: 4 weekly slots reviewed before one payment · A10 payment fail/expiry → no booking · A11 success page without server confirmation → still pending · A12 duplicate webhook → one activation · A13 late success after slot lost → recorded + review · A14 retake free exercise → 2 attempts saved · A15 free user on 👑 exercise → premium prompt, no content leak · A16 edit exercise → new version, old results unchanged · A17 premium expiry → no new paid attempts, history kept · A18 course price correct for free vs premium, no double purchase · A19 free workshop skips the gateway · A20 member can't read another member's data · A21 logout + other device → same data · A22 mobile, RTL, forms, test payment, backup restore.

## 10. Delivery package and phases

Deliverables: approved designs for core screens and mobile, then a test (staging) build · site + admin + services on **owner-owned accounts**, test env separate from prod · source code, DB schema + migrations, setup/deploy/backup docs, no secrets in files · acceptance results, short admin guide, maintenance/hosting/support responsibilities.

Phases: decisions & content → design → accounts & data → services & payment → admin → testing & handover.

**Out of scope for v1:** native apps, live chat, community/comments, AI analysis, certificates, referral programs.

---

## 10b. Technical notes (Next.js + Prisma + Supabase)

- **Auth:** Supabase Auth with the Google provider (`@supabase/ssr`). A `Profile` row in our DB is keyed by the Supabase user id.
- **DB access:** Prisma from server code only (Server Actions / Route Handlers), with **authorization checked in server code** on every query. Prisma bypasses RLS, so we also enable RLS with no public policies on every table, which blocks direct PostgREST access with the anon key.
- **Money:** IQD stored as `Int`. Bookings use a DB-level unique constraint on (coach, slot start) for confirmed and held rows, so double booking is impossible.
- **Payments:** a `PaymentProvider` abstraction (`wayl`, `wallet`). The Wayl webhook is a Node route handler that reads `req.text()` and verifies the signature before parsing, and is idempotent on `referenceId`.
- **UI:** shadcn/ui + Tailwind with `dir="rtl"`, black-and-white theme tokens, Arabic font TBD, Asia/Baghdad timezone.
- **Email:** Resend (suggested), to be confirmed.

## 11. Open decisions (page 26 of the requirements)
> Round 2 resolved: currency (IQD), gateway (Wayl + wallet fallback), premium renewal (manual re-purchase), who sets prices (admin), courses (deferred).

Prices & currency · payment gateway · consultation details (duration, coach(es), method, hours, timezone, hold time) · monthly package scheduling · cancellation/reschedule/no-show/refund policy · premium terms · exercise free/premium split + final questions + scoring per version · Circles content · course/workshop launch list · premium discount per course · public-post approval/review owner · contact/data/team permissions/retention/privacy & terms text · brand assets (logo, characters in original formats, fonts, team names, contact) · operations (domain ownership, hosting/services, expected usage, backups, maintenance owner).

> We can start building the structure, design, accounts and admin now. Prices, policies and content are admin-editable fields. Real payment and unapproved exercises stay off until the decisions are made.
