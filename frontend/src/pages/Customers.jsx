// Customers Management Page
// Full CRUD interface for customer management (Hebrew)

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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Toolbar,
  Tooltip
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SyncIcon from '@mui/icons-material/Sync'
import VisibilityIcon from '@mui/icons-material/Visibility'
import { toast } from 'react-toastify'
import axios from 'axios'
import { useAuth } from '../contexts/AuthContext'

const API_URL = import.meta.env.VITE_API_URL

const Customers = () => {
  const { user } = useAuth()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [totalCount, setTotalCount] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [openDialog, setOpenDialog] = useState(false)
  const [dialogMode, setDialogMode] = useState('create') // 'create', 'edit', 'view'
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    is_active: true
  })

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const token = (await user.getSession())?.access_token

      const params = new URLSearchParams({
        page: page + 1,
        limit: rowsPerPage,
        ...(searchTerm && { search: searchTerm }),
        ...(statusFilter !== 'all' && { is_active: statusFilter })
      })

      const response = await axios.get(`${API_URL}/api/customers?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setCustomers(response.data.data)
      setTotalCount(response.data.pagination.total)
    } catch (error) {
      console.error('Error fetching customers:', error)
      toast.error('שגיאה בטעינת לקוחות')
    } finally {
      setLoading(false)
    }
  }

  // Sync customers from Arbox
  const handleSync = async () => {
    try {
      setSyncing(true)
      const token = (await user.getSession())?.access_token

      const response = await axios.post(
        `${API_URL}/api/customers/sync-from-arbox`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )

      toast.success(`סונכרנו ${response.data.synced} לקוחות מ-Arbox`)
      fetchCustomers()
    } catch (error) {
      console.error('Error syncing customers:', error)
      toast.error('שגיאה בסנכרון לקוחות')
    } finally {
      setSyncing(false)
    }
  }

  // Create or update customer
  const handleSave = async () => {
    try {
      const token = (await user.getSession())?.access_token

      if (dialogMode === 'create') {
        await axios.post(`${API_URL}/api/customers`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success('לקוח נוסף בהצלחה')
      } else if (dialogMode === 'edit') {
        await axios.put(`${API_URL}/api/customers/${selectedCustomer.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        })
        toast.success('לקוח עודכן בהצלחה')
      }

      setOpenDialog(false)
      fetchCustomers()
      resetForm()
    } catch (error) {
      console.error('Error saving customer:', error)
      toast.error(error.response?.data?.message || 'שגיאה בשמירת לקוח')
    }
  }

  // Delete customer
  const handleDelete = async (customerId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק לקוח זה?')) return

    try {
      const token = (await user.getSession())?.access_token
      await axios.delete(`${API_URL}/api/customers/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('לקוח נמחק בהצלחה')
      fetchCustomers()
    } catch (error) {
      console.error('Error deleting customer:', error)
      toast.error('שגיאה במחיקת לקוח')
    }
  }

  // Dialog handlers
  const handleOpenCreate = () => {
    setDialogMode('create')
    resetForm()
    setOpenDialog(true)
  }

  const handleOpenEdit = (customer) => {
    setDialogMode('edit')
    setSelectedCustomer(customer)
    setFormData({
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email || '',
      phone_number: customer.phone_number,
      is_active: customer.is_active
    })
    setOpenDialog(true)
  }

  const handleOpenView = (customer) => {
    setDialogMode('view')
    setSelectedCustomer(customer)
    setOpenDialog(true)
  }

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone_number: '',
      is_active: true
    })
    setSelectedCustomer(null)
  }

  // Load customers on mount and when filters change
  useEffect(() => {
    fetchCustomers()
  }, [page, rowsPerPage, searchTerm, statusFilter])

  return (
    <Layout>
      <Container maxWidth="xl">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          ניהול לקוחות
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={20} /> : <SyncIcon />}
            onClick={handleSync}
            disabled={syncing}
          >
            {syncing ? 'מסנכרן...' : 'סנכרן מ-Arbox'}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreate}
          >
            הוסף לקוח
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            placeholder="חפש לפי שם, טלפון או מייל..."
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
        ) : customers.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              לא נמצאו לקוחות
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              הוסף לקוח חדש או סנכרן מ-Arbox כדי להתחיל
            </Typography>
          </Box>
        ) : (
          <>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>שם מלא</TableCell>
                    <TableCell>טלפון</TableCell>
                    <TableCell>מייל</TableCell>
                    <TableCell align="center">סטטוס</TableCell>
                    <TableCell align="center">מסמכים שנשלחו</TableCell>
                    <TableCell align="center">מסמכים שנחתמו</TableCell>
                    <TableCell align="center">תאריך יצירה</TableCell>
                    <TableCell align="center">פעולות</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id} hover>
                      <TableCell>
                        {customer.first_name} {customer.last_name}
                        {customer.arbox_customer_id && (
                          <Chip
                            label="Arbox"
                            size="small"
                            color="primary"
                            sx={{ mr: 1, height: 20 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>{customer.phone_number}</TableCell>
                      <TableCell>{customer.email || '-'}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={customer.is_active ? 'פעיל' : 'לא פעיל'}
                          color={customer.is_active ? 'success' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="center">{customer.total_documents_sent}</TableCell>
                      <TableCell align="center">{customer.total_documents_signed}</TableCell>
                      <TableCell align="center">
                        {new Date(customer.created_at).toLocaleDateString('he-IL')}
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="צפה">
                          <IconButton size="small" onClick={() => handleOpenView(customer)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="ערוך">
                          <IconButton size="small" onClick={() => handleOpenEdit(customer)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="מחק">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDelete(customer.id)}
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogMode === 'create' && 'הוסף לקוח חדש'}
          {dialogMode === 'edit' && 'ערוך לקוח'}
          {dialogMode === 'view' && 'פרטי לקוח'}
        </DialogTitle>
        <DialogContent>
          {dialogMode === 'view' ? (
            // View mode - display customer details
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                שם מלא
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedCustomer?.first_name} {selectedCustomer?.last_name}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                טלפון
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedCustomer?.phone_number}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                מייל
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedCustomer?.email || '-'}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                סטטוס
              </Typography>
              <Chip
                label={selectedCustomer?.is_active ? 'פעיל' : 'לא פעיל'}
                color={selectedCustomer?.is_active ? 'success' : 'default'}
                size="small"
                sx={{ mb: 2 }}
              />

              <Typography variant="body2" color="text.secondary" gutterBottom>
                מסמכים שנשלחו
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedCustomer?.total_documents_sent}
              </Typography>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                מסמכים שנחתמו
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedCustomer?.total_documents_signed}
              </Typography>

              {selectedCustomer?.arbox_customer_id && (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    מזהה Arbox
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedCustomer.arbox_customer_id}
                  </Typography>
                </>
              )}
            </Box>
          ) : (
            // Create/Edit mode - show form
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="שם פרטי"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="שם משפחה"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
                fullWidth
              />
              <TextField
                label="טלפון"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                required
                fullWidth
                placeholder="05xxxxxxxx"
              />
              <TextField
                label="מייל"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                fullWidth
              />
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>
            {dialogMode === 'view' ? 'סגור' : 'ביטול'}
          </Button>
          {dialogMode !== 'view' && (
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={!formData.first_name || !formData.last_name || !formData.phone_number}
            >
              שמור
            </Button>
          )}
        </DialogActions>
      </Dialog>
      </Container>
    </Layout>
  )
}

export default Customers
