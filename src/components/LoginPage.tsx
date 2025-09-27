'use client'

import { useAuth } from '@/contexts/AuthContext'

export function LoginPage() {
  const { signInWithGoogle } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Welcome to Todo App
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Voice-enabled todo management with calendar integration
          </p>
        </div>
        <div>
          <button
            onClick={signInWithGoogle}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Sign in with Google
          </button>
        </div>
        <div className="mt-6">
          <div className="text-sm text-gray-600">
            <h3 className="font-medium mb-2">Features:</h3>
            <ul className="space-y-1 text-xs">
              <li>• Voice commands to add todos</li>
              <li>• Photo upload for visual todos</li>
              <li>• Calendar integration</li>
              <li>• Smart categorization with AI agents</li>
              <li>• Reminder system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}