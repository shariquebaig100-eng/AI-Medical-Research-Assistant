import React, { useState } from 'react'
import Sidebar from '../components/Sidebar.jsx'
import ChatWindow from '../components/ChatWindow.jsx'
import ResearchPanel from '../components/ResearchPanel.jsx'
import ContextModal from '../components/ContextModel.jsx'
import { useChat } from '../context/ChatContext.jsx'

export default function ChatPage() {
  const [showModal,    setShowModal]    = useState(false)
  const [showResearch, setShowResearch] = useState(true)
  const [sidebarOpen,  setSidebarOpen]  = useState(false)
  const { lastPublications, lastTrials, retrievalStats } = useChat()

  const hasResearch = lastPublications.length > 0 || lastTrials.length > 0

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary relative">

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:relative inset-y-0 left-0 z-50 md:z-auto
        w-72 h-full flex-shrink-0
        bg-bg-secondary border-r border-slate-700
        transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(prev => !prev)} />
      </aside>

      {/* Main chat */}
      <main className="flex-1 min-w-0 h-full flex flex-col">
        <ChatWindow
          onOpenContext={()       => setShowModal(true)}
          onToggleSidebar={()     => setSidebarOpen(v => !v)}
          onToggleResearch={()    => setShowResearch(v => !v)}
          showResearchPanel={showResearch}
        />
      </main>

      {/* Research panel — desktop only */}
      {showResearch && hasResearch && (
        <aside className="hidden lg:flex w-96 flex-shrink-0 h-full flex-col bg-bg-secondary border-l border-slate-700 overflow-y-auto">
          <ResearchPanel
            publications={lastPublications}
            trials={lastTrials}
            stats={retrievalStats}
            onClose={() => setShowResearch(false)}
          />
        </aside>
      )}

      {showModal && <ContextModal onClose={() => setShowModal(false)} />}
    </div>
  )
}