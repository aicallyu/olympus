import { ReactNode } from 'react'
import { Header } from './Header'

interface LayoutProps {
  children: ReactNode
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background text-text-primary relative overflow-hidden">
      <div className="radial-glow" />
      <div className="scanlines" />

      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 overflow-auto px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  )
}
