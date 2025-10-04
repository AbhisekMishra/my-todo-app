'use client'

import { useState } from 'react'
import { AlertCircle, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

interface SeverityFilterProps {
  onFilterChange: (severities: string[]) => void
  onSortChange: (sortBy: 'severity' | 'due_date' | 'created_at', order: 'asc' | 'desc') => void
}

export function SeverityFilter({ onFilterChange, onSortChange }: SeverityFilterProps) {
  const [selectedSeverities, setSelectedSeverities] = useState<string[]>([])
  const [sortBy, setSortBy] = useState<'severity' | 'due_date' | 'created_at'>('due_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const severityOptions = [
    { value: 'critical', label: 'Critical', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'high', label: 'High', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'medium', label: 'Medium', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
    { value: 'low', label: 'Low', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' }
  ]

  const sortOptions: { value: 'severity' | 'due_date' | 'created_at', label: string }[] = [
    { value: 'severity', label: 'Severity' },
    { value: 'due_date', label: 'Due Date' },
    { value: 'created_at', label: 'Created' }
  ]

  const toggleSeverity = (severity: string) => {
    const newSelection = selectedSeverities.includes(severity)
      ? selectedSeverities.filter(s => s !== severity)
      : [...selectedSeverities, severity]

    setSelectedSeverities(newSelection)
    onFilterChange(newSelection)
  }

  const handleSortChange = (newSortBy: 'severity' | 'due_date' | 'created_at') => {
    const newOrder = newSortBy === sortBy && sortOrder === 'asc' ? 'desc' : 'asc'
    setSortBy(newSortBy)
    setSortOrder(newOrder)
    onSortChange(newSortBy, newOrder)
  }

  const clearFilters = () => {
    setSelectedSeverities([])
    onFilterChange([])
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Severity Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Filter by severity:</span>
          {severityOptions.map((option) => {
            const Icon = option.icon
            const isSelected = selectedSeverities.includes(option.value)

            return (
              <button
                key={option.value}
                onClick={() => toggleSeverity(option.value)}
                className={`flex items-center space-x-1 px-3 py-1 rounded-full border text-sm font-medium transition-all ${
                  isSelected
                    ? option.color
                    : 'text-gray-600 bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-3 w-3" />
                <span>{option.label}</span>
              </button>
            )
          })}

          {selectedSeverities.length > 0 && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Sort Options */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Sort by:</span>
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSortChange(option.value)}
              className={`flex items-center space-x-1 px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                sortBy === option.value
                  ? 'bg-indigo-100 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{option.label}</span>
              {sortBy === option.value && (
                <span className="text-xs">
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {selectedSeverities.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Showing:</span>
            <div className="flex gap-1">
              {selectedSeverities.map((severity) => {
                const option = severityOptions.find(opt => opt.value === severity)
                if (!option) return null

                const Icon = option.icon
                return (
                  <span
                    key={severity}
                    className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs ${option.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    <span>{option.label}</span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}