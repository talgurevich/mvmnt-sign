// Main App Component
// Routes and global providers with RTL support

import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import { CacheProvider } from '@emotion/react'
import CssBaseline from '@mui/material/CssBaseline'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

// Theme
import rtlTheme from './theme/rtlTheme'
import cacheRtl from './theme/rtlCache'

// Context
import { AuthProvider } from './contexts/AuthContext'

// Components
import ProtectedRoute from './components/ProtectedRoute'

// Pages
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Customers from './pages/Customers'
import Forms from './pages/Forms'
import SendDocument from './pages/SendDocument'
import SignDocument from './pages/SignDocument'
import Analytics from './pages/Analytics'
import Finance from './pages/Finance'
import Leads from './pages/Leads'
import WaitingList from './pages/WaitingList'

function App() {
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={rtlTheme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/sign/:token" element={<SignDocument />} />

              {/* Protected Routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <ProtectedRoute>
                    <Customers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms"
                element={
                  <ProtectedRoute>
                    <Forms />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/send-document"
                element={
                  <ProtectedRoute>
                    <SendDocument />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/finance"
                element={
                  <ProtectedRoute>
                    <Finance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leads"
                element={
                  <ProtectedRoute>
                    <Leads />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/waitlist"
                element={
                  <ProtectedRoute>
                    <WaitingList />
                  </ProtectedRoute>
                }
              />

              {/* Default Route */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AuthProvider>

        {/* Toast Notifications */}
        <ToastContainer
          position="top-left"
          autoClose={3000}
          hideProgressBar={false}
          rtl={true}
          closeOnClick
          pauseOnHover
        />
      </ThemeProvider>
    </CacheProvider>
  )
}

export default App
