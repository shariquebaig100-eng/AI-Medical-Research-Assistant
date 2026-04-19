import React, { useState } from 'react'
import { useChat } from '../context/ChatContext.jsx'

const DISEASES = [
  'Lung Cancer', "Parkinson's Disease", 'Diabetes Type 2',
  "Alzheimer's Disease", 'Heart Failure', 'Breast Cancer',
  'Multiple Sclerosis', 'Rheumatoid Arthritis',
]

export default function ContextModal({ onClose }) {
  const { context, updateContext, sendMessage } = useChat()
  const [form, setForm] = useState({
    patientName: context.patientName || '',
    disease:     context.disease     || '',
    location:    context.location    || '',
    intent:      context.intent      || '',
    query:       '',
  })

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  const submit = (e) => {
    e.preventDefault()
    updateContext({ patientName: form.patientName, disease: form.disease, location: form.location, intent: form.intent })
    if (form.query.trim()) {
      sendMessage(form.query.trim(), { patientName: form.patientName, disease: form.disease, location: form.location, intent: form.intent })
    }
    onClose()
  }

  const inputCls = "w-full px-3 py-2.5 bg-bg-primary border border-slate-700 focus:border-brand-blue rounded-xl text-sm text-slate-100 placeholder-slate-600 outline-none transition-colors font-sans"

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-5"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-bg-secondary border border-slate-700 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-1">
          <div>
            <h2 className="text-base font-bold text-slate-100">Set Research Context</h2>
            <p className="text-xs text-slate-500 mt-0.5">Personalise responses with patient details</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 hover:bg-slate-700 px-2 py-1 rounded-lg text-sm transition-colors mt-0.5">✕</button>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 pt-4 flex flex-col gap-4">

          {/* Patient name */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              👤 Patient Name <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input type="text" value={form.patientName} onChange={e => set('patientName', e.target.value)}
              placeholder="e.g. John Smith" className={inputCls} />
          </div>

          {/* Disease */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              🏥 Disease / Condition <span className="font-semibold text-teal-500">*recommended</span>
            </label>
            <input type="text" value={form.disease} onChange={e => set('disease', e.target.value)}
              placeholder="e.g. Parkinson's Disease" className={inputCls} />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {DISEASES.map(d => (
                <button type="button" key={d} onClick={() => set('disease', d)}
                  className="text-[10px] px-2.5 py-1 rounded-full bg-bg-tertiary border border-slate-700 text-slate-400 hover:border-brand-blue hover:text-blue-400 transition-colors font-sans">
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              📍 Location <span className="font-normal text-slate-600">(for trial matching)</span>
            </label>
            <input type="text" value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="e.g. Toronto, Canada" className={inputCls} />
          </div>

          {/* Intent */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              🔬 Specific Interest <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <input type="text" value={form.intent} onChange={e => set('intent', e.target.value)}
              placeholder="e.g. Deep brain stimulation, immunotherapy…" className={inputCls} />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-700" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-600">Start with a query</span>
            <div className="flex-1 h-px bg-slate-700" />
          </div>

          {/* Query */}
          <div>
            <label className="text-xs font-semibold text-slate-400 mb-1.5 block">
              💬 Initial Query <span className="font-normal text-slate-600">(optional)</span>
            </label>
            <textarea
              value={form.query}
              onChange={e => set('query', e.target.value)}
              placeholder="Ask your first question… (leave blank to just save context)"
              rows={3}
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2.5 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-bg-tertiary border border-slate-700 hover:bg-bg-hover text-slate-300 text-sm font-semibold rounded-xl transition-colors font-sans">
              Cancel
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-dk text-white text-sm font-semibold rounded-xl transition-colors active:scale-[0.98] font-sans">
              {form.query.trim() ? '🔬 Search with Context' : '✓ Save Context'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}