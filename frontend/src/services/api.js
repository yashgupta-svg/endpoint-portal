const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '');

export async function fetchAgents() {
  const payload = await request('/api/agents');
  return payload.agents || [];
}

export async function getAgent(agentId) {
  const payload = await request(`/api/agents/${encodeURIComponent(agentId)}`);
  return payload.agent;
}

export async function getAgentMetrics(agentId) {
  const payload = await request(`/api/agents/${encodeURIComponent(agentId)}/metrics`);
  return payload.metrics || [];
}

export async function getGroups() {
  const payload = await request('/api/groups');
  return payload.groups || [];
}

export async function getGroup(groupId) {
  const payload = await request(`/api/groups/${groupId}`);
  return payload.group;
}

export async function createGroup(group) {
  const payload = await request('/api/groups', {
    method: 'POST',
    body: JSON.stringify(group),
  });
  return payload.group;
}

export async function deleteGroup(groupId) {
  return request(`/api/groups/${groupId}`, { method: 'DELETE' });
}

export async function assignAgentGroup(agentId, groupId) {
  const payload = await request(`/api/agents/${encodeURIComponent(agentId)}/group`, {
    method: 'PUT',
    body: JSON.stringify({ group_id: groupId }),
  });
  return payload.agent;
}

export async function getReport({ scope, range, groupId, agentId }) {
  const params = new URLSearchParams({ scope, range });
  if (scope === 'group') params.set('group_id', groupId);
  if (scope === 'agent') params.set('agent_id', agentId);
  const payload = await request(`/api/reports?${params.toString()}`);
  return payload.report;
}

export async function getAgents() {
  return fetchAgents();
}

export async function getFileEvents(agentId, limit = 100) {
  const payload = await request(`/api/agents/${encodeURIComponent(agentId)}/file-events?limit=${limit}`);
  return payload.events || [];
}

export async function getFilePolicies() {
  const payload = await request('/api/file-policies');
  return payload.policies || [];
}

export async function createFilePolicy(policy) {
  const payload = await request('/api/file-policies', { method: 'POST', body: JSON.stringify(policy) });
  return payload.policy;
}

export async function updateFilePolicy(policyId, policy) {
  const payload = await request(`/api/file-policies/${policyId}`, { method: 'PUT', body: JSON.stringify(policy) });
  return payload.policy;
}

export async function deleteFilePolicy(policyId) {
  return request(`/api/file-policies/${policyId}`, { method: 'DELETE' });
}

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.error || (response.status === 404 ? 'Endpoint not found' : 'Unable to load endpoint data'));
    error.status = response.status;
    throw error;
  }
  return response.json();
}
