// Dashboard Page
// Main admin interface (Hebrew)

import React, { useState, useEffect } from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  CircularProgress
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import DescriptionIcon from '@mui/icons-material/Description'
import DashboardIcon from '@mui/icons-material/Dashboard'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch dashboard statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const session = await user.getSession()
        const token = session?.access_token

        const response = await axios.get(`${API_URL}/api/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        setStats(response.data)
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <Layout>
      <Container maxWidth="xl">
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ברוך הבא, {user?.user_metadata?.full_name || user?.email}
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          מערכת לניהול חתימות דיגיטליות עבור לקוחות Arbox
        </Typography>

        {/* Status Cards */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <DashboardIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                    <Typography variant="h3" fontWeight="bold">
                      {stats?.formRequests?.total || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      מסמכים שנשלחו
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <CheckCircleIcon sx={{ fontSize: 50, color: 'success.main', mb: 2 }} />
                    <Typography variant="h3" fontWeight="bold">
                      {stats?.formRequests?.signed || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      מסמכים שנחתמו
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <PeopleIcon sx={{ fontSize: 50, color: 'info.main', mb: 2 }} />
                    <Typography variant="h3" fontWeight="bold">
                      {stats?.customers?.total || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      לקוחות
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <DescriptionIcon sx={{ fontSize: 50, color: 'warning.main', mb: 2 }} />
                    <Typography variant="h3" fontWeight="bold">
                      {stats?.templates?.total || 0}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                      תבניות
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Additional Stats Row */}
            <Grid container spacing={3} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      סטטוס מסמכים
                    </Typography>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">ממתינים</Typography>
                        <Typography variant="h5">{stats?.formRequests?.pending || 0}</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">נצפו</Typography>
                        <Typography variant="h5">{stats?.formRequests?.viewed || 0}</Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      שיעור חתימה
                    </Typography>
                    <Typography variant="h3" color="success.main" sx={{ mt: 2 }}>
                      {stats?.signingRate || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      מתוך {stats?.formRequests?.total || 0} מסמכים שנשלחו
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}

        {/* Quick Actions */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="h5" gutterBottom fontWeight="bold">
            פעולות מהירות
          </Typography>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item>
              <Button
                variant="contained"
                size="large"
                onClick={() => navigate('/customers')}
              >
                נהל לקוחות
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="contained"
                color="secondary"
                size="large"
                onClick={() => navigate('/forms')}
              >
                נהל תבניות
              </Button>
            </Grid>
            <Grid item>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/customers')}
              >
                הוסף לקוח
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Info Box */}
        <Card sx={{ mt: 4, backgroundColor: 'info.light' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              🚀 ברוכים הבאים למערכת!
            </Typography>
            <Typography variant="body2">
              המערכת מוכנה לשימוש. תוכל להתחיל להעלות טפסים, לנהל לקוחות ולשלוח מסמכים לחתימה דיגיטלית דרך WhatsApp.
            </Typography>
          </CardContent>
        </Card>
      </Container>
    </Layout>
  )
}

export default Dashboard
