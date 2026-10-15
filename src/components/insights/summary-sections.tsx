import {
  Alert, Box, Card, CardContent, Chip, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Typography,
} from '@mui/material';

import type { Insights, PayStatistics } from '@/shared/contracts';
import { formatCurrency, formatDate } from '@/lib/formatters';
import {
  decimalStringToVisualValue, HorizontalBarChart, type HorizontalBarItem,
} from './horizontal-bar-chart';

function Stat({ label, value }: { label: string; value: string }) {
  return <Box sx={{ minWidth: 0 }}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography fontWeight={750} sx={{ mt: 0.25, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{value}</Typography></Box>;
}

function MoneyStats({ stats, currency }: { stats: PayStatistics; currency: Insights['summaries'][number]['currency'] }) {
  const chartValues: Array<[string, string | null]> = [
    ['Minimum', stats.min],
    ['25th percentile', stats.p25],
    ['Median', stats.median],
    ['Average', stats.average],
    ['75th percentile', stats.p75],
    ['Maximum', stats.max],
  ];
  const chartItems = chartValues.map<HorizontalBarItem>(([label, value]) => ({
    key: label,
    label,
    visualValue: decimalStringToVisualValue(value),
    displayValue: formatCurrency(value, currency),
  }));
  const chartLabel = `${currency} pay statistics chart. ${chartItems.map((item) => `${item.label}: ${item.displayValue}`).join('; ')}.`;

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 1.75, mt: 2 }}>
        <Stat label="Total" value={formatCurrency(stats.total, currency)} />
        <Stat label="Average" value={formatCurrency(stats.average, currency)} />
        <Stat label="Median" value={formatCurrency(stats.median, currency)} />
        <Stat label="Range" value={formatCurrency(stats.min, currency) + ' – ' + formatCurrency(stats.max, currency)} />
        <Stat label="25th percentile" value={formatCurrency(stats.p25, currency)} />
        <Stat label="75th percentile" value={formatCurrency(stats.p75, currency)} />
      </Box>
      <Box sx={{ mt: 2.5 }}>
        <HorizontalBarChart ariaLabel={chartLabel} items={chartItems} />
      </Box>
    </>
  );
}

