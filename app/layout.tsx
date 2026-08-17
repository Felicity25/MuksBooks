import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'
import { Navbar } from '@/components/navbar'
import { ErrorManager } from '@/components/error-manager'
import { AppStateMigrator } from '@/components/app-state-migrator'
import { AuthProvider } from '@/components/auth-provider'
import { AuthPromptModal } from '@/components/auth-prompt-modal'

export const metadata: Metadata = {
  title: 'MuksBooks',
  description: 'AI-powered study platform for Monash actuarial science students.'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-950">
        <AuthProvider>
          <AppStateMigrator />
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1 px-4 py-6 lg:px-8">
              <div className="mx-auto w-full max-w-7xl">{children}</div>
            </main>
            <ErrorManager />
          </div>
          <AuthPromptModal />
        </AuthProvider>
      </body>
    </html>
  )
}
