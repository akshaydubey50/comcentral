import {
  Box, Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';

import type { Insights, PayStatistics } from '@/shared/contracts';
import { formatCurrency } from '@/lib/formatters';

function Stat({ label, value }: { label: string; value: string }) {
  return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={750} sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>{value}</Typography></Box>;
}

function MoneyStats({ stats, currency }: { stats: PayStatistics; currency: Insights['summaries'][number]['currency'] }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.75, mt: 2 }}>
      <Stat label="Total" value={formatCurrency(stats.total, currency)} />
      <Stat label="Average" value={formatCurrency(stats.average, currency)} />
      <Stat label="Median" value={formatCurrency(stats.median, currency)} />
      <Stat label="Range" value={formatCurrency(stats.min, currency) + ' – ' + formatCurrency(stats.max, currency)} />
      <Stat label="25th percentile" value={formatCurrency(stats.p25, currency)} />
      <Stat label="75th percentile" value={formatCurrency(stats.p75, currency)} />
    </Box>
  );
}

export function SummarySection({ insights }: { insights: Insights }) {
  return (
    <Box component="section" aria-labelledby="summary-title">
      <Typography id="summary-title" component="h2" variant="h2" sx={{ mb: 1.5 }}>Current annual commitments</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        <Card sx={{ bgcolor: '#083f3d', color: 'white' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#bfd6d3' }}>Matching headcount</Typography>
            <Typography sx={{ fontSize: '2.35rem', fontWeight: 800, mt: 0.5 }}>{insights.headcount.toLocaleString()}</Typography>
            <Typography variant="body2" sx={{ color: '#bfd6d3', mt: 1 }}>All report sections use this same filtered population.</Typography>
          </CardContent>
        </Card>
        {insights.summaries.map((summary) => (
          <Card key={summary.currency}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography component="h3" variant="h3">{summary.currency} salaries</Typography>
                <Chip size="small" label={summary.count.toLocaleString() + ' people'} />
              </Box>
              <MoneyStats stats={summary} currency={summary.currency} />
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}

export function GroupSection({ insights }: { insights: Insights }) {
  const label = insights.groupBy === 'jobRole' ? 'Job role' : insights.groupBy === 'department' ? 'Department' : 'Country';
  return (
    <Box component="section" aria-labelledby="group-title">
      <Typography id="group-title" component="h2" variant="h2" sx={{ mb: 1.5 }}>By {label.toLowerCase()}</Typography>
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer className="data-table-wrap">
          <Table aria-label={'Salary statistics by ' + label.toLowerCase()} sx={{ minWidth: 900 }}>
            <TableHead><TableRow><TableCell>{label}</TableCell><TableCell>Currency</TableCell><TableCell align="right">People</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Average</TableCell><TableCell align="right">Median</TableCell><TableCell align="right">P25</TableCell><TableCell align="right">P75</TableCell></TableRow></TableHead>
            <TableBody>
              {insights.groups.map((group) => (
                <TableRow key={group.label + '-' + group.currency}>
                  <TableCell sx={{ fontWeight: 700 }}>{group.label}</TableCell>
                  <TableCell>{group.currency}</TableCell>
                  <TableCell align="right">{group.count.toLocaleString()}</TableCell>
                  <TableCell align="right">{formatCurrency(group.total, group.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(group.average, group.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(group.median, group.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(group.p25, group.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(group.p75, group.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Card>
    </Box>
  );
}
