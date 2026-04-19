CREATE TABLE IF NOT EXISTS public.ai_trial_grant_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_user_id UUID,
    raw_email TEXT,
    normalized_email TEXT NOT NULL,
    email_domain TEXT,
    signup_ip TEXT,
    signup_device_fingerprint TEXT,
    signup_user_agent TEXT,
    signup_accept_language TEXT,
    granted_micros BIGINT NOT NULL DEFAULT 0,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_trial_grant_history_normalized_email
    ON public.ai_trial_grant_history(normalized_email);

CREATE INDEX IF NOT EXISTS idx_ai_trial_grant_history_signup_ip
    ON public.ai_trial_grant_history(signup_ip, granted_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_trial_grant_history_signup_device
    ON public.ai_trial_grant_history(signup_device_fingerprint, granted_at DESC);

INSERT INTO public.ai_trial_grant_history (
    original_user_id,
    raw_email,
    normalized_email,
    email_domain,
    signup_ip,
    signup_device_fingerprint,
    signup_user_agent,
    signup_accept_language,
    granted_micros,
    granted_at,
    metadata
)
SELECT
    user_id,
    raw_email,
    normalized_email,
    email_domain,
    signup_ip,
    signup_device_fingerprint,
    signup_user_agent,
    signup_accept_language,
    granted_micros,
    COALESCE(granted_at, created_at, NOW()),
    jsonb_build_object(
        'backfilled_from', 'ai_trial_accounts',
        'grant_count', grant_count,
        'status', status
    )
FROM public.ai_trial_accounts
WHERE grant_count > 0
  AND normalized_email IS NOT NULL
ON CONFLICT (normalized_email) DO UPDATE
SET
    original_user_id = EXCLUDED.original_user_id,
    raw_email = EXCLUDED.raw_email,
    email_domain = EXCLUDED.email_domain,
    signup_ip = EXCLUDED.signup_ip,
    signup_device_fingerprint = EXCLUDED.signup_device_fingerprint,
    signup_user_agent = EXCLUDED.signup_user_agent,
    signup_accept_language = EXCLUDED.signup_accept_language,
    granted_micros = GREATEST(public.ai_trial_grant_history.granted_micros, EXCLUDED.granted_micros),
    granted_at = LEAST(public.ai_trial_grant_history.granted_at, EXCLUDED.granted_at),
    metadata = public.ai_trial_grant_history.metadata || EXCLUDED.metadata;

CREATE OR REPLACE FUNCTION public.evaluate_and_grant_ai_trial(
    p_user_id UUID,
    p_raw_email TEXT,
    p_ip_address TEXT,
    p_device_fingerprint TEXT,
    p_user_agent TEXT,
    p_accept_language TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account public.ai_trial_accounts%ROWTYPE;
    v_budget_micros BIGINT := 2000000;
    v_normalized_email TEXT := public.normalize_trial_email(p_raw_email);
    v_email_domain TEXT := split_part(lower(COALESCE(p_raw_email, '')), '@', 2);
    v_disposable_domains TEXT[] := ARRAY[
        'mailinator.com',
        'guerrillamail.com',
        '10minutemail.com',
        'tempmail.com',
        'yopmail.com',
        'sharklasers.com',
        'discard.email',
        'maildrop.cc',
        'temp-mail.org',
        'trashmail.com'
    ];
    v_risk_flags TEXT[] := ARRAY[]::TEXT[];
    v_duplicate_trial_count INTEGER := 0;
    v_recent_ip_accounts INTEGER := 0;
    v_recent_device_accounts INTEGER := 0;
    v_risk_score INTEGER := 0;
    v_status TEXT := 'active';
    v_blocked_reason TEXT := NULL;
BEGIN
    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.ai_trial_accounts (
            user_id,
            raw_email,
            normalized_email,
            email_domain,
            status
        )
        VALUES (
            p_user_id,
            p_raw_email,
            v_normalized_email,
            v_email_domain,
            'disabled'
        );

        SELECT *
        INTO v_account
        FROM public.ai_trial_accounts
        WHERE user_id = p_user_id
        FOR UPDATE;
    END IF;

    IF v_account.grant_count > 0 THEN
        RETURN jsonb_build_object(
            'status', v_account.status,
            'remaining_micros', v_account.remaining_micros,
            'granted_micros', v_account.granted_micros,
            'consumed_micros', v_account.consumed_micros,
            'grant_count', v_account.grant_count
        );
    END IF;

    SELECT COUNT(*)
    INTO v_duplicate_trial_count
    FROM public.ai_trial_grant_history
    WHERE normalized_email = v_normalized_email;

    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(DISTINCT normalized_email)
        INTO v_recent_ip_accounts
        FROM public.ai_trial_grant_history
        WHERE signup_ip = p_ip_address
          AND granted_at >= NOW() - INTERVAL '7 days';
    END IF;

    IF p_device_fingerprint IS NOT NULL AND p_device_fingerprint <> '' THEN
        SELECT COUNT(DISTINCT normalized_email)
        INTO v_recent_device_accounts
        FROM public.ai_trial_grant_history
        WHERE signup_device_fingerprint = p_device_fingerprint
          AND granted_at >= NOW() - INTERVAL '30 days';
    END IF;

    IF v_duplicate_trial_count > 0 THEN
        v_risk_flags := array_append(v_risk_flags, 'duplicate_normalized_email');
        v_status := 'blocked';
        v_blocked_reason := 'duplicate_normalized_email';
    END IF;

    IF v_email_domain = ANY (v_disposable_domains) THEN
        v_risk_flags := array_append(v_risk_flags, 'disposable_email_domain');
        v_status := 'blocked';
        v_blocked_reason := COALESCE(v_blocked_reason, 'disposable_email_domain');
    END IF;

    IF v_recent_device_accounts >= 2 THEN
        v_risk_flags := array_append(v_risk_flags, 'reused_device_cluster');
        IF v_status = 'active' THEN
            v_status := 'abuse_review';
            v_blocked_reason := 'reused_device_cluster';
        END IF;
    END IF;

    IF v_recent_ip_accounts >= 4 THEN
        v_risk_flags := array_append(v_risk_flags, 'signup_ip_cluster');
        IF v_status = 'active' THEN
            v_status := 'abuse_review';
            v_blocked_reason := 'signup_ip_cluster';
        END IF;
    END IF;

    v_risk_score := COALESCE(array_length(v_risk_flags, 1), 0) * 25;

    INSERT INTO public.ai_abuse_signals (
        user_id,
        signal_type,
        ip_address,
        device_fingerprint,
        raw_email,
        normalized_email,
        email_domain,
        billing_mode,
        provider,
        risk_score,
        risk_flags,
        user_agent,
        accept_language,
        metadata
    )
    VALUES (
        p_user_id,
        'signup',
        p_ip_address,
        NULLIF(p_device_fingerprint, ''),
        p_raw_email,
        v_normalized_email,
        NULLIF(v_email_domain, ''),
        'app_managed_trial',
        'openai',
        v_risk_score,
        to_jsonb(v_risk_flags),
        p_user_agent,
        p_accept_language,
        jsonb_build_object(
            'duplicate_trial_count', v_duplicate_trial_count,
            'recent_ip_accounts', v_recent_ip_accounts,
            'recent_device_accounts', v_recent_device_accounts,
            'durable_history_source', 'ai_trial_grant_history'
        )
    );

    UPDATE public.ai_trial_accounts
    SET
        raw_email = p_raw_email,
        normalized_email = v_normalized_email,
        email_domain = NULLIF(v_email_domain, ''),
        status = v_status,
        trial_budget_micros = v_budget_micros,
        granted_micros = CASE WHEN v_status = 'active' THEN v_budget_micros ELSE 0 END,
        remaining_micros = CASE WHEN v_status = 'active' THEN v_budget_micros ELSE 0 END,
        signup_ip = p_ip_address,
        signup_device_fingerprint = NULLIF(p_device_fingerprint, ''),
        signup_user_agent = p_user_agent,
        signup_accept_language = p_accept_language,
        signup_risk_score = v_risk_score,
        suspicious_flags = to_jsonb(v_risk_flags),
        blocked_reason = v_blocked_reason,
        granted_at = CASE WHEN v_status = 'active' THEN NOW() ELSE NULL END,
        blocked_at = CASE WHEN v_status IN ('blocked', 'abuse_review') THEN NOW() ELSE NULL END,
        last_activity_at = NOW()
    WHERE user_id = p_user_id;

    IF v_status = 'active' THEN
        UPDATE public.ai_trial_accounts
        SET grant_count = 1
        WHERE user_id = p_user_id;

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
            'trial_grant',
            v_budget_micros,
            v_budget_micros,
            'Initial sponsored AI trial grant',
            jsonb_build_object('budget_micros', v_budget_micros)
        );

        INSERT INTO public.ai_trial_grant_history (
            original_user_id,
            raw_email,
            normalized_email,
            email_domain,
            signup_ip,
            signup_device_fingerprint,
            signup_user_agent,
            signup_accept_language,
            granted_micros,
            granted_at,
            metadata
        )
        VALUES (
            p_user_id,
            p_raw_email,
            v_normalized_email,
            NULLIF(v_email_domain, ''),
            p_ip_address,
            NULLIF(p_device_fingerprint, ''),
            p_user_agent,
            p_accept_language,
            v_budget_micros,
            NOW(),
            jsonb_build_object(
                'source', 'evaluate_and_grant_ai_trial',
                'billing_mode', 'app_managed_trial'
            )
        )
        ON CONFLICT (normalized_email) DO UPDATE
        SET
            raw_email = EXCLUDED.raw_email,
            email_domain = EXCLUDED.email_domain,
            signup_ip = EXCLUDED.signup_ip,
            signup_device_fingerprint = EXCLUDED.signup_device_fingerprint,
            signup_user_agent = EXCLUDED.signup_user_agent,
            signup_accept_language = EXCLUDED.signup_accept_language,
            granted_micros = GREATEST(public.ai_trial_grant_history.granted_micros, EXCLUDED.granted_micros),
            metadata = public.ai_trial_grant_history.metadata || EXCLUDED.metadata;
    END IF;

    RETURN (
        SELECT jsonb_build_object(
            'status', status,
            'remaining_micros', remaining_micros,
            'granted_micros', granted_micros,
            'consumed_micros', consumed_micros,
            'grant_count', grant_count,
            'blocked_reason', blocked_reason,
            'risk_score', signup_risk_score,
            'suspicious_flags', suspicious_flags
        )
        FROM public.ai_trial_accounts
        WHERE user_id = p_user_id
    );
END;
$$;
