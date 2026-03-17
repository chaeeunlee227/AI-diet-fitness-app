import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Nav } from './nav'

export const metadata: Metadata = {
  title: 'HealtHI — AI Health Companion',
  description: 'Track meals, workouts, and get AI-powered health insights',
  icons: {
    icon: '/healthi-logo.svg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Nav />
            <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
              {children}
            </main>
            <footer className="text-center py-4">
              HealtHI · Your AI Health Companion 🥗
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}