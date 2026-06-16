'use client';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';

function fmtShort(isoDate) {
  const [, m, d] = isoDate.split('-');
  return `${d}.${m}.`;
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="wc-tooltip">
      <p className="wc-tooltip-date">{label}</p>
      <p className="wc-tooltip-val">{payload[0].value} kg</p>
    </div>
  );
}

export default function WeightChart({ entries, zielgewicht }) {
  if (!entries || entries.length === 0) return null;

  const chartData = entries.map(e => ({
    datum:   fmtShort(e.datum),
    gewicht: e.gewicht,
  }));

  const weights   = entries.map(e => e.gewicht);
  const allValues = zielgewicht ? [...weights, zielgewicht] : weights;
  const minY = Math.floor(Math.min(...allValues)) - 1;
  const maxY = Math.ceil(Math.max(...allValues))  + 1;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={chartData} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="datum"
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border)' }}
        />
        <YAxis
          domain={[minY, maxY]}
          tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => `${v}`}
          width={38}
        />
        <Tooltip content={<CustomTooltip />} />

        {zielgewicht && (
          <ReferenceLine
            y={zielgewicht}
            stroke="var(--cat-fitness)"
            strokeDasharray="6 4"
            strokeWidth={1.5}
          />
        )}

        <Line
          type="monotone"
          dataKey="gewicht"
          stroke="var(--accent)"
          strokeWidth={2.5}
          dot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: 'var(--accent)', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
