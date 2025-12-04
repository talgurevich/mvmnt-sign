import React, { useState, useMemo } from 'react';
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
  TablePagination,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { formatCurrency } from '../../utils/finance/chartHelpers';

const TransactionsTable = ({ transactions }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Get unique transaction types for filter
  const transactionTypes = useMemo(() => {
    const types = new Set(transactions.map(tx => tx.type).filter(Boolean));
    return Array.from(types).sort();
  }, [transactions]);

  // Filter and sort transactions
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(tx =>
        (tx.type || '').toLowerCase().includes(query) ||
        (tx.details || '').toLowerCase().includes(query) ||
        (tx.recipient || '').toLowerCase().includes(query)
      );
    }

    // Type filter
    if (filterType === 'income') {
      result = result.filter(tx => tx.credit > 0);
    } else if (filterType === 'expense') {
      result = result.filter(tx => tx.debit > 0);
    } else if (filterType !== 'all') {
      result = result.filter(tx => tx.type === filterType);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'date':
          comparison = new Date(a.transaction_date || a.date) - new Date(b.transaction_date || b.date);
          break;
        case 'amount':
          comparison = (a.debit + a.credit) - (b.debit + b.credit);
          break;
        case 'type':
          comparison = (a.type || '').localeCompare(b.type || '');
          break;
        default:
          comparison = 0;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [transactions, searchQuery, filterType, sortField, sortDirection]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('all');
  };

  const paginatedTransactions = filteredTransactions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Paper sx={{ p: 3 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <FilterListIcon sx={{ fontSize: 28, mr: 2, color: '#667eea' }} />
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          רשימת תנועות
        </Typography>
        <Chip
          label={`${filteredTransactions.length} תנועות`}
          size="small"
          sx={{ ml: 2 }}
          variant="outlined"
        />
      </Box>

      {/* Filters */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        <TextField
          size="small"
          placeholder="חיפוש..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            )
          }}
          sx={{ minWidth: 250 }}
        />

        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>סוג תנועה</InputLabel>
          <Select
            value={filterType}
            label="סוג תנועה"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">הכל</MenuItem>
            <MenuItem value="income">הכנסות בלבד</MenuItem>
            <MenuItem value="expense">הוצאות בלבד</MenuItem>
            {transactionTypes.map(type => (
              <MenuItem key={type} value={type}>{type}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {(searchQuery || filterType !== 'all') && (
          <Tooltip title="נקה מסננים">
            <IconButton onClick={clearFilters} size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Table */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={() => handleSort('date')}
              >
                תאריך {sortField === 'date' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell
                sx={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={() => handleSort('type')}
              >
                סוג {sortField === 'type' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>פרטים</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>נמען</TableCell>
              <TableCell
                align="left"
                sx={{ cursor: 'pointer', fontWeight: 600 }}
                onClick={() => handleSort('amount')}
              >
                הוצאה {sortField === 'amount' && (sortDirection === 'asc' ? '↑' : '↓')}
              </TableCell>
              <TableCell align="left" sx={{ fontWeight: 600 }}>הכנסה</TableCell>
              <TableCell align="left" sx={{ fontWeight: 600 }}>יתרה</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedTransactions.map((tx, index) => {
              const dateStr = tx.transaction_date || tx.dateString || '';
              const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString('he-IL') : '-';

              return (
                <TableRow key={index} hover>
                  <TableCell>{formattedDate}</TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      label={tx.type || '-'}
                      variant="outlined"
                      sx={{ maxWidth: 150 }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {tx.details || '-'}
                  </TableCell>
                  <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {tx.recipient || '-'}
                  </TableCell>
                  <TableCell align="left" sx={{ color: tx.debit > 0 ? 'error.main' : 'text.secondary', fontWeight: tx.debit > 0 ? 600 : 400 }}>
                    {tx.debit > 0 ? formatCurrency(tx.debit) : '-'}
                  </TableCell>
                  <TableCell align="left" sx={{ color: tx.credit > 0 ? 'success.main' : 'text.secondary', fontWeight: tx.credit > 0 ? 600 : 400 }}>
                    {tx.credit > 0 ? formatCurrency(tx.credit) : '-'}
                  </TableCell>
                  <TableCell align="left" sx={{ fontWeight: 500 }}>
                    {formatCurrency(tx.balance)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={filteredTransactions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
        labelRowsPerPage="שורות בעמוד:"
        labelDisplayedRows={({ from, to, count }) => `${from}-${to} מתוך ${count}`}
      />
    </Paper>
  );
};

export default TransactionsTable;
