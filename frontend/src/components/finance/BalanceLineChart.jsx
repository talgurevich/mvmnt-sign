import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { Line } from 'react-chartjs-2';
import TimelineIcon from '@mui/icons-material/Timeline';
import { formatBalanceLineChartData, getLineChartOptions } from '../../utils/finance/chartHelpers';

const BalanceLineChart = ({ transactions }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">אין נתוני יתרה להצגה</Typography>
      </Paper>
    );
  }

  const chartData = formatBalanceLineChartData(transactions);
  const chartOptions = getLineChartOptions();

  return (
    <Paper sx={{ p: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <TimelineIcon sx={{ fontSize: 32, mr: 2, color: '#00d4ff' }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          יתרה לאורך זמן
        </Typography>
      </Box>
      <Box sx={{ height: '350px', position: 'relative' }}>
        <Line data={chartData} options={chartOptions} />
      </Box>
    </Paper>
  );
};

export default BalanceLineChart;
