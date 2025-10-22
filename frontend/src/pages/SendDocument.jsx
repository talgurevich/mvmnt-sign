// Send Document Page - Simplified
// Interface for sending forms to customers via WhatsApp (Hebrew)

import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  TextField,
  CircularProgress,
  Card,
  CardContent,
  Grid
} from '@mui/material'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import { useLocation } from 'react-router-dom'

const API_URL = import.meta.env.VITE_API_URL

const SendDocument = () => {
  const { getAccessToken } = useAuth()
  const location = useLocation()
  const [customers, setCustomers] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [loading, setLoading] = useState(false)

  // Fetch customers and templates on mount
  useEffect(() => {
    fetchCustomers()
    fetchTemplates()

    // Pre-select customer if passed from navigation
    if (location.state?.selectedCustomer) {
      setSelectedCustomer(location.state.selectedCustomer)
    }
  }, [])

  const fetchCustomers = async () => {
    try {
      const token = await getAccessToken()
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
      const token = await getAccessToken()
      const response = await axios.get(`${API_URL}/api/form-templates?limit=1000&is_active=true`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setTemplates(response.data.data)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('שגיאה בטעינת תבניות')
    }
  }

  const [generatedLink, setGeneratedLink] = useState(null)
  const [generating, setGenerating] = useState(false)

  // Generate link when both customer and template are selected
  const handleGenerateLink = async () => {
    if (!selectedCustomer || !selectedTemplate) return

    try {
      setGenerating(true)
      const token = await getAccessToken()

      // Create form request
      const response = await axios.post(
        `${API_URL}/api/form-requests`,
        {
          customer_id: selectedCustomer.id,
          form_template_id: selectedTemplate.id,
          expiry_days: 30
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      setGeneratedLink(response.data.data)
      toast.success('קישור נוצר בהצלחה!')
    } catch (error) {
      console.error('Error generating link:', error)
      toast.error(error.response?.data?.message || 'שגיאה ביצירת קישור')
    } finally {
      setGenerating(false)
    }
  }

  const handleSendViaWhatsApp = () => {
    if (generatedLink?.whatsapp_link) {
      window.open(generatedLink.whatsapp_link, '_blank')
      toast.success('נפתח WhatsApp - שלח את ההודעה ללקוח!')

      // Reset after sending
      setTimeout(() => {
        setSelectedCustomer(null)
        setSelectedTemplate(null)
        setGeneratedLink(null)
      }, 1000)
    }
  }

  const handleCopyLink = () => {
    if (generatedLink?.signing_url) {
      navigator.clipboard.writeText(generatedLink.signing_url)
      toast.success('הקישור הועתק ללוח!')
    }
  }

  const handleTestLink = () => {
    if (generatedLink?.signing_url) {
      window.open(generatedLink.signing_url, '_blank')
    }
  }

  const handleReset = () => {
    setSelectedCustomer(null)
    setSelectedTemplate(null)
    setGeneratedLink(null)
  }

  // Auto-generate link when both are selected
  useEffect(() => {
    if (selectedCustomer && selectedTemplate && !generatedLink && !generating) {
      handleGenerateLink()
    }
  }, [selectedCustomer, selectedTemplate])

  const canSend = selectedCustomer && selectedTemplate && !loading

  return (
    <Layout>
      <Container maxWidth="md">
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            שלח מסמך לחתימה
          </Typography>
          <Typography variant="body1" color="text.secondary">
            בחר לקוח ותבנית, ושלח מסמך לחתימה דיגיטלית דרך WhatsApp
          </Typography>
        </Box>

        <Paper sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Customer Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                1. בחר לקוח
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
                <Card sx={{ mt: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="success.dark" gutterBottom>
                      ✓ לקוח נבחר
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedCustomer.first_name} {selectedCustomer.last_name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedCustomer.phone_number}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Template Selection */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                2. בחר תבנית מסמך
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
                      {template.template_name}
                      {template.page_count && ` (${template.page_count} עמודים)`}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedTemplate && (
                <Card sx={{ mt: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.main' }}>
                  <CardContent>
                    <Typography variant="subtitle2" color="success.dark" gutterBottom>
                      ✓ תבנית נבחרה
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {selectedTemplate.template_name}
                    </Typography>
                    {selectedTemplate.description && (
                      <Typography variant="body2" color="text.secondary">
                        {selectedTemplate.description}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              )}
            </Grid>

            {/* Link Preview & Actions */}
            {generatedLink && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, bgcolor: 'success.50', border: '2px solid', borderColor: 'success.main' }}>
                  <Typography variant="h6" gutterBottom color="success.dark">
                    ✓ קישור נוצר בהצלחה
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      קישור לחתימה:
                    </Typography>
                    <TextField
                      value={generatedLink.signing_url}
                      fullWidth
                      size="small"
                      InputProps={{
                        readOnly: true,
                        sx: { fontFamily: 'monospace', fontSize: '0.85rem' }
                      }}
                    />
                  </Box>

                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleCopyLink}
                        startIcon={<ContentCopyIcon />}
                      >
                        העתק קישור
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleTestLink}
                        startIcon={<VisibilityIcon />}
                      >
                        בדוק קישור
                      </Button>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Button
                        variant="contained"
                        color="success"
                        fullWidth
                        onClick={handleSendViaWhatsApp}
                        startIcon={<WhatsAppIcon />}
                      >
                        שלח ב-WhatsApp
                      </Button>
                    </Grid>
                  </Grid>

                  <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      הקישור תקף ל-30 ימים
                    </Typography>
                    <Button size="small" onClick={handleReset}>
                      התחל מחדש
                    </Button>
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Generate Link Section (shown when no link yet) */}
            {!generatedLink && (
              <Grid item xs={12}>
                <Box sx={{
                  mt: 2,
                  p: 3,
                  bgcolor: 'primary.50',
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: canSend ? 'primary.main' : 'grey.300'
                }}>
                  <Typography variant="h6" gutterBottom align="center">
                    3. {generating ? 'יוצר קישור...' : 'ממתין לבחירת לקוח ותבנית'}
                  </Typography>
                  {generating && (
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                      <CircularProgress />
                    </Box>
                  )}
                  {!canSend && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>
                      בחר לקוח ותבנית כדי להמשיך
                    </Typography>
                  )}
                </Box>
              </Grid>
            )}
          </Grid>
        </Paper>
      </Container>
    </Layout>
  )
}

export default SendDocument
