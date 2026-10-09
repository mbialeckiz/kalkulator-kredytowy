import { Box, Typography, useTheme } from '@mui/material';
import { useMemo, useState } from 'react';
import { compactMoney, duration, money, monthLabel, type Currency } from '../lib/format';
import type { ScheduleRow } from '../lib/loan';
import { useWidth } from './useWidth';

interface Props {
  base: ScheduleRow[];
  plan: ScheduleRow[];
  amount: number;
  currency: Currency;
  startMonth: string;
}

const H = 240;
const PAD = { top: 12, right: 16, bottom: 28, left: 64 };

function niceStep(max: number, ticks = 4): number {
  const raw = max / ticks;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
}

/** Saldo zadłużenia w czasie: bez nadpłat vs z nadpłatą, z kursorem i dymkiem. */
export function BalanceChart({ base, plan, amount, currency, startMonth }: Props) {
  const t = useTheme().palette.m3;
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hoverMonth, setHoverMonth] = useState<number | null>(null);

  const totalMonths = Math.max(base.length, 1);
  const innerW = Math.max(40, width - PAD.left - PAD.right);
  const innerH = H - PAD.top - PAD.bottom;
  const step = niceStep(amount || 1);
  const yMax = Math.ceil((amount || 1) / step) * step;
  const x = (m: number) => PAD.left + (m / totalMonths) * innerW;
  const y = (v: number) => PAD.top + innerH - (v / yMax) * innerH;

  const path = (rows: ScheduleRow[]) => {
    const pts = [`M${x(0)},${y(amount)}`];
    const stride = Math.max(1, Math.floor(rows.length / innerW));
    rows.forEach((r, i) => {
      if (i % stride === 0 || i === rows.length - 1) pts.push(`L${x(r.month)},${y(r.balance)}`);
    });
    return pts.join(' ');
  };
  const basePath = useMemo(() => path(base), [base, width, amount]); // eslint-disable-line react-hooks/exhaustive-deps
  const planPath = useMemo(() => path(plan), [plan, width, amount]); // eslint-disable-line react-hooks/exhaustive-deps
  const planArea = `${planPath} L${x(plan.length)},${y(0)} L${x(0)},${y(0)} Z`;

  const yTicks: number[] = [];
  for (let v = 0; v <= yMax + 1e-6; v += step) yTicks.push(v);
  const yearsTotal = Math.ceil(totalMonths / 12);
  const yearStep = yearsTotal > 20 ? 5 : yearsTotal > 8 ? 2 : 1;
  const xTicks: number[] = [];
  for (let yr = 0; yr <= yearsTotal; yr += yearStep) xTicks.push(yr * 12);

  const balanceAt = (rows: ScheduleRow[], m: number) => (m <= 0 ? amount : (rows[m - 1]?.balance ?? 0));

  function onMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const m = Math.round(((e.clientX - rect.left) / rect.width) * totalMonths);
    setHoverMonth(Math.min(totalMonths, Math.max(0, m)));
  }

  const hm = hoverMonth;
  const tipLeft = hm !== null ? Math.min(Math.max(x(hm) + 12, PAD.left), width - 200) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, mb: 1.5 }}>
        <Legend color={t.chartBaseline} label="Bez nadpłat" dashed />
        <Legend color={t.chartCapital} label="Z nadpłatą" />
      </Box>
      <Box ref={ref} sx={{ position: 'relative', width: '100%' }}>
        <svg width={width} height={H} role="img" aria-label="Saldo zadłużenia w czasie" style={{ display: 'block' }}>
          {yTicks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke={t.chartGrid} strokeWidth={1} />
              <text x={PAD.left - 8} y={y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill={t.onSurfaceVariant}>
                {v === 0 ? '0' : compactMoney(v, currency)}
              </text>
            </g>
          ))}
          {xTicks.map((m) => (
            <text key={m} x={x(m)} y={H - 8} textAnchor="middle" fontSize={11} fill={t.onSurfaceVariant}>
              {m === 0 ? 'start' : `${m / 12} r.`}
            </text>
          ))}
          <path d={planArea} fill={t.chartCapital} fillOpacity={0.1} />
          <path d={basePath} fill="none" stroke={t.chartBaseline} strokeWidth={2} strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
          <path d={planPath} fill="none" stroke={t.chartCapital} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          {plan.length < base.length && (
            <circle cx={x(plan.length)} cy={y(0)} r={5} fill={t.chartCapital} stroke={t.surfaceContainerLow} strokeWidth={2} />
          )}
          {hm !== null && (
            <g pointerEvents="none">
              <line x1={x(hm)} x2={x(hm)} y1={PAD.top} y2={PAD.top + innerH} stroke={t.outline} strokeWidth={1} />
              <circle cx={x(hm)} cy={y(balanceAt(base, hm))} r={4} fill={t.chartBaseline} stroke={t.surfaceContainerLow} strokeWidth={2} />
              <circle cx={x(hm)} cy={y(balanceAt(plan, hm))} r={4} fill={t.chartCapital} stroke={t.surfaceContainerLow} strokeWidth={2} />
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={onMove}
            onPointerDown={onMove}
            onPointerLeave={() => setHoverMonth(null)}
            style={{ touchAction: 'pan-y' }}
          />
        </svg>
        {hm !== null && (
          <Box
            sx={(th) => ({
              position: 'absolute',
              top: 8,
              left: tipLeft,
              width: 188,
              p: 1.25,
              borderRadius: '8px',
              bgcolor: th.palette.m3.surfaceContainerHighest,
              color: th.palette.m3.onSurface,
              boxShadow: 2,
              pointerEvents: 'none',
              fontSize: 13,
            })}
          >
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
              {hm === 0 ? 'Start' : `${monthLabel(startMonth, hm - 1)} · ${duration(hm)}`}
            </Typography>
            <TipRow color={t.chartBaseline} label="Bez nadpłat" value={money(balanceAt(base, hm), currency)} />
            <TipRow color={t.chartCapital} label="Z nadpłatą" value={money(balanceAt(plan, hm), currency)} />
          </Box>
        )}
      </Box>
    </Box>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <svg width={22} height={8} aria-hidden>
        <line x1={1} x2={21} y1={4} y2={4} stroke={color} strokeWidth={2} strokeDasharray={dashed ? '5 3' : undefined} strokeLinecap="round" />
      </svg>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

function TipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '8px 1fr auto', alignItems: 'center', gap: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color }} />
      <span>{label}</span>
      <strong>{value}</strong>
    </Box>
  );
}
