// Form Templates Management Page
// Create and manage document templates with rich text editor (Hebrew)

import React, { useState, useEffect } from 'react'
import Layout from '../components/Layout'
import {
  Box,
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  IconButton,
  Chip,
  InputAdornment,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import VisibilityIcon from '@mui/icons-material/Visibility'
import DescriptionIcon from '@mui/icons-material/Description'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'

const API_URL = import.meta.env.VITE_API_URL

// Quill editor modules configuration
const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ]
}

const Forms = () => {
  const { user, getAccessToken } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    template_name: '',
    description: '',
    content: '',
    is_active: true
  })

  // Fetch templates from API
  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const token = await getAccessToken()

      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { is_active: statusFilter })
      })

      const response = await axios.get(`${API_URL}/api/form-templates?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setTemplates(response.data.data)
      setTotalCount(response.data.pagination.total)
    } catch (error) {
      console.error('Error fetching templates:', error)
      toast.error('שגיאה בטעינת תבניות')
    } finally {
      setLoading(false)
    }
  }

  // Create template
  const handleCreate = async () => {
    if (!formData.template_name || !formData.content) {
      toast.error('נא למלא שם תבנית ותוכן')
      return
    }

    try {
      setSaving(true)
      const token = await getAccessToken()

      await axios.post(`${API_URL}/api/form-templates`, {
        template_name: formData.template_name,
        description: formData.description,
        text_content: formData.content
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('תבנית נוצרה בהצלחה')
      setOpenDialog(false)
      fetchTemplates()
      resetForm()
    } catch (error) {
      console.error('Error creating template:', error)
      toast.error(error.response?.data?.message || 'שגיאה ביצירת תבנית')
    } finally {
      setSaving(false)
    }
  }

  // Update template
  const handleUpdate = async () => {
    try {
      setSaving(true)
      const token = await getAccessToken()

      await axios.put(
        `${API_URL}/api/form-templates/${selectedTemplate.id}`,
        {
          template_name: formData.template_name,
          description: formData.description,
          text_content: formData.content,
          is_active: formData.is_active
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success('תבנית עודכנה בהצלחה')
      setOpenDialog(false)
      fetchTemplates()
      resetForm()
    } catch (error) {
      console.error('Error updating template:', error)
      toast.error('שגיאה בעדכון תבנית')
    } finally {
      setSaving(false)
    }
  }

  // Delete template
  const handleDelete = async (templateId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק תבנית זו?')) return

    try {
      const token = await getAccessToken()

      await axios.delete(`${API_URL}/api/form-templates/${templateId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      toast.success('תבנית נמחקה בהצלחה')
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      toast.error(error.response?.data?.message || 'שגיאה במחיקת תבנית')
    }
  }

  // Dialog handlers
  const handleOpenCreate = () => {
    setDialogMode('create')
    resetForm()
    setOpenDialog(true)
  }

  const handleOpenEdit = (template) => {
    setDialogMode('edit')
    setSelectedTemplate(template)
    setFormData({
      template_name: template.template_name,
      description: template.description || '',
      content: template.text_content || '',
      is_active: template.is_active
    })
    setOpenDialog(true)
  }

  const handleOpenView = (template) => {
    setDialogMode('view')
    setSelectedTemplate(template)
    setOpenDialog(true)
  }

  const resetForm = () => {
    setFormData({
      template_name: '',
      description: '',
      content: '',
      is_active: true
    })
    setSelectedTemplate(null)
  }

  // Load templates on mount and when filters change
  useEffect(() => {
    fetchTemplates()
  }, [page, rowsPerPage, searchTerm, statusFilter])

  return (
    <Layout>
      <Container maxWidth="xl">
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" fontWeight="bold">
            ניהול תבניות
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            הוסף תבנית
          </Button>
        </Box>

        {/* Filters */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField
              placeholder="חפש לפי שם תבנית..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
              sx={{ flexGrow: 1 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>סטטוס</InputLabel>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="סטטוס"
              >
                <MenuItem value="all">הכל</MenuItem>
                <MenuItem value="true">פעיל</MenuItem>
                <MenuItem value="false">לא פעיל</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Paper>

        {/* Table */}
        <Paper>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : templates.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                לא נמצאו תבניות
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                צור תבנית ראשונה כדי להתחיל
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>שם תבנית</TableCell>
                      <TableCell>תיאור</TableCell>
                      <TableCell align="center">סטטוס</TableCell>
                      <TableCell align="center">תאריך יצירה</TableCell>
                      <TableCell align="center">פעולות</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <DescriptionIcon color="primary" />
                            {template.template_name}
                          </Box>
                        </TableCell>
                        <TableCell>{template.description || '-'}</TableCell>
                        <TableCell align="center">
                          <Chip
                            label={template.is_active ? 'פעיל' : 'לא פעיל'}
                            color={template.is_active ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          {new Date(template.created_at).toLocaleDateString('he-IL')}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="צפה">
                            <IconButton size="small" onClick={() => handleOpenView(template)}>
                              <VisibilityIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="ערוך">
                            <IconButton size="small" onClick={() => handleOpenEdit(template)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="מחק">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDelete(template.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <TablePagination
                component="div"
                count={totalCount}
                page={page}
                onPageChange={(e, newPage) => setPage(newPage)}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={(e) => {
                  setRowsPerPage(parseInt(e.target.value, 10))
                  setPage(0)
                }}
                labelRowsPerPage="שורות לעמוד:"
                labelDisplayedRows={({ from, to, count }) => `${from}-${to} מתוך ${count}`}
              />
            </>
          )}
        </Paper>

        {/* Create/Edit Dialog */}
        <Dialog
          open={openDialog}
          onClose={() => setOpenDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            {dialogMode === 'create' && 'הוסף תבנית חדשה'}
            {dialogMode === 'edit' && 'ערוך תבנית'}
            {dialogMode === 'view' && 'פרטי תבנית'}
          </DialogTitle>
          <DialogContent>
            {dialogMode === 'view' ? (
              // View mode
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  שם תבנית
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedTemplate?.template_name}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  תיאור
                </Typography>
                <Typography variant="body1" paragraph>
                  {selectedTemplate?.description || '-'}
                </Typography>

                <Typography variant="body2" color="text.secondary" gutterBottom>
                  תוכן המסמך
                </Typography>
                <Paper
                  sx={{
                    p: 3,
                    mt: 1,
                    bgcolor: 'grey.50',
                    border: '1px solid',
                    borderColor: 'grey.300'
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: selectedTemplate?.text_content || 'אין תוכן' }} />
                </Paper>

                <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mt: 2 }}>
                  סטטוס
                </Typography>
                <Chip
                  label={selectedTemplate?.is_active ? 'פעיל' : 'לא פעיל'}
                  color={selectedTemplate?.is_active ? 'success' : 'default'}
                  size="small"
                />
              </Box>
            ) : (
              // Create/Edit mode
              <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <TextField
                  label="שם תבנית"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                  required
                  fullWidth
                />
                <TextField
                  label="תיאור"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                />

                <Box>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    תוכן המסמך *
                  </Typography>
                  <Box sx={{
                    '& .quill': {
                      bgcolor: 'white',
                      borderRadius: 1
                    },
                    '& .ql-container': {
                      minHeight: '300px',
                      fontSize: '16px'
                    }
                  }}>
                    <ReactQuill
                      theme="snow"
                      value={formData.content}
                      onChange={(value) => setFormData({ ...formData, content: value })}
                      modules={quillModules}
                      placeholder="הכנס את תוכן המסמך כאן..."
                    />
                  </Box>
                </Box>

                {dialogMode === 'edit' && (
                  <FormControl fullWidth>
                    <InputLabel>סטטוס</InputLabel>
                    <Select
                      value={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                      label="סטטוס"
                    >
                      <MenuItem value={true}>פעיל</MenuItem>
                      <MenuItem value={false}>לא פעיל</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>
              {dialogMode === 'view' ? 'סגור' : 'ביטול'}
            </Button>
            {dialogMode === 'create' && (
              <Button
                onClick={handleCreate}
                variant="contained"
                disabled={!formData.template_name || !formData.content || saving}
              >
                {saving ? <CircularProgress size={24} /> : 'צור'}
              </Button>
            )}
            {dialogMode === 'edit' && (
              <Button
                onClick={handleUpdate}
                variant="contained"
                disabled={!formData.template_name || !formData.content || saving}
              >
                {saving ? <CircularProgress size={24} /> : 'שמור'}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Container>
    </Layout>
  )
}

export default Forms
