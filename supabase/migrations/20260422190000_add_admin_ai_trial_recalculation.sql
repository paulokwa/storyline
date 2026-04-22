CREATE OR REPLACE FUNCTION public.estimate_ai_trial_cost_micros(
    p_endpoint TEXT,
    p_input_chars INTEGER,
    p_output_chars INTEGER DEFAULT NULL,
    p_output_tokens_cap INTEGER DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_input_tokens BIGINT := CEIL(GREATEST(COALESCE(p_input_chars, 0), 0)::NUMERIC / 4.0);
    v_output_tokens BIGINT;
    v_input_micros_per_1k BIGINT;
    v_output_micros_per_1k BIGINT;
    v_min_micros BIGINT;
    v_default_output_cap INTEGER;
BEGIN
    CASE p_endpoint
        WHEN 'ai_helper' THEN
            v_input_micros_per_1k := 400;
            v_output_micros_per_1k := 1600;
            v_min_micros := 1500;
            v_default_output_cap := 1000;
        WHEN 'analyze_scene' THEN
            v_input_micros_per_1k := 400;
            v_output_micros_per_1k := 1600;
            v_min_micros := 1250;
            v_default_output_cap := 1200;
        WHEN 'import_ai_detect' THEN
            v_input_micros_per_1k := 400;
            v_output_micros_per_1k := 1600;
            v_min_micros := 5000;
            v_default_output_cap := 4096;
        ELSE
            RAISE EXCEPTION 'Unsupported AI trial endpoint: %', p_endpoint;
    END CASE;

    v_output_tokens := CASE
        WHEN p_output_chars IS NOT NULL
            THEN CEIL(GREATEST(p_output_chars, 0)::NUMERIC / 4.0)
        ELSE GREATEST(COALESCE(p_output_tokens_cap, v_default_output_cap), 0)
    END;

    RETURN GREATEST(
        v_min_micros,
        CEIL(v_input_tokens::NUMERIC * v_input_micros_per_1k / 1000.0)
        + CEIL(v_output_tokens::NUMERIC * v_output_micros_per_1k / 1000.0)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_recalculate_ai_trial_usage(
    p_target_user_id UUID,
    p_admin_user_id UUID,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account public.ai_trial_accounts%ROWTYPE;
    v_previous_consumed BIGINT;
    v_previous_remaining BIGINT;
    v_previous_status TEXT;
    v_updated_events INTEGER := 0;
    v_new_consumed BIGINT := 0;
    v_new_remaining BIGINT := 0;
    v_new_status TEXT;
    v_balance_delta BIGINT := 0;
BEGIN
    PERFORM public.reconcile_ai_trial_account(p_target_user_id, 15);

    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'trial_account_missing');
    END IF;

    IF v_account.grant_count <= 0 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'trial_not_granted');
    END IF;

    IF COALESCE(v_account.reserved_micros, 0) > 0 THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'pending_reservations_present');
    END IF;

    v_previous_consumed := COALESCE(v_account.consumed_micros, 0);
    v_previous_remaining := COALESCE(v_account.remaining_micros, 0);
    v_previous_status := v_account.status;

    WITH recalculated AS (
        SELECT
            id,
            reserved_micros,
            LEAST(
                CASE
                    WHEN COALESCE(reserved_micros, 0) > 0 THEN reserved_micros
                    ELSE 9223372036854775807::BIGINT
                END,
                public.estimate_ai_trial_cost_micros(
                    endpoint,
                    input_chars,
                    NULLIF(output_chars, 0),
                    estimated_output_tokens
                )
            ) AS recalculated_final_micros
        FROM public.ai_usage_events
        WHERE user_id = p_target_user_id
          AND billing_mode = 'app_managed_trial'
          AND status = 'completed'
        FOR UPDATE
    ),
    updated_events AS (
        UPDATE public.ai_usage_events event
        SET
            final_micros = recalculated.recalculated_final_micros,
            refunded_micros = GREATEST(COALESCE(recalculated.reserved_micros, 0) - recalculated.recalculated_final_micros, 0),
            metadata = COALESCE(event.metadata, '{}'::jsonb) || jsonb_build_object(
                'trial_cost_recalculated', true,
                'trial_cost_recalculated_at', NOW(),
                'trial_cost_recalculated_by_admin', p_admin_user_id
            )
        FROM recalculated
        WHERE event.id = recalculated.id
        RETURNING event.id
    )
    SELECT COUNT(*)
    INTO v_updated_events
    FROM updated_events;

    SELECT COALESCE(SUM(final_micros), 0)
    INTO v_new_consumed
    FROM public.ai_usage_events
    WHERE user_id = p_target_user_id
      AND billing_mode = 'app_managed_trial'
      AND status = 'completed';

    v_new_remaining := GREATEST(
        COALESCE(v_account.granted_micros, 0) - v_new_consumed - COALESCE(v_account.reserved_micros, 0),
        0
    );

    v_new_status := CASE
        WHEN v_account.status IN ('blocked', 'abuse_review', 'disabled') THEN v_account.status
        WHEN v_new_remaining <= 0 THEN 'exhausted'
        ELSE 'active'
    END;

    UPDATE public.ai_trial_accounts
    SET
        consumed_micros = v_new_consumed,
        remaining_micros = v_new_remaining,
        status = v_new_status,
        blocked_reason = CASE
            WHEN v_new_status = 'active' AND blocked_reason = 'trial_budget_exhausted' THEN NULL
            WHEN v_new_status = 'exhausted' THEN 'trial_budget_exhausted'
            ELSE blocked_reason
        END,
        exhausted_at = CASE
            WHEN v_new_status = 'active' THEN NULL
            WHEN v_new_status = 'exhausted' AND exhausted_at IS NULL THEN NOW()
            ELSE exhausted_at
        END,
        reviewed_at = CASE
            WHEN v_new_status = 'active' THEN NOW()
            ELSE reviewed_at
        END,
        last_activity_at = NOW()
    WHERE user_id = p_target_user_id;

    v_balance_delta := v_new_remaining - v_previous_remaining;

    INSERT INTO public.ai_trial_ledger (
        user_id,
        entry_type,
        delta_micros,
        balance_after_micros,
        admin_user_id,
        note,
        metadata
    )
    VALUES (
        p_target_user_id,
        'manual_adjustment',
        v_balance_delta,
        v_new_remaining,
        p_admin_user_id,
        COALESCE(p_note, 'Recalculated sponsored AI usage after pricing-model correction'),
        jsonb_build_object(
            'operation', 'recalculate_trial_usage',
            'updated_events', v_updated_events,
            'previous_consumed_micros', v_previous_consumed,
            'new_consumed_micros', v_new_consumed,
            'previous_remaining_micros', v_previous_remaining,
            'new_remaining_micros', v_new_remaining,
            'previous_status', v_previous_status,
            'new_status', v_new_status
        )
    );

    INSERT INTO public.ai_abuse_signals (
        user_id,
        signal_type,
        risk_flags,
        metadata
    )
    VALUES (
        p_target_user_id,
        'manual_review',
        '[]'::jsonb,
        jsonb_build_object(
            'admin_user_id', p_admin_user_id,
            'operation', 'recalculate_trial_usage',
            'updated_events', v_updated_events,
            'balance_delta_micros', v_balance_delta,
            'previous_consumed_micros', v_previous_consumed,
            'new_consumed_micros', v_new_consumed,
            'note', p_note
        )
    );

    RETURN jsonb_build_object(
        'ok', true,
        'updated_events', v_updated_events,
        'previous_consumed_micros', v_previous_consumed,
        'new_consumed_micros', v_new_consumed,
        'previous_remaining_micros', v_previous_remaining,
        'new_remaining_micros', v_new_remaining,
        'balance_delta_micros', v_balance_delta,
        'status', v_new_status
    );
END;
$$;
