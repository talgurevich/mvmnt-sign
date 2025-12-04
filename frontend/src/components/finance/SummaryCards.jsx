import React from 'react';
import { Grid, Card, CardContent, Box, Typography } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { formatCurrency } from '../../utils/finance/chartHelpers';

const SummaryCards = ({ summary }) => {
  const cards = [
    {
      label: 'סה"כ הכנסות',
      value: summary.totalIncome,
      icon: TrendingUpIcon,
      gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
      color: 'white'
    },
    {
      label: 'סה"כ הוצאות',
      value: summary.totalExpenses,
      icon: TrendingDownIcon,
      gradient: 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)',
      color: 'white'
    },
    {
      label: 'מאזן נטו',
      value: summary.netBalance,
      icon: AccountBalanceIcon,
      gradient: summary.netBalance >= 0
        ? 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
        : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white'
    },
    {
      label: 'יתרה סופית',
      value: summary.finalBalance,
      icon: AccountBalanceWalletIcon,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                background: card.gradient,
                color: card.color
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box display="flex" alignItems="center" mb={1}>
                  <Icon sx={{ fontSize: 32, mr: 1.5, opacity: 0.9 }} />
                  <Typography variant="body1" sx={{ opacity: 0.95 }}>
                    {card.label}
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {formatCurrency(card.value)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
};

export default SummaryCards;
