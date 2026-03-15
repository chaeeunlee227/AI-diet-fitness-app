import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Use createBrowserClient (from @supabase/ssr) instead of createClient
// so that auth cookies are correctly read/written in the browser.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

// Helper: get currently logged-in user (returns null if not logged in)
export async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// Helper: get profile for a user, returns null if not yet set up
export async function getProfile(userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}