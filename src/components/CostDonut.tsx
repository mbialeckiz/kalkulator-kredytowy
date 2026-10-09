import { Box, Typography, useTheme } from '@mui/material';
import { useState } from 'react';
import { money, type Currency } from '../lib/format';

interface Props {
  capital: number;
  interest: number;
  saved: number;
  currency: Currency;
}

/** Struktura kosztu: kapitał, odsetki do zapłaty i odsetki zaoszczędzone dzięki nadpłacie. */
export function CostDonut({ capital, interest, saved, currency }: Props) {
  const t = useTheme().palette.m3;
  const [hover, setHover] = useState<number | null>(null);
  const segments = [
    { label: 'Kapitał', value: capital, color: t.chartCapital },
    { label: 'Odsetki do zapłaty', value: interest, color: t.chartInterest },
    { label: 'Odsetki zaoszczędzone', value: saved, color: t.chartSaved },
  ];
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const baseInterest = interest + saved;
  const savedPct = baseInterest > 0 ? Math.round((saved / baseInterest) * 100) : 0;

  const size = 188;
  const stroke = 22;
  const radius = (size - stroke) / 2;
  const c = 2 * Math.PI * radius;
  const gap = 2; // przerwa w kolorze tła między segmentami
  let offset = 0;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 3 }}>
      <Box sx={{ position: 'relative', width: size, height: size, flex: '0 0 auto', mx: { xs: 'auto', sm: 0 } }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Struktura kosztu kredytu">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={t.surfaceContainer} strokeWidth={stroke} />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const visible = Math.max(0, len - (len > gap * 2 ? gap : 0));
            const el = (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={s.color}
                strokeWidth={hover === i ? stroke + 4 : stroke}
                strokeDasharray={`${visible} ${c - visible}`}
                strokeDashoffset={-offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                style={{ transition: 'stroke-width 120ms', cursor: 'default' }}
              >
                <title>{`${s.label}: ${money(s.value, currency)}`}</title>
              </circle>
            );
            offset += len;
            return s.value > 0 ? el : null;
          })}
        </svg>
        <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center', pointerEvents: 'none' }}>
          <Box>
            {hover === null ? (
              <>
                <Typography sx={{ fontSize: '2rem', fontWeight: 600, lineHeight: 1 }}>{savedPct}%</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 110 }}>
                  mniej odsetek
                </Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600 }}>{money(segments[hover].value, currency)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 120 }}>
                  {segments[hover].label}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </Box>
      <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, flex: '1 1 220px', display: 'grid', gap: 1.5, minWidth: 0 }}>
        {segments.map((s, i) => (
          <Box
            component="li"
            key={s.label}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            sx={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', alignItems: 'center', gap: 1.5 }}
          >
            <Box sx={{ width: 12, height: 12, borderRadius: '3px', bgcolor: s.color }} />
            <Typography variant="body2" color="text.secondary">
              {s.label}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
              {money(s.value, currency)}
            </Typography>
          </Box>
        ))}
        <Box component="li" sx={{ display: 'grid', gridTemplateColumns: '12px 1fr auto', gap: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <span />
          <Typography variant="body2" color="text.secondary">
            Łącznie do spłaty
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600, textAlign: 'right' }}>
            {money(capital + interest, currency)}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
