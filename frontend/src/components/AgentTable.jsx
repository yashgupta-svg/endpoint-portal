function formatLastSeen(value) {
  if (!value) return 'Never';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AgentTable({ agents, selectedId, onSelect }) {
  if (agents.length === 0) {
    return <div className="empty-state">No endpoints have registered yet.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="agent-table">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Network</th>
            <th>Group</th>
            <th>Operating system</th>
            <th>User</th>
            <th>Status</th>
            <th>Last seen</th>
          </tr>
        </thead>
        <tbody>
          {agents.map((agent) => (
            <tr
              key={agent.agent_id}
              className={agent.agent_id === selectedId ? 'is-selected' : ''}
              onClick={() => onSelect(agent)}
              tabIndex="0"
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(agent);
              }}
            >
              <td>
                <div className="endpoint-cell">
                  <span className="endpoint-avatar">{(agent.hostname || agent.agent_id).slice(0, 1).toUpperCase()}</span>
                  <span>
                    <strong>{agent.hostname || 'Unnamed endpoint'}</strong>
                    <small>{agent.agent_id}</small>
                  </span>
                </div>
              </td>
              <td>{agent.ip_address || 'No address'}</td>
              <td>{agent.group?.name || 'No Group'}</td>
              <td>
                <span>{agent.os || 'Unknown OS'}</span>
                <small className="table-subtext">{agent.os_version || 'Version unavailable'}</small>
              </td>
              <td>{agent.username || 'Unknown user'}</td>
              <td><span className={`status-pill status-pill--${agent.status === 'online' ? 'online' : 'offline'}`}><span />{agent.status || 'offline'}</span></td>
              <td>{formatLastSeen(agent.last_seen)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
