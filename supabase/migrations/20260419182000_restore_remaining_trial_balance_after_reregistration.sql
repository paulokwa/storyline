ALTER TABLE public.ai_trial_grant_history
    ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS blocked_reason TEXT,
    ADD COLUMN IF NOT EXISTS grant_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS consumed_micros BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS remaining_micros BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reserved_micros BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS trial_budget_micros BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

UPDATE public.ai_trial_grant_history history
SET
    status = account.status,
    blocked_reason = account.blocked_reason,
    grant_count = account.grant_count,
    consumed_micros = account.consumed_micros,
    remaining_micros = account.remaining_micros,
    reserved_micros = 0,
    trial_budget_micros = account.trial_budget_micros,
    last_activity_at = account.last_activity_at,
    updated_at = COALESCE(account.updated_at, NOW())
FROM public.ai_trial_accounts account
WHERE history.normalized_email = account.normalized_email
  AND account.grant_count > 0;

CREATE OR REPLACE FUNCTION public.sync_ai_trial_grant_history_from_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_source public.ai_trial_accounts%ROWTYPE;
BEGIN
    v_source := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;

    IF v_source.normalized_email IS NULL OR v_source.grant_count <= 0 THEN
        RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
    END IF;

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
        status,
        blocked_reason,
        grant_count,
        consumed_micros,
        remaining_micros,
        reserved_micros,
        trial_budget_micros,
        last_activity_at,
        updated_at,
        metadata
    )
    VALUES (
        v_source.user_id,
        v_source.raw_email,
        v_source.normalized_email,
        v_source.email_domain,
        v_source.signup_ip,
        v_source.signup_device_fingerprint,
        v_source.signup_user_agent,
        v_source.signup_accept_language,
        v_source.granted_micros,
        COALESCE(v_source.granted_at, NOW()),
        v_source.status,
        v_source.blocked_reason,
        v_source.grant_count,
        v_source.consumed_micros,
        v_source.remaining_micros,
        0,
        v_source.trial_budget_micros,
        v_source.last_activity_at,
        NOW(),
        jsonb_build_object(
            'source', 'sync_ai_trial_grant_history_from_account',
            'trigger_op', TG_OP
        )
    )
    ON CONFLICT (normalized_email) DO UPDATE
    SET
        original_user_id = EXCLUDED.original_user_id,
        raw_email = EXCLUDED.raw_email,
        email_domain = EXCLUDED.email_domain,
        signup_ip = EXCLUDED.signup_ip,
        signup_device_fingerprint = EXCLUDED.signup_device_fingerprint,
        signup_user_agent = EXCLUDED.signup_user_agent,
        signup_accept_language = EXCLUDED.signup_accept_language,
        granted_micros = EXCLUDED.granted_micros,
        granted_at = LEAST(public.ai_trial_grant_history.granted_at, EXCLUDED.granted_at),
        status = EXCLUDED.status,
        blocked_reason = EXCLUDED.blocked_reason,
        grant_count = EXCLUDED.grant_count,
        consumed_micros = EXCLUDED.consumed_micros,
        remaining_micros = EXCLUDED.remaining_micros,
        reserved_micros = EXCLUDED.reserved_micros,
        trial_budget_micros = EXCLUDED.trial_budget_micros,
        last_activity_at = EXCLUDED.last_activity_at,
        updated_at = NOW(),
        metadata = public.ai_trial_grant_history.metadata || EXCLUDED.metadata;

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS sync_ai_trial_grant_history_on_write ON public.ai_trial_accounts;
CREATE TRIGGER sync_ai_trial_grant_history_on_write
AFTER INSERT OR UPDATE OR DELETE ON public.ai_trial_accounts
FOR EACH ROW EXECUTE FUNCTION public.sync_ai_trial_grant_history_from_account();

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
    v_existing_grant public.ai_trial_grant_history%ROWTYPE;
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

    SELECT *
    INTO v_existing_grant
    FROM public.ai_trial_grant_history
    WHERE normalized_email = v_normalized_email
    LIMIT 1;

    IF FOUND THEN
        UPDATE public.ai_trial_accounts
        SET
            raw_email = p_raw_email,
            normalized_email = v_normalized_email,
            email_domain = NULLIF(v_email_domain, ''),
            status = v_existing_grant.status,
            trial_budget_micros = v_existing_grant.trial_budget_micros,
            granted_micros = v_existing_grant.granted_micros,
            consumed_micros = v_existing_grant.consumed_micros,
            remaining_micros = v_existing_grant.remaining_micros,
            reserved_micros = 0,
            grant_count = GREATEST(v_existing_grant.grant_count, 1),
            signup_ip = COALESCE(v_existing_grant.signup_ip, p_ip_address),
            signup_device_fingerprint = COALESCE(v_existing_grant.signup_device_fingerprint, NULLIF(p_device_fingerprint, '')),
            signup_user_agent = COALESCE(v_existing_grant.signup_user_agent, p_user_agent),
            signup_accept_language = COALESCE(v_existing_grant.signup_accept_language, p_accept_language),
            signup_risk_score = 0,
            suspicious_flags = '[]'::jsonb,
            blocked_reason = v_existing_grant.blocked_reason,
            granted_at = v_existing_grant.granted_at,
            exhausted_at = CASE WHEN v_existing_grant.status = 'exhausted' THEN COALESCE(v_account.exhausted_at, NOW()) ELSE NULL END,
            blocked_at = CASE WHEN v_existing_grant.status IN ('blocked', 'abuse_review') THEN COALESCE(v_account.blocked_at, NOW()) ELSE NULL END,
            last_activity_at = NOW(),
            last_request_ip = NULL,
            last_device_fingerprint = NULL
        WHERE user_id = p_user_id;

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
            0,
            '[]'::jsonb,
            p_user_agent,
            p_accept_language,
            jsonb_build_object(
                'restored_existing_trial', true,
                'restored_status', v_existing_grant.status,
                'restored_remaining_micros', v_existing_grant.remaining_micros,
                'restored_consumed_micros', v_existing_grant.consumed_micros
            )
        );

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
    END IF;

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
            'recent_ip_accounts', v_recent_ip_accounts,
            'recent_device_accounts', v_recent_device_accounts,
            'durable_history_source', 'ai_trial_grant_history',
            'new_trial_grant', true
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
        consumed_micros = 0,
        remaining_micros = CASE WHEN v_status = 'active' THEN v_budget_micros ELSE 0 END,
        reserved_micros = 0,
        signup_ip = p_ip_address,
        signup_device_fingerprint = NULLIF(p_device_fingerprint, ''),
        signup_user_agent = p_user_agent,
        signup_accept_language = p_accept_language,
        signup_risk_score = v_risk_score,
        suspicious_flags = to_jsonb(v_risk_flags),
        blocked_reason = v_blocked_reason,
        granted_at = CASE WHEN v_status = 'active' THEN NOW() ELSE NULL END,
        blocked_at = CASE WHEN v_status IN ('blocked', 'abuse_review') THEN NOW() ELSE NULL END,
        exhausted_at = NULL,
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
