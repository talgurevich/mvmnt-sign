// Sign Document Page (Public)
// Customer-facing page for signing documents

import React, { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  TextField
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import { toast } from 'react-toastify'
import axios from 'axios'
import SignatureCanvas from 'react-signature-canvas'

const API_URL = import.meta.env.VITE_API_URL

const SignDocument = () => {
  const { token } = useParams()
  const signatureRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [formRequest, setFormRequest] = useState(null)
  const [error, setError] = useState(null)
  const [signing, setSigning] = useState(false)
  const [signed, setSigned] = useState(false)
  const [signerName, setSignerName] = useState('')

  useEffect(() => {
    loadFormRequest()
  }, [token])

  const loadFormRequest = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${API_URL}/api/sign/${token}`)
      setFormRequest(response.data)

      // Pre-fill signer name from customer data
      if (response.data.customer) {
        setSignerName(`${response.data.customer.first_name} ${response.data.customer.last_name}`)
      }
    } catch (err) {
      console.error('Error loading form:', err)
      setError(err.response?.data?.message || 'הקישור אינו תקף או פג תוקף')
    } finally {
      setLoading(false)
    }
  }

  const handleSign = async () => {
    if (!signerName.trim()) {
      toast.error('נא להזין שם מלא')
      return
    }

    // Check if signature is drawn
    if (signatureRef.current.isEmpty()) {
      toast.error('נא לחתום על המסמך')
      return
    }

    try {
      setSigning(true)

      // Get signature as base64 image
      const signatureData = signatureRef.current.toDataURL('image/png')

      await axios.post(`${API_URL}/api/sign/${token}`, {
        signer_name: signerName,
        signature_data: signatureData
      })

      setSigned(true)
      toast.success('המסמך נחתם בהצלחה!')
    } catch (err) {
      console.error('Error signing:', err)
      toast.error(err.response?.data?.message || 'שגיאה בחתימה')
    } finally {
      setSigning(false)
    }
  }

  const handleClearSignature = () => {
    signatureRef.current.clear()
  }

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h6">טוען מסמך...</Typography>
        </Box>
      </Container>
    )
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Alert severity="error" icon={<ErrorIcon />}>
          <Typography variant="h6" gutterBottom>שגיאה בטעינת המסמך</Typography>
          <Typography>{error}</Typography>
        </Alert>
      </Container>
    )
  }

  if (signed) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h4" gutterBottom color="success.main">
            המסמך נחתם בהצלחה!
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            תודה על חתימתך. קיבלנו את המסמך החתום.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ניתן לסגור חלון זה.
          </Typography>
        </Paper>
      </Container>
    )
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom align="center" fontWeight="bold">
          חתימה על מסמך
        </Typography>

        {formRequest && (
          <>
            <Card sx={{ mb: 3, bgcolor: 'primary.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {formRequest.template?.template_name || 'מסמך'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  נשלח אליך על ידי: {formRequest.sender_name || 'העסק'}
                </Typography>
                {formRequest.template?.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {formRequest.template.description}
                  </Typography>
                )}
              </CardContent>
            </Card>

            {/* Document Content */}
            {formRequest.template && (
              <Box sx={{ mb: 3, border: '1px solid #ddd', borderRadius: 1, overflow: 'hidden' }}>
                <Typography variant="h6" sx={{ p: 2, bgcolor: 'background.default', borderBottom: '1px solid #ddd' }}>
                  תוכן המסמך
                </Typography>
                {formRequest.template.text_content ? (
                  // Show text content if available (mobile-friendly) - render HTML
                  <Box sx={{
                    p: 3,
                    bgcolor: 'white',
                    maxHeight: '500px',
                    overflow: 'auto',
                    fontSize: '1rem',
                    lineHeight: 1.8,
                    '& p': {
                      marginBottom: '0.5em'
                    },
                    '& strong': {
                      fontWeight: 'bold'
                    },
                    '& em': {
                      fontStyle: 'italic'
                    },
                    '& u': {
                      textDecoration: 'underline'
                    },
                    '& ul, & ol': {
                      paddingRight: '2em',
                      marginBottom: '0.5em'
                    },
                    '& .ql-align-center': {
                      textAlign: 'center'
                    },
                    '& .ql-align-right': {
                      textAlign: 'right'
                    },
                    '& .ql-align-left': {
                      textAlign: 'left'
                    },
                    '& .ql-align-justify': {
                      textAlign: 'justify'
                    },
                    '& .ql-direction-rtl': {
                      direction: 'rtl'
                    }
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: formRequest.template.text_content }} />
                  </Box>
                ) : formRequest.template.file_url ? (
                  // Fallback to PDF viewer if text content not available
                  <Box sx={{ width: '100%', height: '500px', bgcolor: '#525659' }}>
                    <iframe
                      src={formRequest.template.file_url}
                      style={{
                        width: '100%',
                        height: '100%',
                        border: 'none'
                      }}
                      title="Document Preview"
                    />
                  </Box>
                ) : (
                  // Show message if neither available
                  <Box sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography>תוכן המסמך אינו זמין</Typography>
                  </Box>
                )}
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                פרטי החותם
              </Typography>
              <TextField
                label="שם מלא"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                fullWidth
                required
                helperText="נא להזין את שמך המלא לצורך החתימה"
              />
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                חתימה
              </Typography>
              <Box sx={{
                border: '2px solid #ddd',
                borderRadius: 1,
                overflow: 'hidden',
                bgcolor: 'white'
              }}>
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'signature-canvas',
                    style: { width: '100%', height: '200px' }
                  }}
                  backgroundColor="white"
                />
              </Box>
              <Button
                onClick={handleClearSignature}
                size="small"
                sx={{ mt: 1 }}
              >
                נקה חתימה
              </Button>
            </Box>

            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                בלחיצה על "חתום על המסמך", אתה מאשר שקראת והבנת את תוכן המסמך ומסכים לתנאיו.
              </Typography>
            </Alert>

            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleSign}
              disabled={signing || !signerName.trim()}
              sx={{ py: 2 }}
            >
              {signing ? <CircularProgress size={24} color="inherit" /> : 'חתום על המסמך'}
            </Button>
          </>
        )}
      </Paper>
    </Container>
  )
}

export default SignDocument
