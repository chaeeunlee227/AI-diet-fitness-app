import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  const { origin } = new URL(request.url)
  const supabase = await createSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${origin}/login`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('height_cm')
    .eq('id', user.id)
    .single()

  if (!profile?.height_cm) {
    return NextResponse.redirect(`${origin}/onboard`)
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}