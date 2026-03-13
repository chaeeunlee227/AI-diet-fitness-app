import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  const supabase = createSupabaseServerClient()  // 👈 no await

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('Error exchanging code:', error.message)
      return NextResponse.redirect(`${origin}/login?error=magic-link`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/check`)
}