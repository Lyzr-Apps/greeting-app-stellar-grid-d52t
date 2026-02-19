'use client'

import { useState, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { useLyzrAgentEvents } from '@/lib/lyzrAgentEvents'
import { AgentActivityPanel } from '@/components/AgentActivityPanel'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { FiSun, FiSmile, FiClock, FiRefreshCw, FiSend, FiUser, FiMessageCircle, FiAlertCircle, FiZap } from 'react-icons/fi'

const GREETING_AGENT_ID = '69970d4c46f8ff4c518efb66'

interface GreetingResponse {
  greeting: string
  style: string
  name: string
}

interface HistoryEntry {
  id: number
  greeting: string
  style: string
  name: string
  timestamp: string
}

const SAMPLE_HISTORY: HistoryEntry[] = [
  {
    id: 1,
    greeting: "Hey there, Alex! Hope your day is as awesome as you are!",
    style: "Casual",
    name: "Alex",
    timestamp: "2:30 PM"
  },
  {
    id: 2,
    greeting: "Dear Ms. Johnson, it is with great pleasure that I extend my warmest regards to you on this fine occasion.",
    style: "Formal",
    name: "Ms. Johnson",
    timestamp: "2:25 PM"
  },
  {
    id: 3,
    greeting: "Yo Marco! If you were a vegetable, you'd be a cute-cumber. But since you're not, just take this greeting instead!",
    style: "Funny",
    name: "Marco",
    timestamp: "2:20 PM"
  }
]

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-semibold">
        {part}
      </strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function getStyleColor(style: string): string {
  const lower = style?.toLowerCase() ?? ''
  if (lower.includes('casual')) return 'bg-[hsl(24,95%,53%)] text-white'
  if (lower.includes('formal')) return 'bg-[hsl(20,40%,15%)] text-white'
  if (lower.includes('funny')) return 'bg-[hsl(12,80%,50%)] text-white'
  return 'bg-secondary text-secondary-foreground'
}

function getStyleIcon(style: string) {
  const lower = style?.toLowerCase() ?? ''
  if (lower.includes('casual')) return <FiSun className="h-3.5 w-3.5" />
  if (lower.includes('formal')) return <FiUser className="h-3.5 w-3.5" />
  if (lower.includes('funny')) return <FiSmile className="h-3.5 w-3.5" />
  return <FiMessageCircle className="h-3.5 w-3.5" />
}

export default function Page() {
  const [name, setName] = useState('')
  const [style, setStyle] = useState('Casual')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nameError, setNameError] = useState<string | null>(null)
  const [currentGreeting, setCurrentGreeting] = useState<GreetingResponse | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showSample, setShowSample] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [idCounter, setIdCounter] = useState(1)

  const agentEvents = useLyzrAgentEvents(sessionId)

  const handleGreet = useCallback(async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setNameError('Please enter your name')
      return
    }
    if (trimmedName.length > 50) {
      setNameError('Name must be 50 characters or less')
      return
    }

    setNameError(null)
    setError(null)
    setLoading(true)
    setCurrentGreeting(null)
    setActiveAgentId(GREETING_AGENT_ID)
    agentEvents.setProcessing(true)

    const message = `Generate a ${style} greeting for ${trimmedName}`

    try {
      const result = await callAIAgent(message, GREETING_AGENT_ID)

      if (result?.session_id) {
        setSessionId(result.session_id)
      }

      if (result?.success) {
        const greeting = result?.response?.result?.greeting ?? result?.response?.message ?? 'Could not generate greeting'
        const responseStyle = result?.response?.result?.style ?? style
        const responseName = result?.response?.result?.name ?? trimmedName

        const greetingData: GreetingResponse = {
          greeting,
          style: responseStyle,
          name: responseName
        }

        setCurrentGreeting(greetingData)

        const now = new Date()
        const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

        setHistory(prev => [{
          id: idCounter,
          greeting: greetingData.greeting,
          style: greetingData.style,
          name: greetingData.name,
          timestamp: timeStr
        }, ...prev])
        setIdCounter(prev => prev + 1)
      } else {
        setError(result?.error ?? result?.response?.message ?? 'Failed to generate greeting. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
      agentEvents.setProcessing(false)
    }
  }, [name, style, agentEvents, idCounter])

  const handleReset = useCallback(() => {
    setName('')
    setStyle('Casual')
    setCurrentGreeting(null)
    setError(null)
    setNameError(null)
  }, [])

  const displayHistory = showSample ? SAMPLE_HISTORY : history

  return (
    <div className="min-h-screen bg-background font-sans" style={{ letterSpacing: '-0.01em', lineHeight: '1.55' }}>
      {/* Gradient background layer */}
      <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(135deg, hsl(30 50% 97%) 0%, hsl(20 45% 95%) 35%, hsl(40 40% 96%) 70%, hsl(15 35% 97%) 100%)' }} />

      <div className="max-w-[520px] mx-auto px-4 py-10 md:py-16">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <FiSun className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-foreground tracking-tight mb-2">
            GreetBot
          </h1>
          <p className="text-muted-foreground text-base">
            Your personal greeting companion
          </p>
        </div>

        {/* Sample Data Toggle */}
        <div className="flex items-center justify-end gap-2.5 mb-6">
          <Label htmlFor="sample-toggle" className="text-sm text-muted-foreground cursor-pointer">
            Sample Data
          </Label>
          <Switch
            id="sample-toggle"
            checked={showSample}
            onCheckedChange={setShowSample}
          />
        </div>

        {/* Input Form Card */}
        <Card className="mb-6 border-border/60 shadow-md" style={{ backdropFilter: 'blur(16px)', background: 'hsla(30,40%,96%,0.75)', borderRadius: '0.875rem' }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FiMessageCircle className="h-5 w-5 text-primary" />
              Create a Greeting
            </CardTitle>
            <CardDescription>
              Enter your name and pick a style to generate a personalized greeting.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="name-input" className="text-sm font-medium text-foreground">
                Your Name
              </Label>
              <Input
                id="name-input"
                placeholder="Enter your name"
                value={showSample ? 'Alex' : name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (nameError) setNameError(null)
                }}
                maxLength={50}
                disabled={loading}
                className="border-border bg-background/80 focus:border-primary"
                style={{ borderRadius: '0.75rem' }}
              />
              {nameError && (
                <p className="text-sm text-destructive flex items-center gap-1.5 mt-1">
                  <FiAlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                  {nameError}
                </p>
              )}
            </div>

            {/* Style Select */}
            <div className="space-y-2">
              <Label htmlFor="style-select" className="text-sm font-medium text-foreground">
                Greeting Style
              </Label>
              <Select
                value={showSample ? 'Casual' : style}
                onValueChange={(val) => setStyle(val)}
                disabled={loading}
              >
                <SelectTrigger className="border-border bg-background/80 focus:border-primary" style={{ borderRadius: '0.75rem' }}>
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Casual">
                    <span className="flex items-center gap-2">
                      <FiSun className="h-4 w-4" /> Casual
                    </span>
                  </SelectItem>
                  <SelectItem value="Formal">
                    <span className="flex items-center gap-2">
                      <FiUser className="h-4 w-4" /> Formal
                    </span>
                  </SelectItem>
                  <SelectItem value="Funny">
                    <span className="flex items-center gap-2">
                      <FiSmile className="h-4 w-4" /> Funny
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleGreet}
              disabled={loading || showSample}
              className="w-full font-medium text-base h-11 shadow-md shadow-primary/20 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30"
              style={{ borderRadius: '0.75rem' }}
            >
              {loading ? (
                <>
                  <FiRefreshCw className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <FiSend className="h-4 w-4 mr-2" />
                  Greet Me
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Greeting Output Card */}
        <Card className="mb-6 border-border/60 shadow-md overflow-hidden" style={{ backdropFilter: 'blur(16px)', background: 'hsla(30,40%,96%,0.75)', borderRadius: '0.875rem' }}>
          <CardContent className="p-6">
            {loading ? (
              /* Loading skeleton state */
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FiZap className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-muted-foreground">Crafting your greeting...</span>
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-6 w-full" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            ) : error ? (
              /* Error state */
              <div className="text-center py-4 space-y-3">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-2">
                  <FiAlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <p className="text-sm text-destructive font-medium">{error}</p>
                <Button
                  onClick={handleGreet}
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  style={{ borderRadius: '0.75rem' }}
                >
                  <FiRefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Try Again
                </Button>
              </div>
            ) : showSample ? (
              /* Sample greeting display */
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={`${getStyleColor('Casual')} px-3 py-1 text-xs font-medium flex items-center gap-1.5`} style={{ borderRadius: '999px' }}>
                    {getStyleIcon('Casual')}
                    Casual
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FiClock className="h-3 w-3" />
                    just now
                  </span>
                </div>
                <div className="py-2">
                  <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
                    Hey there, Alex! Hope your day is as awesome as you are!
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Greeting for <span className="font-medium text-foreground">Alex</span>
                </p>
              </div>
            ) : currentGreeting ? (
              /* Real greeting display with entrance animation */
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                  <Badge className={`${getStyleColor(currentGreeting.style)} px-3 py-1 text-xs font-medium flex items-center gap-1.5`} style={{ borderRadius: '999px' }}>
                    {getStyleIcon(currentGreeting.style)}
                    {currentGreeting.style}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <FiClock className="h-3 w-3" />
                    just now
                  </span>
                </div>
                <div className="py-2">
                  {(currentGreeting.greeting?.length ?? 0) > 200 ? (
                    renderMarkdown(currentGreeting.greeting)
                  ) : (
                    <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
                      {currentGreeting.greeting}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Greeting for <span className="font-medium text-foreground">{currentGreeting.name}</span>
                </p>
              </div>
            ) : (
              /* Empty state */
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary mb-3">
                  <FiSun className="h-7 w-7 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Enter your name above to get started!
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Greet Me Again button */}
        {(currentGreeting || showSample) && !loading && (
          <div className="flex justify-center mb-6">
            <Button
              onClick={handleReset}
              variant="outline"
              disabled={showSample}
              className="font-medium shadow-sm transition-all duration-300 hover:shadow-md"
              style={{ borderRadius: '0.75rem' }}
            >
              <FiRefreshCw className="h-4 w-4 mr-2" />
              Greet Me Again
            </Button>
          </div>
        )}

        {/* Greeting History Section */}
        <Card className="mb-6 border-border/60 shadow-md" style={{ backdropFilter: 'blur(16px)', background: 'hsla(30,40%,96%,0.75)', borderRadius: '0.875rem' }}>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FiClock className="h-5 w-5 text-primary" />
              Greeting History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(displayHistory?.length ?? 0) === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  Your greetings will appear here.
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-[320px]">
                <div className="space-y-3 pr-2">
                  {Array.isArray(displayHistory) && displayHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl border border-border/60 bg-background/60 transition-all duration-200 hover:shadow-sm hover:border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{entry.name}</span>
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 h-5 flex items-center gap-1" style={{ borderRadius: '999px' }}>
                            {getStyleIcon(entry.style)}
                            {entry.style}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <FiClock className="h-3 w-3" />
                          {entry.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-2">
                        {entry.greeting}
                      </p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Agent Info Section */}
        <Card className="border-border/40 shadow-sm" style={{ backdropFilter: 'blur(16px)', background: 'hsla(30,40%,96%,0.5)', borderRadius: '0.875rem' }}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10">
                  <FiZap className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">Greeting Agent</p>
                  <p className="text-[10px] text-muted-foreground">Personalized greeting generation</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={`h-2 w-2 rounded-full ${activeAgentId === GREETING_AGENT_ID ? 'bg-primary animate-pulse' : 'bg-green-500'}`} />
                <span className="text-[10px] text-muted-foreground">
                  {activeAgentId === GREETING_AGENT_ID ? 'Processing' : 'Ready'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agent Activity Panel */}
      <AgentActivityPanel
        isConnected={agentEvents.isConnected}
        events={agentEvents.events}
        thinkingEvents={agentEvents.thinkingEvents}
        lastThinkingMessage={agentEvents.lastThinkingMessage}
        activeAgentId={agentEvents.activeAgentId}
        activeAgentName={agentEvents.activeAgentName}
        isProcessing={agentEvents.isProcessing}
      />
    </div>
  )
}
