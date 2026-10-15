'use client';

import {
  Accordion, AccordionDetails, AccordionSummary, Box, Card, CardContent, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';
import { ChevronDown } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ReferenceDot, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

import { formatCurrency, formatDate } from '@/lib/formatters';
import type { Currency, Insights, PayGroup } from '@/shared/contracts';

function visualValue(value: string | null): number {
  if (value === null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function RangeGraphic({ currency, groups, groupLabel }: {
  currency: Currency;
  groups: PayGroup[];
  groupLabel: string;
}) {
  // Conversion to Number is restricted to chart geometry; labels/tables retain exact strings.
  const maximum = Math.max(...groups.map((group) => visualValue(group.p75)), 1);
  const data = groups.map((group) => ({ ...group, range: [visualValue(group.p25), visualValue(group.p75)] }));
  const height = Math.max(180, groups.length * 64 + 40);
  const ariaLabel = currency + ' pay range comparison by ' + groupLabel.toLowerCase() + '. '
    + groups.map((group) => group.label + ': ' + group.count.toLocaleString() + ' people; P25 ' + formatCurrency(group.p25, currency)
      + '; median ' + formatCurrency(group.median, currency)
      + '; P75 ' + formatCurrency(group.p75, currency)).join('; ') + '.';

  return (
    <Box role="img" aria-label={ariaLabel} sx={{ minWidth: 0 }}>
      <Box aria-hidden="true" sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">P25-P75 range</Typography>
        <Typography variant="caption" color="text.secondary">Median marker</Typography>
      </Box>
      <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 600, height }}>
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 0 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="#dce2df" strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, maximum]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => Intl.NumberFormat('en', { notation: 'compact' }).format(value)} />
          <YAxis type="category" dataKey="label" width={104} tick={{ fontSize: 11, fill: '#596664' }} interval={0} tickLine={false} axisLine={false} tickFormatter={(value: string) => value.length > 17 ? value.slice(0, 16) + '…' : value} />
          <Tooltip formatter={(_value, _name, item) => {
            const group = item.payload as PayGroup;
            return [formatCurrency(group.p25, currency) + ' – ' + formatCurrency(group.p75, currency) + '; median ' + formatCurrency(group.median, currency), 'P25–P75'];
          }} />
          <Bar dataKey="range" name="P25–P75" fill="#7fb4ad" barSize={20} radius={3} isAnimationActive={false} />
          {groups.map((group) => <ReferenceDot key={group.label} x={visualValue(group.median)} y={group.label} r={5} fill="#083f3d" stroke="#fffdf9" strokeWidth={2} />)}
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {groups.map((group) => {
          return (
            <Box key={group.label}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={700}>{group.label}</Typography>
                <Typography variant="caption" color="text.secondary">{group.count.toLocaleString()} people</Typography>
              </Box>
              <Typography variant="caption" color="text.secondary">
                P25 {formatCurrency(group.p25, currency)}  |  Median {formatCurrency(group.median, currency)}  |  P75 {formatCurrency(group.p75, currency)}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export function PayRangeChart({ insights }: { insights: Insights }) {
  const approximateUsd = insights.currencyMode === 'USD';
  const hasUsableFx = insights.reportingAvailable && Boolean(insights.fx.rateDate)
    && (insights.fx.state === 'FRESH' || insights.fx.state === 'CACHED');
  const groupLabel = insights.groupBy === 'jobRole' ? 'Job role' : insights.groupBy === 'department' ? 'Department' : 'Country';
  const currencies = [...new Set(insights.groups.map((group) => group.currency))];

  if (approximateUsd && !hasUsableFx) {
    return <Card><CardContent><Typography role="status">Approximate USD pay ranges are unavailable because a complete current rate snapshot is required.</Typography></CardContent></Card>;
  }
  if (insights.groups.length === 0) {
    return <Card><CardContent><Typography role="status">No grouped pay ranges are available for this filtered population.</Typography></CardContent></Card>;
  }

  return (
    <Box component="section" aria-labelledby="pay-range-title">
      <Typography id="pay-range-title" component="h2" variant="h2">Pay range comparison</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 1.5 }}>
        The middle half of recorded annual salaries in each {groupLabel.toLowerCase()}, with the median marked. Native currencies use separate scales.
      </Typography>
      <Box sx={{ display: 'grid', gap: 2 }}>
        {currencies.map((currency) => {
          const groups = insights.groups.filter((group) => group.currency === currency);
          const title = approximateUsd ? 'Approximate USD pay ranges' : currency + ' pay ranges';
          return (
            <Card key={currency}>
              <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
                <Typography component="h3" variant="h3">{title}</Typography>
                {approximateUsd && insights.fx.rateDate && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.75 }}>Rate date: {formatDate(insights.fx.rateDate)}</Typography>}
                <Box sx={{ mt: 2.5 }}><RangeGraphic currency={currency} groups={groups} groupLabel={groupLabel} /></Box>
              </CardContent>
              <Accordion disableGutters elevation={0} slotProps={{ transition: { unmountOnExit: true } }} sx={{ borderTop: 1, borderColor: 'divider', '&:before': { display: 'none' } }}>
                <AccordionSummary expandIcon={<ChevronDown size={18} />}>
                  <Typography fontWeight={700}>Show exact {approximateUsd ? 'approximate USD' : currency} pay data</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0 }}>
                  <TableContainer className="data-table-wrap">
                    <Table size="small" aria-label={(approximateUsd ? 'Approximate USD' : currency) + ' salary statistics by ' + groupLabel.toLowerCase()} sx={{ minWidth: 1050 }}>
                      <TableHead><TableRow><TableCell>{groupLabel}</TableCell><TableCell>Currency</TableCell><TableCell align="right">People</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Minimum</TableCell><TableCell align="right">Maximum</TableCell><TableCell align="right">Average</TableCell><TableCell align="right">Median</TableCell><TableCell align="right">P25</TableCell><TableCell align="right">P75</TableCell></TableRow></TableHead>
                      <TableBody>
                        {groups.map((group) => (
                          <TableRow key={group.label + '-' + group.currency}>
                            <TableCell component="th" scope="row" sx={{ fontWeight: 700 }}>{group.label}</TableCell>
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
                </AccordionDetails>
              </Accordion>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
}
