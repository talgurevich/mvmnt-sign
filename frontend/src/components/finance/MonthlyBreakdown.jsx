import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { formatCurrency } from '../../utils/finance/chartHelpers';
import { getTopExpenses } from '../../utils/finance/dataAggregation';

const MonthlyBreakdown = ({ monthlyData }) => {
  if (!monthlyData || monthlyData.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">אין נתונים חודשיים להצגה</Typography>
      </Paper>
    );
  }

  // Reverse to show newest first
  const sortedMonths = [...monthlyData].reverse();

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        פירוט חודשי
      </Typography>

      {sortedMonths.map((month) => {
        const net = month.income - month.expenses;
        const topExpenses = getTopExpenses(month.transactions, 5);
        const categories = Object.entries(month.byCategory);

        return (
          <Accordion key={month.monthKey} defaultExpanded={sortedMonths.indexOf(month) === 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, minWidth: 120 }}>
                  {month.label}
                </Typography>
                <Chip
                  size="small"
                  label={`${month.transactionCount} תנועות`}
                  variant="outlined"
                />
                <Box sx={{ flexGrow: 1 }} />
                <Chip
                  size="small"
                  label={`הכנסות: ${formatCurrency(month.income)}`}
                  sx={{ bgcolor: 'success.light', color: 'success.dark' }}
                />
                <Chip
                  size="small"
                  label={`הוצאות: ${formatCurrency(month.expenses)}`}
                  sx={{ bgcolor: 'error.light', color: 'error.dark' }}
                />
                <Chip
                  size="small"
                  label={`נטו: ${formatCurrency(net)}`}
                  sx={{
                    bgcolor: net >= 0 ? 'info.light' : 'warning.light',
                    color: net >= 0 ? 'info.dark' : 'warning.dark'
                  }}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                {/* Top 5 Expenses */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    5 ההוצאות הגדולות
                  </Typography>
                  {topExpenses.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>#</TableCell>
                          <TableCell>סוג</TableCell>
                          <TableCell>פרטים</TableCell>
                          <TableCell align="left">סכום</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topExpenses.map((tx, idx) => (
                          <TableRow key={idx}>
                            <TableCell>
                              <Chip
                                size="small"
                                label={idx + 1}
                                sx={{
                                  bgcolor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : 'grey.300',
                                  fontWeight: 600,
                                  minWidth: 28
                                }}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 500 }}>{tx.type}</TableCell>
                            <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {tx.details}
                            </TableCell>
                            <TableCell align="left" sx={{ color: 'error.main', fontWeight: 600 }}>
                              {formatCurrency(tx.debit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography color="text.secondary">אין הוצאות בחודש זה</Typography>
                  )}
                </Grid>

                {/* Category Breakdown */}
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    פילוח לפי קטגוריה
                  </Typography>
                  {categories.length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>קטגוריה</TableCell>
                          <TableCell align="center">תנועות</TableCell>
                          <TableCell align="left">הוצאות</TableCell>
                          <TableCell align="left">הכנסות</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {categories
                          .sort((a, b) => (b[1].expenses + b[1].income) - (a[1].expenses + a[1].income))
                          .map(([category, data]) => (
                            <TableRow key={category}>
                              <TableCell sx={{ fontWeight: 500 }}>{category}</TableCell>
                              <TableCell align="center">{data.count}</TableCell>
                              <TableCell align="left" sx={{ color: data.expenses > 0 ? 'error.main' : 'text.secondary' }}>
                                {data.expenses > 0 ? formatCurrency(data.expenses) : '-'}
                              </TableCell>
                              <TableCell align="left" sx={{ color: data.income > 0 ? 'success.main' : 'text.secondary' }}>
                                {data.income > 0 ? formatCurrency(data.income) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography color="text.secondary">אין קטגוריות להצגה</Typography>
                  )}
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export default MonthlyBreakdown;
