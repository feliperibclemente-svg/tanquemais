import { Area, AreaChart, ResponsiveContainer } from "recharts";

export interface SparkPoint {
  label: string;
  gasto: number;
}

/** Mini-gráfico de gasto usado na Home. Carregado sob demanda (lazy). */
export default function Sparkline({ data }: { data: SparkPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="gasto"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#sparkFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
