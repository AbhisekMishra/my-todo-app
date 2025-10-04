import { createSupabaseClient } from './supabase'
import { TodoAgent } from '@/types/database'

export interface AgentResponse {
  category: 'normal' | 'reminder' | 'custom'
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestions: {
    due_time?: string
    description_enhancement?: string
    breakdown?: string[]
  }
  reasoning: string
}

class AgentService {
  private agents: Map<string, TodoAgent> = new Map()

  constructor() {
    this.loadAgents()
  }

  // Load agents from database
  private async loadAgents() {
    try {
      const supabase = createSupabaseClient()
      const { data: agents, error } = await supabase
        .from('todo_agents')
        .select('*')

      if (error) {
        console.error('Error loading agents:', error)
        return
      }

      if (agents) {
        agents.forEach(agent => {
          this.agents.set(agent.category, agent)
        })
      }
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  // Categorize and enhance todo using AI agents
  async processTodo(todo: {
    title: string
    description?: string
    due_date?: string
    due_time?: string
  }): Promise<AgentResponse> {
    try {
      // Simple rule-based categorization (in real app, this would use AI/ML)
      const analysis = this.analyzeTodo(todo)
      const agent = this.agents.get(analysis.suggestedCategory) || this.getDefaultAgent()

      // Process with selected agent
      const response = this.executeAgent(agent, todo, analysis)
      return response
    } catch (error) {
      console.error('Error processing todo:', error)
      return this.getDefaultResponse()
    }
  }

  // Analyze todo to determine category and initial suggestions
  private analyzeTodo(todo: {
    title: string
    description?: string
    due_date?: string
    due_time?: string
  }): {
    suggestedCategory: 'normal' | 'reminder' | 'custom'
    suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'
    keywords: string[]
  } {
    const text = `${todo.title} ${todo.description || ''}`.toLowerCase()
    const keywords = text.split(/\s+/)

    // Keyword-based categorization
    const urgentKeywords = ['urgent', 'asap', 'immediately', 'emergency', 'critical', 'deadline']
    const reminderKeywords = ['remind', 'appointment', 'meeting', 'call', 'email', 'follow up']
    const highPriorityKeywords = ['important', 'priority', 'must', 'need', 'required']
    const timeKeywords = ['today', 'tomorrow', 'this week', 'next week', 'morning', 'afternoon']

    let suggestedCategory: 'normal' | 'reminder' | 'custom' = 'normal'
    let suggestedSeverity: 'low' | 'medium' | 'high' | 'critical' = 'medium'

    // Determine category
    if (reminderKeywords.some(kw => text.includes(kw)) || todo.due_time) {
      suggestedCategory = 'reminder'
    }

    // Determine severity
    if (urgentKeywords.some(kw => text.includes(kw))) {
      suggestedSeverity = 'critical'
    } else if (highPriorityKeywords.some(kw => text.includes(kw))) {
      suggestedSeverity = 'high'
    } else if (timeKeywords.some(kw => text.includes(kw))) {
      suggestedSeverity = 'medium'
    } else {
      suggestedSeverity = 'low'
    }

    return {
      suggestedCategory,
      suggestedSeverity,
      keywords
    }
  }

  // Execute agent logic
  private executeAgent(
    agent: TodoAgent,
    todo: {
      title: string
      description?: string
      due_date?: string
      due_time?: string
    },
    analysis: {
      suggestedCategory: 'normal' | 'reminder' | 'custom'
      suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'
      keywords: string[]
    }
  ): AgentResponse {
    const suggestions: AgentResponse['suggestions'] = {}

    switch (agent.category) {
      case 'normal':
        return this.executeNormalAgent(todo, analysis, suggestions)
      case 'reminder':
        return this.executeReminderAgent(todo, analysis, suggestions)
      default:
        return this.executeCustomAgent(todo, analysis, suggestions)
    }
  }

  // Normal task agent
  private executeNormalAgent(
    todo: { title: string; description?: string; due_date?: string; due_time?: string },
    analysis: { suggestedCategory: 'normal' | 'reminder' | 'custom'; suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'; keywords: string[] },
    suggestions: AgentResponse['suggestions']
  ): AgentResponse {
    // Suggest breakdown for complex tasks
    if (todo.title.length > 50 || (todo.description && todo.description.length > 100)) {
      suggestions.breakdown = this.suggestTaskBreakdown(todo.title)
    }

    // Enhance description if missing
    if (!todo.description && analysis.suggestedSeverity === 'high') {
      suggestions.description_enhancement = `High priority task: ${todo.title}. Consider adding more details about requirements and expected outcomes.`
    }

    return {
      category: 'normal',
      severity: analysis.suggestedSeverity,
      suggestions,
      reasoning: `Categorized as normal task based on content analysis. Severity: ${analysis.suggestedSeverity} due to keyword patterns.`
    }
  }

  // Reminder agent
  private executeReminderAgent(
    todo: { title: string; description?: string; due_date?: string; due_time?: string },
    analysis: { suggestedCategory: 'normal' | 'reminder' | 'custom'; suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'; keywords: string[] },
    suggestions: AgentResponse['suggestions']
  ): AgentResponse {
    // Suggest due time if not provided
    if (!todo.due_time) {
      if (analysis.keywords.includes('morning')) {
        suggestions.due_time = '09:00'
      } else if (analysis.keywords.includes('afternoon')) {
        suggestions.due_time = '14:00'
      } else if (analysis.keywords.includes('evening')) {
        suggestions.due_time = '18:00'
      } else {
        suggestions.due_time = '10:00' // Default
      }
    }

    // Enhance description for reminders
    if (!todo.description) {
      suggestions.description_enhancement = `Reminder: ${todo.title}. This will create a calendar event with notifications.`
    }

    return {
      category: 'reminder',
      severity: analysis.suggestedSeverity,
      suggestions,
      reasoning: `Categorized as reminder based on time-sensitive keywords and due time. Will create calendar event with notifications.`
    }
  }

  // Custom agent (for future extensions)
  private executeCustomAgent(
    todo: { title: string; description?: string; due_date?: string; due_time?: string },
    analysis: { suggestedCategory: 'normal' | 'reminder' | 'custom'; suggestedSeverity: 'low' | 'medium' | 'high' | 'critical'; keywords: string[] },
    suggestions: AgentResponse['suggestions']
  ): AgentResponse {
    return {
      category: 'custom',
      severity: analysis.suggestedSeverity,
      suggestions,
      reasoning: 'Processed by custom agent for specialized handling.'
    }
  }

  // Suggest task breakdown
  private suggestTaskBreakdown(title: string): string[] {
    const words = title.toLowerCase().split(/\s+/)
    const breakdown: string[] = []

    // Simple heuristics for task breakdown
    if (words.includes('project') || words.includes('build') || words.includes('create')) {
      breakdown.push('Plan and design')
      breakdown.push('Gather requirements')
      breakdown.push('Implementation')
      breakdown.push('Testing and review')
    } else if (words.includes('research') || words.includes('study') || words.includes('learn')) {
      breakdown.push('Define research scope')
      breakdown.push('Gather sources')
      breakdown.push('Analyze information')
      breakdown.push('Document findings')
    } else if (words.includes('meeting') || words.includes('presentation')) {
      breakdown.push('Prepare agenda')
      breakdown.push('Create materials')
      breakdown.push('Send invitations')
      breakdown.push('Conduct meeting')
    } else {
      breakdown.push('Break down into smaller tasks')
      breakdown.push('Set priorities')
      breakdown.push('Execute step by step')
    }

    return breakdown
  }

  // Get default agent
  private getDefaultAgent(): TodoAgent {
    return {
      id: 'default',
      category: 'normal',
      name: 'Default Agent',
      description: 'Basic task processing',
      prompt_template: 'Process this todo item with standard rules',
      created_at: new Date().toISOString()
    }
  }

  // Get default response
  private getDefaultResponse(): AgentResponse {
    return {
      category: 'normal',
      severity: 'medium',
      suggestions: {},
      reasoning: 'Default categorization applied due to processing error.'
    }
  }

  // Get all available agents
  async getAgents(): Promise<TodoAgent[]> {
    return Array.from(this.agents.values())
  }

  // Update agent
  async updateAgent(agent: TodoAgent): Promise<void> {
    try {
      const supabase = createSupabaseClient()
      const { error } = await supabase
        .from('todo_agents')
        .upsert(agent)

      if (!error) {
        this.agents.set(agent.category, agent)
      }
    } catch (error) {
      console.error('Error updating agent:', error)
    }
  }
}

export const agentService = new AgentService()