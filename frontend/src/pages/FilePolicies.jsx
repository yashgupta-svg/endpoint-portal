import { useEffect, useState } from 'react';
import Loading from '../components/Loading';
import { createFilePolicy, deleteFilePolicy, getFilePolicies, getGroups, updateFilePolicy } from '../services/api';

const emptyForm = { name: '', description: '', extension: '.exe', action: 'block', enabled: true, group_id: '' };

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleDateString([], { dateStyle: 'medium' });
}

export default function FilePolicies({ onBack, onOpenGroups, onOpenReports, onOpenFileEvents }) {
  const [policies, setPolicies] = useState([]);
  const [groups, setGroups] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadData() {
    setIsLoading(true);
    setError('');
    try {
      const [nextPolicies, nextGroups] = await Promise.all([getFilePolicies(), getGroups()]);
      setPolicies(nextPolicies);
      setGroups(nextGroups);
    } catch (requestError) { setError(requestError.message); } finally { setIsLoading(false); }
  }

  useEffect(() => { loadData(); }, []);

  function updateForm(field, value) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event) {
    event.preventDefault();
    if (!form.name.trim() || !form.extension.trim().startsWith('.')) { setError('Name and a dot-prefixed extension are required.'); return; }
    setIsSaving(true); setError('');
    try {
      const payload = { ...form, group_id: form.group_id === '' ? null : Number(form.group_id), extension: form.extension.trim().toLowerCase() };
      if (editingId) await updateFilePolicy(editingId, payload); else await createFilePolicy(payload);
      setForm(emptyForm); setEditingId(null); await loadData();
    } catch (requestError) { setError(requestError.message); } finally { setIsSaving(false); }
  }

  function edit(policy) {
    setEditingId(policy.id);
    setForm({ name: policy.name, description: policy.description || '', extension: policy.extension, action: policy.action, enabled: policy.enabled, group_id: policy.group_id || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function toggle(policy) {
    try { await updateFilePolicy(policy.id, { enabled: !policy.enabled }); await loadData(); } catch (requestError) { setError(requestError.message); }
  }

  async function remove(policy) {
    if (!window.confirm(`Delete ${policy.name}?`)) return;
    try { await deleteFilePolicy(policy.id); await loadData(); } catch (requestError) { setError(requestError.message); }
  }

  return <main className="app-shell policy-shell"><header className="topbar"><a className="brand" href="/" aria-label="Endpoint Portal home" onClick={(event) => { event.preventDefault(); onBack(); }}><span className="brand-mark"><span /></span><span>Endpoint <b>Portal</b></span></a><nav className="portal-nav" aria-label="Primary navigation"><button type="button" onClick={onBack}>Dashboard</button><button type="button" onClick={onOpenGroups}>Groups</button><button type="button" onClick={onOpenReports}>Reports</button><button type="button" onClick={onOpenFileEvents}>File Events</button><button className="is-active" type="button">File Policies</button></nav></header><section className="policy-heading"><div><p className="eyebrow">Detection rules / 07</p><h1>File policies</h1><p className="heading-copy">Define extension decisions for all endpoints or a specific group.</p></div><button className="refresh-button" type="button" onClick={loadData} disabled={isLoading}>↻ Refresh policies</button></section>{error && <div className="alert" role="alert"><strong>Policy action failed.</strong><span>{error}</span><button type="button" onClick={() => setError('')}>Dismiss</button></div>}<section className="policy-layout"><form className="panel policy-form" onSubmit={submit}><div className="panel-heading"><div><p className="section-kicker">Policy editor</p><h2>{editingId ? 'Edit policy' : 'Create policy'}</h2></div><span className="detail-icon">＋</span></div><div className="form-fields"><label>Name<input value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Block Executables" /></label><label>Description<span className="optional-label">Optional</span><textarea rows="3" value={form.description} onChange={(event) => updateForm('description', event.target.value)} placeholder="Describe what this policy detects" /></label><label>Extension<input value={form.extension} onChange={(event) => updateForm('extension', event.target.value)} placeholder=".exe" /></label><label>Action<select value={form.action} onChange={(event) => updateForm('action', event.target.value)}><option value="block">Block</option><option value="allow">Allow</option></select></label><label>Scope<select value={form.group_id} onChange={(event) => updateForm('group_id', event.target.value)}><option value="">Global</option>{groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}</select></label><label className="checkbox-label"><input type="checkbox" checked={form.enabled} onChange={(event) => updateForm('enabled', event.target.checked)} /> Enabled</label><div className="form-actions"><button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? 'Saving…' : editingId ? 'Update Policy' : 'Create Policy'}</button>{editingId && <button className="secondary-button" type="button" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</button>}</div></div></form><section className="panel policy-list-panel"><div className="panel-heading"><div><p className="section-kicker">Active configuration</p><h2>All file policies</h2></div><span className="updated-label">{policies.length} policies</span></div>{isLoading ? <Loading /> : policies.length === 0 ? <div className="empty-state">No file policies created yet.</div> : <div className="table-wrap"><table className="policy-table"><thead><tr><th>Name</th><th>Extension</th><th>Action</th><th>Scope</th><th>Enabled</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{policies.map((policy) => <tr key={policy.id}><td><strong>{policy.name}</strong><small>{policy.description || 'No description'}</small></td><td>{policy.extension}</td><td><span className={`policy-action policy-action--${policy.action}`}>{policy.action}</span></td><td>{policy.group_name || 'Global'}</td><td><button className={`toggle-button ${policy.enabled ? 'is-enabled' : ''}`} type="button" onClick={() => toggle(policy)}>{policy.enabled ? 'Enabled' : 'Disabled'}</button></td><td>{formatDate(policy.updated_at)}</td><td><button className="table-action" type="button" onClick={() => edit(policy)}>Edit</button><button className="table-action table-action--danger" type="button" onClick={() => remove(policy)}>Delete</button></td></tr>)}</tbody></table></div>}</section></section></main>;
}
