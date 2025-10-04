import { Todo, TodoInsert } from '@/types/database'

const API_BASE = '/api'

// API client for frontend to backend communication
export class TodoAPI {
  private static async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies in the request
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Fetch all todos
  static async getTodos(): Promise<Todo[]> {
    return this.request<Todo[]>('/todos')
  }

  // Create a new todo
  static async createTodo(todo: Omit<TodoInsert, 'user_id'>): Promise<Todo> {
    return this.request<Todo>('/todos', {
      method: 'POST',
      body: JSON.stringify(todo),
    })
  }

  // Update a todo
  static async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo> {
    return this.request<Todo>(`/todos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  // Delete a todo
  static async deleteTodo(id: string): Promise<void> {
    return this.request<void>(`/todos/${id}`, {
      method: 'DELETE',
    })
  }

  // Toggle todo completion
  static async toggleComplete(id: string, completed: boolean): Promise<Todo> {
    return this.updateTodo(id, { completed })
  }

  // Calendar sync methods
  static async syncTodoToCalendar(todoId: string, action: 'create' | 'update' | 'delete'): Promise<{ success: boolean; eventId?: string }> {
    return this.request<{ success: boolean; eventId?: string }>('/calendar/sync', {
      method: 'POST',
      body: JSON.stringify({ todoId, action }),
    })
  }

  static async createTodoWithCalendarSync(todo: Omit<TodoInsert, 'user_id'>): Promise<Todo> {
    const createdTodo = await this.createTodo(todo)

    // Auto-sync reminder todos to calendar
    if (createdTodo.category === 'reminder') {
      try {
        await this.syncTodoToCalendar(createdTodo.id, 'create')
      } catch (error) {
        console.warn('Failed to sync todo to calendar:', error)
      }
    }

    return createdTodo
  }

  static async updateTodoWithCalendarSync(id: string, updates: Partial<Todo>): Promise<Todo> {
    const updatedTodo = await this.updateTodo(id, updates)

    // Sync reminder todos to calendar
    if (updatedTodo.category === 'reminder' && updatedTodo.google_calendar_event_id) {
      try {
        await this.syncTodoToCalendar(updatedTodo.id, 'update')
      } catch (error) {
        console.warn('Failed to update calendar event:', error)
      }
    }

    return updatedTodo
  }

  static async deleteTodoWithCalendarSync(id: string): Promise<void> {
    // First try to delete from calendar
    try {
      await this.syncTodoToCalendar(id, 'delete')
    } catch (error) {
      console.warn('Failed to delete calendar event:', error)
    }

    // Then delete the todo
    return this.deleteTodo(id)
  }
}