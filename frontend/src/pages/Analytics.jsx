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
import { Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
} from 'chart.js';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import PeopleIcon from '@mui/icons-material/People';
import CategoryIcon from '@mui/icons-material/Category';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

const API_URL = import.meta.env.VITE_API_URL;

const Analytics = () => {
  const { getAccessToken } = useAuth();
  const [data, setData] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [churnData, setChurnData] = useState(null);
  const [leadsData, setLeadsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = await getAccessToken();

        // Fetch overview, timeline, churn, and leads data in parallel
        const [overviewResponse, timelineResponse, churnResponse, leadsResponse] = await Promise.all([
          axios.get(
            `${API_URL}/api/analytics/overview`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${API_URL}/api/analytics/members-over-time?months=12`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${API_URL}/api/analytics/churn-over-time?months=12`,
            { headers: { Authorization: `Bearer ${token}` } }
          ),
          axios.get(
            `${API_URL}/api/analytics/leads-over-time?months=12`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        ]);

        setData(overviewResponse.data);
        setTimelineData(timelineResponse.data);
        setChurnData(churnResponse.data);
        setLeadsData(leadsResponse.data);
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

  // Prepare timeline chart data with breakdown by category
  const lineChartData = timelineData ? (() => {
    // Get all unique categories
    const categories = new Set();
    timelineData.months.forEach(month => {
      Object.keys(month.byCategory).forEach(cat => categories.add(cat));
    });

    // Color mapping for categories
    const categoryColors = {
      'Pilates': { border: '#FF6384', bg: 'rgba(255, 99, 132, 0.1)' },
      'Lift + Move': { border: '#36A2EB', bg: 'rgba(54, 162, 235, 0.1)' },
      'Yoga': { border: '#FFCE56', bg: 'rgba(255, 206, 86, 0.1)' },
      'Teens': { border: '#4BC0C0', bg: 'rgba(75, 192, 192, 0.1)' },
      'Open Gym': { border: '#9966FF', bg: 'rgba(153, 102, 255, 0.1)' },
      'Elite VIP': { border: '#FF9F40', bg: 'rgba(255, 159, 64, 0.1)' },
      'Other': { border: '#C9CBCF', bg: 'rgba(201, 203, 207, 0.1)' }
    };

    // Create dataset for each category
    const datasets = Array.from(categories).map(category => {
      const colors = categoryColors[category] || { border: '#11998e', bg: 'rgba(17, 153, 142, 0.1)' };
      return {
        label: category,
        data: timelineData.months.map(m => m.byCategory[category] || 0),
        borderColor: colors.border,
        backgroundColor: colors.bg,
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });

    return {
      labels: timelineData.months.map(m => m.label),
      datasets
    };
  })() : null;

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
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
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Prepare churn chart data with breakdown by category
  const churnChartData = churnData ? (() => {
    // Get all unique categories
    const categories = new Set();
    churnData.months.forEach(month => {
      Object.keys(month.byCategory).forEach(cat => categories.add(cat));
    });

    // Color mapping for categories (same as new members for consistency)
    const categoryColors = {
      'Pilates': { border: '#FF6384', bg: 'rgba(255, 99, 132, 0.1)' },
      'Lift + Move': { border: '#36A2EB', bg: 'rgba(54, 162, 235, 0.1)' },
      'Yoga': { border: '#FFCE56', bg: 'rgba(255, 206, 86, 0.1)' },
      'Teens': { border: '#4BC0C0', bg: 'rgba(75, 192, 192, 0.1)' },
      'Open Gym': { border: '#9966FF', bg: 'rgba(153, 102, 255, 0.1)' },
      'Elite VIP': { border: '#FF9F40', bg: 'rgba(255, 159, 64, 0.1)' },
      'Other': { border: '#C9CBCF', bg: 'rgba(201, 203, 207, 0.1)' }
    };

    // Create dataset for each category
    const datasets = Array.from(categories).map(category => {
      const colors = categoryColors[category] || { border: '#f093fb', bg: 'rgba(240, 147, 251, 0.1)' };
      return {
        label: category,
        data: churnData.months.map(m => m.byCategory[category] || 0),
        borderColor: colors.border,
        backgroundColor: colors.bg,
        tension: 0.4,
        fill: false,
        pointRadius: 3,
        pointHoverRadius: 5
      };
    });

    return {
      labels: churnData.months.map(m => m.label),
      datasets
    };
  })() : null;

  const churnChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
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
            return `${context.dataset.label}: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
        }
      }
    }
  };

  // Prepare leads chart data
  const leadsChartData = leadsData ? {
    labels: leadsData.months.map(m => m.label),
    datasets: [
      {
        label: 'לידים חדשים',
        data: leadsData.months.map(m => m.newLeads),
        borderColor: '#a8edea',
        backgroundColor: 'rgba(168, 237, 234, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  } : null;

  const leadsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `לידים חדשים: ${context.parsed.y}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0
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

          {/* New Members Over Time Line Chart */}
          {lineChartData && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <TrendingUpIcon sx={{ fontSize: 32, mr: 2, color: '#11998e' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    חברים חדשים לפי חודש
                  </Typography>
                </Box>
                <Box sx={{ height: '400px', position: 'relative' }}>
                  <Line data={lineChartData} options={lineChartOptions} />
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Churn Over Time Line Chart */}
          {churnChartData && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <TrendingDownIcon sx={{ fontSize: 32, mr: 2, color: '#f093fb' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    נשירת חברים לפי חודש
                  </Typography>
                </Box>
                <Box sx={{ height: '400px', position: 'relative' }}>
                  <Line data={churnChartData} options={churnChartOptions} />
                </Box>
              </Paper>
            </Grid>
          )}

          {/* Leads Over Time Line Chart */}
          {leadsChartData && (
            <Grid item xs={12}>
              <Paper sx={{ p: 4 }}>
                <Box display="flex" alignItems="center" mb={3}>
                  <PersonAddIcon sx={{ fontSize: 32, mr: 2, color: '#a8edea' }} />
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    לידים חדשים לפי חודש
                  </Typography>
                </Box>
                <Box sx={{ height: '400px', position: 'relative' }}>
                  <Line data={leadsChartData} options={leadsChartOptions} />
                </Box>
              </Paper>
            </Grid>
          )}

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
