# UniDesk: first run and going live

Do Part A first. Do not start Part B until everything in A works on your computer.

## Part A. Run it on your computer (about 15 minutes)

You need: Node.js 20 or newer, Docker Desktop (for the local database), and this folder.

1. Open a terminal in the `unidesk` folder and run `npm install`. This is the first time it has ever been installed, so read any red errors and send them to me.
2. `npm run db:up` starts the local database.
3. Copy the two settings files:
   - `cp apps/api/.env.example apps/api/.env`
   - `cp apps/web/.env.example apps/web/.env.local`
   Then open `apps/api/.env` and set `JWT_SECRET` to a long random string (the command to make one is in that file). Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` to your own email and a password, so you can sign in as admin without Google for now.
4. `npm run db:push`, then `npm run db:seed`.
5. In one terminal run `npm run dev:api`, in another `npm run dev:web`. Open http://localhost:3000.

**Check these, in this order** (tick each one):
- [ ] Home opens, bottom bar works, no red error in the terminal.
- [ ] Create a student account (username + password), sign out, sign in with the username in different capitals, and use the eye icon.
- [ ] Sign in with your admin email and password, then press Ctrl+Shift+A. On your phone's browser, tap the logo 3 times.
- [ ] Admin → Upload a paper with any PDF. Then open it on Papers and see the preview.
- [ ] Admin → Payments: turn payments on (it asks to confirm). As a student, press Download: you should see the price and the test M-Pesa prompt, which approves itself after about 4 seconds. Turn payments off again and check a new student sees no price at all.
- [ ] Admin → Timetables: upload your two Google Sheets files, read the report, publish. As a student, build a class and an exam timetable.
- [ ] Admin → Venues: paste a few lines like `Ole Moi Yoi; Science area; OML1, OML2`, add a pin and a photo step. Search `OML1` as a student.
- [ ] Chat: send a message as a student, reply from Admin → Support inbox in another browser window.
- [ ] Campus: suggest a club, approve it, join it. Create an ad, pay (test), approve it in Admin → Campus, see it in the marketplace.
- [ ] On your phone (same Wi-Fi, open `http://YOUR-COMPUTER-IP:3000`): check it looks right and nothing is cut off.

If anything fails, copy the exact red error text or describe what you saw, and I will fix it.

## Part B. Put it on the internet

Do these in this order. Never paste secrets into chat or git; they go only into the hosting dashboards.

1. **Neon** (database). Create a project. Copy the *pooled* connection string (`DATABASE_URL`) and the *direct* one (`DIRECT_URL`).
2. **First migration, once, on your computer.** Put the Neon strings into `apps/api/.env`, then run `npm run db:migrate -- --name init` and commit the new `apps/api/prisma/migrations` folder. Then run `npm run db:seed` once. Switch your `.env` back afterwards.
3. **Cloudflare R2** (file storage). Create a *private* bucket and an API token with read and write. Render's disk is erased on every deploy, so papers and photos must not live on it.
4. **GitHub.** Push the project to a private repository.
5. **Render** (API). New Web Service from the repo. Root directory `apps/api`. Build command `npm install --include=dev && npm run build` (the extra flag makes sure the build tools are installed). Start command `npm run db:deploy && npm start`. Health check path `/api/v1/health`. Environment: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `NODE_ENV=production`, `WEB_ORIGIN` (your Vercel address, fill in after step 6), `ADMIN_EMAILS`, `STORAGE_DRIVER=s3` with the four `S3_` values, and later the `MPESA_` and `ANTHROPIC_API_KEY` values. Use a paid plan before real launch: the free plan sleeps, and a sleeping server can miss M-Pesa confirmations.
6. **Vercel** (website). Import the same repo, root directory `apps/web`. Environment: `API_URL` (your Render address) and `NEXT_PUBLIC_GOOGLE_CLIENT_ID`. Then go back to Render and set `WEB_ORIGIN` to the Vercel address.
7. **Google sign-in.** In Google Cloud, create an OAuth Client ID (Web). Add your Vercel address under Authorised JavaScript origins. Put the Client ID in both places (`GOOGLE_CLIENT_ID` on Render, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` on Vercel). Put your Google email in `ADMIN_EMAILS` and sign in with Google: that account becomes admin.
8. **Daraja sandbox test.** On Render set `MPESA_MODE=live`, the sandbox `MPESA_BASE_URL`, your sandbox key, secret, shortcode and passkey, `MPESA_CALLBACK_SECRET`, and `MPESA_CALLBACK_URL` (see the README's Payments section). Test one paper payment end to end.
9. **Go live with Safaricom.** Ask Safaricom to move the app to production, then switch to `https://api.safaricom.co.ke`, your real credentials, your Till as `MPESA_PARTY_B` and `MPESA_TRANSACTION_TYPE=CustomerBuyGoodsOnline`. Make one real KSh 20 payment yourself before telling students.
10. **Before you announce it:** upload your first 20 to 50 papers, publish both timetables, add the venues, and set the real paper price. Payments stay switched off until you turn them on.
