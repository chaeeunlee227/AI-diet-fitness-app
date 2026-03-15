'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // /auth/confirm handles the token hash (#access_token=...) client-side.
        // /auth/callback handles the PKCE code (?code=...) server-side.
        // Magic links use the token hash flow, so point here.
        emailRedirectTo: `${window.location.origin}/auth/confirm`,
      },
    })
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-2xl font-semibold text-gray-900">HealthTrack</h1>
          <p className="text-sm text-gray-500 mt-1">AI-powered diet & fitness tracker</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {!sent ? (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
              <p className="text-sm text-gray-500 mb-5">
                Enter your email — we'll send you a magic link. No password needed.
              </p>
              <form onSubmit={handleLogin} className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
                />
                {error && (
                  <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  {loading ? 'Sending...' : 'Send magic link →'}
                </button>
              </form>
              <p className="text-xs text-gray-400 mt-4 text-center">
                First time? An account is created automatically.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your inbox</h2>
              <p className="text-sm text-gray-500 mb-4">
                We sent a magic link to <strong className="text-gray-700">{email}</strong>.
                Click it to sign in — it expires in 1 hour.
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-xs text-sky-600 hover:underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          Your data is stored securely in Supabase.
        </p>
      </div>
    </div>
  )
}
