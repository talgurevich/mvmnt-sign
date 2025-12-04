import React from 'react';
import { Paper, Box, Typography } from '@mui/material';
import { Bar } from 'react-chartjs-2';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { formatMonthlyBarChartData, getBarChartOptions } from '../../utils/finance/chartHelpers';

const MonthlyBarChart = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">אין נתונים חודשיים להצגה</Typography>
      </Paper>
    );
  }

  const chartData = formatMonthlyBarChartData(data);
  const chartOptions = getBarChartOptions();

  return (
    <Paper sx={{ p: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <CalendarMonthIcon sx={{ fontSize: 32, mr: 2, color: '#667eea' }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          הכנסות והוצאות חודשיות
        </Typography>
      </Box>
      <Box sx={{ height: '400px', position: 'relative' }}>
        <Bar data={chartData} options={chartOptions} />
      </Box>
    </Paper>
  );
};

export default MonthlyBarChart;
