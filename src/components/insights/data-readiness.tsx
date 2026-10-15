import Link from 'next/link';
import {
  Box, Button, Card, CardContent, Chip, LinearProgress, Stack, Typography,
} from '@mui/material';

import { formatDate } from '@/lib/formatters';
import type { EmployeeFilters, Insights, SalaryStatus } from '@/shared/contracts';

/** Carries the applied population into the directory without report-only controls. */
function directoryHref(filters: EmployeeFilters, salaryStatus = filters.salaryStatus): string {
  const params = new URLSearchParams({ page: '1' });
  for (const key of ['q', 'country', 'department', 'jobRole', 'employmentType', 'status'] as const) {
    if (filters[key]) params.set(key, filters[key]);
  }
  if (salaryStatus) params.set('salaryStatus', salaryStatus);
  return '/employees?' + params.toString();
}

/** Explains coverage using the complete report population, independently of FX conversion. */
export function DataReadiness({ insights, filters }: { insights: Insights; filters: EmployeeFilters }) {
  const recorded = insights.headcount - insights.salaryPendingCount;
  const coverage = insights.headcount === 0 ? null : recorded / insights.headcount * 100;
  // Keep partial coverage visibly partial, including populations larger than one import.
  const coverageLabel = coverage === null ? '' : coverage > 99.99 && coverage < 100 ? '>99.99'
    : coverage > 0 && coverage < 0.01 ? '<0.01' : coverage.toLocaleString(undefined, { maximumFractionDigits: 2 });
  const cohorts = insights.outliers.cohorts;
  const evaluated = cohorts.filter((cohort) => cohort.state === 'EVALUATED');
  const evaluatedEmployees = evaluated.reduce((total, cohort) => total + cohort.count, 0);
  const insufficient = cohorts.filter((cohort) => cohort.state === 'INSUFFICIENT_DATA').length;
  const zeroSpread = cohorts.filter((cohort) => cohort.state === 'ZERO_IQR').length;
  const fxLabel = { FRESH: 'Fresh rates', CACHED: 'Cached rates', STALE: 'Rates unavailable', MISSING: 'No rates' }[insights.fx.state];
  const count = (value: number) => value.toLocaleString();
  const salaryLinks: Array<{ status: SalaryStatus; label: string; count: number }> = [
    { status: 'RECORDED', label: 'View recorded salaries', count: recorded },
    { status: 'PENDING', label: 'Review pending salaries', count: insights.salaryPendingCount },
  ];

  return (
    <Box component="section" aria-labelledby="readiness-title">
      <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ mb: 1.5 }}>
        <Box>
          <Typography id="readiness-title" component="h2" variant="h2">Data readiness</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Coverage of the full population matching your applied filters, at {formatDate(insights.asOf)} UTC.
          </Typography>
        </Box>
        <Button component={Link} href={directoryHref(filters)} sx={{ minHeight: 44, alignSelf: 'start' }}>View matching employees</Button>
      </Stack>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' }, gap: 2 }}>
        <Card sx={{ minWidth: 0 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography component="h3" variant="h3">Salary coverage</Typography>
            <Typography fontWeight={700} sx={{ mt: 1 }}>
              {coverage === null ? 'No employees match the applied filters.' : `${count(recorded)} of ${count(insights.headcount)} employees have a recorded salary (${coverageLabel}%).`}
            </Typography>
            {coverage !== null && <LinearProgress variant="determinate" value={coverage} aria-label="Employees with recorded salaries" aria-valuetext={`${count(recorded)} of ${count(insights.headcount)} employees`} sx={{ my: 1.5, height: 6, borderRadius: 1 }} />}
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {count(insights.salaryPendingCount)} salary pending. Pending employees count toward headcount and are excluded from pay statistics.
            </Typography>
            <Stack alignItems="start" sx={{ mt: 1 }}>
              {salaryLinks.filter((link) => link.count > 0).map((link) => (
                <Button key={link.status} component={Link} href={directoryHref(filters, link.status)} sx={{ minHeight: 44 }}>{link.label}</Button>
              ))}
            </Stack>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 0 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography component="h3" variant="h3">Outlier coverage</Typography>
            <Typography fontWeight={700} sx={{ mt: 1 }}>{count(evaluated.length)} of {count(cohorts.length)} cohorts evaluated</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {recorded === 0 ? 'No recorded salaries to evaluate.' : `${count(evaluatedEmployees)} of ${count(recorded)} employees with recorded salaries were evaluated.`}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{count(insufficient)} below minimum size · {count(zeroSpread)} with zero spread</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Peers share country, currency, job role and employment type. Groups need at least {insights.outliers.minimumGroupSize} people.</Typography>
            {insights.headcount > 0 && <Button href="#outlier-title" sx={{ mt: 1, minHeight: 44 }}>Review cohort coverage</Button>}
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 0 }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography component="h3" variant="h3">Currency reporting</Typography>
            <Chip size="small" label={fxLabel} color={insights.fx.state === 'FRESH' ? 'success' : 'warning'} sx={{ mt: 1.5 }} />
            <Typography variant="body2" sx={{ mt: 1.5 }}>
              {insights.currencyMode === 'NATIVE' ? 'Native reporting does not require exchange rates.' : insights.reportingAvailable ? 'Approximate USD reporting available' : 'USD reporting unavailable'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{insights.fx.message}</Typography>
            {insights.fx.rateDate && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>{insights.fx.provider} · reference date {formatDate(insights.fx.rateDate)}</Typography>}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
