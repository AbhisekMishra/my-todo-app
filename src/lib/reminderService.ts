import { createSupabaseClient } from './supabase'
import { Todo } from '@/types/database'
import { format, addDays, subHours, isAfter, isBefore, startOfDay, parseISO } from 'date-fns'

export interface ReminderNotification {
  id: string
  type: 'daily' | 'pre_due'
  title: string
  message: string
  todo: Todo
  scheduledTime: Date
}

class ReminderService {
  private notifications: Map<string, ReminderNotification> = new Map()

  constructor() {
    // Check for due reminders every minute
    setInterval(() => {
      this.checkAndSendReminders()
    }, 60000) // 1 minute interval

    // Schedule daily 9 AM reminder check
    this.scheduleDailyReminders()
  }

  // Schedule daily reminders at 9 AM
  private scheduleDailyReminders() {
    const now = new Date()
    const nextNineAM = new Date()
    nextNineAM.setHours(9, 0, 0, 0)

    // If it's already past 9 AM today, schedule for tomorrow
    if (now.getHours() >= 9) {
      nextNineAM.setDate(nextNineAM.getDate() + 1)
    }

    const timeUntilNineAM = nextNineAM.getTime() - now.getTime()

    setTimeout(() => {
      this.sendDailyReminders()
      // Schedule daily check every 24 hours
      setInterval(() => {
        this.sendDailyReminders()
      }, 24 * 60 * 60 * 1000)
    }, timeUntilNineAM)
  }

  // Send daily 9 AM reminders for today's todos
  private async sendDailyReminders() {
    try {
      const supabase = createSupabaseClient()
      const today = format(new Date(), 'yyyy-MM-dd')

      const { data: todos, error } = await supabase
        .from('todos')
        .select('*')
        .eq('due_date', today)
        .eq('completed', false)

      if (error) {
        console.error('Error fetching daily todos:', error)
        return
      }

      if (todos && todos.length > 0) {
        const message = this.createDailyReminderMessage(todos)
        this.sendNotification({
          id: `daily-${today}`,
          type: 'daily',
          title: `Daily Reminder - ${todos.length} todos today`,
          message,
          todo: todos[0], // Use first todo as representative
          scheduledTime: new Date()
        })
      }
    } catch (error) {
      console.error('Error sending daily reminders:', error)
    }
  }

  // Check for todos that need pre-due reminders
  private async checkAndSendReminders() {
    try {
      const supabase = createSupabaseClient()
      const now = new Date()
      const oneHourFromNow = addDays(now, 0)
      oneHourFromNow.setMinutes(oneHourFromNow.getMinutes() + 60)

      // Get todos with due times in the next hour
      const { data: todos, error } = await supabase
        .from('todos')
        .select('*')
        .eq('completed', false)
        .not('due_time', 'is', null)

      if (error) {
        console.error('Error fetching todos for reminders:', error)
        return
      }

      if (todos) {
        for (const todo of todos) {
          if (todo.due_time) {
            const dueDateTime = parseISO(`${todo.due_date}T${todo.due_time}:00`)
            const reminderTime = subHours(dueDateTime, 1)

            // Check if we should send reminder (within 1 minute of reminder time)
            const timeDiff = Math.abs(now.getTime() - reminderTime.getTime())
            const shouldSendReminder = timeDiff < 60000 // within 1 minute

            if (shouldSendReminder && !this.notifications.has(`pre-due-${todo.id}`)) {
              this.sendPreDueReminder(todo, dueDateTime)
            }
          }
        }
      }
    } catch (error) {
      console.error('Error checking reminders:', error)
    }
  }

  // Send pre-due reminder (1 hour before)
  private sendPreDueReminder(todo: Todo, dueDateTime: Date) {
    const notification: ReminderNotification = {
      id: `pre-due-${todo.id}`,
      type: 'pre_due',
      title: `Reminder: ${todo.title}`,
      message: `Your todo "${todo.title}" is due in 1 hour at ${format(dueDateTime, 'h:mm a')}`,
      todo,
      scheduledTime: new Date()
    }

    this.sendNotification(notification)
    this.notifications.set(notification.id, notification)

    // Remove notification after 1 hour to prevent duplicates
    setTimeout(() => {
      this.notifications.delete(notification.id)
    }, 60 * 60 * 1000)
  }

  // Create daily reminder message
  private createDailyReminderMessage(todos: Todo[]): string {
    const sortedTodos = todos.sort((a, b) => {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
      return severityOrder[a.severity] - severityOrder[b.severity]
    })

    let message = 'Good morning! Here are your todos for today:\n\n'

    sortedTodos.forEach((todo, index) => {
      const priorityEmoji = this.getSeverityEmoji(todo.severity)
      const timeInfo = todo.due_time ? ` at ${todo.due_time}` : ''
      message += `${index + 1}. ${priorityEmoji} ${todo.title}${timeInfo}\n`
    })

    return message
  }

  // Get emoji for severity
  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴'
      case 'high': return '🟠'
      case 'medium': return '🟡'
      case 'low': return '🟢'
      default: return '⚪'
    }
  }

  // Send notification (can be extended to support multiple channels)
  private sendNotification(notification: ReminderNotification) {
    console.log('Sending notification:', notification)

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: notification.id
      })
    }

    // Could also dispatch custom event for UI notifications
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('todoReminder', {
        detail: notification
      }))
    }
  }

  // Request notification permission
  public async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications')
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }

    return false
  }

  // Manual trigger for testing
  public async testDailyReminder() {
    await this.sendDailyReminders()
  }

  // Get all scheduled notifications
  public getScheduledNotifications(): ReminderNotification[] {
    return Array.from(this.notifications.values())
  }

  // Clear all notifications
  public clearNotifications() {
    this.notifications.clear()
  }
}

// Singleton instance
export const reminderService = new ReminderService()