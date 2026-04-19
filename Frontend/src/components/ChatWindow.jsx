import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useChat } from '../context/ChatContext.jsx'

/* ── Streaming cursor ─────────────────────────────────────────────────────── */
function StreamingCursor() {
  return <span className="inline-block w-0.5 h-4 bg-brand-blue ml-0.5 animate-pulse align-middle" />
}

/* ── Typing indicator (shown during retrieval, before streaming starts) ───── */
function TypingIndicator() {
  return (
    <div className="flex gap-3 items-start animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-base flex-shrink-0">🧬</div>
      <div className="bg-bg-secondary border border-slate-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue dot-1 inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue dot-2 inline-block" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-blue dot-3 inline-block" />
          </div>
          <span className="text-xs text-slate-500 italic">Retrieving 200+ papers & reasoning…</span>
        </div>
      </div>
    </div>
  )
}

/* ── Retrieval stats ──────────────────────────────────────────────────────── */
function RetrievalStats({ stats }) {
  if (!stats) return null
  return (
    <div className="flex flex-col gap-1 px-1">
      <div className="flex items-center flex-wrap gap-2 text-[11px]">
        <span className="text-blue-400 font-medium">📚 {stats.pubmed || 0} PubMed</span>
        <span className="text-slate-600">·</span>
        <span className="text-teal-400 font-medium">🌐 {stats.openalex || 0} OpenAlex</span>
        <span className="text-slate-600">·</span>
        <span className="text-purple-400 font-medium">🧪 {stats.trials || 0} Trials</span>
        {stats.llmExpanded && (
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold">🧠 LLM-expanded</span>
        )}
        {stats.researcherMode && (
          <span className="px-1.5 py-0.5 rounded-full bg-pink-500/10 text-pink-400 text-[10px] font-bold">👩‍🔬 Researcher mode</span>
        )}
        <span className="text-slate-600 italic">→ ranked → top shown</span>
      </div>
      {stats.llmExpanded && stats.queryVariants?.length > 1 && (
        <div className="text-[10px] text-slate-600 italic truncate">
          Searched: {stats.queryVariants.slice(0, 2).join(' · ')}
        </div>
      )}
    </div>
  )
}

