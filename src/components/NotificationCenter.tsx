'use client'

import { useState, useEffect } from 'react'
import { reminderService, ReminderNotification } from '@/lib/reminderService'
import { Bell, X, Clock, Calendar } from 'lucide-react'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<ReminderNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  useEffect(() => {
    // Request notification permission on mount
    reminderService.requestNotificationPermission().then(setHasPermission)

    // Listen for reminder events
    const handleReminder = (event: CustomEvent<ReminderNotification>) => {
      setNotifications(prev => [event.detail, ...prev.slice(0, 9)]) // Keep only 10 latest
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('todoReminder', handleReminder as EventListener)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('todoReminder', handleReminder as EventListener)
      }
    }
  }, [])

  // Add keyboard support for Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showNotifications) {
        setShowNotifications(false)
        setShowClearConfirm(false)
      }
    }
    if (showNotifications) {
      window.addEventListener('keydown', handleEscape)
      return () => window.removeEventListener('keydown', handleEscape)
    }
  }, [showNotifications])

  const enableNotifications = async () => {
    const granted = await reminderService.requestNotificationPermission()
    setHasPermission(granted)
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAllNotifications = () => {
    if (showClearConfirm) {
      setNotifications([])
      setShowClearConfirm(false)
    } else {
      setShowClearConfirm(true)
    }
  }

  const testReminder = () => {
    reminderService.testDailyReminder()
  }

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
      >
        <Bell className="h-5 w-5" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {notifications.length}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {showNotifications && (
        <div
          className="absolute right-0 mt-2 w-full sm:w-96 max-w-md rounded-lg shadow-lg z-50"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)'
          }}
        >
          <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-medium" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                Notifications
                <span className="sr-only">{notifications.length} notifications</span>
              </h3>
              <div className="flex gap-2">
                {!hasPermission && (
                  <button
                    onClick={enableNotifications}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: 'var(--accent)',
                      color: 'var(--accent-foreground)'
                    }}
                    aria-label="Enable notifications"
                  >
                    Enable
                  </button>
                )}
                <button
                  onClick={testReminder}
                  className="text-xs px-2 py-1 rounded transition-colors"
                  style={{
                    backgroundColor: 'var(--secondary)',
                    color: 'var(--secondary-foreground)'
                  }}
                  aria-label="Test notification"
                >
                  Test
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs px-2 py-1 rounded transition-colors"
                    style={{
                      backgroundColor: showClearConfirm ? 'var(--destructive)' : 'transparent',
                      color: showClearConfirm ? 'var(--destructive-foreground)' : 'var(--secondary-foreground)'
                    }}
                    aria-label={showClearConfirm ? 'Confirm clear all' : 'Clear all notifications'}
                  >
                    {showClearConfirm ? 'Confirm?' : 'Clear all'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center" style={{ color: 'var(--secondary-foreground)' }}>
                <Bell className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--secondary-foreground)', opacity: 0.5 }} />
                <p className="text-sm">No notifications</p>
                {!hasPermission && (
                  <p className="text-xs mt-1">
                    Enable notifications to receive todo reminders
                  </p>
                )}
              </div>
            ) : (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 transition-colors hover:opacity-80"
                    style={{ borderBottom: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {notification.type === 'daily' ? (
                            <Calendar className="h-4 w-4" style={{ color: 'var(--info)' }} />
                          ) : (
                            <Clock className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                          )}
                          <h4 className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-sm whitespace-pre-line" style={{ color: 'var(--secondary-foreground)' }}>
                          {notification.message}
                        </p>
                        <p className="text-xs mt-1" style={{ color: 'var(--secondary-foreground)', opacity: 0.7 }}>
                          {new Date(notification.scheduledTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="w-8 h-8 flex items-center justify-center rounded transition-colors hover:opacity-70"
                        style={{ color: 'var(--secondary-foreground)' }}
                        aria-label={`Dismiss ${notification.title}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!hasPermission && (
            <div className="p-4" style={{ borderTop: '1px solid var(--border)', backgroundColor: 'var(--accent)' }}>
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4" style={{ color: 'var(--warning)' }} />
                <p className="text-xs" style={{ color: 'var(--accent-foreground)' }}>
                  Notifications are disabled.
                  <button
                    onClick={enableNotifications}
                    className="underline ml-1 hover:no-underline font-medium"
                    style={{ color: 'var(--accent-foreground)' }}
                  >
                    Click to enable
                  </button>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {showNotifications && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowNotifications(false)}
        />
      )}
    </div>
  )
}