// Dashboard Page
// Main admin interface (Hebrew)

import React from 'react'
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid
} from '@mui/material'
import PeopleIcon from '@mui/icons-material/People'
import DescriptionIcon from '@mui/icons-material/Description'
import DashboardIcon from '@mui/icons-material/Dashboard'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

const Dashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

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
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DashboardIcon sx={{ fontSize: 50, color: 'primary.main', mb: 2 }} />
                <Typography variant="h3" fontWeight="bold">
                  0
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  מסמכים שנשלחו
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PeopleIcon sx={{ fontSize: 50, color: 'success.main', mb: 2 }} />
                <Typography variant="h3" fontWeight="bold">
                  0
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  לקוחות
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 50, color: 'info.main', mb: 2 }} />
                <Typography variant="h3" fontWeight="bold">
                  0
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  טפסים
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

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
              <Button variant="contained" color="secondary" size="large">
                העלה טופס
              </Button>
            </Grid>
            <Grid item>
              <Button variant="outlined" size="large">
                סנכרן מ-Arbox
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
