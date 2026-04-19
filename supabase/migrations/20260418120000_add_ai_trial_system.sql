ALTER TABLE user_api_keys
    ADD COLUMN IF NOT EXISTS billing_mode TEXT;

UPDATE user_api_keys
SET billing_mode = CASE
    WHEN ai_provider = 'ollama' THEN 'ollama'
    WHEN api_key IS NOT NULL THEN 'byok'
    ELSE 'app_managed_trial'
END
WHERE billing_mode IS NULL;

ALTER TABLE user_api_keys
    ALTER COLUMN billing_mode SET DEFAULT 'app_managed_trial';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_api_keys_billing_mode_check'
    ) THEN
        ALTER TABLE user_api_keys
            ADD CONSTRAINT user_api_keys_billing_mode_check
            CHECK (billing_mode IN ('app_managed_trial', 'byok', 'ollama'));
    END IF;
END;
$$;

CREATE TABLE IF NOT EXISTS public.ai_trial_accounts (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    raw_email TEXT,
    normalized_email TEXT,
    email_domain TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'exhausted', 'blocked', 'abuse_review', 'disabled')),
    trial_budget_micros BIGINT NOT NULL DEFAULT 2000000,
    granted_micros BIGINT NOT NULL DEFAULT 0,
    consumed_micros BIGINT NOT NULL DEFAULT 0,
    reserved_micros BIGINT NOT NULL DEFAULT 0,
    remaining_micros BIGINT NOT NULL DEFAULT 0,
    grant_count INTEGER NOT NULL DEFAULT 0,
    signup_ip TEXT,
    signup_device_fingerprint TEXT,
    signup_user_agent TEXT,
    signup_accept_language TEXT,
    signup_risk_score INTEGER NOT NULL DEFAULT 0,
    suspicious_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    blocked_reason TEXT,
    granted_at TIMESTAMPTZ,
    exhausted_at TIMESTAMPTZ,
    blocked_at TIMESTAMPTZ,
    disabled_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    last_request_ip TEXT,
    last_device_fingerprint TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_trial_accounts_status ON public.ai_trial_accounts(status);
