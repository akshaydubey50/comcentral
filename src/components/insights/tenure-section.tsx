import {
  Box, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';

import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Insights } from '@/shared/contracts';
import {
  decimalStringToVisualValue, HorizontalBarChart, type HorizontalBarItem,
} from './horizontal-bar-chart';

export function TenureSection({ insights }: { insights: Insights }) {
  const approximateUsd = insights.currencyMode === 'USD';
  const hasUsableFx = insights.reportingAvailable && Boolean(insights.fx.rateDate)
    && (insights.fx.state === 'FRESH' || insights.fx.state === 'CACHED');
  const currencies = [...new Set(insights.tenure.map((bucket) => bucket.currency))];

  return (
    <Box component="section" aria-labelledby="tenure-title">
      <Box sx={{ mb: 1.5 }}>
        <Typography id="tenure-title" component="h2" variant="h2">Pay by tenure</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Completed calendar years at {formatDate(insights.asOf)} UTC. Buckets: under 1 year, 1–under 3, 3–under 5, 5–under 10, and 10+ years.
        </Typography>
      </Box>
      {approximateUsd && !hasUsableFx ? (
        <Card><CardContent><Typography role="status">Approximate USD tenure reporting is unavailable because a complete current rate snapshot is required.</Typography></CardContent></Card>
      ) : insights.tenure.length === 0 ? (
        <Card><CardContent><Typography role="status">No tenure data is available for this filtered population.</Typography></CardContent></Card>
      ) : (
        <>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', xl: currencies.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }, gap: 2 }}>
            {currencies.map((currency) => {
              const buckets = insights.tenure.filter((bucket) => bucket.currency === currency);
              const headcountItems = buckets.map<HorizontalBarItem>((bucket) => ({
                key: bucket.bucket,
                label: bucket.bucket,
                visualValue: bucket.count,
                displayValue: bucket.count.toLocaleString(),
              }));
              const medianItems = buckets.map<HorizontalBarItem>((bucket) => ({
                key: bucket.bucket,
                label: bucket.bucket,
                visualValue: decimalStringToVisualValue(bucket.median),
                displayValue: formatCurrency(bucket.median, bucket.currency),
              }));
              const headcountLabel = `${currency} headcount by tenure chart. ${headcountItems.map((item) => `${item.label}: ${item.displayValue} ${item.visualValue === 1 ? 'person' : 'people'}`).join('; ')}.`;
              const medianLabel = `${currency} median annual pay by tenure chart. ${medianItems.map((item) => `${item.label}: ${item.displayValue}`).join('; ')}.`;

              return (
                <Card key={currency} sx={{ minWidth: 0 }}>
                  <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                    <Typography component="h3" variant="h3">{approximateUsd ? 'Approximate USD tenure' : currency + ' tenure'}</Typography>
                    {approximateUsd && insights.fx.rateDate && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>Rate date: {formatDate(insights.fx.rateDate)}</Typography>}
                    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, minmax(0, 1fr))' }, gap: 3, mt: 2.5 }}>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component="h4" variant="subtitle2" sx={{ mb: 1.5 }}>Headcount</Typography>
                        <HorizontalBarChart ariaLabel={headcountLabel} items={headcountItems} />
                      </Box>
                      <Box sx={{ minWidth: 0 }}>
                        <Typography component="h4" variant="subtitle2" sx={{ mb: 1.5 }}>Median annual pay</Typography>
                        <HorizontalBarChart ariaLabel={medianLabel} items={medianItems} />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
          <Card sx={{ overflow: 'hidden', mt: 2 }}>
            <TableContainer className="data-table-wrap">
              <Table aria-label={approximateUsd ? 'Approximate USD pay by tenure bucket' : 'Pay by tenure bucket'} sx={{ minWidth: 720 }}>
                <TableHead><TableRow><TableCell>Tenure</TableCell><TableCell>Currency</TableCell><TableCell align="right">People</TableCell><TableCell align="right">Average</TableCell><TableCell align="right">Median</TableCell></TableRow></TableHead>
                <TableBody>
                  {insights.tenure.map((bucket) => (
                    <TableRow key={bucket.bucket + '-' + bucket.currency}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{bucket.bucket}</TableCell>
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
        </>
      )}
    </Box>
  );
}
