CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Deletes the authenticated user from the auth.users table.
  -- This triggers all the ON DELETE CASCADE relationships across
  -- profiles, projects, scenes, characters, ideas, and user_api_keys.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;
