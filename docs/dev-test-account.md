# Local Dev Test Account

This workflow is for local development and testing only.

The test account credentials are intentionally stored outside Git in a local env file. Each machine must create its own local credential file.

## Exact setup

Follow these steps on each machine:

1. Ensure your local server env file contains:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Usually this lives in `.env.local`.

2. Create this gitignored local credential file:

```text
.local/test-account.env
```

3. Put this in it:

```env
TEST_ACCOUNT_EMAIL=dev-test@example.com
TEST_ACCOUNT_PASSWORD=replace-with-a-strong-local-password
```

4. Run:

```bash
npm run create:test-account
```

5. Expected result:

- first run: creates the account
- later runs: report that the account already exists

## Copy-paste setup note

```text
Local dev test account setup:
1. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local
2. Create .local/test-account.env
3. Add TEST_ACCOUNT_EMAIL and TEST_ACCOUNT_PASSWORD
4. Run npm run create:test-account
5. Re-running the command should safely report that the account already exists
```

## Local credential file

Create one of these gitignored files:

- `.local/test-account.env`
- `.env.test.local`

Recommended file:

```env
TEST_ACCOUNT_EMAIL=dev-test@example.com
TEST_ACCOUNT_PASSWORD=replace-with-a-strong-local-password
```

The script also requires the normal server-only Supabase environment variables to already be available locally:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not expose the service role key to the browser. This workflow uses backend/admin APIs only.

## Run the script

```bash
npm run create:test-account
```

What it does:

- reads `TEST_ACCOUNT_EMAIL` and `TEST_ACCOUNT_PASSWORD` from the local gitignored env file
- checks Supabase Auth for an existing user with that email
- creates the account only when it does not already exist
- never prints the password

If the required env vars are missing, the script fails safely with a clear error.

## Verified behavior

This workflow has already been verified in the repo:

- the script loads `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- the script loads `.local/test-account.env` or `.env.test.local` for `TEST_ACCOUNT_EMAIL` and `TEST_ACCOUNT_PASSWORD`
- the first run creates the auth user
- later runs detect the same email and report that the account already exists

## Agent notes

Future agents should not ask the user to redesign or re-explain this workflow.

When a local dev test account is needed:

1. Read this file.
2. Assume the current machine may already have a local test account configured.
3. Prefer running `npm run create:test-account` to verify/create the account instead of asking the user to remember the setup steps.
4. Never ask the user to commit credentials.
5. Never print or store the password in tracked files.
