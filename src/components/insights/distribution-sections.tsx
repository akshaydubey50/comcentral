import {
  Box, Card, CardContent, LinearProgress, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';

import type { Insights } from '@/shared/contracts';
import { formatCurrency, formatDate } from '@/lib/formatters';

export function DistributionSection({ insights }: { insights: Insights }) {
  const currencies = [...new Set(insights.bands.map((band) => band.currency))];
  const max = Math.max(1, ...insights.bands.map((band) => band.count));

  return (
    <Box component="section" aria-labelledby="distribution-title">
      <Box sx={{ mb: 1.5 }}>
        <Typography id="distribution-title" component="h2" variant="h2">Salary distribution</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Descriptive ranges for current annual base pay. These ranges are not pay grades.</Typography>
      </Box>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: currencies.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr' }, gap: 2 }}>
        {currencies.map((currency) => (
          <Card key={currency}>
            <CardContent sx={{ p: 2.5 }}>
              <Typography component="h3" variant="h3" sx={{ mb: 2 }}>{currency} ranges</Typography>
              <Stack spacing={1.5}>
                {insights.bands.filter((band) => band.currency === currency).map((band) => (
                  <Box key={band.currency + '-' + band.lower}>
                    <Stack direction="row" justifyContent="space-between" gap={2} sx={{ mb: 0.5 }}>
                      <Typography variant="body2">{band.label}</Typography>
                      <Typography variant="body2" fontWeight={750}>{band.count.toLocaleString()}</Typography>
                    </Stack>
                    <LinearProgress
                      aria-label={band.label + ': ' + band.count + ' employees'}
                      variant="determinate"
                      value={(band.count / max) * 100}
                      sx={{ height: 8, borderRadius: 1, bgcolor: '#e7ebe8' }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Box>
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
