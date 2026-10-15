'use client';

import { Box, IconButton, MenuItem, Pagination, Stack, TextField, Tooltip, Typography, useMediaQuery, useTheme } from '@mui/material';
import { ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from 'lucide-react';
import type { EmployeePage } from '@/shared/contracts';

type Props = {
  pagination: EmployeePage['pagination'];
  visibleCount: number;
  busy: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
};

/** Present the server's one-based pages without changing applied filters. */
export function EmployeePagination({ pagination, visibleCount, busy, onPageChange, onPageSizeChange }: Props) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('sm'));
  const { page, pageSize, total, totalPages } = pagination;
  const unavailable = total > 0 && page > totalPages;
  const start = visibleCount > 0 ? (page - 1) * pageSize + 1 : 0;
  const end = visibleCount > 0 ? Math.min(start + visibleCount - 1, total) : 0;
  const pageSizes = [...new Set([10, 25, 50, 100, pageSize])].sort((a, b) => a - b);
  const controls = [
    { label: 'First', icon: ChevronFirst, target: 1, disabled: page <= 1 },
    { label: 'Previous', icon: ChevronLeft, target: Math.min(page - 1, totalPages), disabled: page <= 1 },
    { label: 'Next', icon: ChevronRight, target: page + 1, disabled: page >= totalPages },
    { label: 'Last', icon: ChevronLast, target: totalPages, disabled: page >= totalPages },
  ];

  return (
    <Stack role="group" aria-label="Employee pagination" gap={1.5} sx={{ px: { xs: 1.5, sm: 2.5 }, py: 1.5, borderTop: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5} flexWrap="wrap">
        <Typography variant="body2" color="text.secondary" aria-live="polite">
          {visibleCount > 0 ? `${start.toLocaleString()}–${end.toLocaleString()} of ${total.toLocaleString()} employees` : `${total.toLocaleString()} matching employees`}
        </Typography>
        <TextField select label="Rows per page" value={pageSize} disabled={busy} onChange={(event) => onPageSizeChange(Number(event.target.value))} sx={{ width: 132, flexShrink: 0 }}>
          {pageSizes.map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
        </TextField>
      </Stack>
      {compact ? (
        <Stack component="nav" aria-label="Employee directory pages" direction="row" alignItems="center" justifyContent="space-between" gap={1}>
          <Typography variant="body2" color="text.secondary" sx={{ minWidth: 0 }}>
            {totalPages === 0 ? 'No pages' : unavailable ? 'Choose a page' : `${page} / ${totalPages.toLocaleString()}`}
          </Typography>
          <Stack direction="row" sx={{ flexShrink: 0 }}>
            {controls.map(({ label, icon: Icon, target, disabled }) => (
              <Tooltip key={label} title={`${label} page`}>
                <span><IconButton aria-label={label} disabled={busy || totalPages === 0 || disabled} onClick={() => onPageChange(target)}><Icon size={18} aria-hidden /></IconButton></span>
              </Tooltip>
            ))}
          </Stack>
        </Stack>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            aria-label="Employee directory pages"
            count={totalPages}
            page={page}
            disabled={busy || totalPages === 0}
            onChange={(_, nextPage) => onPageChange(nextPage)}
            showFirstButton showLastButton siblingCount={0}
            color="primary" shape="rounded" variant="outlined"
            getItemAriaLabel={(type, number, selected) => type === 'page' ? `${selected ? 'Page' : 'Go to page'} ${number}` : ({ first: 'First', previous: 'Previous', next: 'Next', last: 'Last', 'start-ellipsis': 'More pages', 'end-ellipsis': 'More pages' }[type])}
            sx={{ '& .MuiPaginationItem-root': { minWidth: 44, minHeight: 44, mx: 0.25 }, '& .MuiPaginationItem-ellipsis': { minWidth: 24 } }}
          />
        </Box>
      )}
    </Stack>
  );
}
