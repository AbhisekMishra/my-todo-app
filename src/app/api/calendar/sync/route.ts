import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { googleCalendarService } from '@/lib/googleCalendar'

export async function POST(request: NextRequest) {
  try {
    const { todoId, action } = await request.json()

    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: { [key: string]: unknown }) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: { [key: string]: unknown }) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get todo from database
    const { data: todo, error: todoError } = await supabase
      .from('todos')
      .select('*')
      .eq('id', todoId)
      .eq('user_id', user.id)
      .single()

    if (todoError || !todo) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 })
    }

    // Set up Google Calendar access
    const hasAccess = await googleCalendarService.getAccessTokenFromSupabase()
    if (!hasAccess) {
      return NextResponse.json({ error: 'Google Calendar access not available' }, { status: 403 })
    }

    let result = null

    switch (action) {
      case 'create':
        if (todo.category === 'reminder') {
          const calendarEvent = googleCalendarService.createEventFromTodo(todo)
          const eventId = await googleCalendarService.createEvent(calendarEvent)

          // Update todo with calendar event ID
          await supabase
            .from('todos')
            .update({ google_calendar_event_id: eventId })
            .eq('id', todoId)

          result = { eventId }
        }
        break

      case 'update':
        if (todo.google_calendar_event_id && todo.category === 'reminder') {
          const calendarEvent = googleCalendarService.createEventFromTodo(todo)
          await googleCalendarService.updateEvent(todo.google_calendar_event_id, calendarEvent)
          result = { updated: true }
        }
        break

      case 'delete':
        if (todo.google_calendar_event_id) {
          await googleCalendarService.deleteEvent(todo.google_calendar_event_id)

          // Remove calendar event ID from todo
          await supabase
            .from('todos')
            .update({ google_calendar_event_id: null })
            .eq('id', todoId)

          result = { deleted: true }
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true, result })
  } catch (error) {
    console.error('Calendar sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync with calendar' },
      { status: 500 }
    )
  }
}