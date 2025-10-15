// Send Document Page
// Interface for sending forms to customers via WhatsApp (Hebrew)

import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  CircularProgress,
  Card,
  CardContent,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Grid,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

const steps = ['בחר לקוח', 'בחר תבנית', 'שלח מסמך']

const SendDocument = () => {
  const { user } = useAuth()
  const [activeStep, setActiveStep] = useState(0)
  const [customers, setCustomers] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [expiryDays, setExpiryDays] = useState(30)
  const [customMessage, setCustomMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [showResultDialog, setShowResultDialog] = useState(false)

  // Fetch customers and templates on mount
  useEffect(() => {
    fetchCustomers()
    fetchTemplates()
  }, [])

  const fetchCustomers = async () => {
    try {
      const session = await user.getSession()
      const token = session?.access_token

      const response = await axios.get(`${API_URL}/api/customers?limit=1000&is_active=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setCustomers(response.data.data)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('שגיאה בטעינת לקוחות')
    }
  }

  const fetchTemplates = async () => {
    try {
      const session = await user.getSession()
      const token = session?.access_token

      const response = await axios.get(`${API_URL}/api/form-templates?limit=1000&is_active=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setTemplates(response.data.data)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('שגיאה בטעינת תבניות')
    }
  }

  const handleNext = () => {
    if (activeStep === 0 && !selectedCustomer) {
      toast.error('נא לבחור לקוח')
      return
    }
    if (activeStep === 1 && !selectedTemplate) {
      toast.error('נא לבחור תבנית')
      return
    }
    setActiveStep((prevStep) => prevStep + 1)
  }

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1)
  }

  const handleSend = async () => {
    if (!selectedCustomer || !selectedTemplate) {
      toast.error('נא לבחור לקוח ותבנית')
      return
    }

    try {
      setLoading(true)
      const session = await user.getSession()
      const token = session?.access_token

      const response = await axios.post(
        `${API_URL}/api/form-requests`,
        {
          customer_id: selectedCustomer.id,
          form_template_id: selectedTemplate.id,
          expiry_days: expiryDays,
          custom_message: customMessage || undefined
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setResult(response.data.data)
      setShowResultDialog(true)
      toast.success('מסמך נשלח בהצלחה!')

      // Reset form after successful send
      setTimeout(() => {
        setActiveStep(0)
        setSelectedCustomer(null)
        setSelectedTemplate(null)
        setCustomMessage('')
      }, 2000)
    } catch (error) {
      console.error('Error sending document:', error)
      toast.error(error.response?.data?.message || 'שגיאה בשליחת מסמך')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    toast.success('הועתק ללוח')
  }

  const openWhatsApp = () => {
    if (result?.whatsapp_link) {
      window.open(result.whatsapp_link, '_blank')
    }
  }

  return (
    <Layout>
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          שלח מסמך לחתימה
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          בחר לקוח, תבנית ושלח מסמך לחתימה דיגיטלית דרך WhatsApp
        </Typography>

        {/* Stepper */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Step 0: Select Customer */}
          {activeStep === 0 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                בחר לקוח
              </Typography>
              <Autocomplete
                options={customers}
                getOptionLabel={(customer) =>
                  `${customer.first_name} ${customer.last_name} (${customer.phone_number})`
                }
                value={selectedCustomer}
                onChange={(event, newValue) => setSelectedCustomer(newValue)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="חפש לקוח..."
                    placeholder="הקלד שם או טלפון"
                  />
                )}
                renderOption={(props, customer) => (
                  <li {...props}>
                    <Box>
                      <Typography variant="body1">
                        {customer.first_name} {customer.last_name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {customer.phone_number} {customer.email && `• ${customer.email}`}
                      </Typography>
                    </Box>
                  </li>
                )}
                fullWidth
              />

              {selectedCustomer && (
                <Card sx={{ mt: 2, bgcolor: 'success.light' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      לקוח נבחר:
                    </Typography>
                    <Typography variant="h6">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </Typography>
                    <Typography variant="body2">
                      טלפון: {selectedCustomer.phone_number}
                    </Typography>
                    {selectedCustomer.email && (
                      <Typography variant="body2">
                        מייל: {selectedCustomer.email}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Step 1: Select Template */}
          {activeStep === 1 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                בחר תבנית
              </Typography>
              <FormControl fullWidth>
                <InputLabel>תבנית מסמך</InputLabel>
                <Select
                  value={selectedTemplate?.id || ''}
                  onChange={(e) => {
                    const template = templates.find(t => t.id === e.target.value)
                    setSelectedTemplate(template)
                  }}
                  label="תבנית מסמך"
                >
                  {templates.map((template) => (
                    <MenuItem key={template.id} value={template.id}>
                      {template.template_name} ({template.page_count} עמודים)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedTemplate && (
                <Card sx={{ mt: 2, bgcolor: 'success.light' }}>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      תבנית נבחרה:
                    </Typography>
                    <Typography variant="h6">{selectedTemplate.template_name}</Typography>
                    <Typography variant="body2">
                      עמודים: {selectedTemplate.page_count}
                    </Typography>
                    {selectedTemplate.description && (
                      <Typography variant="body2">
                        תיאור: {selectedTemplate.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )}
            </Box>
          )}

          {/* Step 2: Customize & Send */}
          {activeStep === 2 && (
            <Box>
              <Typography variant="h6" gutterBottom>
                סיכום ושליחה
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        לקוח
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedCustomer?.first_name} {selectedCustomer?.last_name}
                      </Typography>
                      <Typography variant="body2">{selectedCustomer?.phone_number}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                        תבנית
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {selectedTemplate?.template_name}
                      </Typography>
                      <Typography variant="body2">
                        {selectedTemplate?.page_count} עמודים
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <TextField
                label="תוקף (ימים)"
                type="number"
                value={expiryDays}
                onChange={(e) => setExpiryDays(parseInt(e.target.value) || 30)}
                fullWidth
                sx={{ mb: 2 }}
                helperText="הקישור לחתימה יהיה תקף למספר הימים שתבחר"
              />

              <TextField
                label="הודעה מותאמת אישית (אופציונלי)"
                multiline
                rows={4}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                fullWidth
                helperText="אם תשאיר ריק, תישלח הודעת ברירת מחדל"
              />
            </Box>
          )}

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              חזור
            </Button>
            <Box>
              {activeStep < 2 ? (
                <Button
                  variant="contained"
                  onClick={handleNext}
                >
                  המשך
                </Button>
              ) : (
                <Button
                  variant="contained"
                  startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
                  onClick={handleSend}
                  disabled={loading}
                >
                  {loading ? 'שולח...' : 'שלח מסמך'}
                </Button>
              )}
            </Box>
          </Box>
        </Paper>

        {/* Result Dialog */}
        <Dialog
          open={showResultDialog}
          onClose={() => setShowResultDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CheckCircleIcon color="success" />
              <Typography variant="h6">מסמך נשלח בהצלחה!</Typography>
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="success" sx={{ mb: 2 }}>
              המסמך מוכן לשליחה ללקוח דרך WhatsApp
            </Alert>

            <Typography variant="body2" color="text.secondary" gutterBottom>
              קישור לחתימה:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                value={result?.signing_url || ''}
                fullWidth
                size="small"
                InputProps={{
                  readOnly: true
                }}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => copyToClipboard(result?.signing_url)}
              >
                <ContentCopyIcon />
              </Button>
            </Box>

            <Button
              variant="contained"
              color="success"
              fullWidth
              size="large"
              startIcon={<WhatsAppIcon />}
              onClick={openWhatsApp}
              sx={{ mt: 2 }}
            >
              פתח WhatsApp ושלח ללקוח
            </Button>

            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
              הקישור תקף ל-{expiryDays} ימים
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowResultDialog(false)}>סגור</Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}

export default SendDocument
