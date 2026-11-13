# UniDesk

**Start here: [SETUP.md](SETUP.md)** (first run on your computer, then going live).

Student help center for Kenyatta University students: past papers, guidance, timetables, venues, chat, AI help, clubs and a marketplace.

- `apps/api`: NestJS 10, Prisma 5, PostgreSQL. REST under `/api/v1`.
- `apps/web`: Next.js 14 (App Router, TypeScript), Tailwind, installable as an app (PWA).

## Run it on your computer

```bash
npm install
npm run db:up                                   # local Postgres (needs Docker)
cp apps/api/.env.example apps/api/.env          # then edit JWT_SECRET (and the optional values)
cp apps/web/.env.example apps/web/.env.local
npm run db:push                                 # creates the tables
npm run db:seed                                 # creates Kenyatta University + starting settings
npm run dev:api                                 # http://localhost:4000
npm run dev:web                                 # http://localhost:3000
```

## Sign-in

- Google, or an account made with an email or a username, plus a password (8+ characters).
- Usernames and emails are not case sensitive (`Jane`, `JANE` and `jane` are the same person).
- The sign-in cookie is `httpOnly`. The website forwards `/api/v1/*` to the API (see `apps/web/next.config.mjs`), so the cookie is first-party and works on every phone browser.
- **First admin:** put your email in `ADMIN_EMAILS` and sign in with Google (Google confirms the email), or set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` and run `npm run db:seed`.
  Password sign-up with an `ADMIN_EMAILS` address is blocked on purpose, so nobody can claim an admin address first.
- Admin area: **Ctrl+Shift+A** on a computer, or tap the logo 3 times on a phone. This only navigates; the server checks the ADMIN role on every admin request.

## Hosting

- **Neon:** create a database. Use the pooled connection string as `DATABASE_URL` and the direct one as `DIRECT_URL`.
- **Render (API):** root `apps/api`, build `npm install && npm run build`, start `npm run db:deploy && npm start`. Set `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `WEB_ORIGIN`, `GOOGLE_CLIENT_ID`, `ADMIN_EMAILS`, `NODE_ENV=production`. Health check path: `/api/v1/health`. (The free plan sleeps when idle; use a paid plan before launch so payment callbacks are never missed.)
- **Vercel (web):** root `apps/web`. Set `API_URL` (the Render address) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
- For the first deploy there is no migration folder yet: run `npm run db:migrate -- --name init` once on your computer against Neon, commit the generated `prisma/migrations`, and Render's `db:deploy` takes over from there.

## Past papers (step 2)

- **Students:** search by unit code or name, open a paper, see a preview of page 1, download the PDF. Missing paper? "Request it" is always one tap away (also on Home). Browsing and previews need no account; downloading and requesting do.
- **Admin** (`/admin`): upload a PDF (the unit code and title are guessed from the file name, and the preview image is made in your browser), and see what students are requesting, most wanted first. Uploading a paper closes everyone's open requests for that unit.
- **Payment is invisible until it is on.** The server decides in one place (`PapersService.assertCanDownload`): while the `payments_enabled` setting is `false` (the seed default), every signed-in student can download and no price or payment wording appears anywhere. When it is `true`, a student who has not unlocked the paper gets a 402 with the price, only when they press Download. The M-Pesa payment itself is step 3; until then the 402 shows a placeholder message. There is no screen to flip the switch yet, so it stays off.
- **Files are private.** They are never linked directly: every download goes through the API after the check above. Locally they are saved in `apps/api/uploads`. For hosting, use a private Cloudflare R2 bucket (`STORAGE_DRIVER=s3`, see `.env.example`), because Render's disk is wiped on every deploy.
- Previews need a recent browser (Chrome 119+ or similar). If the preview cannot be made, the paper still uploads without one.

## Payments (step 3)

- **Admin → Payments** (`/admin/payments`): one switch to charge for downloads, the price per paper, today's and all-time totals, and a list of recent payments (phone numbers are masked). Turning it on asks for confirmation. While it is off, students never see a price or any payment wording.
- **Student flow:** press Download on a paper they have not unlocked → a bottom sheet shows the price and asks for their M-Pesa number → STK push → the app waits (checking every 4 s) → on success the paper unlocks and downloads. A paper stays unlocked for that student for good. Papers downloaded while payments were off also stay unlocked.
- **How a payment is trusted** (`PaymentsService`): the callback URL carries a secret; the amount must match; and Safaricom is asked directly to confirm before anything unlocks. A 20-second background check settles payments whose callback never arrived (for example, the server was asleep), and the student's own page also checks while it waits. A payment can only succeed once.
- **Test mode vs real money:** `MPESA_MODE=mock` fakes the prompt and approves it after ~4 s. It is refused when `NODE_ENV=production`, and the admin cannot switch payments on in production until `MPESA_MODE=live`, so students can never get free downloads through test mode.