CREATE INDEX IF NOT EXISTS idx_ai_trial_accounts_normalized_email ON public.ai_trial_accounts(normalized_email);
CREATE INDEX IF NOT EXISTS idx_ai_trial_accounts_last_activity ON public.ai_trial_accounts(last_activity_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_usage_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_key TEXT NOT NULL UNIQUE,
    endpoint TEXT NOT NULL CHECK (endpoint IN ('ai_helper', 'analyze_scene', 'import_ai_detect')),
    billing_mode TEXT NOT NULL CHECK (billing_mode IN ('app_managed_trial', 'byok', 'ollama')),
    provider TEXT NOT NULL CHECK (provider IN ('openai', 'gemini', 'ollama')),
    model TEXT,
    status TEXT NOT NULL CHECK (status IN ('reserved', 'completed', 'failed', 'blocked', 'bypassed')),
    input_chars INTEGER NOT NULL DEFAULT 0,
    output_chars INTEGER NOT NULL DEFAULT 0,
    estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
    reserved_micros BIGINT NOT NULL DEFAULT 0,
    final_micros BIGINT NOT NULL DEFAULT 0,
    refunded_micros BIGINT NOT NULL DEFAULT 0,
    error_code TEXT,
    http_status INTEGER,
    ip_address TEXT,
    device_fingerprint TEXT,
    normalized_email TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_events_user_id ON public.ai_usage_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_endpoint ON public.ai_usage_events(endpoint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_status ON public.ai_usage_events(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_events_mode_provider ON public.ai_usage_events(billing_mode, provider, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_trial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    usage_event_id UUID REFERENCES public.ai_usage_events(id) ON DELETE SET NULL,
    entry_type TEXT NOT NULL CHECK (entry_type IN ('trial_grant', 'usage_reservation', 'usage_refund', 'manual_adjustment', 'status_change')),
    delta_micros BIGINT NOT NULL,
    balance_after_micros BIGINT NOT NULL,
    admin_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    note TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_trial_ledger_user_id ON public.ai_trial_ledger(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_trial_ledger_usage_event_id ON public.ai_trial_ledger(usage_event_id);

CREATE TABLE IF NOT EXISTS public.ai_abuse_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('signup_attempt', 'signup', 'ai_request', 'mode_change', 'manual_review')),
    ip_address TEXT,
    device_fingerprint TEXT,
    raw_email TEXT,
    normalized_email TEXT,
    email_domain TEXT,
    billing_mode TEXT CHECK (billing_mode IN ('app_managed_trial', 'byok', 'ollama')),
    provider TEXT CHECK (provider IN ('openai', 'gemini', 'ollama')),
    endpoint TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    user_agent TEXT,
    accept_language TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_abuse_signals_created_at ON public.ai_abuse_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_abuse_signals_ip ON public.ai_abuse_signals(ip_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_abuse_signals_device ON public.ai_abuse_signals(device_fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_abuse_signals_normalized_email ON public.ai_abuse_signals(normalized_email, created_at DESC);

ALTER TABLE public.ai_trial_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_trial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_abuse_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own ai trial account" ON public.ai_trial_accounts;
CREATE POLICY "Users can view their own ai trial account"
ON public.ai_trial_accounts FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own ai usage events" ON public.ai_usage_events;
CREATE POLICY "Users can view their own ai usage events"
ON public.ai_usage_events FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own ai trial ledger" ON public.ai_trial_ledger;
CREATE POLICY "Users can view their own ai trial ledger"
ON public.ai_trial_ledger FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own ai abuse signals" ON public.ai_abuse_signals;
CREATE POLICY "Users can view their own ai abuse signals"
ON public.ai_abuse_signals FOR SELECT
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.normalize_trial_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    local_part TEXT;
    domain_part TEXT;
BEGIN
    IF p_email IS NULL THEN
        RETURN NULL;
    END IF;

    local_part := split_part(lower(trim(p_email)), '@', 1);
    domain_part := split_part(lower(trim(p_email)), '@', 2);

    IF domain_part = '' THEN
        RETURN lower(trim(p_email));
    END IF;

    IF domain_part = 'googlemail.com' THEN
        domain_part := 'gmail.com';
    END IF;

    IF domain_part = ANY (ARRAY[
        'gmail.com',
        'googlemail.com',
        'outlook.com',
        'hotmail.com',
        'live.com',
        'icloud.com',
        'me.com',
        'pm.me',
        'proton.me',
        'protonmail.com',
        'fastmail.com'
    ]) THEN
        local_part := split_part(local_part, '+', 1);
    END IF;

    IF domain_part = 'gmail.com' THEN
        local_part := replace(local_part, '.', '');
    END IF;

    RETURN local_part || '@' || domain_part;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_ai_trial_accounts_updated_at ON public.ai_trial_accounts;
CREATE TRIGGER set_ai_trial_accounts_updated_at
BEFORE UPDATE ON public.ai_trial_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.ensure_default_ai_settings_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_api_keys (
        user_id,
        ai_enabled,
        ai_provider,
        billing_mode,
        ai_fallback_enabled,
        ollama_model,
        ollama_url
    )
    VALUES (
        NEW.id,
        true,
        'openai',
        'app_managed_trial',
        false,
        'llama3',
        'http://127.0.0.1:11434'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ai_settings ON auth.users;
CREATE TRIGGER on_auth_user_created_ai_settings
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.ensure_default_ai_settings_for_user();

CREATE OR REPLACE FUNCTION public.init_ai_trial_account()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.ai_trial_accounts (
        user_id,
        raw_email,
        normalized_email,
        email_domain,
        status
    )
    VALUES (
        NEW.id,
        NEW.email,
        public.normalize_trial_email(NEW.email),
        split_part(lower(COALESCE(NEW.email, '')), '@', 2),
        'disabled'
    )
    ON CONFLICT (user_id) DO UPDATE SET
        raw_email = EXCLUDED.raw_email,
        normalized_email = EXCLUDED.normalized_email,
        email_domain = EXCLUDED.email_domain;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_ai_trial_account ON auth.users;
CREATE TRIGGER on_auth_user_created_ai_trial_account
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.init_ai_trial_account();

CREATE OR REPLACE FUNCTION public.record_signup_attempt_signal(
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
    v_normalized_email TEXT := public.normalize_trial_email(p_raw_email);
    v_email_domain TEXT := split_part(lower(COALESCE(p_raw_email, '')), '@', 2);
    v_recent_ip_attempts INTEGER := 0;
    v_recent_device_attempts INTEGER := 0;
    v_risk_flags TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(*)
        INTO v_recent_ip_attempts
        FROM public.ai_abuse_signals
        WHERE signal_type = 'signup_attempt'
          AND ip_address = p_ip_address
          AND created_at >= NOW() - INTERVAL '1 hour';
    END IF;

    IF p_device_fingerprint IS NOT NULL AND p_device_fingerprint <> '' THEN
        SELECT COUNT(*)
        INTO v_recent_device_attempts
        FROM public.ai_abuse_signals
        WHERE signal_type = 'signup_attempt'
          AND device_fingerprint = p_device_fingerprint
          AND created_at >= NOW() - INTERVAL '12 hours';
    END IF;

    IF v_recent_ip_attempts >= 6 THEN
        v_risk_flags := array_append(v_risk_flags, 'signup_rate_ip');
    END IF;

    IF v_recent_device_attempts >= 4 THEN
        v_risk_flags := array_append(v_risk_flags, 'signup_rate_device');
    END IF;

    INSERT INTO public.ai_abuse_signals (
        signal_type,
        ip_address,
        device_fingerprint,
        raw_email,
        normalized_email,
        email_domain,
        risk_score,
        risk_flags,
        user_agent,
        accept_language
    )
    VALUES (
        'signup_attempt',
        p_ip_address,
        NULLIF(p_device_fingerprint, ''),
        p_raw_email,
        v_normalized_email,
        NULLIF(v_email_domain, ''),
        COALESCE(array_length(v_risk_flags, 1), 0) * 25,
        to_jsonb(v_risk_flags),
        p_user_agent,
        p_accept_language
    );

    RETURN jsonb_build_object(
        'allowed', COALESCE(array_length(v_risk_flags, 1), 0) = 0,
        'flags', to_jsonb(v_risk_flags),
        'recent_ip_attempts', v_recent_ip_attempts,
        'recent_device_attempts', v_recent_device_attempts
    );
END;
$$;

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
    FROM public.ai_trial_accounts
    WHERE normalized_email = v_normalized_email
      AND user_id <> p_user_id
      AND grant_count > 0;

    IF p_ip_address IS NOT NULL THEN
        SELECT COUNT(DISTINCT user_id)
        INTO v_recent_ip_accounts
        FROM public.ai_abuse_signals
        WHERE signal_type = 'signup'
          AND ip_address = p_ip_address
          AND created_at >= NOW() - INTERVAL '7 days';
    END IF;

    IF p_device_fingerprint IS NOT NULL AND p_device_fingerprint <> '' THEN
        SELECT COUNT(DISTINCT user_id)
        INTO v_recent_device_accounts
        FROM public.ai_abuse_signals
        WHERE signal_type = 'signup'
          AND device_fingerprint = p_device_fingerprint
          AND created_at >= NOW() - INTERVAL '30 days';
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
            'recent_device_accounts', v_recent_device_accounts
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

CREATE OR REPLACE FUNCTION public.reserve_ai_trial_usage(
    p_user_id UUID,
    p_request_key TEXT,
    p_endpoint TEXT,
    p_provider TEXT,
    p_model TEXT,
    p_reserved_micros BIGINT,
    p_input_chars INTEGER,
    p_estimated_input_tokens INTEGER,
    p_estimated_output_tokens INTEGER,
    p_ip_address TEXT,
    p_device_fingerprint TEXT,
    p_user_agent TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account public.ai_trial_accounts%ROWTYPE;
    v_event public.ai_usage_events%ROWTYPE;
    v_next_balance BIGINT;
BEGIN
    SELECT *
    INTO v_event
    FROM public.ai_usage_events
    WHERE request_key = p_request_key
    LIMIT 1;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'ok', v_event.status = 'reserved',
            'status', v_event.status,
            'usage_event_id', v_event.id,
            'reserved_micros', v_event.reserved_micros
        );
    END IF;

    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'status', 'disabled', 'reason', 'trial_account_missing');
    END IF;

    IF v_account.status <> 'active' THEN
        INSERT INTO public.ai_usage_events (
            user_id,
            request_key,
            endpoint,
            billing_mode,
            provider,
            model,
            status,
            input_chars,
            estimated_input_tokens,
            estimated_output_tokens,
            ip_address,
            device_fingerprint,
            normalized_email,
            user_agent,
            metadata
        )
        VALUES (
            p_user_id,
            p_request_key,
            p_endpoint,
            'app_managed_trial',
            p_provider,
            p_model,
            'blocked',
            COALESCE(p_input_chars, 0),
            COALESCE(p_estimated_input_tokens, 0),
            COALESCE(p_estimated_output_tokens, 0),
            p_ip_address,
            NULLIF(p_device_fingerprint, ''),
            v_account.normalized_email,
            p_user_agent,
            p_metadata
        )
        RETURNING *
        INTO v_event;

        RETURN jsonb_build_object(
            'ok', false,
            'status', v_account.status,
            'usage_event_id', v_event.id,
            'reason', COALESCE(v_account.blocked_reason, 'trial_not_active')
        );
    END IF;

    IF v_account.remaining_micros < p_reserved_micros THEN
        UPDATE public.ai_trial_accounts
        SET
            status = 'exhausted',
            exhausted_at = COALESCE(exhausted_at, NOW()),
            blocked_reason = 'trial_budget_exhausted'
        WHERE user_id = p_user_id;

        INSERT INTO public.ai_usage_events (
            user_id,
            request_key,
            endpoint,
            billing_mode,
            provider,
            model,
            status,
            input_chars,
            estimated_input_tokens,
            estimated_output_tokens,
            ip_address,
            device_fingerprint,
            normalized_email,
            user_agent,
            metadata,
            error_code
        )
        VALUES (
            p_user_id,
            p_request_key,
            p_endpoint,
            'app_managed_trial',
            p_provider,
            p_model,
            'blocked',
            COALESCE(p_input_chars, 0),
            COALESCE(p_estimated_input_tokens, 0),
            COALESCE(p_estimated_output_tokens, 0),
            p_ip_address,
            NULLIF(p_device_fingerprint, ''),
            v_account.normalized_email,
            p_user_agent,
            p_metadata,
            'trial_budget_exhausted'
        )
        RETURNING *
        INTO v_event;

        RETURN jsonb_build_object(
            'ok', false,
            'status', 'exhausted',
            'usage_event_id', v_event.id,
            'reason', 'trial_budget_exhausted'
        );
    END IF;

    INSERT INTO public.ai_usage_events (
        user_id,
        request_key,
        endpoint,
        billing_mode,
        provider,
        model,
        status,
        input_chars,
        estimated_input_tokens,
        estimated_output_tokens,
        reserved_micros,
        ip_address,
        device_fingerprint,
        normalized_email,
        user_agent,
        metadata
    )
    VALUES (
        p_user_id,
        p_request_key,
        p_endpoint,
        'app_managed_trial',
        p_provider,
        p_model,
        'reserved',
        COALESCE(p_input_chars, 0),
        COALESCE(p_estimated_input_tokens, 0),
        COALESCE(p_estimated_output_tokens, 0),
        p_reserved_micros,
        p_ip_address,
        NULLIF(p_device_fingerprint, ''),
        v_account.normalized_email,
        p_user_agent,
        p_metadata
    )
    RETURNING *
    INTO v_event;

    v_next_balance := v_account.remaining_micros - p_reserved_micros;

    UPDATE public.ai_trial_accounts
    SET
        remaining_micros = v_next_balance,
        reserved_micros = reserved_micros + p_reserved_micros,
        last_activity_at = NOW(),
        last_request_ip = p_ip_address,
        last_device_fingerprint = NULLIF(p_device_fingerprint, '')
    WHERE user_id = p_user_id;

    INSERT INTO public.ai_trial_ledger (
        user_id,
        usage_event_id,
        entry_type,
        delta_micros,
        balance_after_micros,
        note,
        metadata
    )
    VALUES (
        p_user_id,
        v_event.id,
        'usage_reservation',
        -p_reserved_micros,
        v_next_balance,
        'Reserved sponsored AI budget',
        p_metadata
    );

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
        endpoint,
        user_agent,
        metadata
    )
    VALUES (
        p_user_id,
        'ai_request',
        p_ip_address,
        NULLIF(p_device_fingerprint, ''),
        v_account.raw_email,
        v_account.normalized_email,
        v_account.email_domain,
        'app_managed_trial',
        p_provider,
        p_endpoint,
        p_user_agent,
        p_metadata
    );

    RETURN jsonb_build_object(
        'ok', true,
        'status', 'reserved',
        'usage_event_id', v_event.id,
        'reserved_micros', p_reserved_micros,
        'remaining_micros', v_next_balance
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_ai_trial_usage(
    p_user_id UUID,
    p_request_key TEXT,
    p_final_micros BIGINT,
    p_output_chars INTEGER,
    p_http_status INTEGER,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event public.ai_usage_events%ROWTYPE;
    v_account public.ai_trial_accounts%ROWTYPE;
    v_actual_micros BIGINT;
    v_refund_micros BIGINT;
    v_balance_after BIGINT;
BEGIN
    SELECT *
    INTO v_event
    FROM public.ai_usage_events
    WHERE request_key = p_request_key
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'usage_event_missing');
    END IF;

    IF v_event.status <> 'reserved' THEN
        RETURN jsonb_build_object(
            'ok', true,
            'status', v_event.status,
            'final_micros', v_event.final_micros,
            'refunded_micros', v_event.refunded_micros
        );
    END IF;

    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    v_actual_micros := LEAST(GREATEST(p_final_micros, 0), v_event.reserved_micros);
    v_refund_micros := v_event.reserved_micros - v_actual_micros;
    v_balance_after := v_account.remaining_micros + v_refund_micros;

    UPDATE public.ai_usage_events
    SET
        status = 'completed',
        output_chars = COALESCE(p_output_chars, 0),
        final_micros = v_actual_micros,
        refunded_micros = v_refund_micros,
        http_status = p_http_status,
        metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
        completed_at = NOW()
    WHERE id = v_event.id;

    UPDATE public.ai_trial_accounts
    SET
        reserved_micros = GREATEST(reserved_micros - v_event.reserved_micros, 0),
        consumed_micros = consumed_micros + v_actual_micros,
        remaining_micros = v_balance_after,
        status = CASE
            WHEN status = 'active' AND v_balance_after <= 0 THEN 'exhausted'
            ELSE status
        END,
        exhausted_at = CASE
            WHEN status = 'active' AND v_balance_after <= 0 THEN NOW()
            ELSE exhausted_at
        END,
        last_activity_at = NOW()
    WHERE user_id = p_user_id;

    IF v_refund_micros > 0 THEN
        INSERT INTO public.ai_trial_ledger (
            user_id,
            usage_event_id,
            entry_type,
            delta_micros,
            balance_after_micros,
            note,
            metadata
        )
        VALUES (
            p_user_id,
            v_event.id,
            'usage_refund',
            v_refund_micros,
            v_balance_after,
            'Refunded unused sponsored AI reserve',
            p_metadata
        );
    END IF;

    RETURN jsonb_build_object(
        'ok', true,
        'status', CASE WHEN v_balance_after <= 0 THEN 'exhausted' ELSE 'completed' END,
        'final_micros', v_actual_micros,
        'refunded_micros', v_refund_micros,
        'remaining_micros', v_balance_after
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_ai_trial_usage(
    p_user_id UUID,
    p_request_key TEXT,
    p_error_code TEXT,
    p_http_status INTEGER,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event public.ai_usage_events%ROWTYPE;
    v_account public.ai_trial_accounts%ROWTYPE;
    v_balance_after BIGINT;
BEGIN
    SELECT *
    INTO v_event
    FROM public.ai_usage_events
    WHERE request_key = p_request_key
      AND user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'usage_event_missing');
    END IF;

    IF v_event.status <> 'reserved' THEN
        RETURN jsonb_build_object('ok', true, 'status', v_event.status);
    END IF;

    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_user_id
    FOR UPDATE;

    v_balance_after := v_account.remaining_micros + v_event.reserved_micros;

    UPDATE public.ai_usage_events
    SET
        status = 'failed',
        refunded_micros = v_event.reserved_micros,
        http_status = p_http_status,
        error_code = p_error_code,
        metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(p_metadata, '{}'::jsonb),
        completed_at = NOW()
    WHERE id = v_event.id;

    UPDATE public.ai_trial_accounts
    SET
        reserved_micros = GREATEST(reserved_micros - v_event.reserved_micros, 0),
        remaining_micros = v_balance_after,
        last_activity_at = NOW()
    WHERE user_id = p_user_id;

    INSERT INTO public.ai_trial_ledger (
        user_id,
        usage_event_id,
        entry_type,
        delta_micros,
        balance_after_micros,
        note,
        metadata
    )
    VALUES (
        p_user_id,
        v_event.id,
        'usage_refund',
        v_event.reserved_micros,
        v_balance_after,
        'Refunded failed sponsored AI request',
        COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('error_code', p_error_code)
    );

    RETURN jsonb_build_object(
        'ok', true,
        'status', 'failed',
        'remaining_micros', v_balance_after
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_adjust_ai_trial(
    p_target_user_id UUID,
    p_admin_user_id UUID,
    p_delta_micros BIGINT,
    p_status TEXT DEFAULT NULL,
    p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_account public.ai_trial_accounts%ROWTYPE;
    v_next_balance BIGINT;
    v_next_status TEXT;
BEGIN
    SELECT *
    INTO v_account
    FROM public.ai_trial_accounts
    WHERE user_id = p_target_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'trial_account_missing');
    END IF;

    v_next_balance := GREATEST(v_account.remaining_micros + p_delta_micros, 0);
    v_next_status := COALESCE(p_status, CASE WHEN v_next_balance <= 0 THEN 'exhausted' ELSE v_account.status END);

    UPDATE public.ai_trial_accounts
    SET
        granted_micros = granted_micros + GREATEST(p_delta_micros, 0),
        remaining_micros = v_next_balance,
        status = v_next_status,
        blocked_reason = CASE WHEN v_next_status = 'blocked' THEN COALESCE(p_note, blocked_reason) ELSE blocked_reason END,
        blocked_at = CASE WHEN v_next_status IN ('blocked', 'abuse_review') THEN NOW() ELSE blocked_at END,
        exhausted_at = CASE WHEN v_next_status = 'exhausted' THEN NOW() ELSE exhausted_at END,
        reviewed_at = CASE WHEN v_next_status = 'active' THEN NOW() ELSE reviewed_at END,
        last_activity_at = NOW()
    WHERE user_id = p_target_user_id;

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
        p_delta_micros,
        v_next_balance,
        p_admin_user_id,
        p_note,
        jsonb_build_object('status', v_next_status)
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
            'delta_micros', p_delta_micros,
            'status', v_next_status,
            'note', p_note
        )
    );

    RETURN jsonb_build_object(
        'ok', true,
        'status', v_next_status,
        'remaining_micros', v_next_balance
    );
END;
$$;
