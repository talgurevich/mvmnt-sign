import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Grid,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material'
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Delete as DeleteIcon,
  ShoppingCart as CartIcon,
  CheckCircle as CheckIcon
} from '@mui/icons-material'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

// Product catalog (matches backend)
const PRODUCTS = [
  {
    id: 'wool-hat',
    name: 'כובע צמר',
    price: 50,
    sizes: ['ילדים', 'מבוגרים'],
    colors: ['שחור', 'לבן'],
    image: '/pics/wool-hat-black.jpg',
    images: {
      'שחור': '/pics/wool-hat-black.jpg',
      'לבן': '/pics/wool-hat-white.jpg'
    }
  },
  {
    id: 'cap',
    name: 'כובע מצחיה',
    price: 50,
    sizes: ['ילדים', 'מבוגרים'],
    colors: ['שחור', 'לבן'],
    image: '/pics/cap-black.jpg',
    images: {
      'שחור': '/pics/cap-black.jpg',
      'לבן': '/pics/cap-white.jpg'
    }
  },
  {
    id: 'hoodie-no-zip',
    name: 'קפוצון בלי רוכסן',
    price: 100,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    colors: ['שחור', 'אפור', 'לבן'],
    image: '/pics/hoodie-gray.jpg',
    images: {
      'שחור': '/pics/hoodie-black.jpg',
      'אפור': '/pics/hoodie-gray.jpg',
      'לבן': '/pics/hoodie-white.jpg'
    }
  },
  {
    id: 'hoodie-zip',
    name: 'קפוצון עם רוכסן',
    price: 100,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    colors: ['שחור', 'אפור', 'לבן'],
    image: '/pics/hoodie-zip-gray.jpg',
    images: {
      'שחור': '/pics/hoodie-zip-black.jpg',
      'אפור': '/pics/hoodie-zip-gray.jpg',
      'לבן': '/pics/hoodie-zip-white.jpg'
    }
  },
  {
    id: 'dryfit-shirt',
    name: 'חולצה',
    price: 55,
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'],
    colors: ['אפור', 'שחור'],
    image: '/pics/dryfit-gray.jpg',
    images: {
      'אפור': '/pics/dryfit-gray.jpg',
      'שחור': '/pics/dryfit-black.jpg'
    }
  },
  {
    id: 'towel',
    name: 'מגבת',
    price: 70,
    sizes: ['מידה אחת'],
    colors: ['שחור', 'אפור', 'לבן', 'כחול'],
    image: '/pics/towel.jpg',
    images: {
      'שחור': '/pics/towel.jpg',
      'אפור': '/pics/towel.jpg',
      'לבן': '/pics/towel.jpg',
      'כחול': '/pics/towel.jpg'
    }
  }
]

// Countdown end date - December 26, 2025 at 23:59:59 Israel time
const ORDER_DEADLINE = new Date('2025-12-26T23:59:59+02:00')

// Shop closed flag
const SHOP_CLOSED = true

