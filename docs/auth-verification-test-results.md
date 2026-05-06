# Auth Verification Test Results

This document preserves the detailed manual testing context for the production signup verification issues found around 2026-05-06. It exists so `TASK_BOARD.md` can stay focused while the full auth-testing evidence is not lost.

## Background

A production signup verification email previously opened `localhost` instead of the live Storyline site. This happened because production auth email links were being generated without a production `NEXT_PUBLIC_SITE_URL`, so the app fell back to the local development URL.

A follow-up hardening change was implemented in commit `bb9c1ca`:

- Signup callbacks were marked as signup-specific.
- `app/api/auth/callback/route.ts` was hardened.
- The `next` redirect was sanitized.
- Existing local session handling on signup callback failure was tightened.
- Reused/expired signup links were intended to route to login with clearer guidance.

Related config work:

- Netlify production should have `NEXT_PUBLIC_SITE_URL=https://storyline-paulokwa-v2.netlify.app`.
- Supabase Auth Site URL should point to the clean live domain.
- Supabase Auth Redirect URLs should allow the clean live production domain.
- `localhost` may remain in the Supabase allowlist only if intentionally needed for local development auth testing.

## Clean production URL

Use this for live testing:

```text
https://storyline-paulokwa-v2.netlify.app
```

Do not start auth tests from the Netlify branch deploy URL:

```text
https://main--storyline-paulokwa-v2.netlify.app
```

## Manual test results so far

### Test 1 — New signup email clean URL

Status: **Passed**

Observed verification email link:

```text
https://spzlrzqbpxewuyebbdly.supabase.co/auth/v1/verify?token=pkce_4c23e6cdca4a9967f13fd02f236cf9d66e59d12349ff15c08c92dac9&type=signup&redirect_to=https://storyline-paulokwa-v2.netlify.app/api/auth/callback
```

Result:

- The email link correctly used Supabase's `/auth/v1/verify` endpoint.
- The `redirect_to` parameter correctly pointed to `https://storyline-paulokwa-v2.netlify.app/api/auth/callback`.
- No `localhost` URL appeared.
- No `main--storyline-paulokwa-v2.netlify.app` branch deploy URL appeared.

Conclusion: the original production `localhost` redirect problem appears fixed for new signup emails.

### Test 2 — First-time verification correct account

Status: **Passed**

Result:

- Normal first-time signup verification landed in the correct new account/library.
- No wrong existing account was opened during the happy path.

### Test 3 — Reused signup verification link guidance

Status: **Failed**

Expected:

- Clicking the same signup verification link twice should show clear reused/expired-link guidance on the login page.
- Intended guidance was expected to come from a route like `/login?verification=already-used`.

Observed after clicking an already-used verification link:

```text
https://storyline-paulokwa-v2.netlify.app/library?error=Invalid_Or_Expired_Token#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=.
```

Result:

- The app opened `/library` with `Invalid_Or_Expired_Token` in the URL.
- The user did not see the intended friendly reused/expired-link guidance.
- The browser spawned a new tab during the email-link flow, but that tab behavior is controlled by the mail client/browser and is not the main bug.

Conclusion: expired/reused signup verification links still need better routing/handling. This is a launch-blocking auth polish/safety issue because it creates confusing behaviour during a core signup trust moment.

### Test 4 — Existing signed-in account plus another account's signup verification link

Status: **Blocked / inconclusive**

Goal:

- Sign in as Account A in the normal browser.
- Create a brand-new Account B in a separate/private flow.
- Copy Account B's verification link without using it.
- Paste Account B's verification link into the normal browser where Account A is already signed in.
- Confirm the app does not silently land in the wrong account or create confusing account/session behaviour.

Observed verification email link:

```text
https://spzlrzqbpxewuyebbdly.supabase.co/auth/v1/verify?token=pkce_a249e614de3df2036eb7be2ff10c6668183c2185ffc8930540c358b3&type=signup&redirect_to=https://storyline-paulokwa-v2.netlify.app/api/auth/callback
```

Observed after opening the link:

```text
https://storyline-paulokwa-v2.netlify.app/library?error=Invalid_Or_Expired_Token
```

Result:

- The email link's `redirect_to` was clean and production-safe.
- The final app URL hit the same `Invalid_Or_Expired_Token` path as Test 3.
- Because the token was invalid/expired/consumed, this did not cleanly prove the intended existing-session account-switch case.

Conclusion: Test 4 needs a clean retry with a never-used verification link after the email rate limit clears. However, the invalid-token routing failure is already sufficiently demonstrated by Test 3.

### Test 5 — Production password reset clean URL

Status: **Blocked / not tested**

Reason:

- Supabase returned `email rate limit exceeded` during signup/email testing.
- Do not keep pressing signup/reset buttons while rate-limited, because repeated attempts may prolong the cooldown.

Needed later:

- Request one production password reset.
- Copy the reset email link before clicking.
- Confirm the link uses the clean production domain and not `localhost` or the `main--` branch deploy URL.

## Supabase rate limit note

During testing, the signup form showed:

```text
email rate limit exceeded
```

This is likely Supabase's free/default auth email throttle after repeated signup/reset/verification email tests. Pause email-link testing until the limit clears, then continue with only the minimum remaining checks.

## Remaining issue to fix before launch

Expired/reused/invalid signup verification links can currently land on:

```text
/library?error=Invalid_Or_Expired_Token
```

instead of showing the intended friendly login guidance.

A future coding agent should investigate why Supabase's invalid/expired callback path is not being normalized into the app's intended login guidance route. The fix should preserve the current passing behaviours:

- New signup verification emails use the clean production redirect.
- First-time verification lands in the correct new account.
- No auth email should generate `localhost` in production.
- No auth email should use the Netlify `main--` branch deploy URL during production launch testing.

## Later validation checklist

After a fix lands and Supabase email rate limits clear, rerun:

- New signup email clean URL.
- First-time signup verification lands in the correct account.
- Reused signup verification link shows friendly login guidance.
- Existing signed-in account plus another account's fresh signup verification link does not silently land in the wrong account.
- Password reset email uses the clean production URL.
