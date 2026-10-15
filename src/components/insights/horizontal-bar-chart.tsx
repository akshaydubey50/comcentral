'use client';

import { Box, Typography } from '@mui/material';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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
  const maximum = Math.max(1, ...items.map((item) => item.visualValue));
  const height = Math.max(160, items.length * 56 + 40);

  return (
    <Box role="img" aria-label={ariaLabel} sx={{ minWidth: 0 }}>
      <ResponsiveContainer width="100%" height={height} minWidth={0} initialDimension={{ width: 600, height }}>
        <BarChart data={items} layout="vertical" margin={{ top: 8, right: 12, bottom: 4, left: 0 }} accessibilityLayer>
          <CartesianGrid horizontal={false} stroke="#dce2df" strokeDasharray="3 3" />
          <XAxis type="number" domain={[0, maximum]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value: number) => Intl.NumberFormat('en', { notation: 'compact' }).format(value)} />
          <YAxis type="category" dataKey="label" width={104} interval={0} tick={{ fontSize: 11, fill: '#596664' }} axisLine={false} tickLine={false} tickFormatter={(value: string) => value.length > 17 ? value.slice(0, 16) + '…' : value} />
          <Tooltip cursor={{ fill: '#edf6f4' }} formatter={(_value, _name, item) => [String(item.payload.displayValue), String(item.payload.label)]} />
          <Bar dataKey="visualValue" name="Value" fill="#0b625e" radius={[0, 4, 4, 0]} barSize={18} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <Box sx={{ display: 'grid', gap: 0.75, mt: 1 }}>
        {items.map((item) => <Box key={item.key} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}><Typography variant="caption" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{item.label}</Typography><Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right', overflowWrap: 'anywhere' }}>{item.displayValue}</Typography></Box>)}
      </Box>
    </Box>
  );
}
