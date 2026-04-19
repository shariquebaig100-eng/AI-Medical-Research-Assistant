import React from 'react'
import { useChat } from '../context/ChatContext.jsx'

const SUGGESTIONS = [
  'Latest treatment for lung cancer',
  "Clinical trials for diabetes type 2",
  "Top researchers in Alzheimer's disease",
  'Recent studies on heart disease',
  'Deep brain stimulation Parkinson\'s disease',
  'Immunotherapy advances breast cancer',
  'mRNA vaccine technology updates',
  'CRISPR gene therapy clinical trials',
]

export default function Sidebar({ onClose }) {
  const { context, startNewSession, sendMessage } = useChat()

  return (
    <div className="flex flex-col h-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">🧬</span>
          <div>
            <p className="text-sm font-bold text-slate-100 tracking-tight">MedResearch AI</p>
            <p className="text-[11px] text-slate-500">Evidence-based research</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-slate-500 hover:text-slate-300 hover:bg-slate-700 px-2 py-1 rounded-lg text-sm transition-colors"
        >✕</button>
      </div>

      {/* New session */}
      <div className="px-3 pt-3">
        <button
          onClick={startNewSession}
          className="w-full flex items-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dk text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98]"
        >
          <span className="text-base font-light">+</span> New Research Session
        </button>
      </div>

      {/* Context card */}
      {(context.disease || context.patientName) && (
        <div className="px-3 pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1.5">Current Context</p>
          <div className="bg-bg-tertiary rounded-xl px-3 py-2.5 flex flex-col gap-1.5">
            {context.patientName && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>👤</span><span>{context.patientName}</span>
              </div>
            )}
            {context.disease && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>🏥</span><span>{context.disease}</span>
              </div>
            )}
            {context.location && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>📍</span><span>{context.location}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested queries */}
      <div className="px-3 pt-3 flex-1 overflow-y-auto">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-2">Quick Queries</p>
        <div className="flex flex-col gap-1">
          {SUGGESTIONS.map((q, i) => (
            <button
              key={i}
              onClick={() => { sendMessage(q); onClose?.() }}
              className="flex items-start gap-2 px-3 py-2 rounded-xl text-left text-slate-400 text-xs hover:bg-bg-tertiary hover:text-slate-200 transition-colors leading-snug border border-transparent hover:border-slate-700"
            >
              <span className="mt-0.5 text-xs flex-shrink-0">🔬</span>
              <span>{q}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-700">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">PubMed</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400">OpenAlex</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">ClinicalTrials</span>
        </div>
        <p className="text-[10px] text-slate-600 leading-relaxed">For research purposes only. Not medical advice.</p>
      </div>
    </div>
  )
}