const Shop = () => {
  const [cart, setCart] = useState([])
  const [customerName, setCustomerName] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedSize, setSelectedSize] = useState('')
  const [selectedColor, setSelectedColor] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [productDialogOpen, setProductDialogOpen] = useState(false)
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })

  // Countdown timer effect
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date()
      const difference = ORDER_DEADLINE - now

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        })
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      }
    }

    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    return () => clearInterval(timer)
  }, [])

  const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)

  const handleProductClick = (product) => {
    setSelectedProduct(product)
    setSelectedSize(product.sizes[0])
    setSelectedColor(product.colors[0])
    setProductDialogOpen(true)
  }

  const handleAddToCart = () => {
    if (!selectedProduct || !selectedSize || !selectedColor) return

    const existingIndex = cart.findIndex(
      item => item.product_id === selectedProduct.id &&
        item.size === selectedSize &&
        item.color === selectedColor
    )

    if (existingIndex >= 0) {
      // Increase quantity
      const newCart = [...cart]
      newCart[existingIndex].quantity += 1
      setCart(newCart)
    } else {
      // Add new item
      setCart([...cart, {
        product_id: selectedProduct.id,
        name: selectedProduct.name,
        size: selectedSize,
        color: selectedColor,
        price: selectedProduct.price,
        quantity: 1
      }])
    }

    setProductDialogOpen(false)
  }

  const handleRemoveFromCart = (index) => {
    const newCart = cart.filter((_, i) => i !== index)
    setCart(newCart)
  }

  const handleQuantityChange = (index, delta) => {
    const newCart = [...cart]
    newCart[index].quantity = Math.max(1, newCart[index].quantity + delta)
    setCart(newCart)
  }

  const handleSubmitOrder = async () => {
    if (!customerName.trim()) {
      setError('יש להזין שם')
      return
    }

    if (cart.length === 0) {
      setError('יש להוסיף פריטים לסל')
      return
    }

    setLoading(true)
    setError('')

    try {
      await axios.post(`${API_URL}/api/merchandise/orders`, {
        customer_name: customerName,
        items: cart
      })

      setSuccess(true)
      setCart([])
      setCustomerName('')
    } catch (err) {
      setError(err.response?.data?.error || 'שגיאה בשליחת ההזמנה')
    } finally {
      setLoading(false)
    }
  }

  // Shop closed - show popup
  if (SHOP_CLOSED) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          p: 3
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <Typography variant="h1" sx={{ mb: 2 }}>
            🚫
          </Typography>
          <Typography variant="h4" gutterBottom>
            החנות סגורה
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            ההזמנות נסגרו. תודה לכל מי שהזמין!
          </Typography>
        </Paper>
      </Box>
    )
  }

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#f5f5f5',
          p: 3
        }}
      >
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 400 }}>
          <CheckIcon sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" gutterBottom>
            ההזמנה נשלחה בהצלחה!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            תודה על ההזמנה. ניצור איתך קשר בקרוב.
          </Typography>
          <Button
            variant="contained"
            onClick={() => setSuccess(false)}
          >
            הזמנה נוספת
          </Button>
        </Paper>
      </Box>
    )
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'white', py: 2, boxShadow: 1 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
            <Box
              component="img"
              src="/ilana-logo.jpg"
              alt="ILANA.INK"
              sx={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
            <Typography variant="h5" fontWeight="bold">
              חנות מרצ'נדייז
            </Typography>
            <Box
              component="img"
              src="/pics/mvmnt-logo.svg"
              alt="MVMNT"
              sx={{ height: 50, objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none' }}
            />
          </Box>
        </Container>
      </Box>

      {/* Welcome Message */}
      <Box sx={{ bgcolor: '#f8f9fa', py: 4 }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              שנה חדשה, סטייל חדש!
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
              חברי MVMNT Factory היקרים,
            </Typography>
            <Typography variant="body1" color="text.secondary">
              לרגל השנה החדשה, אנחנו שמחים להציע לכם קולקציה מוגבלת של מרצ'נדייז בעיצוב ייחודי.
              <br />
              המלאי מוגבל - הזמינו עכשיו!
            </Typography>
          </Box>
        </Container>
      </Box>


      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Grid container spacing={4}>
          {/* Products Grid */}
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
              המוצרים שלנו
            </Typography>
            <Grid container spacing={3}>
              {PRODUCTS.map((product) => (
                <Grid item xs={6} sm={6} md={4} key={product.id}>
                  <Card
                    sx={{
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => handleProductClick(product)}
                  >
                    <CardMedia
                      component="img"
                      height="180"
                      image={product.image}
                      alt={product.name}
                      sx={{ bgcolor: '#e0e0e0', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" viewBox="0 0 200 180"><rect fill="%23e0e0e0" width="200" height="180"/><text fill="%23999" font-family="Arial" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">תמונה בקרוב</text></svg>'
                      }}
                    />
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {product.name}
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {product.price}₪
                      </Typography>
                      <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {product.colors.map(color => (
                          <Chip key={color} label={color} size="small" variant="outlined" />
                        ))}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Grid>

          {/* Cart Sidebar */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3, position: 'sticky', top: 20 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <CartIcon />
                <Typography variant="h6">סל קניות</Typography>
              </Box>

              {cart.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                  הסל ריק
                </Typography>
              ) : (
                <>
                  {cart.map((item, index) => (
                    <Box key={index} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Typography fontWeight="medium">{item.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.color} | {item.size}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            {item.price * item.quantity}₪
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton size="small" onClick={() => handleQuantityChange(index, -1)}>
                            <RemoveIcon fontSize="small" />
                          </IconButton>
                          <Typography>{item.quantity}</Typography>
                          <IconButton size="small" onClick={() => handleQuantityChange(index, 1)}>
                            <AddIcon fontSize="small" />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleRemoveFromCart(index)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Divider sx={{ mt: 2 }} />
                    </Box>
                  ))}

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', my: 2 }}>
                    <Typography variant="h6">סה"כ:</Typography>
                    <Typography variant="h6" color="primary">{totalAmount}₪</Typography>
                  </Box>
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <TextField
                fullWidth
                label="שם מלא"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                sx={{ mb: 2 }}
                required
              />

              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={handleSubmitOrder}
                disabled={loading || cart.length === 0}
                startIcon={loading ? <CircularProgress size={20} /> : null}
              >
                {loading ? 'שולח...' : 'שליחת הזמנה'}
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#333', color: 'white', py: 4, mt: 4 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              צרו קשר
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              ברכה צפירה 3, עכו
            </Typography>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <Box
                component="a"
                href="tel:052-2880040"
                sx={{ color: 'white', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                052-2880040
              </Box>
            </Typography>
            <Typography variant="body1">
              <Box
                component="a"
                href="mailto:info@mvmntfactoryakko.com"
                sx={{ color: 'white', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                info@mvmntfactoryakko.com
              </Box>
            </Typography>
          </Box>
          <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.2)' }} />
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)' }}>
              built by{' '}
              <Box
                component="a"
                href="https://www.errn.io"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                www.errn.io
              </Box>
            </Typography>
          </Box>
        </Container>
      </Box>

      {/* Product Selection Dialog */}
      <Dialog open={productDialogOpen} onClose={() => setProductDialogOpen(false)} maxWidth="xs" fullWidth>
        {selectedProduct && (
          <>
            <DialogTitle>{selectedProduct.name}</DialogTitle>
            <DialogContent>
              {/* Product image that changes with color */}
              <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                <Box
                  component="img"
                  src={selectedProduct.images?.[selectedColor] || selectedProduct.image}
                  alt={`${selectedProduct.name} - ${selectedColor}`}
                  sx={{
                    width: '100%',
                    maxHeight: 250,
                    objectFit: 'contain',
                    borderRadius: 2,
                    bgcolor: '#f5f5f5'
                  }}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="180" viewBox="0 0 200 180"><rect fill="%23e0e0e0" width="200" height="180"/><text fill="%23999" font-family="Arial" font-size="14" x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">תמונה בקרוב</text></svg>'
                  }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h5" color="primary" gutterBottom>
                  {selectedProduct.price}₪
                </Typography>
              </Box>

              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>צבע</InputLabel>
                <Select
                  value={selectedColor}
                  label="צבע"
                  onChange={(e) => setSelectedColor(e.target.value)}
                >
                  {selectedProduct.colors.map(color => (
                    <MenuItem key={color} value={color}>{color}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>מידה</InputLabel>
                <Select
                  value={selectedSize}
                  label="מידה"
                  onChange={(e) => setSelectedSize(e.target.value)}
                >
                  {selectedProduct.sizes.map(size => (
                    <MenuItem key={size} value={size}>{size}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setProductDialogOpen(false)}>ביטול</Button>
              <Button variant="contained" onClick={handleAddToCart}>
                הוסף לסל
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  )
}

export default Shop
