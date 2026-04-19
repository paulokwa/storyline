# AI Trial Deletion Hardening Report

## Summary

This change closes the loophole where a user could:

1. receive the sponsored AI free trial
2. delete their account
3. sign up again with the same email
4. receive a fresh trial grant

The system now keeps a durable record of granted trial identities even after the original account is deleted, and restores the same trial balance if the user signs up again with the same normalized email.

## Root Cause

Before this change, the main trial-memory tables were tied to `auth.users` with `ON DELETE CASCADE`:

* `ai_trial_accounts`
* `ai_usage_events`
* `ai_trial_ledger`
* `ai_abuse_signals` rows linked to that user

That meant deleting the auth user removed the authoritative evidence that the normalized email had already received trial credits.

## Implemented Fix

Migrations:

* [supabase/migrations/20260419174000_harden_ai_trial_reuse_after_account_deletion.sql](/c:/Coding/Storytime/storyline/supabase/migrations/20260419174000_harden_ai_trial_reuse_after_account_deletion.sql:1)
* [supabase/migrations/20260419182000_restore_remaining_trial_balance_after_reregistration.sql](/c:/Coding/Storytime/storyline/supabase/migrations/20260419182000_restore_remaining_trial_balance_after_reregistration.sql:1)

These migrations add:

* `public.ai_trial_grant_history`

Key properties:

* stores normalized email permanently
* stores original user id as plain data, not a cascading foreign key
* stores signup IP and device fingerprint used at grant time
* survives account deletion
* is backfilled from existing `ai_trial_accounts` rows with granted trials
* now stores the durable trial state, including:
  * granted balance
  * consumed balance
  * remaining balance
  * trial status
  * blocked reason

## Trial Grant Logic Changes

The `evaluate_and_grant_ai_trial` function now:

* checks `ai_trial_grant_history` for prior grants to the same normalized email
* restores the previous trial state when the same normalized email signs up again
* does not mint a fresh trial budget for that re-registered user
* uses durable grant history for recent IP cluster checks
* uses durable grant history for recent device cluster checks
* syncs ongoing trial usage state into durable history through an `ai_trial_accounts` trigger

## Security Outcome

After this change:

* deleting an account no longer resets free trial eligibility for the same normalized email
* if a user had remaining trial credits before deleting, those same credits are restored after re-registration
* if a user had already exhausted the trial, they remain exhausted after re-registration
* prior granted trial history remains available for abuse detection
* IP and device heuristics continue to work across deleted-and-recreated accounts

## What Still Happens

Account deletion still removes the user's actual content and account-owned rows, which is expected.

This fix is intentionally limited to preserving **free-trial eligibility memory**, not restoring deleted user data.

## Verification Checklist

1. Sign up with a fresh email and receive trial credits.
2. Spend only part of the trial budget.
3. Delete the account.
4. Sign up again with the same email.
5. Confirm the remaining trial balance is restored instead of a fresh full grant being issued.
6. Exhaust the remaining balance.
7. Delete the account again and re-register.
8. Confirm the user remains exhausted and does not receive a fresh budget.
9. Check `ai_trial_grant_history` for the preserved normalized email row.
10. Confirm the original deleted user no longer exists in `auth.users`.

## Cross-Reference

Relevant existing files:

* [supabase/migrations/20260418120000_add_ai_trial_system.sql](/c:/Coding/Storytime/storyline/supabase/migrations/20260418120000_add_ai_trial_system.sql:373)
* [supabase/migrations/20260405175501_delete_user_rpc.sql](/c:/Coding/Storytime/storyline/supabase/migrations/20260405175501_delete_user_rpc.sql:1)

## Risk Notes

This is a durable anti-abuse measure. Users who delete and recreate an account keep the same trial state, but they do not receive a second free trial budget. That is intentional.
