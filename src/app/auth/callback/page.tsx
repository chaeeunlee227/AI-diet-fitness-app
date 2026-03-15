'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

/**
 * This page handles the magic link token hash flow.
 *
 * Supabase magic links redirect to /auth/callback with the session tokens
 * in the URL *fragment* (e.g. #access_token=...&refresh_token=...).
 * Fragments are never sent to the server, so the Route Handler (route.ts)
 * never sees them. This client component reads the fragment, lets the
 * Supabase client exchange it for a real session, then redirects onward.
 *
 * The PKCE flow (?code=...) is still handled by route.ts — both can coexist.
 */
export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // onAuthStateChange fires automatically when Supabase detects a token
    // hash in the URL fragment and exchanges it for a session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
      if (event === 'TOKEN_REFRESHED' && session) {
        subscription.unsubscribe()
        router.replace('/dashboard')
      }
    })

    // Also handle the case where the session was set synchronously
    // before the listener fired (e.g. page refresh on this URL).
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
