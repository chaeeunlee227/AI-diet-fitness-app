'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'

export function Nav() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Don't show nav on login page
  if (pathname === '/login') return null

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <a href="/dashboard" className="flex items-center gap-2 font-semibold text-sky-600 text-lg">
          <span className="text-2xl">🥗</span>
          <span>HealthTrack</span>
        </a>

        {user && !loading && (
          <div className="flex items-center gap-1">
            <NavLink href="/dashboard">Dashboard</NavLink>
            <NavLink href="/log">Daily Log</NavLink>
            <NavLink href="/calendar">Calendar</NavLink>
            <NavLink href="/profile">Profile</NavLink>
            <button
              onClick={handleSignOut}
              className="ml-2 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-sky-50 text-sky-600'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {children}
    </a>
  )
}
