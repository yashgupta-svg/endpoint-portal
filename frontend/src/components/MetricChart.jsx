import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatValue(value) {
  return `${Number(value).toFixed(1)}%`;
}

export default function MetricChart({ title, data, dataKey, color }) {
  return (
    <article className="metric-chart-card">
      <div className="metric-chart-heading">
        <h3>{title}</h3>
        <span className="metric-chart-unit">percent</span>
      </div>
      <div className="metric-chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
            <CartesianGrid stroke="#e6ece7" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="timestamp" tickFormatter={formatTime} tick={{ fill: '#89968e', fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={24} />
            <YAxis domain={[0, 100]} tick={{ fill: '#89968e', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
            <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} formatter={(value) => [formatValue(value), title]} contentStyle={{ border: '1px solid #dce3dc', borderRadius: 6, fontSize: 11, boxShadow: '0 8px 20px rgba(33, 53, 43, .08)' }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 2, fill: color, strokeWidth: 0 }} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
}
