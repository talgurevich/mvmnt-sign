import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend);

const API_URL = import.meta.env.VITE_API_URL;

const Analytics = () => {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAccessToken();
        const response = await axios.get(
          `${API_URL}/api/analytics/overview`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch analytics:', error);
        setError('שגיאה בטעינת נתוני הניתוח. נסה שוב מאוחר יותר.');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [getAccessToken]);

  // Prepare chart data
  const chartData = data ? {
    labels: data.membershipTypes.map(m => m.type),
    datasets: [
      {
        data: data.membershipTypes.map(m => m.count),
        backgroundColor: [
          '#FF6384',
          '#36A2EB',
          '#FFCE56',
          '#4BC0C0',
          '#9966FF',
          '#FF9F40',
          '#FF6384',
          '#C9CBCF',
          '#4BC0C0',
          '#FF6384'
        ],
        borderColor: '#fff',
        borderWidth: 2
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          font: {
            size: 12,
            family: 'Arial'
          },
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = data.membershipTypes[context.dataIndex].percentage;
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, fontWeight: 600 }}>
          ניתוח נתונים
        </Typography>

        <Grid container spacing={3}>
          {/* Total Active Members Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <PeopleIcon sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h6">
                    סך הכל חברים פעילים
                  </Typography>
                </Box>
                <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
                  {data.totalActiveMembers}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  מתוך {data.totalUsers} סך הכל משתמשים במערכת
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Membership Types Card */}
          <Grid item xs={12} md={6}>
            <Card
              sx={{
                height: '100%',
                background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
                color: 'white'
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={2}>
                  <CategoryIcon sx={{ fontSize: 40, mr: 2 }} />
                  <Typography variant="h6">
                    סוגי מנויים
                  </Typography>
                </Box>
                <Typography variant="h2" sx={{ fontWeight: 700, mb: 1 }}>
                  {data.membershipTypes.length}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  קטגוריות שונות של חברות
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Pie Chart */}
          <Grid item xs={12}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                התפלגות חברים לפי סוג מנוי
              </Typography>
              <Box sx={{ height: '500px', position: 'relative' }}>
                {chartData && <Pie data={chartData} options={chartOptions} />}
              </Box>
            </Paper>
          </Grid>

          {/* Membership Types Table */}
          <Grid item xs={12}>
            <Paper sx={{ p: 4 }}>
              <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
                פירוט מנויים
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#667eea', color: 'white' }}>
                      <th style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        סוג מנוי
                      </th>
                      <th style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        מספר חברים
                      </th>
                      <th style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                        אחוז
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.membershipTypes.map((membership, index) => (
                      <tr
                        key={index}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#f8f9fa' : 'white'
                        }}
                      >
                        <td style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd', fontWeight: 600 }}>
                          {membership.type}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                          {membership.count}
                        </td>
                        <td style={{ padding: '15px', textAlign: 'right', borderBottom: '1px solid #ddd' }}>
                          {membership.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="caption" display="block" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
          עודכן לאחרונה: {data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('he-IL') : ''}
        </Typography>
      </Container>
    </Layout>
  );
};

export default Analytics;
