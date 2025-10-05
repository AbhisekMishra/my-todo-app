'use client'

import { useState, useMemo } from 'react'
import Calendar from 'react-calendar'
import { Todo } from '@/types/database'
import { format, startOfDay } from 'date-fns'
import { Clock, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import 'react-calendar/dist/Calendar.css'

interface CalendarViewProps {
  todos: Todo[]
  onTodoClick?: (todo: Todo) => void
}

export function CalendarView({ todos, onTodoClick }: CalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())

  // Group todos by date
  const todosByDate = useMemo(() => {
    const grouped: { [date: string]: Todo[] } = {}

    todos.forEach(todo => {
      const dateKey = format(startOfDay(new Date(todo.due_date)), 'yyyy-MM-dd')
      if (!grouped[dateKey]) {
        grouped[dateKey] = []
      }
      grouped[dateKey].push(todo)
    })

    return grouped
  }, [todos])

  // Get todos for selected date
  const selectedDateTodos = useMemo(() => {
    const dateKey = format(startOfDay(selectedDate), 'yyyy-MM-dd')
    return todosByDate[dateKey] || []
  }, [selectedDate, todosByDate])

  // Check if a date has todos
  const hasTodasForDate = (date: Date): boolean => {
    const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
    return !!(todosByDate[dateKey] && todosByDate[dateKey].length > 0)
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-green-600 bg-green-50 border-green-200'
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  // Custom tile content to show todo indicators
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && hasTodasForDate(date)) {
      const dateKey = format(startOfDay(date), 'yyyy-MM-dd')
      const todosForDate = todosByDate[dateKey]
      const criticalCount = todosForDate.filter(t => t.severity === 'critical').length
      const highCount = todosForDate.filter(t => t.severity === 'high').length
      const totalCount = todosForDate.length

      return (
        <div className="flex flex-col items-center">
          <div className="flex space-x-1 mt-1">
            {criticalCount > 0 && (
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            )}
            {highCount > 0 && (
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
            )}
            {totalCount > 0 && (
              <div className="text-xs text-gray-600 font-medium">{totalCount}</div>
            )}
          </div>
        </div>
      )
    }
    return null
  }

  // Custom tile class names
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month' && hasTodasForDate(date)) {
      return 'has-todos'
    }
    return ''
  }

  return (
    <div className="card p-4 sm:p-6 h-auto lg:h-[calc(100vh-12rem)]">
      <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
        Calendar View
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:h-[calc(100%-3rem)]">
        {/* Calendar */}
        <div className="order-2 lg:order-1 lg:col-span-2 flex flex-col lg:h-full">
          <div className="flex-1 min-h-[400px] lg:min-h-0">
            <Calendar
              onChange={(date) => setSelectedDate(date as Date)}
              value={selectedDate}
              tileContent={tileContent}
              tileClassName={tileClassName}
              className="w-full h-full border-0 shadow-none"
            />
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm" style={{ color: 'var(--secondary-foreground)' }}>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Critical</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span>High Priority</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'var(--secondary-foreground)' }}></div>
              <span>Todo Count</span>
            </div>
          </div>
        </div>

        {/* Selected Date Todos */}
        <div className="order-1 lg:order-2 lg:col-span-1 flex flex-col lg:h-full">
          <h3 className="font-medium text-base sm:text-lg mb-3 sm:mb-4" style={{ color: 'var(--foreground)', fontFamily: 'Google Sans, sans-serif' }}>
            {format(selectedDate, 'MMMM d, yyyy')}
          </h3>

          {selectedDateTodos.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--secondary-foreground)' }}>No todos for this date</p>
          ) : (
            <div className="space-y-3 overflow-y-auto lg:flex-1 max-h-96 lg:max-h-none">
              {selectedDateTodos.map((todo) => (
                <div
                  key={todo.id}
                  onClick={() => onTodoClick?.(todo)}
                  className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getSeverityColor(todo.severity)} ${
                    todo.completed ? 'opacity-60' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  aria-label={`View todo: ${todo.title}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onTodoClick?.(todo)
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className={`font-medium text-sm ${
                      todo.completed ? 'line-through' : ''
                    }`}>
                      {todo.title}
                    </h4>
                    <span className="text-xs px-2 py-1 rounded-full bg-current bg-opacity-20">
                      {todo.severity}
                    </span>
                  </div>

                  {todo.description && (
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {todo.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    {todo.due_time && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{todo.due_time}</span>
                      </div>
                    )}

                    <div className="flex items-center space-x-1">
                      <span className="capitalize">{todo.category}</span>
                      {todo.category === 'reminder' && (
                        <AlertCircle className="h-3 w-3" />
                      )}
                    </div>
                  </div>

                  {todo.image_url && (
                    <div className="mt-2 relative w-full h-16 rounded overflow-hidden">
                      <Image
                        src={todo.image_url}
                        alt="Todo attachment"
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 384px"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style jsx global>{`
        .react-calendar {
          border: none !important;
          font-family: 'Google Sans', sans-serif;
          width: 100% !important;
          height: 100% !important;
          background: transparent;
        }

        .react-calendar__viewContainer {
          height: calc(100% - 3rem);
        }

        .react-calendar__month-view {
          height: 100%;
        }

        .react-calendar__month-view > div {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .react-calendar__month-view__days {
          flex: 1;
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          grid-template-rows: repeat(auto-fill, 1fr);
        }

        .react-calendar__tile {
          position: relative;
          border: 1px solid var(--border);
          background: var(--card);
          color: var(--foreground);
          transition: all 0.2s;
          padding: 0.5rem;
          height: 100%;
          max-height: none;
        }

        @media (min-width: 640px) {
          .react-calendar__tile {
            padding: 0.75rem;
          }
        }

        .react-calendar__tile:hover {
          background: var(--accent);
        }

        .react-calendar__tile--active {
          background: var(--primary) !important;
          color: var(--primary-foreground) !important;
        }

        .react-calendar__tile.has-todos {
          background: var(--accent);
          border-color: var(--primary);
        }

        .react-calendar__tile.has-todos:hover {
          opacity: 0.8;
        }

        .react-calendar__navigation button {
          background: none;
          border: none;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--foreground);
          min-width: 44px;
          min-height: 44px;
        }

        @media (min-width: 640px) {
          .react-calendar__navigation button {
            font-size: 1rem;
          }
        }

        .react-calendar__navigation button:hover {
          background: var(--secondary);
        }

        .react-calendar__navigation button:disabled {
          opacity: 0.5;
        }

        .react-calendar__month-view__weekdays {
          text-transform: uppercase;
          font-weight: 600;
          font-size: 0.65rem;
          color: var(--secondary-foreground);
        }

        @media (min-width: 640px) {
          .react-calendar__month-view__weekdays {
            font-size: 0.75rem;
          }
        }

        .react-calendar__month-view__weekdays__weekday {
          padding: 0.5rem;
        }
      `}</style>
    </div>
  )
}