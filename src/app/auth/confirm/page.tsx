'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Fallback for token hash flow (#access_token=...) in case Supabase ever
// sends that instead of the PKCE code. onAuthStateChange picks up the
// fragment automatically and fires SIGNED_IN.
export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="text-4xl mb-3">🔐</div>
        <p className="text-sm text-gray-500">Signing you in…</p>
      </div>
    </div>
  )
}