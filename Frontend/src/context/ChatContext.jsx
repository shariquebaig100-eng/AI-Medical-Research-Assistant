import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { chatApi } from '../services/api.js'

const ChatContext = createContext(null)

export function ChatProvider({ children }) {
  const [sessionId, setSessionId]           = useState(() => localStorage.getItem('mra_sid') || uuidv4())
  const [messages, setMessages]             = useState([])
  const [isLoading, setIsLoading]           = useState(false)
  const [isStreaming, setIsStreaming]        = useState(false)
  const [error, setError]                   = useState(null)
  const [context, setContext]               = useState({ patientName: '', disease: '', location: '', intent: '' })
  const [lastPublications, setLastPubs]     = useState([])
  const [lastTrials, setLastTrials]         = useState([])
  const [retrievalStats, setRetrievalStats] = useState(null)
  const abortRef = useRef(null)

  const sendMessage = useCallback(async (text, extraCtx = {}) => {
    if (!text.trim() || isLoading) return

    const userMsg = { id: uuidv4(), role: 'user', content: text, timestamp: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setIsStreaming(false)
    setError(null)

    // Placeholder for streaming assistant message
    const asstId = uuidv4()
    const asstMsg = {
      id: asstId, role: 'assistant', content: '', timestamp: new Date().toISOString(),
      publications: [], trials: [], retrievalStats: null, isStreaming: true
    }
    setMessages(prev => [...prev, asstMsg])

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000'

      // Abort any previous stream
      if (abortRef.current) abortRef.current.abort()
      const controller = new AbortController()
      abortRef.current = controller

      const response = await fetch(`${apiBase}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId,
          message: text,
          patientName: extraCtx.patientName || context.patientName,
          disease:     extraCtx.disease     || context.disease,
          location:    extraCtx.location    || context.location,
          intent:      extraCtx.intent      || context.intent,
        })
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedContent = ''

      setIsStreaming(true)
      setIsLoading(false)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (raw === '[DONE]') break
          if (!raw || raw === ': ping') continue

          try {
            const parsed = JSON.parse(raw)

            // Research data arrives first
            if (parsed.type === 'research') {
              const pubs   = parsed.publications || []
              const trials = parsed.trials       || []
              const stats  = parsed.retrievalStats

              setLastPubs(pubs)
              setLastTrials(trials)
              setRetrievalStats(stats)

              if (parsed.context) {
                setContext(prev => ({
                  ...prev,
                  disease:     parsed.context.disease     || prev.disease,
                  patientName: parsed.context.patientName || prev.patientName,
                  location:    parsed.context.location    || prev.location,
                }))
              }

              // Attach research data to the assistant placeholder
              setMessages(prev => prev.map(m =>
                m.id === asstId
                  ? { ...m, publications: pubs, trials, retrievalStats: stats }
                  : m
              ))
              continue
            }

            // Token streaming
            if (parsed.token !== undefined) {
              streamedContent += parsed.token
              setMessages(prev => prev.map(m =>
                m.id === asstId ? { ...m, content: streamedContent } : m
              ))
            }

            if (parsed.error) {
              setError(parsed.error)
            }
          } catch (_) {}
        }
      }

      // Mark streaming complete
      setMessages(prev => prev.map(m =>
        m.id === asstId ? { ...m, isStreaming: false, content: streamedContent || m.content } : m
      ))

    } catch (err) {
      if (err.name === 'AbortError') return
      setError(err.message)
      setMessages(prev => prev.map(m =>
        m.id === asstId
          ? { ...m, isStreaming: false, isError: true, content: `❌ ${err.message}` }
          : m
      ))
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [sessionId, isLoading, context])

  // Submit thumbs up/down feedback
  const submitFeedback = useCallback(async (messageIndex, rating, comment = '') => {
    try {
      await chatApi.submitFeedback({ sessionId, messageIndex, rating, comment })
      // Mark the message as rated locally
      setMessages(prev => prev.map((m, i) =>
        i === messageIndex ? { ...m, feedback: rating } : m
      ))
    } catch (err) {
      console.error('Feedback error:', err.message)
    }
  }, [sessionId])

  const updateContext = useCallback(patch => setContext(prev => ({ ...prev, ...patch })), [])

  const startNewSession = useCallback(() => {
    if (abortRef.current) abortRef.current.abort()
    const id = uuidv4()
    setSessionId(id)
    localStorage.setItem('mra_sid', id)
    setMessages([])
    setLastPubs([])
    setLastTrials([])
    setRetrievalStats(null)
    setError(null)
    setIsLoading(false)
    setIsStreaming(false)
    setContext({ patientName: '', disease: '', location: '', intent: '' })
  }, [])

  return (
    <ChatContext.Provider value={{
      sessionId, messages, isLoading, isStreaming, error, context,
      lastPublications, lastTrials, retrievalStats,
      sendMessage, submitFeedback, updateContext, startNewSession,
    }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChat = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error('useChat must be used within ChatProvider')
  return ctx
}