### Connecting your Till (Daraja)

1. In the Daraja portal, create an app with **Lipa Na M-Pesa Online** (STK push). Start on the sandbox.
2. Set these on Render (never in git or chat): `MPESA_MODE=live`, `MPESA_BASE_URL`, `MPESA_KEY`, `MPESA_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_PARTY_B` (your Till number), `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline`, `MPESA_CALLBACK_SECRET` (a long random string) and `MPESA_CALLBACK_URL` = `https://YOUR-API.onrender.com/api/v1/payments/mpesa/callback?secret=<that same string>`.
3. For a Buy Goods Till, `MPESA_SHORTCODE` is the till's store (head-office) number and `MPESA_PARTY_B` is the till number customers pay to. For a Paybill, use `CustomerPayBillOnline` and leave `MPESA_PARTY_B` empty. Your Till is a Buy Goods Till paid by STK push, which is what the defaults above assume. Safaricom's go-live process decides the exact shortcode values, so confirm them with them.
4. Test on the sandbox, then ask Safaricom to move the app to production and switch `MPESA_BASE_URL` to `https://api.safaricom.co.ke`.
5. Locally, Safaricom cannot reach `localhost`. Use mock mode, or a tunnel such as ngrok for the callback.
6. Run `npm run db:push` again (a new `failureReason` column on payments).

## Guide (step 4)

- **Guide hub** (`/guide`): Call off a semester, Important KU offices, Timetable and Find a venue (the last two are placeholders until their steps), then Quick links.
- **Call off a semester:** six short steps, plus **My letter**, a form that writes the Registrar letter in the required format (details top left, addressed to The Registrar (Academic), REF line, introduction, reason, return date, phone at the bottom). The semester and academic year are fields, so the letter is never stuck on an old year. Copy it or Print / Save as PDF. Nothing typed is stored or sent anywhere.
- **Important KU offices:** all 12 offices, with search that understands everyday words ("fees" finds Finance, "password" finds the reset office, "defer" finds Room 12). The content is in `apps/web/content/offices.ts`; edit that file when a room moves.
- **Quick links:** permanent shortcuts to official pages (seeded: Student Online Services and Hostel application, with no dates or "open now" wording). **Admin → Quick links** adds or removes them; only `https://` links are accepted. Run `npm run db:push` and `npm run db:seed` again (new `QuickLink` table).
- The guidance text lives in `apps/web/content/`. The AI assistant step will read the same content.

## Timetables (step 5)

- **Admin → Timetables** (`/admin/timetables`): upload the class or exam sheet saved from Google Sheets as **Web page (.html)**. It is read, a report is shown (counts, dates, cells it could not read), and nothing is visible to students until you press **Publish**. Publishing replaces the live one of that kind; older ones are kept (unpublish or delete them). Upload is admin-only; the server never fetches links.
- **Students** (`/guide/timetable`): Classes and Exams tabs. Type unit codes, tap Make timetable. Classes: days with times and venues, a choice when a unit has two sessions on one day, clash warnings (e-learning never clashes). Exams: by date, with slot, venue(s) and clash warnings. Units are remembered on the phone only. Print / Save as PDF.
- The class reader gives exactly Ratiba's result on the real sheet (917 sessions). The exam reader found 140 exams over 15 days on the certificate/diploma sheet. If a semester's layout changes, the upload report shows what could not be read.
- Run `npm run db:push` again (new `startMin` and `endMin` on exams).

## Venues (step 6)

- **Students** (`/guide/venues`): type a room code (OML5, SOE6) or a building name. A building page has a **Walk there with Google Maps** button (walking directions to the pin), a hint line, up to 8 swipeable photo steps for inside the building, and its room list. Room codes in a student's timetable link straight here.
- **Admin → Venues** (`/admin/venues`): paste many buildings at once (`Name; Area; CODE1, CODE2` per line), then open a building to set its map pin (latitude/longitude from Google Maps), hint, rooms and photo steps (reorder, delete). Photos are checked to be real JPG/PNG/WebP files and served through the API.
- No venue data is included yet. Send me your venue list and I will format it for the paste box, or paste it yourself.
- Run `npm run db:push` again (new `landmark` column, delete cascades).

## Support chat (step 7)

