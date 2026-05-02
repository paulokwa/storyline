# Local Dev Test Account

This workflow is for local development and testing only.

The test account credentials are intentionally stored outside Git in a local env file. Each machine must create its own local credential file.

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
