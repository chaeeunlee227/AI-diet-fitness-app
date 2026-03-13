import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { Nav } from './nav'

export const metadata: Metadata = {
  title: 'HealthTrack — AI Diet & Fitness',
  description: 'Track meals, workouts, and get AI-powered health insights',
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
            <footer className="text-center text-xs text-gray-400 py-4">
              HealthTrack
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
