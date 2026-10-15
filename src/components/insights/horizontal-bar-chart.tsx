import { Box, Typography } from '@mui/material';

export interface HorizontalBarItem {
  key: string;
  label: string;
  visualValue: number;
  displayValue: string;
}

/**
 * Renders comparison bars while keeping exact display values independent from
 * the numeric coordinates used only to size the visual marks.
 */
export function HorizontalBarChart({
  ariaLabel,
  items,
}: {
  ariaLabel: string;
  items: HorizontalBarItem[];
}) {
  const maximum = Math.max(0, ...items.map((item) => item.visualValue));

  return (
    <Box role="img" aria-label={ariaLabel} sx={{ display: 'grid', gap: 1.5 }}>
      {items.map((item) => (
        <Box
          key={item.key}
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'minmax(0, 1fr) auto', sm: 'minmax(7rem, 14rem) minmax(0, 1fr) auto' },
            alignItems: 'center',
            columnGap: 1.5,
            rowGap: 0.5,
            minWidth: 0,
          }}
        >
          <Typography variant="body2" fontWeight={700} sx={{ overflowWrap: 'anywhere' }}>
            {item.label}
          </Typography>
          <Box
            sx={{
              gridColumn: { xs: '1 / -1', sm: 'auto' },
              height: 12,
              overflow: 'hidden',
              bgcolor: 'action.hover',
              borderRadius: 1,
            }}
          >
            <Box
              sx={{
                width: maximum > 0 ? `${(item.visualValue / maximum) * 100}%` : 0,
                height: '100%',
                bgcolor: 'primary.main',
                borderRadius: 'inherit',
              }}
            />
          </Box>
          <Typography
            variant="body2"
            fontWeight={750}
            sx={{ fontVariantNumeric: 'tabular-nums', justifySelf: 'end', gridColumn: { xs: 2, sm: 'auto' }, gridRow: { xs: 1, sm: 'auto' } }}
          >
            {item.displayValue}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
