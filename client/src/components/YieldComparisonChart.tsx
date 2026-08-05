import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis, ResponsiveContainer } from "recharts";

export interface YieldPoint {
  label: string;
  rendimientoPorHa: number | null;
  cultivo?: string;
}

export function YieldComparisonChart({ data }: { data: YieldPoint[] }) {
  const chartData = data.map((d) => ({ ...d, rendimiento: d.rendimientoPorHa ?? 0 }));

  if (chartData.every((d) => d.rendimiento === 0)) {
    return <p className="text-muted">Todavía no hay datos de cosecha para graficar rendimiento.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} width={60} />
        <Tooltip
          formatter={((value: number) => [
            `${Number(value ?? 0).toLocaleString("es-AR")} kg/ha`,
            "Rendimiento",
          ]) as (value: unknown) => [string, string]}
          contentStyle={{ fontSize: "0.85rem" }}
        />
        <Bar dataKey="rendimiento" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
