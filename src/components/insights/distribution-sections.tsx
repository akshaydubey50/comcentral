import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';

import type { Insights } from '@/shared/contracts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { HorizontalBarChart, type HorizontalBarItem } from './horizontal-bar-chart';

export function DistributionSection({ insights }: { insights: Insights }) {
  const approximateUsd = insights.currencyMode === 'USD';
  const hasUsableFx = insights.reportingAvailable && Boolean(insights.fx.rateDate)
    && (insights.fx.state === 'FRESH' || insights.fx.state === 'CACHED');
  const currencies = [...new Set(insights.bands.map((band) => band.currency))];

  return (
    <Box component="section" aria-labelledby="distribution-title">
      <Box sx={{ mb: 1.5 }}>
        <Typography id="distribution-title" component="h2" variant="h2">Salary distribution</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Descriptive ranges for current annual base pay. These ranges are not pay grades. Native currencies use separate charts.</Typography>
      </Box>
      {approximateUsd && !hasUsableFx ? (
        <Card><CardContent><Typography role="status">Approximate USD distribution is unavailable because a complete current rate snapshot is required.</Typography></CardContent></Card>
      ) : insights.bands.length === 0 ? (
        <Card><CardContent><Typography role="status">No salary bands are available for this filtered population.</Typography></CardContent></Card>
      ) : (
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: currencies.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }, gap: 2 }}>
          {currencies.map((currency) => {
            const bands = insights.bands.filter((band) => band.currency === currency);
            const chartItems = bands.map<HorizontalBarItem>((band) => ({
              key: band.currency + '-' + band.lower,
              label: band.label,
              visualValue: band.count,
              displayValue: band.count.toLocaleString(),
            }));
            const chartLabel = `${currency} salary distribution chart. ${bands.map((band) => `${band.label}: ${band.count.toLocaleString()} ${band.count === 1 ? 'person' : 'people'}`).join('; ')}.`;
            const tableLabel = approximateUsd ? 'Approximate USD salary bands' : currency + ' salary bands';

            return (
              <Card key={currency} sx={{ minWidth: 0 }}>
                <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                  <Typography component="h3" variant="h3">{approximateUsd ? 'Approximate USD ranges' : currency + ' ranges'}</Typography>
                  {approximateUsd && insights.fx.rateDate && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>Rate date: {formatDate(insights.fx.rateDate)}</Typography>}
                  <Box sx={{ mt: 2.5 }}><HorizontalBarChart ariaLabel={chartLabel} items={chartItems} /></Box>
                  <TableContainer className="data-table-wrap" sx={{ mt: 2.5 }}>
                    <Table size="small" aria-label={tableLabel} sx={{ minWidth: 540 }}>
                      <TableHead><TableRow><TableCell>Range</TableCell><TableCell align="right">Lower bound</TableCell><TableCell align="right">Upper bound</TableCell><TableCell align="right">People</TableCell></TableRow></TableHead>
                      <TableBody>
                        {bands.map((band) => (
                          <TableRow key={band.currency + '-' + band.lower}>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{band.label}</TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{formatCurrency(band.lower, band.currency)}</TableCell>
                            <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{band.upper === null ? 'No upper limit' : formatCurrency(band.upper, band.currency)}</TableCell>
                            <TableCell align="right">{band.count.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export function TenureSection({ insights }: { insights: Insights }) {
  return (
    <Box component="section" aria-labelledby="tenure-title">
      <Box sx={{ mb: 1.5 }}>
        <Typography id="tenure-title" component="h2" variant="h2">Pay by tenure</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Completed calendar years at {formatDate(insights.asOf)} UTC. Buckets: under 1 year, 1–under 3, 3–under 5, 5–under 10, and 10+ years.
        </Typography>
      </Box>
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer className="data-table-wrap">
          <Table aria-label="Pay by tenure bucket" sx={{ minWidth: 720 }}>
            <TableHead><TableRow><TableCell>Tenure</TableCell><TableCell>Currency</TableCell><TableCell align="right">People</TableCell><TableCell align="right">Average</TableCell><TableCell align="right">Median</TableCell></TableRow></TableHead>
            <TableBody>
              {insights.tenure.map((bucket) => (
                <TableRow key={bucket.bucket + '-' + bucket.currency}>
                  <TableCell sx={{ fontWeight: 700 }}>{bucket.bucket}</TableCell>
                  <TableCell>{bucket.currency}</TableCell>
                  <TableCell align="right">{bucket.count.toLocaleString()}</TableCell>
                  <TableCell align="right">{formatCurrency(bucket.average, bucket.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(bucket.median, bucket.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
