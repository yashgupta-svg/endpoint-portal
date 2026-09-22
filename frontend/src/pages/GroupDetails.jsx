import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import { getGroup } from '../services/api';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export default function GroupDetails({ groupId, onBack, onOpenAgent }) {
  const [group, setGroup] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadGroup() {
    setError('');
    try {
      setGroup(await getGroup(groupId));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { loadGroup(); }, [groupId]);

  if (isLoading) return <main className="app-shell details-shell"><button className="back-link" type="button" onClick={onBack}>← Back to Groups</button><Loading /></main>;
  if (error || !group) return <main className="app-shell details-shell"><button className="back-link" type="button" onClick={onBack}>← Back to Groups</button><div className="state-panel"><span className="state-code">GROUP</span><h1>{error === 'Group not found' ? 'Group not found' : 'Unable to load group data.'}</h1><p>{error || 'This group is no longer available.'}</p><button className="refresh-button" type="button" onClick={loadGroup}>Retry</button></div></main>;

  return <main className="app-shell groups-shell"><header className="topbar"><a className="brand" href="/" aria-label="Endpoint Portal home" onClick={(event) => { event.preventDefault(); onBack(); }}><span className="brand-mark"><span /></span><span>Endpoint <b>Portal</b></span></a><nav className="portal-nav" aria-label="Primary navigation"><button type="button" onClick={() => onBack('/')}>Dashboard</button><button className="is-active" type="button" onClick={onBack}>Groups</button></nav></header><button className="back-link" type="button" onClick={onBack}>← Back to Groups</button><section className="groups-heading group-detail-heading"><div><p className="eyebrow">Group profile / 04</p><h1>{group.name}</h1><p className="heading-copy">{group.description || 'No description provided.'}</p></div><div className="group-detail-count"><strong>{group.agent_count}</strong><span>{group.agent_count === 1 ? 'endpoint' : 'endpoints'}</span></div></section><section className="panel group-agent-panel"><div className="panel-heading"><div><p className="section-kicker">Membership</p><h2>Endpoints in this group</h2></div><span className="updated-label">Created {formatDate(group.created_at)}</span></div>{group.agents.length === 0 ? <div className="empty-state">No endpoints belong to this group yet.</div> : <div className="table-wrap"><table className="agent-table"><thead><tr><th>Endpoint</th><th>IP address</th><th>Operating system</th><th>Status</th><th>Last seen</th></tr></thead><tbody>{group.agents.map((agent) => <tr key={agent.agent_id} onClick={() => onOpenAgent(agent.agent_id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenAgent(agent.agent_id); }}><td><div className="endpoint-cell"><span className="endpoint-avatar">{(agent.hostname || agent.agent_id).slice(0, 1).toUpperCase()}</span><span><strong>{agent.hostname}</strong><small>{agent.agent_id}</small></span></div></td><td>{agent.ip_address || 'No address'}</td><td>{agent.os || 'Unknown OS'}</td><td><span className={`status-pill status-pill--${agent.status === 'online' ? 'online' : 'offline'}`}><span />{agent.status || 'offline'}</span></td><td>{formatDate(agent.last_seen)}</td></tr>)}</tbody></table></div>}</section></main>;
}
