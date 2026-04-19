import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ChatProvider } from './context/ChatContext.jsx'
import ChatPage from './pages/ChatPage.jsx'
 
export default function App() {
  return (
    <BrowserRouter>
      <ChatProvider>
        <Routes>
          <Route path="/" element={<ChatPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ChatProvider>
    </BrowserRouter>
  )
}