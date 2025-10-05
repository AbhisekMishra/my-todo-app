'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { TodoAPI } from '@/lib/api'
import { Todo, TodoInsert } from '@/types/database'
import { uploadImageToSupabase } from '@/lib/fileUpload'
import { format } from 'date-fns'
import { Calendar, Plus, LogOut, Clock, List, CalendarDays, CheckCircle, AlertTriangle, AlertCircle, Search } from 'lucide-react'
import Image from 'next/image'
import { WebNativeFeatures } from './WebNativeFeatures'
import { ThemeToggle } from './ThemeToggle'
import { CalendarView } from './CalendarView'
import { NotificationCenter } from './NotificationCenter'
import { agentService } from '@/lib/agentService'
import { SeverityFilter } from './SeverityFilter'
import { ToastContainer } from './Toast'
import { useToast } from '@/hooks/useToast'

export function TodoDashboard() {
  const { user, signOut } = useAuth()
  const { toasts, removeToast, success, error } = useToast()
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
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [severityFilter, setSeverityFilter] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'severity' | 'due_date' | 'created_at'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

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

      setShowAddForm(true)
    } catch (error) {
      console.error('Error handling image:', error)
      // Fallback to just using the local URL
      setNewTodo(prev => ({ ...prev, image_url: imageUrl }))
      setShowAddForm(true)
    }
  }

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {}

    if (!newTodo.title?.trim()) {
      errors.title = 'Title is required'
    }

    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const addTodo = async () => {
    if (!user) return

    if (!validateForm()) {
      error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      // Process todo with AI agents for categorization and enhancement
      const agentResponse = await agentService.processTodo({
        title: newTodo.title!,
        description: newTodo.description || undefined,
        due_date: newTodo.due_date,
        due_time: newTodo.due_time || undefined
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
        title: enhancedTodo.title!,
        description: enhancedTodo.description || null,
        due_date: enhancedTodo.due_date || format(new Date(), 'yyyy-MM-dd'),
        due_time: enhancedTodo.due_time || null,
        category: enhancedTodo.category || 'normal',
        severity: enhancedTodo.severity || 'medium',
        image_url: newTodo.image_url || null
      })

      setTodos([...todos, data])
      setNewTodo({
        title: '',
        description: '',
        due_date: format(new Date(), 'yyyy-MM-dd'),
        category: 'normal',
        severity: 'medium'
      })
      setFormErrors({})
      setShowAddForm(false)
      success('Todo added successfully!')
    } catch (err) {
      console.error('Error adding todo:', err)
      error('Failed to add todo. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleComplete = async (id: string, completed: boolean) => {
    try {
      const updatedTodo = await TodoAPI.toggleComplete(id, !completed)
      setTodos(todos.map(todo =>
        todo.id === id ? updatedTodo : todo
      ))
      success(completed ? 'Todo marked as incomplete' : 'Todo completed!')
    } catch (err) {
      console.error('Error updating todo:', err)
      error('Failed to update todo. Please try again.')
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return <CheckCircle className="h-3 w-3" />
      case 'medium': return <Clock className="h-3 w-3" />
      case 'high': return <AlertTriangle className="h-3 w-3" />
      case 'critical': return <AlertCircle className="h-3 w-3" />
      default: return null
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-300 dark:border-yellow-700'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300 dark:border-orange-700'
      case 'critical': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-300 dark:border-red-700'
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600'
    }
  }

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(query) ||
        (todo.description?.toLowerCase().includes(query) ?? false) ||
        todo.category.toLowerCase().includes(query)
      )
    }

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
  }, [todos, searchQuery, severityFilter, sortBy, sortOrder])

  const handleFilterChange = (severities: string[]) => {
    setSeverityFilter(severities)
  }

  const handleSortChange = (newSortBy: 'severity' | 'due_date' | 'created_at', order: 'asc' | 'desc') => {
    setSortBy(newSortBy)
    setSortOrder(order)
  }

  // Add keyboard support for closing form with Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAddForm) {
        setShowAddForm(false)
        setFormErrors({})
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [showAddForm])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--primary)' }}></div>
          <div className="text-xl" style={{ fontFamily: 'Google Sans, sans-serif' }}>Loading todos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Screen reader announcements */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {filteredAndSortedTodos.length} {filteredAndSortedTodos.length === 1 ? 'todo' : 'todos'} in list
      </div>

      {/* Header */}
      <header className="border-b" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center py-4 gap-4">
            <div className="flex items-center space-x-4">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8" style={{ color: 'var(--primary)' }} />
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                Todo Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
              <span className="text-xs sm:text-sm hidden sm:inline" style={{ color: 'var(--secondary-foreground)' }}>
                {user?.email?.split('@')[0]}
              </span>
              <NotificationCenter />
              <ThemeToggle />
              <button
                onClick={signOut}
                className="secondary flex items-center space-x-2 px-3 py-2 text-sm rounded-lg"
                style={{ color: 'var(--foreground)' }}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Sign Out</span>
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
          <div className="flex rounded-lg p-1" style={{ backgroundColor: 'var(--secondary)' }}>
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'list' ? 'var(--card)' : 'transparent',
                color: viewMode === 'list' ? 'var(--foreground)' : 'var(--secondary-foreground)',
                boxShadow: viewMode === 'list' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
            >
              <List className="h-4 w-4" />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: viewMode === 'calendar' ? 'var(--card)' : 'transparent',
                color: viewMode === 'calendar' ? 'var(--foreground)' : 'var(--secondary-foreground)',
                boxShadow: viewMode === 'calendar' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
              }}
              aria-label="Calendar view"
              aria-pressed={viewMode === 'calendar'}
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
              onError={error}
            />
          </div>
        </div>

        {/* Search and Filters */}
        {viewMode === 'list' && (
          <div className="mb-6 space-y-4">
            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5" style={{ color: 'var(--secondary-foreground)' }} />
              <input
                type="search"
                placeholder="Search todos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4"
                aria-label="Search todos"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: 'var(--secondary-foreground)' }}
                  aria-label="Clear search"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Severity Filter */}
            <SeverityFilter
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
            />
          </div>
        )}

        {/* Add Todo Form */}
        {showAddForm && (
          <div className="card p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
              Add New Todo
            </h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="todo-title" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  id="todo-title"
                  type="text"
                  value={newTodo.title || ''}
                  onChange={(e) => {
                    setNewTodo({ ...newTodo, title: e.target.value })
                    if (formErrors.title) {
                      setFormErrors(prev => ({ ...prev, title: '' }))
                    }
                  }}
                  className="w-full"
                  placeholder="Enter todo title"
                  aria-required="true"
                  aria-invalid={!!formErrors.title}
                  aria-describedby={formErrors.title ? 'title-error' : undefined}
                  autoFocus
                />
                {formErrors.title && (
                  <p id="title-error" className="text-sm mt-1" style={{ color: 'var(--destructive)' }}>
                    {formErrors.title}
                  </p>
                )}
              </div>
              <div>
                <label htmlFor="todo-description" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                  Description
                </label>
                <textarea
                  id="todo-description"
                  value={newTodo.description || ''}
                  onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                  className="w-full"
                  rows={3}
                  placeholder="Enter description (optional)"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="todo-due-date" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                    Due Date
                  </label>
                  <input
                    id="todo-due-date"
                    type="date"
                    value={newTodo.due_date || ''}
                    onChange={(e) => setNewTodo({ ...newTodo, due_date: e.target.value })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="todo-category" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                    Category
                  </label>
                  <select
                    id="todo-category"
                    value={newTodo.category || 'normal'}
                    onChange={(e) => setNewTodo({ ...newTodo, category: e.target.value as 'normal' | 'reminder' | 'custom' })}
                    className="w-full"
                  >
                    <option value="normal">Normal Task</option>
                    <option value="reminder">Task with Reminder</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="todo-severity" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                    Severity
                  </label>
                  <select
                    id="todo-severity"
                    value={newTodo.severity || 'medium'}
                    onChange={(e) => setNewTodo({ ...newTodo, severity: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                    className="w-full"
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
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                    Attached Image
                  </label>
                  <div className="relative inline-block">
                    <div className="relative w-80 h-48 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                      <Image
                        src={newTodo.image_url}
                        alt="Selected attachment"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 320px"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setNewTodo(prev => ({ ...prev, image_url: undefined }))}
                      className="absolute -top-2 -right-2 rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                      style={{
                        backgroundColor: 'var(--destructive)',
                        color: 'var(--destructive-foreground)'
                      }}
                      aria-label="Remove image"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={addTodo}
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-lg transition-opacity disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    fontFamily: 'Google Sans, sans-serif'
                  }}
                >
                  {isSubmitting ? 'Adding...' : 'Add Todo'}
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setFormErrors({})
                  }}
                  disabled={isSubmitting}
                  className="secondary px-6 py-2 rounded-lg disabled:opacity-50"
                  style={{ fontFamily: 'Google Sans, sans-serif' }}
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
          <div className="grid gap-4" role="list" aria-label="Todo items">
            {filteredAndSortedTodos.length === 0 ? (
              <div className="card p-12 text-center">
                <Calendar className="h-16 w-16 mx-auto mb-4" style={{ color: 'var(--secondary-foreground)', opacity: 0.5 }} />
                <h3 className="text-lg font-medium mb-2" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                  No todos yet
                </h3>
                <p className="mb-4" style={{ color: 'var(--secondary-foreground)' }}>
                  Get started by adding your first task
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg"
                  style={{
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-foreground)',
                    fontFamily: 'Google Sans, sans-serif'
                  }}
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Todo</span>
                </button>
              </div>
            ) : (
              filteredAndSortedTodos.map((todo) => (
                <div
                  key={todo.id}
                  role="listitem"
                  className={`card p-4 border-l-4 transition-opacity ${todo.completed ? 'opacity-60' : ''}`}
                  style={{
                    borderLeftColor: todo.severity === 'critical' ? '#dc2626' : todo.severity === 'high' ? '#ea580c' : todo.severity === 'medium' ? '#ca8a04' : '#16a34a'
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => toggleComplete(todo.id, todo.completed)}
                          className="h-5 w-5 rounded transition-colors"
                          style={{
                            accentColor: 'var(--primary)'
                          }}
                          aria-label={`Mark "${todo.title}" as ${todo.completed ? 'incomplete' : 'complete'}`}
                        />
                        <h3 className={`text-lg font-medium ${todo.completed ? 'line-through' : ''}`} style={{ color: todo.completed ? 'var(--secondary-foreground)' : 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
                          {todo.title}
                        </h3>
                      </div>
                      {todo.description && (
                        <p className="mb-2 ml-8" style={{ color: 'var(--secondary-foreground)' }}>{todo.description}</p>
                      )}
                      {todo.image_url && (
                        <div className="ml-8 mb-2">
                          <div className="relative w-80 h-48 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                            <Image
                              src={todo.image_url}
                              alt="Todo attachment"
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 320px"
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-4 ml-8 flex-wrap">
                        <div className="flex items-center space-x-1 text-sm" style={{ color: 'var(--secondary-foreground)' }}>
                          <Clock className="h-4 w-4" />
                          <span>{format(new Date(todo.due_date), 'MMM d, yyyy')}</span>
                          {todo.due_time && <span>at {todo.due_time}</span>}
                        </div>
                        <span className="text-sm capitalize" style={{ color: 'var(--secondary-foreground)' }}>
                          {todo.category}
                        </span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 text-xs rounded-full border flex items-center gap-1 ${getSeverityColor(todo.severity)}`}>
                      {getSeverityIcon(todo.severity)}
                      <span className="font-medium">{todo.severity}</span>
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