/* ── Source chip ──────────────────────────────────────────────────────────── */
function SourceChip({ href, label, title, badge, badgeClass, snippet, isResearcher }) {
  const [showSnippet, setShowSnippet] = useState(false)
  return (
    <div className="rounded-lg bg-bg-primary border border-slate-700 hover:border-slate-500 transition-colors overflow-hidden">
      <div className="flex items-center gap-2 px-2.5 py-1.5 text-[11px]">
        <span className="font-mono font-bold text-slate-500 flex-shrink-0">{label}</span>
        {isResearcher && <span className="text-pink-400 flex-shrink-0 text-[10px]">👩‍🔬</span>}
        <span className="text-slate-400 flex-1 truncate">{title?.substring(0, 50)}…</span>
        <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${badgeClass}`}>{badge}</span>
        {snippet && (
          <button onClick={() => setShowSnippet(v => !v)}
            className="flex-shrink-0 text-slate-600 hover:text-slate-400 text-[10px] ml-1 transition-colors">
            {showSnippet ? '▲' : '▼'}
          </button>
        )}
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 text-slate-600 hover:text-blue-400 transition-colors text-[10px]">↗</a>
        )}
      </div>
      {snippet && showSnippet && (
        <div className="px-2.5 pb-2 border-t border-slate-800">
          <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5 italic line-clamp-3">{snippet}</p>
          {href && <a href={href} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-400 hover:underline mt-1 inline-block">Open source →</a>}
        </div>
      )}
    </div>
  )
}

/* ── Feedback buttons ─────────────────────────────────────────────────────── */
function FeedbackBar({ messageIndex, currentFeedback, onFeedback }) {
  return (
    <div className="flex items-center gap-2 px-1 mt-1">
      <span className="text-[10px] text-slate-600">Was this helpful?</span>
      <button
        onClick={() => onFeedback(messageIndex, 1)}
        className={`text-sm transition-all px-1.5 py-0.5 rounded-md ${currentFeedback === 1 ? 'bg-green-500/20 text-green-400' : 'text-slate-600 hover:text-green-400 hover:bg-green-500/10'}`}
        title="Helpful"
      >👍</button>
      <button
        onClick={() => onFeedback(messageIndex, -1)}
        className={`text-sm transition-all px-1.5 py-0.5 rounded-md ${currentFeedback === -1 ? 'bg-red-500/20 text-red-400' : 'text-slate-600 hover:text-red-400 hover:bg-red-500/10'}`}
        title="Not helpful"
      >👎</button>
      {currentFeedback !== undefined && (
        <span className="text-[10px] text-slate-600 italic">
          {currentFeedback === 1 ? '✓ Marked helpful' : '✓ Feedback noted'}
        </span>
      )}
    </div>
  )
}

/* ── Single message ───────────────────────────────────────────────────────── */
function Message({ message, messageIndex, onFeedback }) {
  const isUser = message.role === 'user'
  const hasSources = !isUser && (message.publications?.length > 0 || message.trials?.length > 0)
  const streaming = message.isStreaming && message.content

  return (
    <div className={`flex gap-3 items-start animate-fade-in ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5 ${isUser ? 'bg-blue-500/20' : 'bg-teal-500/20'}`}>
        {isUser ? '👤' : '🧬'}
      </div>
      <div className={`flex flex-col gap-2 max-w-[min(680px,85%)] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-brand-blue text-white rounded-br-sm'
            : message.isError
              ? 'bg-red-500/10 border border-red-500/30 text-red-400 rounded-bl-sm'
              : 'bg-bg-secondary border border-slate-700 rounded-bl-sm'
        }`}>
          {isUser ? (
            <p className="text-white">{message.content}</p>
          ) : (
            <div className="md">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
              {streaming && <StreamingCursor />}
            </div>
          )}
        </div>

        {hasSources && <RetrievalStats stats={message.retrievalStats} />}

        {hasSources && (
          <div className="flex flex-col gap-1 w-full">
            {message.publications?.slice(0, 4).map((p, i) => (
              <SourceChip
                key={p.id} href={p.url}
                label={p.isResearcher ? `[RES${i+1}]` : `[PUB${i+1}]`}
                title={p.title} badge={p.year}
                snippet={p.abstract ? p.abstract.substring(0, 280) : null}
                isResearcher={p.isResearcher}
                badgeClass={p.isResearcher
                  ? 'bg-pink-500/10 text-pink-400'
                  : p.source?.toLowerCase() === 'pubmed'
                    ? 'bg-blue-500/10 text-blue-400'
                    : 'bg-teal-500/10 text-teal-400'}
              />
            ))}
            {message.trials?.slice(0, 2).map((t, i) => (
              <SourceChip
                key={t.id} href={t.url}
                label={`[TRIAL${i+1}]`} title={t.title}
                badge={t.status?.replace(/_/g, ' ')}
                snippet={t.summary ? t.summary.substring(0, 280) : null}
                badgeClass={t.status === 'RECRUITING' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'}
              />
            ))}
          </div>
        )}

        {/* Feedback bar — only on completed assistant messages */}
        {!isUser && !message.isStreaming && !message.isError && message.content && (
          <FeedbackBar
            messageIndex={messageIndex}
            currentFeedback={message.feedback}
            onFeedback={onFeedback}
          />
        )}

        <p className="text-[10px] text-slate-600 px-1">
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  )
}

/* ── Welcome screen ───────────────────────────────────────────────────────── */
function WelcomeScreen({ onSend }) {
  const examples = [
    { icon: '🫁', text: 'Latest treatment for lung cancer' },
    { icon: '🧠', text: "Clinical trials for Alzheimer's disease" },
    { icon: '❤️', text: 'Recent studies on heart failure treatment' },
    { icon: '💉', text: 'Clinical trials for diabetes type 2' },
    { icon: '👩‍🔬', text: "Top researchers in Alzheimer's disease" },
    { icon: '🧬', text: 'Deep brain stimulation for Parkinson\'s disease' },
  ]
  return (
    <div className="flex items-center justify-center h-full px-6 py-10">
      <div className="text-center max-w-lg w-full">
        <div className="text-5xl mb-4">🧬</div>
        <h1 className="text-3xl font-extrabold text-slate-100 tracking-tight mb-3">MedResearch AI</h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-6">
          Evidence-based answers powered by PubMed, OpenAlex &amp; ClinicalTrials.gov
        </p>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {['📚 200+ papers retrieved & ranked', '🔬 Live clinical trial matching', '🧠 LLM query expansion', '👩‍🔬 Researcher discovery', '⚡ Real-time streaming'].map(f => (
            <span key={f} className="text-xs px-3 py-1.5 rounded-full bg-bg-secondary border border-slate-700 text-slate-400">{f}</span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {examples.map((ex, i) => (
            <button key={i} onClick={() => onSend(ex.text)}
              className="flex items-start gap-2.5 p-3.5 bg-bg-secondary border border-slate-700 hover:border-brand-blue hover:bg-bg-hover rounded-xl text-left text-slate-400 hover:text-slate-200 text-xs leading-snug transition-all">
              <span className="text-base flex-shrink-0">{ex.icon}</span>
              <span>{ex.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ── Mobile research drawer ───────────────────────────────────────────────── */
function MobileResearchDrawer({ publications, trials, onClose }) {
  const [tab, setTab] = useState('publications')
  if (!publications.length && !trials.length) return null
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-bg-secondary border-t border-slate-700 rounded-t-2xl max-h-[60vh] flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-sm font-semibold text-slate-200">📋 Research Sources</span>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 px-2 py-1 rounded-lg text-sm">✕</button>
      </div>
      <div className="flex border-b border-slate-700">
        {[['publications','📚 Publications', publications.length], ['trials','🧪 Trials', trials.length]].map(([key, label, count]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${tab === key ? 'text-blue-400 border-brand-blue' : 'text-slate-500 border-transparent'}`}>
            {label} <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-bg-tertiary">{count}</span>
          </button>
        ))}
      </div>
      <div className="overflow-y-auto p-3 flex flex-col gap-2">
        {tab === 'publications' && publications.slice(0, 5).map((p, i) => (
          <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
            className="flex flex-col gap-1 p-2.5 bg-bg-primary border border-slate-700 rounded-xl hover:border-slate-500 transition-colors">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.isResearcher ? 'bg-pink-500/10 text-pink-400' : p.source === 'PubMed' ? 'bg-blue-500/10 text-blue-400' : 'bg-teal-500/10 text-teal-400'}`}>{p.source}</span>
              <span className="text-[10px] text-slate-500">{p.year}</span>
            </div>
            <p className="text-xs text-slate-300 leading-snug line-clamp-2">{p.title}</p>
          </a>
        ))}
        {tab === 'trials' && trials.slice(0, 5).map((t, i) => (
          <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
            className="flex flex-col gap-1 p-2.5 bg-bg-primary border border-slate-700 rounded-xl hover:border-slate-500 transition-colors">
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full w-fit ${t.status === 'RECRUITING' ? 'bg-green-500/10 text-green-400' : 'bg-purple-500/10 text-purple-400'}`}>{t.status?.replace(/_/g,' ')}</span>
            <p className="text-xs text-slate-300 leading-snug line-clamp-2">{t.title}</p>
          </a>
        ))}
      </div>
    </div>
  )
}

