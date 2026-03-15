'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type Mode = 'signin' | 'signup'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        // Signed up — Supabase auto-signs them in, push to dashboard
        router.replace('/dashboard')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.replace('/dashboard')
      }
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
          {/* Mode toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-5">
            <button
              onClick={() => { setMode('signin'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signin' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('signup'); setError('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'signup' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'
              }`}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-sky-400"
            />

            {error && (
              <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-colors"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center text-gray-400 mt-6">
          Your data is stored securely in Supabase.
        </p>
      </div>
    </div>
  )
}