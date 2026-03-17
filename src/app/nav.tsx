'use client'
import { useAuth } from '@/lib/auth-context'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'

export function Nav() {
  const { user, loading, signOut } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)

  if (pathname === '/login') return null

  async function handleSignOut() {
    await signOut()
    router.push('/login')
  }

  return (
    <nav className="bg-white border-b border-green-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <a
          href="/dashboard"
          className="flex items-center gap-2 select-none group"
        >
          <span
            className="text-3xl transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110 inline-block"
            role="img"
            aria-label="Salad"
          >
            🥗
          </span>
          <span className="font-extrabold text-xl tracking-tight leading-none"
            style={{ fontFamily: "'Nunito', 'Helvetica Neue', Arial, sans-serif" }}
          >
            <span className="text-green-900">Healt</span>
            <span className="text-green-500">HI</span>
            <sup
              className="text-[9px] font-bold text-white bg-green-500 px-1.5 py-0.5 rounded-full ml-0.5 relative -top-2.5 tracking-wide"
            >
              AI
            </sup>
          </span>
        </a>

        {/* Desktop nav links */}
        {user && !loading && (
          <>
            <div className="hidden md:flex items-center gap-1">
              <NavLink href="/dashboard" current={pathname}>Dashboard</NavLink>
              <NavLink href="/log" current={pathname}>Daily Log</NavLink>
              <NavLink href="/calendar" current={pathname}>Calendar</NavLink>
              <NavLink href="/profile" current={pathname}>Profile</NavLink>
              <button
                onClick={handleSignOut}
                className="ml-2 px-3 py-1.5 rounded-xl text-sm text-green-700 border border-green-200 hover:bg-green-50 hover:border-green-400 transition-colors font-semibold"
                style={{ fontFamily: "'Nunito', 'Helvetica Neue', Arial, sans-serif" }}
              >
                Sign out
              </button>
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-green-50 transition-colors"
              onClick={() => setMenuOpen(o => !o)}
              aria-label="Menu"
            >
              <span className="block w-5 h-0.5 bg-green-700 mb-1 rounded" />
              <span className="block w-5 h-0.5 bg-green-700 mb-1 rounded" />
              <span className="block w-5 h-0.5 bg-green-700 rounded" />
            </button>
          </>
        )}
      </div>

      {/* Mobile dropdown */}
      {menuOpen && user && !loading && (
        <div
          className="md:hidden border-t border-green-100 bg-white px-4 pb-4 flex flex-col gap-1"
          style={{ fontFamily: "'Nunito', 'Helvetica Neue', Arial, sans-serif" }}
        >
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/log', label: 'Daily Log' },
            { href: '/calendar', label: 'Calendar' },
            { href: '/profile', label: 'Profile' },
          ].map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
                pathname === link.href
                  ? 'bg-green-50 text-green-600'
                  : 'text-green-800 hover:bg-green-50'
              }`}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={handleSignOut}
            className="mt-1 px-4 py-2.5 rounded-xl text-sm font-bold text-left text-green-700 border border-green-200 hover:bg-green-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  )
}

function NavLink({
  href,
  current,
  children,
}: {
  href: string
  current: string
  children: React.ReactNode
}) {
  const active = current === href
  return (
    <a
      href={href}
      className={`px-3 py-1.5 rounded-xl text-sm font-bold transition-colors ${
        active
          ? 'bg-green-50 text-green-600'
          : 'text-green-800 hover:bg-green-50 hover:text-green-600'
      }`}
      style={{ fontFamily: "'Nunito', 'Helvetica Neue', Arial, sans-serif" }}
    >
      {children}
    </a>
  )
}