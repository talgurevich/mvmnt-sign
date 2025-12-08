import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Paper,
  Button,
  Tabs,
  Tab
} from '@mui/material';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement
} from 'chart.js';
import Layout from '../components/Layout';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import RefreshIcon from '@mui/icons-material/Refresh';

// Finance components
import FileUploadDropzone from '../components/finance/FileUploadDropzone';
import BankConnectionPanel from '../components/finance/BankConnectionPanel';
import SummaryCards from '../components/finance/SummaryCards';
import MonthlyBarChart from '../components/finance/MonthlyBarChart';
import BalanceLineChart from '../components/finance/BalanceLineChart';
import ExpensePieChart from '../components/finance/ExpensePieChart';
import IncomePieChart from '../components/finance/IncomePieChart';
import MonthlyBreakdown from '../components/finance/MonthlyBreakdown';
import TransferRecipients from '../components/finance/TransferRecipients';
import TransactionsTable from '../components/finance/TransactionsTable';
import InsightsPanel from '../components/finance/InsightsPanel';

// Utils
import { calculateSummary, aggregateByMonth, aggregateByCategory, aggregateTransferRecipients } from '../utils/finance/dataAggregation';
import { generateInsights } from '../utils/finance/insightsGenerator';

// Register ChartJS components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement);

const API_URL = import.meta.env.VITE_API_URL;

const Finance = () => {
  const { getAccessToken } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [imports, setImports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [selectedPieMonth, setSelectedPieMonth] = useState('all');

  // Filter transactions to only show July-November (exclude June and December)
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (!tx.transaction_date) return false;
      const month = new Date(tx.transaction_date).getMonth() + 1; // 1-12
      return month >= 7 && month <= 11; // July (7) through November (11)
    });
  }, [transactions]);

  // Fetch existing transactions on mount
  useEffect(() => {
    fetchData();
  }, [getAccessToken]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await getAccessToken();

      const [transactionsRes, importsRes] = await Promise.all([
        axios.get(`${API_URL}/api/finance/transactions`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${API_URL}/api/finance/imports`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      setTransactions(transactionsRes.data.transactions || []);
      setImports(importsRes.data.imports || []);
    } catch (error) {
      console.error('Failed to fetch finance data:', error);
      // Don't show error if just no data yet
      if (error.response?.status !== 404) {
        setError('שגיאה בטעינת הנתונים');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      setError(null);
      const token = await getAccessToken();

      const formData = new FormData();
      formData.append('file', file);

      await axios.post(`${API_URL}/api/finance/upload`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      // Refresh data after upload
      await fetchData();
    } catch (error) {
      console.error('Failed to upload file:', error);
      setError(error.response?.data?.error || 'שגיאה בהעלאת הקובץ');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteImport = async (importId) => {
    try {
      const token = await getAccessToken();
      await axios.delete(`${API_URL}/api/finance/imports/${importId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchData();
    } catch (error) {
      console.error('Failed to delete import:', error);
      setError('שגיאה במחיקת הייבוא');
    }
  };

  // Compute aggregated data (using filtered transactions - July to November only)
  const summary = useMemo(() => calculateSummary(filteredTransactions), [filteredTransactions]);
  const monthlyData = useMemo(() => aggregateByMonth(filteredTransactions), [filteredTransactions]);
  const expenseCategories = useMemo(() => aggregateByCategory(filteredTransactions, 'expense'), [filteredTransactions]);
  const incomeCategories = useMemo(() => aggregateByCategory(filteredTransactions, 'income'), [filteredTransactions]);
  const recipients = useMemo(() => aggregateTransferRecipients(filteredTransactions), [filteredTransactions]);
  const insights = useMemo(() => generateInsights(filteredTransactions, monthlyData, expenseCategories), [filteredTransactions, monthlyData, expenseCategories]);

  if (loading) {
    return (
      <Layout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  const hasData = filteredTransactions.length > 0;

  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            דוח פיננסי
          </Typography>
          {hasData && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={fetchData}
            >
              רענן נתונים
            </Button>
          )}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Bank Connection Section */}
        <BankConnectionPanel onSyncComplete={() => fetchData()} />

        {/* File Upload Section */}
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            העלאת קובץ תנועות בנק
          </Typography>
          <FileUploadDropzone
            onFileUpload={handleFileUpload}
            uploading={uploading}
            imports={imports}
            onDeleteImport={handleDeleteImport}
          />
        </Paper>

        {!hasData ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              אין נתונים להצגה
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              העלה קובץ Excel עם תנועות הבנק כדי לראות את הניתוח הפיננסי
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Summary Cards */}
            <SummaryCards summary={summary} />

            {/* Insights Panel */}
            <InsightsPanel insights={insights} />

            {/* Tabs for different views */}
            <Paper sx={{ mb: 3 }}>
              <Tabs
                value={tabValue}
                onChange={(e, v) => setTabValue(v)}
                variant="scrollable"
                scrollButtons="auto"
              >
                <Tab label="סקירה כללית" />
                <Tab label="פירוט חודשי" />
                <Tab label="תנועות" />
              </Tabs>
            </Paper>

            {/* Tab Content */}
            {tabValue === 0 && (
              <Grid container spacing={3}>
                {/* Monthly Income vs Expenses */}
                <Grid item xs={12}>
                  <MonthlyBarChart data={monthlyData} />
                </Grid>

                {/* Balance Over Time */}
                <Grid item xs={12}>
                  <BalanceLineChart transactions={filteredTransactions} />
                </Grid>

                {/* Pie Charts */}
                <Grid item xs={12} md={6}>
                  <ExpensePieChart
                    data={expenseCategories}
                    monthlyData={monthlyData}
                    selectedMonth={selectedPieMonth}
                    onMonthChange={setSelectedPieMonth}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <IncomePieChart
                    data={incomeCategories}
                    monthlyData={monthlyData}
                    selectedMonth={selectedPieMonth}
                    onMonthChange={setSelectedPieMonth}
                  />
                </Grid>

                {/* Transfer Recipients */}
                <Grid item xs={12}>
                  <TransferRecipients recipients={recipients} />
                </Grid>
              </Grid>
            )}

            {tabValue === 1 && (
              <MonthlyBreakdown monthlyData={monthlyData} />
            )}

            {tabValue === 2 && (
              <TransactionsTable transactions={filteredTransactions} />
            )}
          </>
        )}

        {hasData && (
          <Typography variant="caption" display="block" sx={{ mt: 3, textAlign: 'center', color: 'text.secondary' }}>
            {filteredTransactions.length} תנועות (יולי-נובמבר) מ-{imports.length} קבצים
          </Typography>
        )}
      </Container>
    </Layout>
  );
};

export default Finance;
