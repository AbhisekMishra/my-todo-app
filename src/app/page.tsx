'use client'

import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/components/LoginPage'
import { TodoDashboard } from '@/components/TodoDashboard'

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <LoginPage />
  }

  return <TodoDashboard />
}
