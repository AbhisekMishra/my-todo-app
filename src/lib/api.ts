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
}