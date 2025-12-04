import React from 'react';
import { Paper, Box, Typography, Grid, Alert } from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StarIcon from '@mui/icons-material/Star';
import CalculateIcon from '@mui/icons-material/Calculate';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CategoryIcon from '@mui/icons-material/Category';
import WarningIcon from '@mui/icons-material/Warning';
import SavingsIcon from '@mui/icons-material/Savings';
import TimelineIcon from '@mui/icons-material/Timeline';
import InfoIcon from '@mui/icons-material/Info';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

const iconMap = {
  TrendingUp: TrendingUpIcon,
  TrendingDown: TrendingDownIcon,
  Star: StarIcon,
  Calculate: CalculateIcon,
  AccountBalance: AccountBalanceIcon,
  Category: CategoryIcon,
  Warning: WarningIcon,
  Savings: SavingsIcon,
  Timeline: TimelineIcon,
  Info: InfoIcon
};

const severityMap = {
  success: 'success',
  warning: 'warning',
  error: 'error',
  info: 'info',
  alert: 'warning'
};

const InsightsPanel = ({ insights }) => {
  if (!insights || insights.length === 0) {
    return null;
  }

  return (
    <Paper sx={{ p: 3, mb: 4 }}>
      <Box display="flex" alignItems="center" mb={3}>
        <LightbulbIcon sx={{ fontSize: 28, mr: 2, color: '#FFCE56' }} />
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          תובנות פיננסיות
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {insights.map((insight, index) => {
          const IconComponent = iconMap[insight.icon] || InfoIcon;
          const severity = severityMap[insight.type] || 'info';

          return (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Alert
                severity={severity}
                icon={<IconComponent />}
                sx={{
                  height: '100%',
                  '& .MuiAlert-message': {
                    width: '100%'
                  }
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {insight.title}
                </Typography>
                <Typography variant="body2">
                  {insight.text}
                </Typography>
              </Alert>
            </Grid>
          );
        })}
      </Grid>
    </Paper>
  );
};

export default InsightsPanel;
