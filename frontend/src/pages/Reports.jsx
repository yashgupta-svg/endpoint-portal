import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import { fetchAgents, getGroups, getReport } from '../services/api';

const ranges = [
  { value: '1h', label: 'Last 1 hour' },
  { value: '6h', label: 'Last 6 hours' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

function number(value, suffix = '') {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}${suffix}` : '—';
}

function csvValue(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function exportCsv(report) {
  const headers = ['Agent ID', 'Hostname', 'IP Address', 'OS', 'Username', 'Group', 'Status', 'Last Seen', 'Average CPU', 'Maximum CPU', 'Average RAM', 'Maximum RAM', 'Average Disk', 'Maximum Disk', 'Average Download', 'Maximum Download', 'Metric Count'];
  const rows = report.endpoints.map((endpoint) => [
    endpoint.agent_id, endpoint.hostname, endpoint.ip_address, endpoint.os, endpoint.username, endpoint.group || 'No Group', endpoint.status, endpoint.last_seen,
    endpoint.metrics.average_cpu, endpoint.metrics.maximum_cpu, endpoint.metrics.average_ram, endpoint.metrics.maximum_ram, endpoint.metrics.average_disk, endpoint.metrics.maximum_disk,
    endpoint.metrics.average_download, endpoint.metrics.maximum_download, endpoint.metrics.metric_count,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvValue).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `endpoint-report-${report.range}-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function Reports({ onBack, onOpenAgent, onOpenGroups, onOpenFileEvents }) {
  const [scope, setScope] = useState('all');
  const [range, setRange] = useState('24h');
  const [groupId, setGroupId] = useState('');
  const [agentId, setAgentId] = useState('');
  const [groups, setGroups] = useState([]);
  const [agents, setAgents] = useState([]);
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getGroups(), fetchAgents()]).then(([nextGroups, nextAgents]) => {
      setGroups(nextGroups);
      setAgents(nextAgents);
    }).catch((requestError) => setError(requestError.message)).finally(() => setIsLoading(false));
  }, []);

  async function handleGenerate(event) {
    event.preventDefault();
    if (scope === 'group' && !groupId) {
      setError('Select a group before generating this report.');
      return;
    }
    if (scope === 'agent' && !agentId) {
      setError('Select an endpoint before generating this report.');
      return;
    }
    setIsGenerating(true);
    setError('');
    try {
      setReport(await getReport({ scope, range, groupId, agentId }));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="app-shell reports-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="Endpoint Portal home" onClick={(event) => { event.preventDefault(); onBack(); }}><span className="brand-mark"><span /></span><span>Endpoint <b>Portal</b></span></a><nav className="portal-nav" aria-label="Primary navigation"><button type="button" onClick={onBack}>Dashboard</button><button type="button" onClick={onOpenGroups}>Groups</button><button className="is-active" type="button">Reports</button><button type="button" onClick={onOpenFileEvents}>File Events</button></nav></header>
      <section className="reports-heading"><div><p className="eyebrow">Analysis / 05</p><h1>Monitoring reports</h1><p className="heading-copy">Turn endpoint readings into a focused operational snapshot.</p></div></section>
      {error && <div className="alert" role="alert"><strong>Report action failed.</strong><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}
      <form className="panel report-builder" onSubmit={handleGenerate}><div className="panel-heading"><div><p className="section-kicker">Report builder</p><h2>Choose a view</h2></div><span className="updated-label">PostgreSQL aggregation</span></div><div className="report-controls"><label>Report scope<select value={scope} onChange={(event) => setScope(event.target.value)}><option value="all">All endpoints</option><option value="group">Endpoint group</option><option value="agent">Individual endpoint</option></select></label>{scope === 'group' && <label>Group<select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="">Select group</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label>}{scope === 'agent' && <label>Endpoint<select value={agentId} onChange={(event) => setAgentId(event.target.value)}><option value="">Select endpoint</option>{agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.hostname} · {agent.agent_id}</option>)}</select></label>}<label>Time range<select value={range} onChange={(event) => setRange(event.target.value)}>{ranges.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label><button className="primary-button" type="submit" disabled={isGenerating || isLoading}>{isGenerating ? 'Generating report…' : 'Generate Report'}</button></div></form>
      {isLoading ? <Loading /> : report ? <ReportResults report={report} onOpenAgent={onOpenAgent} /> : <div className="panel report-empty"><span className="state-code">READY</span><h2>Build a report from live data</h2><p>Choose a scope and time range, then generate a report when you need it.</p></div>}
    </main>
  );
}

function ReportResults({ report, onOpenAgent }) {
  const cards = [['Total endpoints', report.summary.total_endpoints], ['Online endpoints', report.summary.online_endpoints], ['Offline endpoints', report.summary.offline_endpoints], ['Metric records', report.summary.metric_records]];
  return <section className="report-results"><div className="report-result-heading"><div><p className="section-kicker">Generated report</p><h2>{report.scope === 'all' ? 'All endpoints' : report.scope === 'group' ? report.group?.name : report.agent?.hostname}</h2><span>{report.range} · {new Date(report.start_time).toLocaleString()} to {new Date(report.end_time).toLocaleString()}</span></div><button className="refresh-button" type="button" onClick={() => exportCsv(report)}>↓ Export CSV</button></div><div className="report-summary-grid">{cards.map(([label, value]) => <article className="report-summary-card" key={label}><span>{label}</span><strong>{value}</strong></article>)}</div>{report.endpoints.length === 0 || report.summary.metric_records === 0 ? <div className="panel report-empty"><h2>No monitoring data is available for the selected period.</h2><p>The selected scope contains no metric records in this time range.</p></div> : <div className="panel report-table-panel"><div className="panel-heading"><div><p className="section-kicker">Endpoint summary</p><h2>{report.endpoints.length} endpoint{report.endpoints.length === 1 ? '' : 's'}</h2></div><span className="updated-label">Generated {new Date(report.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><div className="table-wrap"><table className="report-table"><thead><tr><th>Endpoint</th><th>IP</th><th>Group</th><th>Status</th><th>Avg CPU</th><th>Max CPU</th><th>Avg RAM</th><th>Max RAM</th><th>Avg Disk</th><th>Max Disk</th><th>Metric count</th></tr></thead><tbody>{report.endpoints.map((endpoint) => <tr key={endpoint.agent_id} onClick={() => onOpenAgent(endpoint.agent_id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenAgent(endpoint.agent_id); }}><td><strong>{endpoint.hostname}</strong><small>{endpoint.agent_id}</small></td><td>{endpoint.ip_address || '—'}</td><td>{endpoint.group || 'No Group'}</td><td><span className={`status-pill status-pill--${endpoint.status === 'online' ? 'online' : 'offline'}`}><span />{endpoint.status}</span></td><td>{number(endpoint.metrics.average_cpu, '%')}</td><td>{number(endpoint.metrics.maximum_cpu, '%')}</td><td>{number(endpoint.metrics.average_ram, '%')}</td><td>{number(endpoint.metrics.maximum_ram, '%')}</td><td>{number(endpoint.metrics.average_disk, '%')}</td><td>{number(endpoint.metrics.maximum_disk, '%')}</td><td>{endpoint.metrics.metric_count}</td></tr>)}</tbody></table></div></div>}</section>;
}
