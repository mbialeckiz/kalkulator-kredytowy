import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'default' | 'positive' | 'primary';
}

export function StatCard({ label, value, hint, tone = 'default' }: Props) {
  return (
    <Box
      sx={(t) => ({
        p: 2,
        borderRadius: '16px',
        minWidth: 0,
        bgcolor:
          tone === 'positive'
            ? t.palette.m3.tertiaryContainer
            : tone === 'primary'
              ? t.palette.m3.primaryContainer
              : t.palette.m3.surfaceContainer,
        color:
          tone === 'positive'
            ? t.palette.m3.onTertiaryContainer
            : tone === 'primary'
              ? t.palette.m3.onPrimaryContainer
              : t.palette.m3.onSurface,
      })}
    >
      <Typography variant="body2" sx={{ opacity: 0.8 }}>
        {label}
      </Typography>
      <Typography
        component="div"
        sx={{ fontSize: { xs: '1.375rem', sm: '1.625rem' }, fontWeight: 600, lineHeight: 1.25, mt: 0.5, overflowWrap: 'anywhere' }}
      >
        {value}
      </Typography>
      {hint && (
        <Typography variant="body2" sx={{ opacity: 0.75, mt: 0.25 }}>
          {hint}
        </Typography>
      )}
    </Box>
  );
}
