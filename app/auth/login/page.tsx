import { Suspense } from 'react'
import { LoginClient } from './login-client'

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="mx-auto flex min-h-screen max-w-md items-center justify-center px-4"><div className="w-full rounded-3xl border border-slate-200 bg-white p-8 shadow-sm text-center text-sm text-slate-600">Loading sign in...</div></main>}>
      <LoginClient />
    </Suspense>
  )
}
