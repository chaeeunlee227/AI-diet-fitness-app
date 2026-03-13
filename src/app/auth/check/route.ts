import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const supabase = createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // No session found → go back to login
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!profile) {
    // First-time user → onboarding
    return NextResponse.redirect(`${origin}/onboard`)
  }

  // Returning user → dashboard
  return NextResponse.redirect(`${origin}/dashboard`)
}