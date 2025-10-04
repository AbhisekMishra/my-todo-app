import { google } from 'googleapis'
import { createSupabaseClient } from './supabase'

export interface CalendarEvent {
  id?: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone?: string
  }
  end: {
    dateTime: string
    timeZone?: string
  }
  reminders?: {
    useDefault: boolean
    overrides?: Array<{
      method: 'email' | 'popup'
      minutes: number
    }>
  }
}

class GoogleCalendarService {
  private oauth2Client: any
  private calendar: any

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
    )

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client })
  }

  async setAccessToken(accessToken: string, refreshToken?: string) {
    this.oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken
    })
  }

  async getAccessTokenFromSupabase(userId: string) {
    const supabase = createSupabaseClient()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.provider_token) {
        await this.setAccessToken(session.provider_token, session.provider_refresh_token)
        return true
      }
      return false
    } catch (error) {
      console.error('Error getting access token:', error)
      return false
    }
  }

  async createEvent(event: CalendarEvent): Promise<string | null> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event
      })

      return response.data.id
    } catch (error) {
      console.error('Error creating calendar event:', error)
      throw new Error('Failed to create calendar event')
    }
  }

  async updateEvent(eventId: string, event: CalendarEvent): Promise<void> {
    try {
      await this.calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        resource: event
      })
    } catch (error) {
      console.error('Error updating calendar event:', error)
      throw new Error('Failed to update calendar event')
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      })
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      throw new Error('Failed to delete calendar event')
    }
  }

  async getEvents(timeMin?: string, timeMax?: string): Promise<any[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      })

      return response.data.items || []
    } catch (error) {
      console.error('Error fetching calendar events:', error)
      return []
    }
  }

  // Helper method to create calendar event from todo
  createEventFromTodo(todo: {
    title: string
    description?: string
    due_date: string
    due_time?: string
    severity: string
  }): CalendarEvent {
    const startDateTime = todo.due_time
      ? `${todo.due_date}T${todo.due_time}:00`
      : `${todo.due_date}T09:00:00`

    const endDateTime = todo.due_time
      ? `${todo.due_date}T${this.addHour(todo.due_time)}:00`
      : `${todo.due_date}T10:00:00`

    const reminders = todo.severity === 'critical' || todo.severity === 'high'
      ? {
          useDefault: false,
          overrides: [
            { method: 'popup' as const, minutes: 60 }, // 1 hour before
            { method: 'popup' as const, minutes: 15 }, // 15 minutes before
            { method: 'email' as const, minutes: 60 }   // Email 1 hour before
          ]
        }
      : {
          useDefault: false,
          overrides: [
            { method: 'popup' as const, minutes: 60 } // 1 hour before
          ]
        }

    return {
      summary: `[TODO] ${todo.title}`,
      description: todo.description || `Todo item with ${todo.severity} priority`,
      start: {
        dateTime: startDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      end: {
        dateTime: endDateTime,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      reminders
    }
  }

  private addHour(time: string): string {
    const [hours, minutes] = time.split(':').map(Number)
    const newHours = (hours + 1) % 24
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
}

export const googleCalendarService = new GoogleCalendarService()