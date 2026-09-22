import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import { getAgents, getFileEvents } from '../services/api';

function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function formatSize(value) {
  if (value === null || value === undefined) return 'Unavailable';
  const size = Number(value);
  if (!Number.isFinite(size)) return 'Unavailable';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileEvents({ onBack, onOpenGroups, onOpenReports, initialAgentId = '' }) {
  const [agents, setAgents] = useState([]);
  const [events, setEvents] = useState([]);
  const [agentFilter, setAgentFilter] = useState(initialAgentId);
  const [extensionFilter, setExtensionFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getAgents().then(setAgents).catch((requestError) => setError(requestError.message));
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    setError('');
    try {
      if (agentFilter) {
        setEvents(await getFileEvents(agentFilter, 500));
      } else {
        const results = await Promise.all(agents.map((agent) => getFileEvents(agent.agent_id, 500)));
        setEvents(results.flat().sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp)));
      }
    } catch (requestError) {
      setError(requestError.message);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (agents.length > 0) loadEvents();
  }, [agents, agentFilter]);

  const filteredEvents = events.filter((event) => (
    (extensionFilter === 'all' || event.file_extension === extensionFilter)
    && (eventFilter === 'all' || event.event_type === eventFilter)
  ));
  const extensions = [...new Set(events.map((event) => event.file_extension))].sort();

  return (
    <main className="app-shell file-events-shell">
      <header className="topbar"><a className="brand" href="/" aria-label="Endpoint Portal home" onClick={(event) => { event.preventDefault(); onBack(); }}><span className="brand-mark"><span /></span><span>Endpoint <b>Portal</b></span></a><nav className="portal-nav" aria-label="Primary navigation"><button type="button" onClick={onBack}>Dashboard</button><button type="button" onClick={onOpenGroups}>Groups</button><button type="button" onClick={onOpenReports}>Reports</button><button className="is-active" type="button">File Events</button></nav></header>
      <section className="file-events-heading"><div><p className="eyebrow">Activity stream / 06</p><h1>File events</h1><p className="heading-copy">Lightweight activity monitoring for supported archive and installer files.</p></div><button className="refresh-button" type="button" onClick={loadEvents} disabled={isLoading}>↻ Refresh events</button></section>
      {error && <div className="alert" role="alert"><strong>Unable to load file events.</strong><span>{error}</span><button type="button" onClick={loadEvents}>Retry</button></div>}
      <section className="panel file-filter-panel"><div className="file-filters"><label>Endpoint<select value={agentFilter} onChange={(event) => setAgentFilter(event.target.value)}><option value="">All endpoints</option>{agents.map((agent) => <option key={agent.agent_id} value={agent.agent_id}>{agent.hostname} · {agent.agent_id}</option>)}</select></label><label>Extension<select value={extensionFilter} onChange={(event) => setExtensionFilter(event.target.value)}><option value="all">All supported types</option>{extensions.map((extension) => <option key={extension} value={extension}>{extension}</option>)}</select></label><label>Event type<select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}><option value="all">All events</option><option value="created">Created</option><option value="modified">Modified</option><option value="deleted">Deleted</option></select></label></div></section>
      {isLoading ? <Loading /> : filteredEvents.length === 0 ? <div className="panel file-events-empty"><span className="state-code">QUIET</span><h2>No file events found</h2><p>No supported file activity matches the selected filters.</p></div> : <section className="panel file-events-table-panel"><div className="panel-heading"><div><p className="section-kicker">Latest activity</p><h2>{filteredEvents.length} event{filteredEvents.length === 1 ? '' : 's'}</h2></div><span className="updated-label">Newest first</span></div><div className="table-wrap"><table className="file-events-table"><thead><tr><th>Time</th><th>Endpoint</th><th>User</th><th>File</th><th>Path</th><th>Extension</th><th>Event</th><th>Size</th></tr></thead><tbody>{filteredEvents.map((event) => <tr key={event.id}><td>{formatTime(event.timestamp)}</td><td>{event.agent_id}</td><td>{event.username || 'Unknown'}</td><td><strong>{event.file_name}</strong></td><td className="file-path-cell">{event.file_path}</td><td>{event.file_extension}</td><td><span className={`file-event-pill file-event-pill--${event.event_type}`}>{event.event_type}</span></td><td>{formatSize(event.file_size)}</td></tr>)}</tbody></table></div></section>}
    </main>
  );
}
