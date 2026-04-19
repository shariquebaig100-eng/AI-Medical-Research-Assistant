import React, { useState } from 'react'

/* ── Publication card (also handles researcher profiles) ──────────────────── */
function PublicationCard({ pub, index }) {
  const [expanded, setExpanded] = useState(false)
  const isPubMed = pub.source?.toLowerCase() === 'pubmed'
  const isResearcher = pub.isResearcher

  if (isResearcher) {
    return (
      <div className="bg-bg-primary border border-slate-700 border-t-2 rounded-xl p-3.5 hover:border-slate-600 transition-colors animate-slide-in"
           style={{ borderTopColor: '#ec4899', animationDelay: `${index * 0.04}s` }}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400">👩‍🔬 Researcher</span>
          <span className="text-[10px] font-mono font-bold text-slate-600">[RES{index + 1}]</span>
        </div>
        <h4 className="text-sm font-bold text-slate-100 mb-2">{pub.title}</h4>
        {pub.citedByCount > 0 && (
          <span className="text-[11px] text-amber-400 font-semibold mb-2 block">📈 {pub.citedByCount.toLocaleString()} total citations</span>
        )}
        {pub.abstract && <p className="text-[11px] text-slate-400 leading-relaxed mb-2">{pub.abstract}</p>}
        {pub.url && (
          <a href={pub.url} target="_blank" rel="noopener noreferrer"
             className="inline-block text-[11px] font-semibold text-pink-400 hover:underline">
            View on OpenAlex →
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="bg-bg-primary border border-slate-700 border-t-2 rounded-xl p-3.5 hover:border-slate-600 transition-colors animate-slide-in"
         style={{ borderTopColor: isPubMed ? '#3b82f6' : '#14b8a6', animationDelay: `${index * 0.04}s` }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isPubMed ? 'bg-blue-500/10 text-blue-400' : 'bg-teal-500/10 text-teal-400'}`}>
            {pub.source}
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">{pub.year}</span>
          {pub.citedByCount > 0 && (
            <span className="text-[10px] text-slate-600" title="Citations">📈 {pub.citedByCount.toLocaleString()}</span>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold text-slate-600">[PUB{index + 1}]</span>
      </div>

      <h4 className="text-xs font-semibold text-slate-200 leading-snug mb-1.5">{pub.title}</h4>

      {pub.authors?.length > 0 && (
        <p className="text-[11px] text-slate-500 italic mb-2">
          {pub.authors.slice(0, 3).join(', ')}{pub.authors.length > 3 ? ` +${pub.authors.length - 3} more` : ''}
        </p>
      )}

      {pub.abstract && (
        <>
          <p className={`text-[11px] text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {pub.abstract}
          </p>
          {pub.abstract.length > 160 && (
            <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-blue-400 hover:underline mt-1">
              {expanded ? 'Show less ↑' : 'Read more ↓'}
            </button>
          )}
        </>
      )}

      <a href={pub.url} target="_blank" rel="noopener noreferrer"
         className={`inline-block text-[11px] font-semibold mt-2 hover:underline ${isPubMed ? 'text-blue-400' : 'text-teal-400'}`}>
        View on {pub.source} →
      </a>
    </div>
  )
}

/* ── Trial card ───────────────────────────────────────────────────────────── */
function TrialCard({ trial, index }) {
  const [expanded, setExpanded] = useState(false)

  const statusStyle = {
    RECRUITING:             'bg-green-500/10 text-green-400',
    NOT_YET_RECRUITING:     'bg-purple-500/10 text-purple-400',
    ACTIVE_NOT_RECRUITING:  'bg-amber-500/10 text-amber-400',
    COMPLETED:              'bg-slate-500/10 text-slate-400',
  }[trial.status] || 'bg-slate-500/10 text-slate-400'

  // Trim eligibility to first meaningful sentence(s) for always-visible summary
  const eligibilitySummary = trial.eligibilityCriteria
    ? trial.eligibilityCriteria.replace(/inclusion criteria:/i, '').trim().substring(0, 220)
    : null

  return (
    <div className="bg-bg-primary border border-slate-700 border-t-2 rounded-xl p-3.5 hover:border-slate-600 transition-colors animate-slide-in"
         style={{ borderTopColor: '#8b5cf6', animationDelay: `${index * 0.04}s` }}>

      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusStyle}`}>
            {trial.status?.replace(/_/g, ' ')}
          </span>
          {trial.phase && trial.phase !== 'N/A' && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-bg-tertiary text-slate-400">{trial.phase}</span>
          )}
          {trial.enrollment && trial.enrollment !== 'N/A' && (
            <span className="text-[10px] text-slate-600">👥 {trial.enrollment} enrolled</span>
          )}
        </div>
        <span className="text-[10px] font-mono font-bold text-purple-600/70 flex-shrink-0">[TRIAL{index + 1}]</span>
      </div>

      {/* Title */}
      <h4 className="text-xs font-semibold text-slate-200 leading-snug mb-1.5">{trial.title}</h4>

      {/* NCT ID + dates */}
      <div className="flex items-center gap-3 mb-2">
        {trial.nctId && (
          <p className="text-[10px] text-slate-500">
            NCT: <code className="font-mono bg-bg-tertiary px-1 py-0.5 rounded text-[10px]">{trial.nctId}</code>
          </p>
        )}
        {trial.startDate && trial.startDate !== 'N/A' && (
          <p className="text-[10px] text-slate-600">Started: {trial.startDate}</p>
        )}
      </div>

      {/* Summary */}
      {trial.summary && (
        <>
          <p className={`text-[11px] text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
            {trial.summary}
          </p>
          {trial.summary.length > 160 && (
            <button onClick={() => setExpanded(v => !v)} className="text-[11px] text-purple-400 hover:underline mt-1">
              {expanded ? 'Show less ↑' : 'Read more ↓'}
            </button>
          )}
        </>
      )}

      {/* ── Always-visible eligibility summary ── */}
      {eligibilitySummary && (
        <div className="mt-2.5 bg-bg-secondary border border-slate-700 rounded-lg px-2.5 py-2">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">📋 Eligibility</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {eligibilitySummary}{trial.eligibilityCriteria?.length > 220 ? '…' : ''}
          </p>
        </div>
      )}

      {/* Location */}
      {trial.locations?.[0] && (
        <div className="flex items-start gap-1 mt-2 text-[11px] text-slate-500">
          <span className="flex-shrink-0">📍</span>
          <span>{trial.locations[0]}{trial.locations.length > 1 ? ` +${trial.locations.length - 1} more` : ''}</span>
        </div>
      )}

      {/* ── Contact block (name + phone + email) ── */}
      {(trial.contactName !== 'N/A' || trial.contactPhone !== 'N/A' || trial.contactEmail !== 'N/A') && (
        <div className="mt-2 bg-bg-secondary border border-slate-700 rounded-lg px-2.5 py-2 flex flex-col gap-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Contact</p>
          {trial.contactName && trial.contactName !== 'N/A' && (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <span>👤</span><span>{trial.contactName}</span>
            </div>
          )}
          {trial.contactPhone && trial.contactPhone !== 'N/A' && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>📞</span>
              <a href={`tel:${trial.contactPhone}`} className="text-slate-400 hover:text-blue-400 transition-colors">
                {trial.contactPhone}
              </a>
            </div>
          )}
          {trial.contactEmail && trial.contactEmail !== 'N/A' && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>✉️</span>
              <a href={`mailto:${trial.contactEmail}`} className="text-blue-400 hover:underline truncate">
                {trial.contactEmail}
              </a>
            </div>
          )}
        </div>
      )}

      <a href={trial.url} target="_blank" rel="noopener noreferrer"
         className="inline-block text-[11px] font-semibold text-purple-400 hover:underline mt-2.5">
        View on ClinicalTrials.gov →
      </a>
    </div>
  )
}

