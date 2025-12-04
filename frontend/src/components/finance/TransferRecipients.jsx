import React from 'react';
import {
  Paper,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  LinearProgress
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { formatCurrency } from '../../utils/finance/chartHelpers';

const TransferRecipients = ({ recipients }) => {
  if (!recipients || recipients.length === 0) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">אין נתוני העברות להצגה</Typography>
      </Paper>
    );
  }

  const totalTransferred = recipients.reduce((sum, r) => sum + r.totalAmount, 0);
  const maxAmount = Math.max(...recipients.map(r => r.totalAmount));

  return (
    <Paper sx={{ p: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <SendIcon sx={{ fontSize: 32, mr: 2, color: '#9966FF' }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          נמעני העברות
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          label={`סה"כ: ${formatCurrency(totalTransferred)}`}
          color="secondary"
          sx={{ fontWeight: 600 }}
        />
      </Box>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>נמען</TableCell>
              <TableCell align="center">מספר העברות</TableCell>
              <TableCell align="left">סכום כולל</TableCell>
              <TableCell sx={{ width: '30%' }}>חלק יחסי</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recipients.slice(0, 15).map((recipient, index) => {
              const percentage = (recipient.totalAmount / totalTransferred * 100).toFixed(1);
              const barWidth = (recipient.totalAmount / maxAmount * 100);

              return (
                <TableRow key={index} hover>
                  <TableCell>
                    <Chip
                      size="small"
                      label={index + 1}
                      sx={{
                        bgcolor: index < 3 ? 'secondary.light' : 'grey.200',
                        fontWeight: 600,
                        minWidth: 28
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {recipient.recipient}
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      label={recipient.transferCount}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="left" sx={{ fontWeight: 600, color: 'error.main' }}>
                    {formatCurrency(recipient.totalAmount)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={barWidth}
                        sx={{
                          flexGrow: 1,
                          height: 8,
                          borderRadius: 4,
                          bgcolor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#9966FF'
                          }
                        }}
                      />
                      <Typography variant="body2" sx={{ minWidth: 45 }}>
                        {percentage}%
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {recipients.length > 15 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
          מציג 15 מתוך {recipients.length} נמענים
        </Typography>
      )}
    </Paper>
  );
};

export default TransferRecipients;
