import React, { useMemo } from 'react';
import { Paper, Box, Typography, FormControl, Select, MenuItem, InputLabel } from '@mui/material';
import { Pie } from 'react-chartjs-2';
import DonutLargeIcon from '@mui/icons-material/DonutLarge';
import { formatPieChartData, getPieChartOptions, formatCurrency } from '../../utils/finance/chartHelpers';

const IncomePieChart = ({ data, monthlyData, selectedMonth, onMonthChange }) => {
  // Calculate filtered data based on selected month
  const filteredData = useMemo(() => {
    if (!selectedMonth || selectedMonth === 'all') {
      return data;
    }

    // Find the selected month's data
    const monthData = monthlyData?.find(m => m.monthKey === selectedMonth);
    if (!monthData || !monthData.byCategory) {
      return [];
    }

    // Convert byCategory object to array format matching aggregateByCategory output
    const categories = Object.entries(monthData.byCategory)
      .filter(([_, values]) => values.income > 0)
      .map(([category, values]) => ({
        category,
        total: values.income,
        count: values.count
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate percentages
    const total = categories.reduce((sum, c) => sum + c.total, 0);
    categories.forEach(c => {
      c.percentage = total > 0 ? ((c.total / total) * 100).toFixed(1) : '0';
    });

    return categories;
  }, [data, monthlyData, selectedMonth]);

  if (!filteredData || filteredData.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center', height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center">
            <DonutLargeIcon sx={{ fontSize: 28, mr: 2, color: '#00ff88' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              התפלגות הכנסות
            </Typography>
          </Box>
          {monthlyData && monthlyData.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>חודש</InputLabel>
              <Select
                value={selectedMonth || 'all'}
                label="חודש"
                onChange={(e) => onMonthChange(e.target.value)}
              >
                <MenuItem value="all">כל התקופה</MenuItem>
                {monthlyData.map(m => (
                  <MenuItem key={m.monthKey} value={m.monthKey}>{m.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>
        <Typography color="text.secondary">אין נתוני הכנסות להצגה</Typography>
      </Paper>
    );
  }

  const chartData = formatPieChartData(filteredData, 'income');
  const chartOptions = getPieChartOptions();

  const totalIncome = filteredData.reduce((sum, c) => sum + c.total, 0);

  return (
    <Paper sx={{ p: 4, height: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center">
          <DonutLargeIcon sx={{ fontSize: 28, mr: 2, color: '#00ff88' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            התפלגות הכנסות
          </Typography>
        </Box>
        {monthlyData && monthlyData.length > 0 && (
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>חודש</InputLabel>
            <Select
              value={selectedMonth || 'all'}
              label="חודש"
              onChange={(e) => onMonthChange(e.target.value)}
            >
              <MenuItem value="all">כל התקופה</MenuItem>
              {monthlyData.map(m => (
                <MenuItem key={m.monthKey} value={m.monthKey}>{m.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        סה"כ: {formatCurrency(totalIncome)}
      </Typography>
      <Box sx={{ height: '300px', position: 'relative' }}>
        <Pie data={chartData} options={chartOptions} />
      </Box>
    </Paper>
  );
};

export default IncomePieChart;
