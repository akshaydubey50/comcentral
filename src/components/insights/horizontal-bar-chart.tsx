import { Box, Typography } from '@mui/material';

export interface HorizontalBarItem {
  key: string;
  label: string;
  visualValue: number;
  displayValue: string;
}

/** Converts an exact decimal string only into a bounded presentation coordinate. */
export function decimalStringToVisualValue(value: string | null): number {
  if (value === null) return 0;
  const coordinate = Number(value);
  return Number.isFinite(coordinate) && coordinate > 0 ? coordinate : 0;
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
            gridTemplateColumns: { xs: 'minmax(0, 1fr) minmax(0, 1.5fr)', sm: 'minmax(7rem, 12rem) minmax(3rem, 1fr) minmax(0, 12rem)' },
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
            sx={{
              fontVariantNumeric: 'tabular-nums',
              justifySelf: 'end',
              gridColumn: { xs: 2, sm: 'auto' },
              gridRow: { xs: 1, sm: 'auto' },
              maxWidth: '100%',
              overflowWrap: 'anywhere',
              textAlign: 'right',
            }}
          >
            {item.displayValue}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
