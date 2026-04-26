-- Make project asset storage quotas explicit and reproducible.
--
-- The app checks this quota before uploading to Supabase Storage. Keep it
-- database-backed so one user cannot consume the whole Supabase project quota,
-- but compute usage from project_assets so stale counters cannot block uploads.

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS storage_quota_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS quota_override_bytes BIGINT;

ALTER TABLE public.profiles
    ALTER COLUMN storage_used_bytes SET DEFAULT 0;

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_storage_quota_bytes_nonnegative;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_storage_quota_bytes_nonnegative
    CHECK (storage_quota_bytes IS NULL OR storage_quota_bytes >= 0);

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_storage_used_bytes_nonnegative;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_storage_used_bytes_nonnegative
    CHECK (storage_used_bytes >= 0);

ALTER TABLE public.profiles
    DROP CONSTRAINT IF EXISTS profiles_quota_override_bytes_nonnegative;

ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_quota_override_bytes_nonnegative
    CHECK (quota_override_bytes IS NULL OR quota_override_bytes >= 0);

-- 100MB gives cloud projects practical room for images while still protecting
-- a small Supabase project from one account consuming all available storage.
UPDATE public.profiles
SET storage_quota_bytes = 100 * 1024 * 1024
WHERE storage_quota_bytes IS NULL
   OR storage_quota_bytes < 100 * 1024 * 1024;

CREATE OR REPLACE FUNCTION public.calculate_project_asset_storage_used(p_user_id UUID)
RETURNS BIGINT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COALESCE(SUM(pa.file_size), 0)::BIGINT
    FROM public.project_assets pa
    LEFT JOIN public.projects p ON p.id = pa.project_id
    WHERE COALESCE(pa.uploaded_by, p.user_id) = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.refresh_profile_storage_usage(p_user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_usage BIGINT;
BEGIN
    v_usage := public.calculate_project_asset_storage_used(p_user_id);

    UPDATE public.profiles
    SET storage_used_bytes = v_usage
    WHERE id = p_user_id;

    RETURN v_usage;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_profile_storage_usage_for_asset()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_user_id UUID;
    v_new_user_id UUID;
BEGIN
    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        SELECT COALESCE(OLD.uploaded_by, p.user_id)
        INTO v_old_user_id
        FROM public.projects p
        WHERE p.id = OLD.project_id;

        IF v_old_user_id IS NOT NULL THEN
            PERFORM public.refresh_profile_storage_usage(v_old_user_id);
        END IF;
    END IF;

    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        SELECT COALESCE(NEW.uploaded_by, p.user_id)
        INTO v_new_user_id
        FROM public.projects p
        WHERE p.id = NEW.project_id;

        IF v_new_user_id IS NOT NULL
           AND (v_old_user_id IS NULL OR v_new_user_id <> v_old_user_id) THEN
            PERFORM public.refresh_profile_storage_usage(v_new_user_id);
        END IF;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_assets_sync_profile_storage_usage ON public.project_assets;
CREATE TRIGGER project_assets_sync_profile_storage_usage
    AFTER INSERT OR UPDATE OF file_size, uploaded_by, project_id OR DELETE
    ON public.project_assets
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_storage_usage_for_asset();

WITH user_usage AS (
    SELECT
        p.id,
        public.calculate_project_asset_storage_used(p.id) AS usage_bytes
    FROM public.profiles p
)
UPDATE public.profiles p
SET storage_used_bytes = user_usage.usage_bytes
FROM user_usage
WHERE user_usage.id = p.id;

CREATE OR REPLACE FUNCTION public.check_storage_quota(
    p_user_id UUID,
    p_incoming_file_size BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_default_quota_bytes BIGINT := 100 * 1024 * 1024;
    v_current_usage_bytes BIGINT;
    v_effective_quota_bytes BIGINT;
    v_incoming_file_size BIGINT := GREATEST(COALESCE(p_incoming_file_size, 0), 0);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not authenticated' USING ERRCODE = '28000';
    END IF;

    IF auth.uid() <> p_user_id THEN
        RAISE EXCEPTION 'Cannot check storage quota for another user' USING ERRCODE = '42501';
    END IF;

    SELECT GREATEST(
        v_default_quota_bytes,
        COALESCE(storage_quota_bytes, 0),
        COALESCE(quota_override_bytes, 0)
    )
    INTO v_effective_quota_bytes
    FROM public.profiles
    WHERE id = p_user_id;

    IF v_effective_quota_bytes IS NULL THEN
        INSERT INTO public.profiles (id, storage_quota_bytes, storage_used_bytes)
        VALUES (p_user_id, v_default_quota_bytes, 0)
        ON CONFLICT (id) DO NOTHING;

        v_effective_quota_bytes := v_default_quota_bytes;
    END IF;

    v_current_usage_bytes := public.refresh_profile_storage_usage(p_user_id);

    RETURN jsonb_build_object(
        'within_quota', v_current_usage_bytes + v_incoming_file_size <= v_effective_quota_bytes,
        'current_usage_bytes', v_current_usage_bytes,
        'effective_quota_bytes', v_effective_quota_bytes
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_project_asset_storage_used(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_profile_storage_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_storage_quota(UUID, BIGINT) TO authenticated;
