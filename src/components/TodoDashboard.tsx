'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TodoAPI } from '@/lib/api'
import { Todo, TodoInsert } from '@/types/database'
import { uploadImageToSupabase } from '@/lib/fileUpload'
import { format } from 'date-fns'
import { Calendar, Plus, LogOut, Clock, List, CalendarDays } from 'lucide-react'
import { WebNativeFeatures } from './WebNativeFeatures'
import { ThemeToggle } from './ThemeToggle'
import { CalendarView } from './CalendarView'
import { NotificationCenter } from './NotificationCenter'
import { agentService } from '@/lib/agentService'
import { SeverityFilter } from './SeverityFilter'

export function TodoDashboard() {
  const { user, signOut } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newTodo, setNewTodo] = useState<Partial<TodoInsert>>({
    title: '',
    description: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
    category: 'normal',
    severity: 'medium'
  })
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'severity' | 'due_date' | 'created_at'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const fetchTodos = useCallback(async () => {
    try {
      const data = await TodoAPI.getTodos()
      setTodos(data)
    } catch (error) {
      console.error('Error fetching todos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodos()
  }, [fetchTodos])

  // Handle voice input from web speech API
  const handleVoiceInput = (text: string) => {
    setNewTodo(prev => ({ ...prev, title: text }))
    setShowAddForm(true)
  }

  // Handle image selection from web APIs
  const handleImageSelected = async (imageUrl: string) => {
    try {
      // Convert blob URL to file for upload
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      // Create a file-like object for upload
      const file = new File([blob], 'image.jpg', { type: blob.type })

      // Upload to Supabase if user is logged in
      if (user) {
        const uploadResult = await uploadImageToSupabase({
          uri: imageUrl,
          type: blob.type,
          name: 'web-capture.jpg'
        }, user.id)

        if (uploadResult.success) {
          setNewTodo(prev => ({ ...prev, image_url: uploadResult.url }))
        } else {
          // Fallback to local URL if upload fails
          setNewTodo(prev => ({ ...prev, image_url: imageUrl }))
        }
      } else {
        setNewTodo(prev => ({ ...prev, image_url: imageUrl }))
      }

      setSelectedImage(imageUrl)
      setShowAddForm(true)
    } catch (error) {
      console.error('Error handling image:', error)
      // Fallback to just using the local URL
      setSelectedImage(imageUrl)
      setNewTodo(prev => ({ ...prev, image_url: imageUrl }))
      setShowAddForm(true)
    }
  }

  const addTodo = async () => {
    if (!newTodo.title || !user) return

    try {
      // Process todo with AI agents for categorization and enhancement
      const agentResponse = await agentService.processTodo({
        title: newTodo.title,
        description: newTodo.description,
        due_date: newTodo.due_date,
        due_time: newTodo.due_time
      })

      // Apply agent suggestions
      const enhancedTodo = {
        ...newTodo,
        category: agentResponse.category,
        severity: agentResponse.severity,
        due_time: agentResponse.suggestions.due_time || newTodo.due_time,
        description: agentResponse.suggestions.description_enhancement || newTodo.description
      }

      const data = await TodoAPI.createTodoWithCalendarSync({
        title: enhancedTodo.title,
        description: enhancedTodo.description,
        due_date: enhancedTodo.due_date,
        due_time: enhancedTodo.due_time,
        category: enhancedTodo.category || 'normal',
        severity: enhancedTodo.severity || 'medium',
        image_url: newTodo.image_url
      })

      setTodos([...todos, data])
      setNewTodo({
        title: '',
        description: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'normal',
        severity: 'medium'
      })
      setShowAddForm(false)
    } catch (error) {
      console.error('Error adding todo:', error)
      alert('Failed to add todo: ' + error)
    }
  }

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      const updatedTodo = await TodoAPI.toggleComplete(id, !completed)
      setTodos(todos.map(todo =>
        todo.id === id ? updatedTodo : todo
      ))
    } catch (error) {
      console.error('Error updating todo:', error)
      alert('Failed to update todo: ' + error)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos

    // Apply severity filter
    if (severityFilter.length > 0) {
      filtered = filtered.filter(todo => severityFilter.includes(todo.severity))
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0

      switch (sortBy) {
        case 'severity':
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
          comparison = severityOrder[a.severity] - severityOrder[b.severity]
          break
        case 'due_date':
          comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          break
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          break
      }

      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [todos, severityFilter, sortBy, sortOrder])

  const handleFilterChange = (severities: string[]) => {
    setSeverityFilter(severities)
  }

  const handleSortChange = (newSortBy: 'severity' | 'due_date' | 'created_at', order: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(order)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading todos...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Calendar className="h-8 w-8" style={{ color: 'var(--primary)' }} />
              <h1 className="text-2xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                Todo Dashboard
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                Welcome, {user?.email}
              </span>
              <NotificationCenter />
              <ThemeToggle />
              <button
                onClick={signOut}
                className="secondary flex items-center space-x-2 px-3 py-2 text-sm rounded-lg"
                style={{ color: 'var(--foreground)' }}
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* View Toggle and Action Buttons */}
        <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'calendar'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
                }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Calendar</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 px-4 py-2 rounded-lg"
              style={{
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-foreground)',
                fontFamily: 'Google Sans, sans-serif'
              }}
            >
              <Plus className="h-4 w-4" />
              <span>Add Todo</span>
            </button>

            <WebNativeFeatures
              onVoiceInput={handleVoiceInput}
              onImageSelected={handleImageSelected}
            />
          </div>
        </div>

        {/* Severity Filter */}
        {viewMode === 'list' && (
          <SeverityFilter
            onFilterChange={handleFilterChange}
            onSortChange={handleSortChange}
          />
        )}

        {/* Add Todo Form */}
        {showAddForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
              Add New Todo
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                  Title
                </label>
                <input
                  type="text"
                  value={newTodo.title || ''}
                  onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                  className="w-full"
                  placeholder="Enter todo title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newTodo.description || ''}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={3}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={newTodo.due_date || ''}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={newTodo.category || 'normal'}
                    onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value as 'normal' | 'reminder' | 'custom' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="normal">Normal Task</option>
                    <option value="reminder">Task with Reminder</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severity
                  </label>
                  <select
                    value={newTodo.severity || 'medium'}
                    onChange={(e) => setNewTodo({ ...newTodo, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              {newTodo.image_url && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Attached Image
                  </label>
                  <div className="relative">
                    <img
                      src={newTodo.image_url}
                      alt="Selected attachment"
                      className="max-w-xs max-h-48 rounded-lg border border-gray-200"
                    />
                    <button
                      type="button"
                      onClick={() => setNewTodo(prev => ({ ...prev, image_url: undefined }))}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <div className="flex space-x-4">
                <button
                  onClick={addTodo}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Add Todo
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Todos Content */}
        {viewMode === 'calendar' ? (
          <CalendarView
            todos={filteredAndSortedTodos}
            onTodoClick={(todo) => {
              // Handle todo click in calendar view
              console.log('Todo clicked:', todo)
            }}
          />
        ) : (
          <div className="grid gap-4">
            {filteredAndSortedTodos.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No todos yet. Add your first todo!</p>
              </div>
            ) : (
              filteredAndSortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={`bg-white rounded-lg shadow p-4 border-l-4 ${todo.completed ? 'opacity-60' : ''
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleComplete(todo.id, todo.completed)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <h3 className={`text-lg font-medium ${todo.completed ? 'line-through text-gray-500' : 'text-gray-900'
                          }`}>
                          {todo.title}
                        </h3>
                      </div>
                      {todo.description && (
                        <p className="text-gray-600 mb-2 ml-7">{todo.description}</p>
                      )}
                      {todo.image_url && (
                        <div className="ml-7 mb-2">
                          <img
                            src={todo.image_url}
                            alt="Todo attachment"
                            className="max-w-xs max-h-48 rounded-lg border border-gray-200"
                          />
                        </div>
                      )}
                      <div className="flex items-center space-x-4 ml-7">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(todo.due_date), 'MMM d, yyyy')}</span>
                          {todo.due_time && <span>at {todo.due_time}</span>}
                        </div>
                        <span className="text-sm text-gray-500 capitalize">
                          {todo.category}
                        </span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full border ${getSeverityColor(todo.severity)}`}>
                      {todo.severity}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  )
}