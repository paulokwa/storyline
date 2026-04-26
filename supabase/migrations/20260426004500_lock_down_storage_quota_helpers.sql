REVOKE ALL ON FUNCTION public.calculate_project_asset_storage_used(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_profile_storage_usage(UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_profile_storage_usage_for_asset() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.check_storage_quota(UUID, BIGINT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_storage_quota(UUID, BIGINT) TO authenticated;
