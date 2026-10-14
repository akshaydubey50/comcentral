import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography,
} from '@mui/material';

import type { SalaryHistory } from '@/shared/contracts';
import { formatCurrency, formatDateTime } from '@/lib/formatters';
import { EmptyState, ErrorState, LoadingState } from '@/components/feedback';

export function SalaryHistoryTable({
  history,
  loading,
  error,
  onRetry,
}: {
  history?: SalaryHistory[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  if (loading) return <Box sx={{ p: 2.5 }}><LoadingState label="Loading salary history" /></Box>;
  if (error) return <Box sx={{ p: 2.5 }}><ErrorState message="Salary history is unavailable." onRetry={onRetry} /></Box>;
  if (!history?.length) return <EmptyState title="No salary changes yet" description="The employee's starting salary is current. Future changes will appear here with their reason and actor." />;

  return (
    <TableContainer className="data-table-wrap">
      <Table aria-label="Salary change history" sx={{ minWidth: 800 }}>
        <TableHead>
          <TableRow>
            <TableCell>Changed</TableCell>
            <TableCell>Before</TableCell>
            <TableCell>After</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Changed by</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(entry.previousSalary, entry.previousCurrency)}</TableCell>
              <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{formatCurrency(entry.salary, entry.currency)}</TableCell>
              <TableCell><Typography variant="body2" sx={{ minWidth: 180 }}>{entry.reason}</Typography></TableCell>
              <TableCell>{entry.actor.name}<Typography variant="caption" display="block" color="text.secondary">{entry.actor.email}</Typography></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
