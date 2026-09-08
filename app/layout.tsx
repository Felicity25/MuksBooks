import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { IBM_Plex_Sans, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { ErrorManager } from '@/components/error-manager'
import { AppStateMigrator } from '@/components/app-state-migrator'
import { AuthProvider } from '@/components/auth-provider'
import { AuthPromptModal } from '@/components/auth-prompt-modal'
import { ReadAloudProvider } from '@/components/study/read-aloud-provider'
import { GlobalStudyProvider } from '@/components/study/global-study-provider'
import { GlobalStudyBar } from '@/components/study/global-study-bar'

const uiFont = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-ui',
  display: 'swap'
})

const brandFont = Space_Grotesk({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-brand',
  display: 'swap'
})

export const metadata: Metadata = {
  title: {
    default: 'MuksBooks',
    template: '%s | MuksBooks'
  },
  description: 'Your personalised academia app.',
  icons: {
    icon: '/icon',
    apple: '/apple-icon'
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${uiFont.variable} ${brandFont.variable}`}>
      <body className="min-h-screen bg-slate-50 text-slate-950">
        <script
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              try {
                var raw = window.localStorage.getItem('muksbooks:user-settings:v2');
                var parsed = raw ? JSON.parse(raw) : null;
                var theme = parsed && parsed.theme ? parsed.theme : 'oxford';
                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (theme === 'system') theme = prefersDark ? 'midnight' : 'oxford';
                if (theme === 'light') theme = 'oxford';
                if (theme === 'dark') theme = 'midnight';
                document.documentElement.dataset.theme = theme;
              } catch (e) {}
            })();`
          }}
        />
        <AuthProvider>
          <ReadAloudProvider>
            <GlobalStudyProvider>
              <AppStateMigrator />
              <AppShell>{children}</AppShell>
              <ErrorManager />
              <GlobalStudyBar />
            </GlobalStudyProvider>
          </ReadAloudProvider>
          <AuthPromptModal />
        </AuthProvider>
      </body>
    </html>
  )
}