- **Students** (`/chat`): a conversation with support, new messages appear within about 3 seconds. Sign-in required. A conversation stays open until staff close it; after that the next message starts a fresh one.
- **Staff** (`/admin/chat`, also linked from Admin): inbox with waiting conversations first, reply, close. Give someone the `SUPPORT` role to let them answer chat and see paper requests only, without the rest of Admin: `UPDATE "User" SET role='SUPPORT' WHERE email='...';`
- It refreshes by asking the server every 3 seconds while the screen is open, not by a held-open connection. That works on every phone and with Render's sleeping free plan, and needs nothing extra to install. If chat volume grows, it can be swapped for WebSockets without changing the screens' look.
- Limits: 1000 characters per message, 15 sends a minute, and at most 40 unanswered messages per conversation.
- Run `npm run db:push` again (new `updatedAt` on conversations).

## AI assistant (step 8)

- **Where:** the Chat tab gets two tabs, **Ask AI** and **Talk to a person**. The AI tab only appears when the server has an API key, so students never see a dead button.
- **Switch it on:** set `GEMINI_API_KEY` (free key from aistudio.google.com) or `ANTHROPIC_API_KEY` in Render's Environment (never in git or chat). Optional: `AI_MODEL` (default `claude-haiku-5-5`, fast and cheap) and `AI_DAILY_LIMIT` (default 30 questions per student per day).
- **What it knows:** the 12 KU offices, the call-off steps, and real venue data (if a question mentions a room code like SOE6, the building is looked up and added to the prompt). It is told to say "I am not sure" and point to the office or Support chat rather than guess dates, fees or rules, to say nothing about payments, and to treat the student's text as a question, not as instructions.
- **Keep it in step:** the API hosts its own copy of the guide content. After editing `apps/web/content/*.ts`, run `npm run sync:content` and redeploy the API.
- **Cost control:** sign-in required, 8 questions a minute, a daily cap per student, short answers (500 tokens max), and the last 12 turns only. The daily count lives in memory, so a server restart resets it. Chat history is not stored.

## Campus (step 9)

- **Clubs** (Campus tab): browse approved clubs, Join / Leave (sign-in needed), and suggest a club (hidden until an admin approves it; 3 waiting suggestions at most per student). **Admin → Campus → Clubs** approves, hides or deletes.
- **Marketplace:** anyone can browse and search ads and call or WhatsApp the advertiser. A business signs in, writes an ad (title, text, price, phone, one picture), then **pays the listing fee by M-Pesa** (the same Till and flow as papers). A paid ad goes to **Admin → Campus → Ads to check**; Approve makes it live for `listing_days`, Reject needs a reason the business sees. When time is up the ad disappears and the owner can **Renew** (pays again, is checked again).
- **Fee and days:** set in **Admin → Payments** (listing fee, days). This is separate from the paper-download switch: the paper switch never affects ads. Fee 0 = free ads that still wait for approval. Flat fee for now; tiers can come later.
- **Refunds:** if you reject a paid ad, refund the business by M-Pesa from your Till (the admin screen reminds you). There is no automatic refund.
- Pictures are checked to be real JPG/PNG/WebP files. An ad's picture is public only once it is live; before that only its owner and admins can see it.
- Run `npm run db:push` again (new club and ad columns).

## Feedback and responsiveness

- **Layout:** built for phones first (one column, bottom bar, 44px+ tap targets, safe-area padding for notches). Tablets get a centred 640px column. On computers (1024px and wider) the bottom bar becomes a **left sidebar** (Home, Papers, Guide, Chat, Campus, plus Admin for staff and your account), content sits in a reading column or, on list pages, flows into two columns up to 1080px wide, and pop-ups become centred dialogs. The rules are in `app/globals.css` (`wide` and `cols-lg` classes) and `components/Sidebar.tsx`.
- **Feedback on every action:** buttons show spinners while working, errors appear in red next to the action, and successes show a short green confirmation above the bottom bar (joined a club, published a timetable, payment received, saved). Every tap has a small press animation (turned off for people who set "reduce motion"). A banner appears at the top when the phone goes offline.
- Not yet tested on real devices: check it on a small Android phone, an iPhone and a laptop before launch.

## Reading papers in the app

