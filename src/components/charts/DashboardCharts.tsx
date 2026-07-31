import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { brl, num } from "@/lib/format";

export interface SeriesPoint {
  label: string;
  gasto: number;
  consumo: number | null;
}

const tooltipStyle = {
  borderRadius: 16,
  border: "1px solid var(--border)",
  background: "var(--card)",
};

/** Gráficos do Painel. Carregados sob demanda (lazy) para aliviar o bundle inicial. */
export default function DashboardCharts({ series }: { series: SeriesPoint[] }) {
  return (
    <>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis hide />
            <Tooltip
              cursor={{ fill: "var(--accent)" }}
              formatter={(v: number) => brl(v)}
              contentStyle={tooltipStyle}
            />
            <Bar dataKey="gasto" fill="var(--primary)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <p className="mt-6 text-sm font-semibold text-foreground">Consumo (km/L)</p>
      <div className="mt-4 h-44">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis hide domain={["dataMin - 1", "dataMax + 1"]} />
            <Tooltip formatter={(v: number) => `${num(v)} km/L`} contentStyle={tooltipStyle} />
            <Line
              type="monotone"
              dataKey="consumo"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}
