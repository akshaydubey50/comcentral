import Link from 'next/link';
import {
  Alert, Box, Card, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';

import type { Insights } from '@/shared/contracts';
import { formatCurrency, formatEmploymentType } from '@/lib/formatters';
import { EmptyState } from '@/components/feedback';

export function OutlierSection({ insights }: { insights: Insights }) {
  const evaluated = insights.outliers.cohorts.filter((cohort) => cohort.state === 'EVALUATED').length;
  const insufficient = insights.outliers.cohorts.filter((cohort) => cohort.state === 'INSUFFICIENT_DATA').length;
  const zeroSpread = insights.outliers.cohorts.filter((cohort) => cohort.state === 'ZERO_IQR').length;

  return (
    <Box component="section" aria-labelledby="outlier-title">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} sx={{ mb: 1.5 }}>
        <Box>
          <Typography id="outlier-title" component="h2" variant="h2">Native salary outlier review</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Review aid using strict 1.5 × IQR fences within country, native currency, job role, and employment type cohorts.
          </Typography>
        </Box>
        <Chip label={insights.outliers.total.toLocaleString() + ' review flags'} color={insights.outliers.total ? 'warning' : 'default'} />
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>
        Cohorts need at least {insights.outliers.minimumGroupSize} employees. Fence equality is not flagged, and zero-spread cohorts are withheld. A flag is not a pay-equity conclusion or an automatic salary decision.
      </Alert>
      <Stack direction="row" gap={1} flexWrap="wrap" sx={{ mb: 1.5 }}>
        <Chip size="small" label={evaluated + ' cohorts evaluated'} />
        <Chip size="small" label={insufficient + ' below minimum size'} variant="outlined" />
        <Chip size="small" label={zeroSpread + ' with zero spread'} variant="outlined" />
      </Stack>
      <Card sx={{ overflow: 'hidden' }}>
        {!insights.outliers.data.length ? (
          <EmptyState title="No salaries need outlier review" description="No employee falls strictly outside the IQR fences in an eligible cohort for these filters." />
        ) : (
          <TableContainer className="data-table-wrap">
            <Table aria-label="Native salary outlier review" sx={{ minWidth: 1050 }}>
              <TableHead>
                <TableRow><TableCell>Employee</TableCell><TableCell>Cohort</TableCell><TableCell align="right">Salary</TableCell><TableCell align="right">Lower fence</TableCell><TableCell align="right">Upper fence</TableCell><TableCell>Direction</TableCell></TableRow>
              </TableHead>
              <TableBody>
                {insights.outliers.data.map((outlier) => (
                  <TableRow key={outlier.employeeId}>
                    <TableCell>
                      <Typography component={Link} href={'/employees/' + outlier.employeeId} color="primary.main" fontWeight={750} sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{outlier.name}</Typography>
                      <Typography variant="caption" display="block" color="text.secondary">{outlier.employeeCode}</Typography>
                    </TableCell>
                    <TableCell>
                      {outlier.country} · {outlier.jobRole}
                      <Typography variant="caption" display="block" color="text.secondary">{formatEmploymentType(outlier.employmentType)} · {outlier.groupSize} people</Typography>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 750 }}>{formatCurrency(outlier.salary, outlier.currency)}</TableCell>
                    <TableCell align="right">{formatCurrency(outlier.lowerFence, outlier.currency)}</TableCell>
                    <TableCell align="right">{formatCurrency(outlier.upperFence, outlier.currency)}</TableCell>
                    <TableCell><Chip size="small" color="warning" variant="outlined" label={outlier.direction === 'HIGH' ? 'Above fence' : 'Below fence'} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
      {insights.outliers.total > insights.outliers.data.length && (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Showing the first {insights.outliers.data.length} of {insights.outliers.total.toLocaleString()} flags.
        </Typography>
      )}
    </Box>
  );
}
