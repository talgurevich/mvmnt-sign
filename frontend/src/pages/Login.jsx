// Login Page
// Hebrew UI with Google Sign-In

import React, { useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material'
import GoogleIcon from '@mui/icons-material/Google'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'

const Login = () => {
  const { signInWithGoogle, user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      navigate('/dashboard')
    }
  }, [user, navigate])

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    const { error } = await signInWithGoogle()

    if (error) {
      setError('שגיאה בהתחברות. אנא נסה שוב.') // "Login error. Please try again."
      setLoading(false)
    }
    // If successful, Supabase will redirect automatically
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <Container maxWidth="sm">
        <Card
          elevation={10}
          sx={{
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <CardContent sx={{ p: 6, textAlign: 'center' }}>
            {/* Logo/Title */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h3" component="h1" gutterBottom fontWeight="bold">
                ILANA.INK
              </Typography>
              <Typography variant="h6" color="text.secondary">
                מערכת חתימה דיגיטלית
              </Typography>
            </Box>

            {/* Error Message */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            {/* Google Sign-In Button */}
            <Button
              variant="contained"
              size="large"
              fullWidth
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <GoogleIcon />}
              onClick={handleGoogleSignIn}
              disabled={loading}
              sx={{
                py: 2,
                fontSize: '1.1rem',
                fontWeight: 600,
                background: '#fff',
                color: '#000',
                '&:hover': {
                  background: '#f5f5f5',
                },
                boxShadow: 3,
              }}
            >
              {loading ? 'מתחבר...' : 'התחבר עם Google'}
            </Button>

            {/* Info Text */}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
              התחברות בטוחה באמצעות חשבון Google שלך
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              מיועד למנהלים בלבד
            </Typography>
          </CardContent>
        </Card>

        {/* Footer */}
        <Typography
          variant="body2"
          align="center"
          sx={{ mt: 4, color: 'white', fontWeight: 500 }}
        >
          מערכת לניהול חתימות דיגיטליות
        </Typography>
      </Container>
    </Box>
  )
}

export default Login