- Students read a paper page by page inside the app (page images made in the admin's browser when the paper is uploaded, up to 30 pages). The PDF itself stays private and is only given out by Download.
- **Admin → Payments → Reading papers in the app** chooses what students can read before downloading: **the whole paper**, **the first pages only** (you choose how many, 1 to 10), or **page 1 only**. Change it any time; it takes effect straight away.
- This setting only applies when payments are on. While payments are off, every page is readable and nothing mentions payment. When it applies, locked pages say "opens when you download it", and the price only appears when the student presses Download.
- A student who has unlocked a paper reads all of it. Papers uploaded before this feature have no page images (only the page-1 preview) until they are uploaded again.

## Status

Done: monorepo, full database schema (with a `university` on every content table), auth, web shell, Home, Login, Account, admin guard, install button, icons, past papers with requests and admin upload, payments, **guide (call-off letter, offices, quick links)**, **timetables (class and exam)**, **support chat**, **AI assistant**, **Campus (clubs and paid marketplace)**.

Venues are built (empty until you add them).

All planned screens are built.

Not yet checked by running: this first version was written without being installed or run. Run `npm install` and the steps above, and fix anything that complains before building on it.

## Next

3. Guidance, offices, venues, timetables (class and exam), live chat, AI assistant.
4. Campus: clubs and marketplace (paid listings).

## Managing papers and the reader

- **Admin → Manage papers** lists every paper (hidden ones too). Edit the unit code, title, year, sitting or school; Hide or Show it to students; Replace the PDF (this also rebuilds the readable pages); or Delete it. A paper students have paid for cannot be deleted (the money history stays), so Hide it instead.
- The reader crops the blank margins around the text when a paper is uploaded, so text is larger on phones. Papers uploaded earlier keep their old pages until you use **Replace PDF** on them.
- Students can tap a page to zoom in, and pages run edge to edge on a phone.

## Search engines and AI answers (SEO and AEO)

What is built in:
- **Every public page has its own title, description, canonical address and share picture.** Paper pages are rendered on the server with real 404s, so removed papers leave search results.
- **One page per unit code** at `/units/ICS2201`, listing every year, plus a page for every paper, venue, guide and the FAQ.
- **`/sitemap.xml`** is rebuilt hourly from the library, so new papers appear without a deploy. **`/robots.txt`** keeps admin, chat, account and sign-in out of search, and welcomes search and AI crawlers.
- **Structured data (JSON-LD):** Organization, WebSite with site search, WebApplication, LearningResource per paper, CollectionPage per unit, FAQPage, HowTo (call-off), Place (venues) and breadcrumbs.
- **For AI assistants:** answer-first sentences on the key pages, a FAQ, and `/llms.txt` plus `/llms-full.txt` (the guide, office list and FAQ as plain text).
- The `*.vercel.app` address is marked noindex so only `unidesk.co.ke` is indexed.

After deploying:
1. **Google Search Console** (search.google.com/search-console): add the property `unidesk.co.ke` (Domain), verify with the DNS TXT record (add it in Vercel → Domains → unidesk.co.ke → DNS Records), then **Sitemaps → add `sitemap.xml`**.
2. **Bing Webmaster Tools** (bing.com/webmasters): import from Search Console, or add the site and submit the same sitemap. Bing also feeds several AI assistants.
3. Optional: if you prefer a meta-tag check, set `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` (and `NEXT_PUBLIC_BING_SITE_VERIFICATION`) on Vercel and redeploy.
4. Check a paper page in Google's **Rich Results Test** and a link preview by sending a paper link on WhatsApp.
5. The sitemap and unit pages read the paper library through `API_URL` (already set on Vercel). Keep the API awake (see the uptime monitor) so crawlers do not hit a sleeping server.

## "Your paper is ready" emails and the Your requests list

- Students see their paper requests under **Papers > Your requests** (Waiting or Ready), and a red number on the Papers tab when a paper they asked for is ready.
- When an admin uploads a paper, everyone who asked for that unit is emailed once. Email is optional: with no `RESEND_API_KEY` nothing is sent and the in-app list still works.
- To switch email on: create a free account at resend.com, add and verify the domain `unidesk.co.ke` (Resend shows DNS records to add in Vercel DNS), create an API key, then set on Render: `RESEND_API_KEY`, `MAIL_FROM` (for example `UniDesk <hello@unidesk.co.ke>`) and `SITE_URL=https://unidesk.co.ke`.
- Failures are written to the Render log as `Mail ...` lines and never block an upload.

## Downloaded PDFs carry the site address

When a student downloads a paper, the server adds one small grey line, "Downloaded from unidesk.co.ke · KU past papers", at the bottom of every page, linked to the site. The stored original and the in-app reader are not changed. If a PDF is locked, damaged or over 25 MB, the original is sent unchanged, so a download never fails because of this. To change the wording, edit `STAMP_TEXT` in `apps/api/src/papers/stamp.ts`.
