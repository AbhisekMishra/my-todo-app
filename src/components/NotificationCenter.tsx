'use client'

import { useState, useEffect } from 'react'
import { reminderService, ReminderNotification } from '@/lib/reminderService'
import { Bell, X, Clock, Calendar } from 'lucide-react'

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<ReminderNotification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [hasPermission, setHasPermission] = useState(false)

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

  const enableNotifications = async () => {
    const granted = await reminderService.requestNotificationPermission()
    setHasPermission(granted)

    if (!granted) {
      alert('Please enable notifications in your browser settings to receive todo reminders.')
    }
  }

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  const clearAllNotifications = () => {
    setNotifications([])
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
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900">Notifications</h3>
              <div className="flex space-x-2">
                {!hasPermission && (
                  <button
                    onClick={enableNotifications}
                    className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200"
                  >
                    Enable
                  </button>
                )}
                <button
                  onClick={testReminder}
                  className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded hover:bg-gray-200"
                >
                  Test
                </button>
                {notifications.length > 0 && (
                  <button
                    onClick={clearAllNotifications}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Bell className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No notifications</p>
                {!hasPermission && (
                  <p className="text-xs mt-1">
                    Enable notifications to receive todo reminders
                  </p>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          {notification.type === 'daily' ? (
                            <Calendar className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-500" />
                          )}
                          <h4 className="text-sm font-medium text-gray-900">
                            {notification.title}
                          </h4>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-line">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notification.scheduledTime).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => dismissNotification(notification.id)}
                        className="ml-2 text-gray-400 hover:text-gray-600"
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
            <div className="p-4 border-t border-gray-200 bg-yellow-50">
              <div className="flex items-center space-x-2">
                <Bell className="h-4 w-4 text-yellow-600" />
                <p className="text-xs text-yellow-700">
                  Notifications are disabled.
                  <button
                    onClick={enableNotifications}
                    className="underline ml-1 hover:no-underline"
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