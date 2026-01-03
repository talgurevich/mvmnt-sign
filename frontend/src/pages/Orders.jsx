import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Tooltip,
  ButtonGroup,
  Collapse,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon
} from '@mui/material'
import {
  Visibility as ViewIcon,
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  ExpandLess,
  ExpandMore,
  Checkroom as ProductIcon,
  Straighten as SizeIcon
} from '@mui/icons-material'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import axios from 'axios'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_API_URL

const statusConfig = {
  pending: { label: 'ממתין', color: 'warning', icon: '⏳' },
  confirmed: { label: 'אושר', color: 'info', icon: '✅' },
  delivered: { label: 'נמסר', color: 'success', icon: '📦' },
  cancelled: { label: 'בוטל', color: 'error', icon: '❌' }
}

const Orders = () => {
  const { getAccessToken } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [updating, setUpdating] = useState(false)
  const [expandedProducts, setExpandedProducts] = useState({})
  const [expandedSizes, setExpandedSizes] = useState({})

  useEffect(() => {
    fetchOrders()
  }, [statusFilter])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const token = await getAccessToken()
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
      const response = await axios.get(`${API_URL}/api/merchandise/orders${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setOrders(response.data.orders || [])
      setError('')
    } catch (err) {
      setError('שגיאה בטעינת ההזמנות')
      console.error('Error fetching orders:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleViewOrder = (order) => {
    setSelectedOrder(order)
    setDialogOpen(true)
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      setUpdating(true)
      const token = await getAccessToken()
      await axios.patch(`${API_URL}/api/merchandise/orders/${orderId}`, {
        status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('הסטטוס עודכן בהצלחה')
      fetchOrders()
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus })
      }
    } catch (err) {
      toast.error('שגיאה בעדכון הסטטוס')
      console.error('Error updating status:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('האם אתה בטוח שברצונך למחוק את ההזמנה?')) {
      return
    }

    try {
      setUpdating(true)
      const token = await getAccessToken()
      await axios.delete(`${API_URL}/api/merchandise/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      toast.success('ההזמנה נמחקה בהצלחה')
      setDialogOpen(false)
      setSelectedOrder(null)
      fetchOrders()
    } catch (err) {
      toast.error('שגיאה במחיקת ההזמנה')
      console.error('Error deleting order:', err)
    } finally {
      setUpdating(false)
    }
  }

  const exportToCSV = () => {
    const headers = ['תאריך', 'שם לקוח', 'פריטים', 'סכום', 'סטטוס']
    const rows = orders.map(order => [
      new Date(order.created_at).toLocaleDateString('he-IL'),
      order.customer_name,
      order.items.map(i => `${i.name} (${i.color}, ${i.size}) x${i.quantity}`).join('; '),
      order.total_amount + '₪',
      statusConfig[order.status]?.label || order.status
    ])

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `orders_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Toggle product expansion
  const toggleProduct = (productName) => {
    setExpandedProducts(prev => ({
      ...prev,
      [productName]: !prev[productName]
    }))
  }

  // Toggle size expansion
  const toggleSize = (productName, size) => {
    const key = `${productName}|${size}`
    setExpandedSizes(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  // Calculate hierarchical product summary: Product → Size → Color
  const getHierarchicalSummary = () => {
    const products = {}

    // Only count non-cancelled orders
    orders
      .filter(o => o.status !== 'cancelled')
      .forEach(order => {
        order.items.forEach(item => {
          // Initialize product level
          if (!products[item.name]) {
            products[item.name] = {
              name: item.name,
              totalQuantity: 0,
              totalRevenue: 0,
              sizes: {}
            }
          }

          // Initialize size level
          if (!products[item.name].sizes[item.size]) {
            products[item.name].sizes[item.size] = {
              size: item.size,
              totalQuantity: 0,
              totalRevenue: 0,
              colors: {}
            }
          }

          // Initialize color level
          if (!products[item.name].sizes[item.size].colors[item.color]) {
            products[item.name].sizes[item.size].colors[item.color] = {
              color: item.color,
              quantity: 0,
              revenue: 0
            }
          }

          // Update quantities and revenues at all levels
          const qty = item.quantity
          const rev = item.price * item.quantity

          products[item.name].totalQuantity += qty
          products[item.name].totalRevenue += rev
          products[item.name].sizes[item.size].totalQuantity += qty
          products[item.name].sizes[item.size].totalRevenue += rev
          products[item.name].sizes[item.size].colors[item.color].quantity += qty
          products[item.name].sizes[item.size].colors[item.color].revenue += rev
        })
      })

    // Convert to sorted arrays
    return Object.values(products)
      .sort((a, b) => a.name.localeCompare(b.name, 'he'))
      .map(product => ({
        ...product,
        sizes: Object.values(product.sizes)
          .sort((a, b) => a.size.localeCompare(b.size))
          .map(size => ({
            ...size,
            colors: Object.values(size.colors)
              .sort((a, b) => a.color.localeCompare(b.color, 'he'))
          }))
      }))
  }

  const hierarchicalSummary = getHierarchicalSummary()
  const totalItems = hierarchicalSummary.reduce((sum, p) => sum + p.totalQuantity, 0)

  return (
    <Layout>
      <Container maxWidth="xl">
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4">
              📦 הזמנות מרצ'נדייז
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={fetchOrders}
                disabled={loading}
              >
                רענון
              </Button>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportToCSV}
                disabled={orders.length === 0}
              >
                ייצוא CSV
              </Button>
            </Box>
          </Box>

          {/* Stats */}
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">{orders.length}</Typography>
              <Typography variant="body2" color="text.secondary">סה"כ הזמנות</Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {orders.filter(o => o.status === 'pending').length}
              </Typography>
              <Typography variant="body2" color="text.secondary">ממתינות</Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {orders.reduce((sum, o) => sum + o.total_amount, 0)}₪
              </Typography>
              <Typography variant="body2" color="text.secondary">סה"כ מכירות</Typography>
            </Paper>
            <Paper sx={{ p: 2, minWidth: 120, textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {totalItems}
              </Typography>
              <Typography variant="body2" color="text.secondary">סה"כ פריטים</Typography>
            </Paper>
          </Box>

          {/* Hierarchical Product Summary */}
          {hierarchicalSummary.length > 0 && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                📊 סיכום מוצרים
              </Typography>
              <List sx={{ width: '100%' }}>
                {hierarchicalSummary.map((product) => (
                  <Box key={product.name}>
                    {/* Product Level */}
                    <ListItemButton
                      onClick={() => toggleProduct(product.name)}
                      sx={{
                        bgcolor: 'grey.100',
                        borderRadius: 1,
                        mb: 0.5,
                        '&:hover': { bgcolor: 'grey.200' }
                      }}
                    >
                      <ListItemIcon>
                        <ProductIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography fontWeight="bold">{product.name}</Typography>
                            <Chip
                              label={`${product.totalQuantity} יח'`}
                              size="small"
                              color="primary"
                            />
                            <Typography variant="body2" color="text.secondary">
                              {product.totalRevenue}₪
                            </Typography>
                          </Box>
                        }
                      />
                      {expandedProducts[product.name] ? <ExpandLess /> : <ExpandMore />}
                    </ListItemButton>

                    {/* Size Level */}
                    <Collapse in={expandedProducts[product.name]} timeout="auto" unmountOnExit>
                      <List component="div" disablePadding>
                        {product.sizes.map((size) => (
                          <Box key={`${product.name}-${size.size}`}>
                            <ListItemButton
                              onClick={() => toggleSize(product.name, size.size)}
                              sx={{ pr: 4, pl: 6 }}
                            >
                              <ListItemIcon>
                                <SizeIcon fontSize="small" />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography>{size.size}</Typography>
                                    <Chip
                                      label={`${size.totalQuantity} יח'`}
                                      size="small"
                                      variant="outlined"
                                      color="primary"
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                      {size.totalRevenue}₪
                                    </Typography>
                                  </Box>
                                }
                              />
                              {expandedSizes[`${product.name}|${size.size}`] ? <ExpandLess /> : <ExpandMore />}
                            </ListItemButton>

                            {/* Color Level */}
                            <Collapse in={expandedSizes[`${product.name}|${size.size}`]} timeout="auto" unmountOnExit>
                              <List component="div" disablePadding>
                                {size.colors.map((color) => (
                                  <Box
                                    key={`${product.name}-${size.size}-${color.color}`}
                                    sx={{
                                      pl: 12,
                                      pr: 4,
                                      py: 1,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 2,
                                      borderRight: '3px solid',
                                      borderColor: 'primary.light',
                                      mr: 2,
                                      bgcolor: 'grey.50'
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 16,
                                        height: 16,
                                        borderRadius: '50%',
                                        border: '1px solid grey',
                                        bgcolor: color.color === 'שחור' ? 'black'
                                          : color.color === 'לבן' ? 'white'
                                          : color.color === 'אפור' ? 'grey'
                                          : color.color === 'כחול' ? 'blue'
                                          : 'transparent'
                                      }}
                                    />
                                    <Typography>{color.color}</Typography>
                                    <Chip
                                      label={color.quantity}
                                      size="small"
                                      sx={{ minWidth: 40 }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                      {color.revenue}₪
                                    </Typography>
                                  </Box>
                                ))}
                              </List>
                            </Collapse>
                          </Box>
                        ))}
                      </List>
                    </Collapse>
                  </Box>
                ))}
              </List>
            </Paper>
          )}

          {/* Filter */}
          <Box sx={{ mb: 3 }}>
            <ButtonGroup variant="outlined">
              {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(status => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'contained' : 'outlined'}
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'הכל' : `${statusConfig[status]?.icon} ${statusConfig[status]?.label}`}
                </Button>
              ))}
            </ButtonGroup>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          {/* Orders Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>תאריך</TableCell>
                  <TableCell>שם לקוח</TableCell>
                  <TableCell>פריטים</TableCell>
                  <TableCell>סכום</TableCell>
                  <TableCell>סטטוס</TableCell>
                  <TableCell>פעולות</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">אין הזמנות</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => (
                    <TableRow
                      key={order.id}
                      hover
                      onClick={() => handleViewOrder(order)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>{formatDate(order.created_at)}</TableCell>
                      <TableCell>
                        <Typography fontWeight="medium">{order.customer_name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={order.items.map(i => `${i.name} (${i.color}, ${i.size})`).join(', ')}>
                          <Typography>
                            {order.items.length} פריטים
                          </Typography>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight="bold" color="primary">
                          {order.total_amount}₪
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${statusConfig[order.status]?.icon} ${statusConfig[order.status]?.label}`}
                          color={statusConfig[order.status]?.color || 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {order.status === 'pending' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="success"
                              onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                              disabled={updating}
                            >
                              אישור
                            </Button>
                          )}
                          {order.status === 'confirmed' && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              onClick={() => handleUpdateStatus(order.id, 'delivered')}
                              disabled={updating}
                            >
                              נמסר
                            </Button>
                          )}
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={updating}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* Order Details Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          {selectedOrder && (
            <>
              <DialogTitle>
                פרטי הזמנה
              </DialogTitle>
              <DialogContent>
                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">תאריך</Typography>
                  <Typography>{formatDate(selectedOrder.created_at)}</Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">שם לקוח</Typography>
                  <Typography fontWeight="bold">{selectedOrder.customer_name}</Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>פריטים</Typography>
                  <Paper variant="outlined" sx={{ p: 2 }}>
                    {selectedOrder.items.map((item, index) => (
                      <Box key={index} sx={{ mb: index < selectedOrder.items.length - 1 ? 2 : 0 }}>
                        <Typography fontWeight="medium">{item.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.color} | {item.size} | כמות: {item.quantity}
                        </Typography>
                        <Typography variant="body2" color="primary">
                          {item.price * item.quantity}₪
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="body2" color="text.secondary">סה"כ</Typography>
                  <Typography variant="h5" color="primary">{selectedOrder.total_amount}₪</Typography>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>סטטוס</Typography>
                  <FormControl fullWidth size="small">
                    <Select
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, e.target.value)}
                      disabled={updating}
                    >
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <MenuItem key={value} value={value}>
                          {config.icon} {config.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </DialogContent>
              <DialogActions sx={{ justifyContent: 'space-between' }}>
                <Button
                  color="error"
                  onClick={() => handleDeleteOrder(selectedOrder.id)}
                  disabled={updating}
                  startIcon={<DeleteIcon />}
                >
                  מחק הזמנה
                </Button>
                <Button onClick={() => setDialogOpen(false)}>סגור</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Container>
    </Layout>
  )
}

export default Orders
