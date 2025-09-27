'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200"
      style={{
        backgroundColor: theme === 'dark' ? 'var(--accent)' : 'var(--secondary)',
        color: 'var(--foreground)',
        border: '1px solid var(--border)'
      }}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-4 w-4" />
          <span className="text-sm">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" />
          <span className="text-sm">Dark</span>
        </>
      )}
    </button>
  )
}