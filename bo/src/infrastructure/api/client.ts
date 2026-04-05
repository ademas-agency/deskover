import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY

// Client pour l'auth (login/logout) — garde la session
export const supabaseAuth = createClient(supabaseUrl, supabaseKey)

// Client admin pour les opérations data — force la service_role key, ignore la session user
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false }
})