export function SummarySection({ insights }: { insights: Insights }) {
  const approximateUsd = insights.currencyMode === 'USD';
  const hasUsableFx = insights.reportingAvailable && Boolean(insights.fx.rateDate)
    && (insights.fx.state === 'FRESH' || insights.fx.state === 'CACHED');
  const approximateUsdUnavailable = approximateUsd && !hasUsableFx;

  return (
    <Box component="section" aria-labelledby="summary-title">
      <Typography id="summary-title" component="h2" variant="h2" sx={{ mb: 1.5 }}>Current annual commitments</Typography>
      {insights.salaryPendingCount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={700}>
            {insights.salaryPendingCount.toLocaleString()}{' '}
            {insights.salaryPendingCount === 1 ? 'employee has' : 'employees have'} salary pending.
          </Typography>
          These employees are included in matching headcount but excluded from pay statistics,
          group counts, salary bands, tenure summaries and outlier checks until a salary is added.
        </Alert>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        <Card sx={{ bgcolor: '#083f3d', color: 'white' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ color: '#bfd6d3' }}>Matching headcount</Typography>
            <Typography sx={{ fontSize: '2.35rem', fontWeight: 800, mt: 0.5 }}>{insights.headcount.toLocaleString()}</Typography>
            <Typography variant="body2" sx={{ color: '#bfd6d3', mt: 1 }}>All matching employees, including those with salary pending.</Typography>
          </CardContent>
        </Card>
        {approximateUsdUnavailable && (
          <Card><CardContent sx={{ p: 2.5 }}><Typography role="status">Approximate USD pay statistics are unavailable because a complete current rate snapshot is required.</Typography></CardContent></Card>
        )}
        {insights.headcount > 0 && insights.salaryPendingCount === insights.headcount && (
          <Card><CardContent sx={{ p: 2.5 }}><Typography role="status">No recorded salaries match these filters. Add salaries from employee details to populate pay statistics.</Typography></CardContent></Card>
        )}
        {!approximateUsdUnavailable && insights.summaries.map((summary) => (
          <Card key={summary.currency}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography component="h3" variant="h3">{approximateUsd ? 'Approximate USD salaries' : summary.currency + ' salaries'}</Typography>
                <Chip size="small" label={summary.count.toLocaleString() + (summary.count === 1 ? ' person' : ' people')} />
              </Box>
              {approximateUsd && insights.fx.rateDate && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>Rate date: {formatDate(insights.fx.rateDate)}</Typography>}
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
  const pluralLabel = insights.groupBy === 'jobRole' ? 'job roles' : insights.groupBy === 'department' ? 'departments' : 'countries';
  const headcounts = Array.from(insights.groups.reduce((counts, group) => {
    counts.set(group.label, (counts.get(group.label) ?? 0) + group.count);
    return counts;
  }, new Map<string, number>())).map<HorizontalBarItem>(([groupLabel, count]) => ({
    key: groupLabel,
    label: groupLabel,
    visualValue: count,
    displayValue: count.toLocaleString(),
  }));
  const representedHeadcount = headcounts.reduce((total, item) => total + item.visualValue, 0);
  const chartLabel = `Headcount by ${label.toLowerCase()} chart. ${headcounts.map((item) => `${item.label}: ${item.displayValue} ${item.visualValue === 1 ? 'person' : 'people'}`).join('; ')}.`;

  return (
    <Box component="section" aria-labelledby="group-title">
      <Typography id="group-title" component="h2" variant="h2" sx={{ mb: 1.5 }}>By {label.toLowerCase()}</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography component="h3" variant="h3">Headcount with recorded salary</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            Employees with salary pending are excluded from these group counts and pay statistics.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, mb: 2.5 }}>
            {representedHeadcount.toLocaleString()} matching {representedHeadcount === 1 ? 'person' : 'people'} across {headcounts.length.toLocaleString()} {headcounts.length === 1 ? label.toLowerCase() : pluralLabel}. Currency rows are combined in these counts.
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.5fr) minmax(16rem, 0.7fr)' }, gap: 3, alignItems: 'start' }}>
            <HorizontalBarChart ariaLabel={chartLabel} items={headcounts} />
            <TableContainer>
              <Table size="small" aria-label={'Headcount by ' + label.toLowerCase()}>
                <TableHead><TableRow><TableCell>{label}</TableCell><TableCell align="right">People</TableCell></TableRow></TableHead>
                <TableBody>
                  {headcounts.map((item) => (
                    <TableRow key={item.key}>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{item.label}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{item.displayValue}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </CardContent>
      </Card>
      <Typography component="h3" variant="h3" sx={{ mb: 1.5 }}>Pay statistics</Typography>
      <Card sx={{ overflow: 'hidden' }}>
        <TableContainer className="data-table-wrap">
          <Table aria-label={'Salary statistics by ' + label.toLowerCase()} sx={{ minWidth: 1100 }}>
            <TableHead><TableRow><TableCell>{label}</TableCell><TableCell>Currency</TableCell><TableCell align="right">People</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Minimum</TableCell><TableCell align="right">Maximum</TableCell><TableCell align="right">Average</TableCell><TableCell align="right">Median</TableCell><TableCell align="right">P25</TableCell><TableCell align="right">P75</TableCell></TableRow></TableHead>
            <TableBody>
              {insights.groups.map((group) => (
                <TableRow key={group.label + '-' + group.currency}>
                  <TableCell sx={{ fontWeight: 700 }}>{group.label}</TableCell>
                  <TableCell>{group.currency}</TableCell>
                  <TableCell align="right">{group.count.toLocaleString()}</TableCell>
                  <TableCell align="right">{formatCurrency(group.total, group.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(group.min, group.currency)}</TableCell>
                  <TableCell align="right">{formatCurrency(group.max, group.currency)}</TableCell>
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
