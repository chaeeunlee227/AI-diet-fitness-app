'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * Handles the magic link token hash flow.
 *
 * Supabase magic links redirect here with session tokens in the URL
 * fragment (e.g. #access_token=...&refresh_token=...).
 * Fragments are never sent to the server, so this client component
 * reads the fragment, lets the Supabase client exchange it for a real
 * session via onAuthStateChange, then redirects to /dashboard.
 */
export default function AuthConfirmPage() {
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    // Handle case where session was already set before listener fired
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
