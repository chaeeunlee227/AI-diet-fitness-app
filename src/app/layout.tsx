import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'HealthTrack — Your AI Diet & Fitness Companion',
  description: 'Track meals, workouts, and get AI-powered health insights',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="min-h-screen flex flex-col">
          <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
              <a href="/dashboard" className="flex items-center gap-2 font-semibold text-sky-600 text-lg">
                <span className="text-2xl">🥗</span>
                <span>HealthTrack</span>
              </a>
              <div className="flex items-center gap-1">
                <NavLink href="/dashboard">Dashboard</NavLink>
                <NavLink href="/log">Daily Log</NavLink>
                <NavLink href="/calendar">Calendar</NavLink>
                <NavLink href="/onboard">⚙ Profile</NavLink>
              </div>
            </div>
          </nav>
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
            {children}
          </main>
          <footer className="text-center text-xs text-gray-400 py-4">
            HealthTrack — personal use only
          </footer>
        </div>
      </body>
    </html>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors font-medium"
    >
      {children}
    </a>
  )
}
