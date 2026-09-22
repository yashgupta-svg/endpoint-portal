import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import { createGroup, deleteGroup, getGroups } from '../services/api';

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString([], { dateStyle: 'medium' });
}

export default function Groups({ onBack, onOpenGroup, onOpenReports, onOpenFileEvents }) {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');

  async function loadGroups(showLoading = true) {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      setGroups(await getGroups());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }

  useEffect(() => { loadGroups(); }, []);

  async function handleCreate(event) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Group name is required.');
      return;
    }
    setIsCreating(true);
    setError('');
    try {
      await createGroup(form);
      setForm({ name: '', description: '' });
      await loadGroups(false);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsCreating(false);
    }
  }

  async function handleDelete(event, group) {
    event.stopPropagation();
    if (!window.confirm(`Delete ${group.name}? Endpoints will remain registered without a group.`)) return;
    try {
      await deleteGroup(group.id);
      await loadGroups(false);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <main className="app-shell groups-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Endpoint Portal home" onClick={(event) => { event.preventDefault(); onBack(); }}><span className="brand-mark"><span /></span><span>Endpoint <b>Portal</b></span></a>
        <nav className="portal-nav" aria-label="Primary navigation"><button type="button" onClick={onBack}>Dashboard</button><button className="is-active" type="button">Groups</button><button type="button" onClick={onOpenReports}>Reports</button><button type="button" onClick={onOpenFileEvents}>File Events</button></nav>
      </header>
      <section className="groups-heading"><div><p className="eyebrow">Organization / 03</p><h1>Endpoint groups</h1><p className="heading-copy">Organize registered endpoints into focused operational sets.</p></div><button className="refresh-button" type="button" onClick={() => loadGroups()} disabled={isLoading}>↻ Refresh groups</button></section>
      {error && <div className="alert" role="alert"><strong>Group action failed.</strong><span>{error}</span><button type="button" onClick={() => loadGroups()}>Retry</button></div>}
      <section className="group-layout">
        <form className="panel create-group-panel" onSubmit={handleCreate}>
          <div className="panel-heading"><div><p className="section-kicker">New collection</p><h2>Create group</h2></div><span className="detail-icon">＋</span></div>
          <div className="form-fields"><label htmlFor="group-name">Group name<input id="group-name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Windows Systems" /></label><label htmlFor="group-description">Description<span className="optional-label">Optional</span><textarea id="group-description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="What belongs in this group?" rows="4" /></label><button className="primary-button" type="submit" disabled={isCreating}>{isCreating ? 'Creating…' : 'Create Group'}</button></div>
        </form>
        <section className="panel groups-list-panel"><div className="panel-heading"><div><p className="section-kicker">Collections</p><h2>All groups</h2></div><span className="updated-label">{groups.length} groups</span></div>{isLoading ? <Loading /> : groups.length === 0 ? <div className="empty-state">No groups created yet.</div> : <div className="group-list">{groups.map((group) => <article className="group-card" key={group.id} onClick={() => onOpenGroup(group.id)} tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onOpenGroup(group.id); }}><div className="group-card-top"><span className="group-symbol">G</span><div><h3>{group.name}</h3><p>{group.description || 'No description provided.'}</p></div><button className="icon-action" type="button" aria-label={`Delete ${group.name}`} onClick={(event) => handleDelete(event, group)}>×</button></div><div className="group-card-bottom"><strong>{group.agent_count} {group.agent_count === 1 ? 'endpoint' : 'endpoints'}</strong><span>Created {formatDate(group.created_at)} <b>Open →</b></span></div></article>)}</div>}</section>
      </section>
    </main>
  );
}