/* ── Main ChatWindow ──────────────────────────────────────────────────────── */
export default function ChatWindow({ onOpenContext, onToggleSidebar, onToggleResearch, showResearchPanel }) {
  const { messages, isLoading, isStreaming, sendMessage, submitFeedback, context, startNewSession, lastPublications, lastTrials } = useChat()
  const [input, setInput]             = useState('')
  const [showMobileDrawer, setMobile] = useState(false)
  const endRef                        = useRef(null)
  const inputRef                      = useRef(null)
  const hasResearch = lastPublications.length > 0 || lastTrials.length > 0

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, isLoading])

  // Auto-show mobile drawer when new research arrives
  useEffect(() => { if (hasResearch) setMobile(true) }, [lastPublications.length, lastTrials.length])

  const submit = (e) => {
    e?.preventDefault()
    if (!input.trim() || isLoading || isStreaming) return
    sendMessage(input.trim())
    setInput('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  const busy = isLoading || isStreaming

  return (
    <div className="flex flex-col h-full relative">

      {/* Header */}
      <header className="flex items-center justify-between px-4 h-16 border-b border-slate-700 bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onToggleSidebar} className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-2 rounded-lg transition-colors text-base">☰</button>
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-100">MedResearch AI</p>
            {context.disease && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0 animate-pulse" />
                <span className="truncate">{context.disease}{context.patientName && ` · ${context.patientName}`}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Mobile research toggle */}
          {hasResearch && (
            <button onClick={() => setMobile(v => !v)}
              className="md:hidden text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-2 rounded-lg transition-colors"
              title="View research sources">📋</button>
          )}
          {hasResearch && (
            <button onClick={onToggleResearch}
              className={`hidden lg:flex p-2 rounded-lg text-base transition-colors ${showResearchPanel ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-700'}`}
              title="Toggle research panel">📋</button>
          )}
          <button onClick={onOpenContext} className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-2 rounded-lg transition-colors" title="Set context">⚙️</button>
          <button onClick={startNewSession} className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 p-2 rounded-lg transition-colors" title="New session">🔄</button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0
          ? <WelcomeScreen onSend={sendMessage} />
          : (
            <div className="max-w-3xl mx-auto w-full px-4 py-6 flex flex-col gap-5 pb-32 lg:pb-6">
              {messages.map((msg, idx) => (
                <Message
                  key={msg.id}
                  message={msg}
                  messageIndex={idx}
                  onFeedback={submitFeedback}
                />
              ))}
              {isLoading && !isStreaming && <TypingIndicator />}
              <div ref={endRef} />
            </div>
          )
        }
      </div>

      {/* Mobile research drawer */}
      {showMobileDrawer && (
        <MobileResearchDrawer
          publications={lastPublications}
          trials={lastTrials}
          onClose={() => setMobile(false)}
        />
      )}

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-slate-700 bg-bg-primary flex-shrink-0">
        {context.disease && (
          <div className="text-[11px] text-slate-500 px-3 py-1.5 mb-2 bg-bg-secondary border border-slate-700 rounded-lg">
            🏥 <strong className="text-slate-400">{context.disease}</strong>
            {context.patientName && <> · 👤 <strong className="text-slate-400">{context.patientName}</strong></>}
          </div>
        )}
        <form onSubmit={submit}>
          <div className={`flex items-end gap-2 bg-bg-secondary border rounded-2xl px-4 py-2.5 transition-colors ${busy ? 'border-slate-700' : 'border-slate-700 focus-within:border-brand-blue'}`}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKeyDown}
              placeholder="Ask about treatments, clinical trials, top researchers…"
              rows={1} disabled={busy}
              className="flex-1 bg-transparent outline-none text-slate-100 text-sm placeholder-slate-600 resize-none leading-6 max-h-32 overflow-y-auto disabled:opacity-50 font-sans" />
            <button type="submit" disabled={!input.trim() || busy}
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-base font-bold flex-shrink-0 transition-all ${
                input.trim() && !busy ? 'bg-brand-blue text-white hover:bg-brand-bluedk active:scale-95' : 'bg-bg-tertiary text-slate-600 cursor-not-allowed'
              }`}>
              {busy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" /> : '↑'}
            </button>
          </div>
          <p className="text-[10px] text-slate-600 text-center mt-1.5">
            {isStreaming ? '⚡ Streaming response…' : 'Enter to send · Shift+Enter for new line · Powered by Zephyr 7B + PubMed + OpenAlex'}
          </p>
        </form>
      </div>
    </div>
  )
}