function formatTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function RecentFileActivity({ events, onViewAll }) {
  return (
    <section className="panel recent-file-panel">
      <div className="panel-heading"><div><p className="section-kicker">Recent activity</p><h2>Recent File Activity</h2></div><button className="inline-link" type="button" onClick={onViewAll}>View all file events →</button></div>
      {events.length === 0 ? <div className="no-metrics">No file events available yet.</div> : <div className="table-wrap"><table className="recent-file-table"><thead><tr><th>Time</th><th>File</th><th>Event</th><th>Size</th></tr></thead><tbody>{events.map((event) => <tr key={event.id}><td>{formatTime(event.timestamp)}</td><td><strong>{event.file_name}</strong><small>{event.file_path}</small></td><td><span className={`file-event-pill file-event-pill--${event.event_type}`}>{event.event_type}</span></td><td>{event.file_size === null || event.file_size === undefined ? 'Unavailable' : `${event.file_size} B`}</td></tr>)}</tbody></table></div>}
    </section>
  );
}
