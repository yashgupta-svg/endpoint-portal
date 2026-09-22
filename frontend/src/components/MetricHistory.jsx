function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatNumber(value, suffix = '') {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(2)}${suffix}` : '—';
}

export default function MetricHistory({ metrics }) {
  return (
    <div className="table-wrap">
      <table className="metric-history-table">
        <thead>
          <tr><th>Timestamp</th><th>CPU</th><th>RAM</th><th>Disk</th><th>Download</th><th>Upload</th></tr>
        </thead>
        <tbody>
          {metrics.map((metric) => (
            <tr key={`${metric.timestamp}-${metric.id || ''}`}>
              <td>{formatTimestamp(metric.timestamp)}</td>
              <td>{formatNumber(metric.cpu_usage, '%')}</td>
              <td>{formatNumber(metric.ram_usage, '%')}</td>
              <td>{formatNumber(metric.disk_usage, '%')}</td>
              <td>{formatNumber(metric.network_download, ' MB/s')}</td>
              <td>{formatNumber(metric.network_upload, ' MB/s')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
