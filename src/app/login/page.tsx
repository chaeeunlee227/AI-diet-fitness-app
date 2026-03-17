'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/onboarding')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(error.message)
      } else {
        router.push('/auth/check')
      }
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0faf4] px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🥗</div>
          <h1 className="text-3xl font-extrabold text-green-700">HealtHI</h1>
          <p className="text-sm font-semibold text-green-500 mt-1">AI-powered diet & fitness tracker</p>
        </div>

        <div className="bg-white rounded-3xl border border-green-100 p-7 shadow-sm">
          <h2 className="text-xl font-extrabold text-gray-800 mb-1">
            {isSignUp ? 'Create account' : 'Welcome back!'}
          </h2>
          <p className="text-sm font-medium text-gray-400 mb-6">
            {isSignUp ? 'Start your health journey today 🌱' : 'Sign in to continue 👋'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              autoFocus
              className="w-full px-4 py-3 border-2 border-green-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 placeholder:font-normal"
            />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
              minLength={6}
              className="w-full px-4 py-3 border-2 border-green-100 rounded-2xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400 placeholder:font-normal"
            />
            {error && (
              <p className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-2xl text-sm font-bold transition-colors"
            >
              {loading ? 'Please wait...' : isSignUp ? 'Create account →' : 'Sign in →'}
            </button>
          </form>

          <p className="text-xs font-semibold text-center text-gray-400 mt-5">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              onClick={() => { setIsSignUp(!isSignUp); setError('') }}
              className="text-green-600 hover:underline font-bold"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>

        <p className="text-xs font-medium text-center text-gray-400 mt-6">
          Your data is stored securely in Supabase.
        </p>
      </div>
    </div>
  )
}