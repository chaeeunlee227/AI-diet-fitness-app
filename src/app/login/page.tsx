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
      if (error) { setError(error.message) } else { router.replace('/dashboard') }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message) } else { router.replace('/dashboard') }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🥗</div>
          <h1 className="text-3xl font-black text-green-900">
            Healt<span className="text-green-500">HI</span>
          </h1>
          <p className="text-sm text-green-600 mt-1 font-semibold">Your AI Health Companion</p>
        </div>

        <div className="bg-white rounded-3xl border border-green-100 p-6 shadow-green">

          {/* Mode toggle */}
          <div className="flex rounded-2xl bg-green-50 border border-green-100 p-1 mb-5 gap-1">
            {(['signin', 'signup'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError('') }}
                className={`flex-1 py-2 rounded-xl text-sm font-black transition-all ${
                  mode === m
                    ? 'bg-white shadow text-green-900 border border-green-100'
                    : 'text-green-600 hover:text-green-800'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="field-input"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'signup' ? 'Create a password' : 'Your password'}
              required
              minLength={6}
              className="field-input"
            />

            {error && <p className="msg-error">{error}</p>}

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="btn-primary w-full justify-center py-3 text-sm rounded-2xl"
            >
              {loading
                ? 'Please wait…'
                : mode === 'signin' ? 'Sign in →' : 'Create account →'}
            </button>
          </form>
        </div>

        <p className="text-xs text-center text-green-400 mt-6 font-semibold">
          Your data is stored securely in Supabase.
        </p>
      </div>
    </div>
  )
}