/* ── Main panel ───────────────────────────────────────────────────────────── */
export default function ResearchPanel({ publications = [], trials = [], stats, onClose }) {
  const [tab, setTab] = useState('publications')
  const isResearcherMode = publications.some(p => p.isResearcher)
  const pubTabLabel = isResearcherMode ? '👩‍🔬 Researchers' : '📚 Publications'

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700 flex-shrink-0">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <span>📋</span><span>Research Sources</span>
        </div>
        <button onClick={onClose} className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 px-2 py-1 rounded-lg text-sm transition-colors">✕</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="px-4 py-3 border-b border-slate-700 bg-bg-primary flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Retrieved & ranked from</p>
            <div className="flex gap-1.5">
              {stats.llmExpanded && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400">🧠 LLM-expanded</span>
              )}
              {stats.researcherMode && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400">👩‍🔬 Researcher mode</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[
              { num: stats.pubmed   || 0, label: 'PubMed',     cls: 'border-blue-500/20   bg-blue-500/5',   txt: 'text-blue-400'   },
              { num: stats.openalex || 0, label: 'OpenAlex',   cls: 'border-teal-500/20   bg-teal-500/5',   txt: 'text-teal-400'   },
              { num: stats.trials   || 0, label: 'Trials',     cls: 'border-purple-500/20 bg-purple-500/5', txt: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className={`border rounded-xl p-2 text-center ${s.cls}`}>
                <p className={`text-lg font-bold leading-none ${s.txt}`}>{s.num}</p>
                <p className="text-[10px] text-slate-500 font-semibold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-600 italic">Top {publications.length + trials.length} most relevant shown</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        {[
          { key: 'publications', label: pubTabLabel, count: publications.length },
          { key: 'trials',       label: '🧪 Trials',       count: trials.length },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
              tab === t.key
                ? 'text-blue-400 border-brand-blue'
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-bg-hover'
            }`}
          >
            {t.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.key ? 'bg-blue-500/15 text-blue-400' : 'bg-bg-tertiary text-slate-500'}`}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {tab === 'publications' && (
          publications.length === 0
            ? <p className="text-center text-slate-500 text-sm py-10">No publications found.</p>
            : publications.map((p, i) => <PublicationCard key={p.id} pub={p} index={i} />)
        )}
        {tab === 'trials' && (
          trials.length === 0
            ? <p className="text-center text-slate-500 text-sm py-10">No active clinical trials found.</p>
            : trials.map((t, i) => <TrialCard key={t.id} trial={t} index={i} />)
        )}
      </div>
    </div>
  )
}