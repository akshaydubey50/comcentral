'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Alert, Box, Button, Card, CardContent, Chip, FormControl, InputLabel, MenuItem,
  Select, Stack, ToggleButton, ToggleButtonGroup, Typography,
} from '@mui/material';
import { useMutation, useQuery } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';

import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';
import { PageHeader } from '@/components/page-header';
import { EmployeeFilterBar } from '@/components/employees/employee-filters';
import { api } from '@/lib/api-client';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { parseInsightsQuery } from '@/lib/query-state';
import type { CurrencyMode, EmployeeFilters, GroupBy, InsightsQuery } from '@/shared/contracts';
import { DistributionSection, TenureSection } from './distribution-sections';
import { OutlierSection } from './outlier-section';
import { GroupSection, SummarySection } from './summary-sections';

function FxPanel({
  mode,
  status,
  refreshing,
  onRefresh,
}: {
  mode: CurrencyMode;
  status: Awaited<ReturnType<typeof api.refreshFx>>;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const tone = status.state === 'FRESH' ? 'success' : status.state === 'CACHED' ? 'warning' : 'error';
  return (
    <Card sx={{ bgcolor: mode === 'USD' ? '#eef6f3' : 'background.paper' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
              <Typography component="h2" variant="h3">USD conversion status</Typography>
              <Chip size="small" color={tone} label={status.state === 'FRESH' ? 'Fresh rates' : status.state === 'CACHED' ? 'Cached rates' : status.state === 'STALE' ? 'Rates unavailable' : 'No rates'} />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>{status.message}</Typography>
            {(status.rateDate || status.fetchedAt) && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>
                {status.provider}{status.rateDate ? ' · reference date ' + formatDate(status.rateDate) : ''}{status.fetchedAt ? ' · fetched ' + formatDateTime(status.fetchedAt) : ''}
              </Typography>
            )}
          </Box>
          <Button variant="outlined" startIcon={<RefreshCw size={17} />} onClick={onRefresh} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh rates'}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function InsightsDashboard() {
  const search = useSearchParams();
  // URL navigation starts a new filter draft, including browser Back/Forward.
  return <InsightsDashboardContent key={search.toString()} />;
}

function InsightsDashboardContent() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const query = useMemo<InsightsQuery>(() => parseInsightsQuery(search), [search]);
  const [draftFilters, setDraftFilters] = useState<EmployeeFilters>(query);


  const insights = useQuery({ queryKey: ['insights', query], queryFn: () => api.insights(query), retry: false });
  const options = useQuery({ queryKey: ['directory-options'], queryFn: api.options });
  const refreshFx = useMutation({
    mutationFn: api.refreshFx,
    onSettled: () => insights.refetch(),
  });

  function navigate(changes: Partial<InsightsQuery>) {
    const next = { ...query, ...changes };
    const params = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    router.push(pathname + '?' + params.toString());
  }

  const mode = query.currencyMode ?? 'NATIVE';
  const groupBy = query.groupBy ?? 'country';
  const activeFilters = ['q', 'country', 'department', 'jobRole', 'employmentType']
    .filter((key) => Boolean(query[key as keyof InsightsQuery])).length;
  const populationLabel = query.status === 'ARCHIVED'
    ? 'Archived employees'
    : query.status === 'ALL' ? 'All employee statuses' : 'Active employees';

  return (
    <Stack spacing={3.5}>
      <PageHeader
        eyebrow="Compensation insights"
        title="Organization pay overview"
        description="Understand current annual base-pay commitments across the same filtered population, with native currencies kept separate by default."
      />
      <Card>
        <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Stack spacing={2.25}>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
              <ToggleButtonGroup
                value={mode}
                exclusive
                onChange={(_, value: CurrencyMode | null) => value && navigate({ currencyMode: value })}
                aria-label="Currency reporting mode"
                size="small"
              >
                <ToggleButton value="NATIVE">Native currencies</ToggleButton>
                <ToggleButton value="USD">Approximate USD</ToggleButton>
              </ToggleButtonGroup>
              <FormControl sx={{ minWidth: 190 }}>
                <InputLabel id="group-by-label">Group results by</InputLabel>
                <Select labelId="group-by-label" label="Group results by" value={groupBy} onChange={(event) => navigate({ groupBy: event.target.value as GroupBy })}>
                  <MenuItem value="country">Country</MenuItem>
                  <MenuItem value="department">Department</MenuItem>
                  <MenuItem value="jobRole">Job role</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            <EmployeeFilterBar
              filters={draftFilters}
              options={options.data}
              onChange={setDraftFilters}
              onApply={() => navigate(draftFilters)}
              onClear={() => {
                setDraftFilters({ status: 'ACTIVE' });
                navigate({ q: undefined, country: undefined, department: undefined, jobRole: undefined, employmentType: undefined, status: 'ACTIVE' });
              }}
            />
          </Stack>
        </CardContent>
      </Card>
      <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
        <Chip label={mode === 'USD' ? 'Approximate USD view' : 'Native currency view'} color="primary" variant="outlined" />
        <Chip label={activeFilters ? activeFilters + ' report filters · ' + populationLabel : populationLabel} variant="outlined" />
        {insights.data && <Typography variant="body2" color="text.secondary">Reporting date: {formatDate(insights.data.asOf)}</Typography>}
      </Stack>
      {insights.isLoading ? <LoadingState label="Loading pay insights" /> :
        insights.isError ? <ErrorState message="We could not load pay insights. Please try again." onRetry={() => insights.refetch()} /> :
        insights.data && (
          <>
            <FxPanel mode={mode} status={insights.data.fx} refreshing={refreshFx.isPending} onRefresh={() => refreshFx.mutate()} />
            {refreshFx.isError && <Alert severity="error" role="alert">The rate refresh failed. The last good snapshot is preserved; the status above shows whether it remains usable.</Alert>}
            {mode === 'USD' && !insights.data.reportingAvailable && (
              <Alert severity="warning">Approximate USD totals are unavailable because there is no complete, current rate snapshot. Native employee salaries remain unchanged and available in the native view.</Alert>
            )}
            {insights.data.headcount === 0 ? (
              <EmptyState title="No employees match these filters" description="Clear one or more report filters to widen the matching population." />
            ) : (
              <>
                <SummarySection insights={insights.data} />
                {insights.data.reportingAvailable && (
                  <>
                    <GroupSection insights={insights.data} />
                    <DistributionSection insights={insights.data} />
                    <TenureSection insights={insights.data} />
                  </>
                )}
                <OutlierSection insights={insights.data} />
              </>
            )}
          </>
        )}
    </Stack>
  );
}
