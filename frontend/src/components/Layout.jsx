// Main Layout Component
// Shared layout with AppBar and navigation (Hebrew)

import React from 'react'
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar
} from '@mui/material'
import LogoutIcon from '@mui/icons-material/Logout'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardIcon from '@mui/icons-material/Dashboard'
import PeopleIcon from '@mui/icons-material/People'
import DescriptionIcon from '@mui/icons-material/Description'
import SendIcon from '@mui/icons-material/Send'
import AnalyticsIcon from '@mui/icons-material/Analytics'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import CakeIcon from '@mui/icons-material/Cake'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'

const DRAWER_WIDTH = 240

const Layout = ({ children }) => {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const menuItems = [
    { text: 'לוח בקרה', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'לידים', icon: <PersonAddIcon />, path: '/leads' },
    { text: 'רשימת המתנה', icon: <HourglassEmptyIcon />, path: '/waitlist' },
    { text: 'ימי הולדת', icon: <CakeIcon />, path: '/birthdays' },
    { text: 'אוטומציות', icon: <SmartToyIcon />, path: '/automations' },
    { text: 'ניתוח נתונים', icon: <AnalyticsIcon />, path: '/analytics' },
    { text: 'דוח פיננסי', icon: <AccountBalanceIcon />, path: '/finance' },
    { text: 'שלח מסמך', icon: <SendIcon />, path: '/send-document' },
    { text: 'לקוחות', icon: <PeopleIcon />, path: '/customers' },
    { text: 'טפסים', icon: <DescriptionIcon />, path: '/forms' }
  ]

  const drawer = (
    <Box>
      <Toolbar sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', py: 2 }}>
        <Box
          component="img"
          src="/ilana-logo.jpg"
          alt="ILANA.INK"
          sx={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            objectFit: 'cover',
            mb: 1,
            border: '2px solid',
            borderColor: 'grey.800',
            filter: 'grayscale(100%) contrast(1.2)',
          }}
        />
        <Typography variant="h6" fontWeight="bold" color="primary">
          ILANA.INK
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                setMobileOpen(false)
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` }
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            ILANA.INK
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2">
                {user?.user_metadata?.full_name || user?.email}
              </Typography>
            </Box>
            <IconButton color="inherit" onClick={handleSignOut}>
              <LogoutIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
          }}
        >
          {drawer}
        </Drawer>

        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: DRAWER_WIDTH }
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          minHeight: '100vh',
          backgroundColor: 'background.default'
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        {children}
      </Box>
    </Box>
  )
}

export default Layout
