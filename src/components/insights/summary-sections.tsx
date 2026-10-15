import {
  Accordion, AccordionDetails, AccordionSummary, Alert, Box, Card, CardContent, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';

import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Insights } from '@/shared/contracts';
import { HorizontalBarChart, type HorizontalBarItem } from './horizontal-bar-chart';

function CountCard({ label, value, detail, emphasized = false }: {
  label: string;
  value: number;
  detail: string;
  emphasized?: boolean;
}) {
  return (
    <Card sx={emphasized ? { bgcolor: '#083f3d', color: 'white' } : undefined}>
      <CardContent sx={{ p: 2.25 }}>
        <Typography variant="caption" sx={emphasized ? { color: '#bfd6d3' } : { color: 'text.secondary' }}>{label}</Typography>
        <Typography sx={{ fontSize: '2rem', fontWeight: 800, mt: 0.25, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</Typography>
        <Typography variant="body2" sx={emphasized ? { color: '#bfd6d3', mt: 0.75 } : { color: 'text.secondary', mt: 0.75 }}>{detail}</Typography>
      </CardContent>
    </Card>
  );
}

export function SummarySection({ insights }: { insights: Insights }) {
  const approximateUsd = insights.currencyMode === 'USD';
  const hasUsableFx = insights.reportingAvailable && Boolean(insights.fx.rateDate)
    && (insights.fx.state === 'FRESH' || insights.fx.state === 'CACHED');
  const approximateUsdUnavailable = approximateUsd && !hasUsableFx;
  const recordedCount = Math.max(0, insights.headcount - insights.salaryPendingCount);

  return (
    <Box component="section" aria-labelledby="summary-title">
      <Typography id="summary-title" component="h2" variant="h2" sx={{ mb: 1.5 }}>Salary readiness and commitments</Typography>
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
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 2 }}>
        <CountCard label="Matching employees" value={insights.headcount} detail="All employees in the current filter context." emphasized />
        <CountCard label="Salaries recorded" value={recordedCount} detail="Included in pay reporting." />
        <CountCard label="Salaries pending" value={insights.salaryPendingCount} detail="Excluded until salary is recorded." />
        {approximateUsdUnavailable && (
          <Card><CardContent sx={{ p: 2.25 }}><Typography role="status">Approximate USD pay statistics are unavailable because a complete current rate snapshot is required.</Typography></CardContent></Card>
        )}
        {insights.headcount > 0 && insights.salaryPendingCount === insights.headcount && (
          <Card><CardContent sx={{ p: 2.25 }}><Typography role="status">No recorded salaries match these filters. Add salaries from employee details to populate pay statistics.</Typography></CardContent></Card>
        )}
        {!approximateUsdUnavailable && insights.summaries.map((summary) => (
          <Card key={summary.currency}>
            <CardContent sx={{ p: 2.25 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                <Typography component="h3" variant="h3">
                  {approximateUsd ? 'Approximate USD annual commitment' : summary.currency + ' annual commitment'}
                </Typography>
                <Chip size="small" label={summary.count.toLocaleString() + (summary.count === 1 ? ' person' : ' people')} />
              </Box>
              {approximateUsd && insights.fx.rateDate && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>Rate date: {formatDate(insights.fx.rateDate)}</Typography>}
              <Typography sx={{ fontSize: '1.45rem', fontWeight: 800, mt: 1.5, fontVariantNumeric: 'tabular-nums', overflowWrap: 'anywhere' }}>{formatCurrency(summary.total, summary.currency)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>Median {formatCurrency(summary.median, summary.currency)}</Typography>
            </CardContent>
            <Accordion disableGutters elevation={0} slotProps={{ transition: { unmountOnExit: true } }} sx={{ borderTop: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
              <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                <Typography fontWeight={700}>Show exact {summary.currency} summary</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 0 }}>
                <TableContainer className="data-table-wrap">
                  <Table size="small" aria-label={summary.currency + ' population salary statistics'} sx={{ minWidth: 840 }}>
                    <TableHead><TableRow><TableCell align="right">People</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Minimum</TableCell><TableCell align="right">Maximum</TableCell><TableCell align="right">Average</TableCell><TableCell align="right">Median</TableCell><TableCell align="right">P25</TableCell><TableCell align="right">P75</TableCell></TableRow></TableHead>
                    <TableBody><TableRow>
                      <TableCell align="right">{summary.count.toLocaleString()}</TableCell>
                      {[summary.total, summary.min, summary.max, summary.average, summary.median, summary.p25, summary.p75].map((value, index) => <TableCell align="right" key={index}>{formatCurrency(value, summary.currency)}</TableCell>)}
                    </TableRow></TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
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
  const chartLabel = 'Headcount by ' + label.toLowerCase() + ' chart. '
    + headcounts.map((item) => item.label + ': ' + item.displayValue + ' ' + (item.visualValue === 1 ? 'person' : 'people')).join('; ') + '.';

  if (headcounts.length === 0) {
    return <Card><CardContent><Typography role="status">No recorded salaries match these filters. Group comparisons will appear when salaries are recorded.</Typography></CardContent></Card>;
  }

  return (
    <Box component="section" aria-labelledby="group-title">
      <Typography id="group-title" component="h2" variant="h2" sx={{ mb: 1.5 }}>By {label.toLowerCase()}</Typography>
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Typography component="h3" variant="h3">Headcount with recorded salary</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
            {representedHeadcount.toLocaleString()} matching {representedHeadcount === 1 ? 'person' : 'people'} across {headcounts.length.toLocaleString()} {headcounts.length === 1 ? label.toLowerCase() : pluralLabel}. {insights.currencyMode === 'NATIVE' ? 'Native currency rows are combined only for these headcounts.' : 'Counts reflect recorded salaries in the approximate USD view.'}
          </Typography>
          <Box sx={{ mt: 2.5 }}><HorizontalBarChart ariaLabel={chartLabel} items={headcounts} /></Box>
        </CardContent>
        <Accordion disableGutters elevation={0} slotProps={{ transition: { unmountOnExit: true } }} sx={{ borderTop: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ChevronDown size={18} />}>
            <Typography fontWeight={700}>Show exact {label.toLowerCase()} headcount</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ p: 0 }}>
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
          </AccordionDetails>
        </Accordion>
      </Card>
    </Box>
  );
}
