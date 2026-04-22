CREATE OR REPLACE FUNCTION public.reconcile_ai_trial_account(
    p_user_id UUID,
    p_stale_after_minutes INTEGER DEFAULT 15
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account public.ai_trial_accounts%ROWTYPE;
    v_refunded_micros BIGINT := 0;
    v_released_events INTEGER := 0;
    v_next_remaining BIGINT;
    v_next_reserved BIGINT;
    v_next_status TEXT;
    v_stale_cutoff TIMESTAMPTZ := NOW() - make_interval(mins => GREATEST(COALESCE(p_stale_after_minutes, 15), 1));
BEGIN
    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'trial_account_missing');
    END IF;

    WITH stale_events AS (
        SELECT id, reserved_micros
        FROM public.ai_usage_events
        WHERE user_id = p_user_id
          AND status = 'reserved'
          AND created_at <= v_stale_cutoff
        FOR UPDATE
    ),
    updated_events AS (
        UPDATE public.ai_usage_events event
        SET
            status = 'failed',
            refunded_micros = event.reserved_micros,
            error_code = COALESCE(event.error_code, 'reservation_expired'),
            http_status = COALESCE(event.http_status, 408),
            metadata = COALESCE(event.metadata, '{}'::jsonb) || jsonb_build_object(
                'reconciled', true,
                'reconcile_reason', 'reservation_expired'
            ),
            completed_at = COALESCE(event.completed_at, NOW())
        FROM stale_events stale
        WHERE event.id = stale.id
        RETURNING event.id, event.reserved_micros
    )
    SELECT
        COALESCE(SUM(reserved_micros), 0),
        COUNT(*)
    INTO v_refunded_micros, v_released_events
    FROM updated_events;

    v_next_remaining := v_account.remaining_micros + v_refunded_micros;
    v_next_reserved := GREATEST(v_account.reserved_micros - v_refunded_micros, 0);
    v_next_status := v_account.status;

    IF v_account.status = 'active' AND v_next_remaining <= 0 THEN
        v_next_status := 'exhausted';
    ELSIF v_account.status = 'exhausted'
        AND v_next_remaining > 0
        AND v_account.status NOT IN ('blocked', 'abuse_review', 'disabled') THEN
        v_next_status := 'active';
    END IF;

    UPDATE public.ai_trial_accounts
    SET
        remaining_micros = v_next_remaining,
        reserved_micros = v_next_reserved,
        status = v_next_status,
        blocked_reason = CASE
            WHEN v_next_status = 'active' AND blocked_reason = 'trial_budget_exhausted' THEN NULL
            ELSE blocked_reason
        END,
        exhausted_at = CASE
            WHEN v_next_status = 'active' THEN NULL
            WHEN v_next_status = 'exhausted' AND exhausted_at IS NULL THEN NOW()
            ELSE exhausted_at
        END,
        last_activity_at = NOW()
    WHERE user_id = p_user_id;

    IF v_released_events > 0 THEN
        INSERT INTO public.ai_trial_ledger (
            user_id,
            entry_type,
            delta_micros,
            balance_after_micros,
            note,
            metadata
        )
        VALUES (
            p_user_id,
            'usage_refund',
            v_refunded_micros,
            v_next_remaining,
            'Released stale sponsored AI reservations',
            jsonb_build_object(
                'reconciled', true,
                'released_events', v_released_events,
                'stale_after_minutes', GREATEST(COALESCE(p_stale_after_minutes, 15), 1)
            )
        );
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'status', v_next_status,
        'released_events', v_released_events,
        'refunded_micros', v_refunded_micros,
        'remaining_micros', v_next_remaining,
        'reserved_micros', v_next_reserved
    );
END;
$$;
