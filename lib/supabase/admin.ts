import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

export type AdminClientConfigStatus = 'ready' | 'missing_supabase_url' | 'missing_service_role_key'

export function getAdminClientConfigStatus(): AdminClientConfigStatus {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) return 'missing_supabase_url'
  if (!serviceRoleKey) return 'missing_service_role_key'
  return 'ready'
}

export function createAdminClient() {
  if (getAdminClientConfigStatus() !== 'ready') {
    return null
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
