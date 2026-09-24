import { useEffect, useState } from 'react';
import AgentTable from '../components/AgentTable';
import Loading from '../components/Loading';
import StatCard from '../components/StatCard';
import { fetchAgents } from '../services/api';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function formatLastSeen(value) {
  if (!value) return 'Never';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

export default function Dashboard({
  onOpenAgent,
  onOpenGroups,
  onOpenReports,
  onOpenFileEvents,
  onOpenFilePolicies,
  onOpenUsbEvents,
  onOpenThreatEvents,
}) {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isThreatLoading, setIsThreatLoading] = useState(true);

  const [error, setError] = useState('');
  const [threatError, setThreatError] = useState('');

  const [lastUpdated, setLastUpdated] = useState(null);

  const [threats, setThreats] = useState([]);

  async function loadAgents() {
    setIsLoading(true);
    setError('');

    try {
      const nextAgents = await fetchAgents();

      setAgents(nextAgents);

      setSelectedAgent(
        (current) =>
          nextAgents.find(
            (agent) => agent.agent_id === current?.agent_id
          ) ||
          nextAgents[0] ||
          null
      );

      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadThreats() {
    setIsThreatLoading(true);
    setThreatError('');

    try {
      const response = await fetch(
        `${API_URL}/api/threat-events?limit=500`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Threat API returned HTTP ${response.status}`
        );
      }

      setThreats(
        Array.isArray(data?.threats)
          ? data.threats
          : []
      );
    } catch (requestError) {
      setThreatError(requestError.message);
      setThreats([]);
    } finally {
      setIsThreatLoading(false);
    }
  }

  async function refreshDashboard() {
    await Promise.all([
      loadAgents(),
      loadThreats(),
    ]);
  }

  useEffect(() => {
    loadAgents();
    loadThreats();
  }, []);

  const onlineCount = agents.filter(
    (agent) => agent.status === 'online'
  ).length;

  const offlineCount = agents.length - onlineCount;

  const criticalThreats = threats.filter(
    (threat) => threat.severity === 'critical'
  ).length;

  const highThreats = threats.filter(
    (threat) => threat.severity === 'high'
  ).length;

  const mediumThreats = threats.filter(
    (threat) => threat.severity === 'medium'
  ).length;

  const lowThreats = threats.filter(
    (threat) => threat.severity === 'low'
  ).length;

  const openThreats = threats.filter(
    (threat) => threat.status === 'open'
  ).length;

  const recentThreats = [...threats]
    .sort(
      (a, b) =>
        new Date(b.detected_at || b.created_at).getTime() -
        new Date(a.detected_at || a.created_at).getTime()
    )
    .slice(0, 5);

  return (
    <main className="app-shell">

      {/* TOP NAVIGATION */}
      <header className="topbar">

        <a
          className="brand"
          href="/"
          aria-label="Endpoint Portal home"
        >
          <span className="brand-mark">
            <span />
          </span>

          <span>
            Endpoint <b>Portal</b>
          </span>
        </a>

        <nav
          className="portal-nav"
          aria-label="Primary navigation"
        >
          <button
            className="is-active"
            type="button"
          >
            Dashboard
          </button>

          <button
            type="button"
            onClick={onOpenGroups}
          >
            Groups
          </button>

          <button
            type="button"
            onClick={onOpenReports}
          >
            Reports
          </button>

          <button
            type="button"
            onClick={onOpenFileEvents}
          >
            File Events
          </button>

          <button
            type="button"
            onClick={onOpenFilePolicies}
          >
            File Policies
          </button>

          <button
            type="button"
            onClick={onOpenUsbEvents}
          >
            USB Events
          </button>

          <button
            type="button"
            onClick={onOpenThreatEvents}
          >
            Threat Detection
          </button>
        </nav>

        <div className="topbar-meta">

          <span className="live-indicator">
            <span />
            API connected
          </span>

          <span className="environment-label">
            Local environment
          </span>

        </div>
      </header>

      {/* PAGE HEADING */}
      <section className="page-heading">

        <div>
          <p className="eyebrow">
            Fleet overview / 01
          </p>

          <h1>
            Endpoint command center
          </h1>

          <p className="heading-copy">
            A live view of the devices reporting into your environment.
          </p>
        </div>

        <button
          className="refresh-button"
          type="button"
          onClick={refreshDashboard}
          disabled={isLoading || isThreatLoading}
        >
          <span
            aria-hidden="true"
            className={
              isLoading || isThreatLoading
                ? 'refresh-icon is-spinning'
                : 'refresh-icon'
            }
          >
            ↻
          </span>

          {isLoading || isThreatLoading
            ? 'Refreshing'
            : 'Refresh data'}
        </button>

      </section>

      {/* AGENT ERROR */}
      {error && (
        <div
          className="alert"
          role="alert"
        >
          <strong>
            Could not reach the API.
          </strong>

          <span>
            {error}. Check that the backend is running at localhost:3000.
          </span>

          <button
            type="button"
            onClick={loadAgents}
          >
            Retry
          </button>
        </div>
      )}

      {/* THREAT ERROR */}
      {threatError && (
        <div
          className="alert"
          role="alert"
        >
          <strong>
            Could not load threat events.
          </strong>

          <span>
            {threatError}
          </span>

          <button
            type="button"
            onClick={loadThreats}
          >
            Retry
          </button>
        </div>
      )}

      {/* ENDPOINT STATS */}
      <section
        className="stats-grid"
        aria-label="Endpoint summary"
      >

        <StatCard
          label="Total endpoints"
          value={agents.length}
          detail="Registered in portal"
          tone="ink"
        />

        <StatCard
          label="Online now"
          value={onlineCount}
          detail="Reporting active status"
          tone="green"
        />

        <StatCard
          label="Offline"
          value={offlineCount}
          detail="Not currently reporting"
          tone="amber"
        />

      </section>

      {/* THREAT OVERVIEW */}
      <section
        className="stats-grid"
        aria-label="Threat summary"
      >

        <StatCard
          label="Critical threats"
          value={isThreatLoading ? '—' : criticalThreats}
          detail="Critical severity events"
          tone="amber"
        />

        <StatCard
          label="High threats"
          value={isThreatLoading ? '—' : highThreats}
          detail="High severity events"
          tone="amber"
        />

        <StatCard
          label="Open threats"
          value={isThreatLoading ? '—' : openThreats}
          detail="Threats requiring review"
          tone="ink"
        />

      </section>

      {/* THREAT SHORTCUT */}
      <section className="panel dashboard-threat-panel">

        <div className="panel-heading">

          <div>
            <p className="section-kicker">
              Security
            </p>

            <h2>
              Threat detection
            </h2>
          </div>

          <button
            className="refresh-button"
            type="button"
            onClick={onOpenThreatEvents}
          >
            View threat events
          </button>

        </div>

        <div className="dashboard-threat-overview">

          <div className="dashboard-threat-metric dashboard-threat-metric--critical">
            <span>Critical</span>
            <strong>
              {isThreatLoading ? '—' : criticalThreats}
            </strong>
          </div>

          <div className="dashboard-threat-metric dashboard-threat-metric--high">
            <span>High</span>
            <strong>
              {isThreatLoading ? '—' : highThreats}
            </strong>
          </div>

          <div className="dashboard-threat-metric dashboard-threat-metric--medium">
            <span>Medium</span>
            <strong>
              {isThreatLoading ? '—' : mediumThreats}
            </strong>
          </div>

          <div className="dashboard-threat-metric dashboard-threat-metric--low">
            <span>Low</span>
            <strong>
              {isThreatLoading ? '—' : lowThreats}
            </strong>
          </div>

          <div className="dashboard-threat-metric dashboard-threat-metric--total">
            <span>Total detected</span>
            <strong>
              {isThreatLoading ? '—' : threats.length}
            </strong>
          </div>

        </div>

      </section>

      {/* RECENT THREATS */}
      <section className="panel dashboard-recent-threats-panel">

        <div className="panel-heading">

          <div>
            <p className="section-kicker">
              Latest security events
            </p>

            <h2>
              Recent threats
            </h2>
          </div>

          <span className="updated-label">
            Latest events first
          </span>

        </div>

        {isThreatLoading ? (
          <Loading />
        ) : recentThreats.length === 0 ? (
          <div className="detail-empty">
            No threat events detected.
          </div>
        ) : (
          <div className="dashboard-recent-threats-wrap">

            <table className="dashboard-recent-threats-table">

              <thead>
                <tr>
                  <th>Threat</th>
                  <th>Severity</th>
                  <th>Process</th>
                  <th>User</th>
                  <th>Status</th>
                  <th>Detected</th>
                </tr>
              </thead>

              <tbody>
                {recentThreats.map((threat) => (
                  <tr key={threat.id}>

                    <td>
                      <strong>
                        {threat.title || 'Unknown threat'}
                      </strong>

                      <div>
                        {threat.threat_type || 'Unknown type'}
                      </div>
                    </td>

                    <td>
                      <span
                        className={`dashboard-threat-severity dashboard-threat-severity--${
                          threat.severity || 'low'
                        }`}
                      >
                        {threat.severity || 'unknown'}
                      </span>
                    </td>

                    <td>
                      {threat.process_name || 'Unknown'}
                    </td>

                    <td>
                      {threat.username || 'Unknown'}
                    </td>

                    <td>
                      <span
                        className={`dashboard-threat-status dashboard-threat-status--${
                          threat.status || 'open'
                        }`}
                      >
                        {threat.status || 'open'}
                      </span>
                    </td>

                    <td>
                      {formatLastSeen(
                        threat.detected_at || threat.created_at
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>

          </div>
        )}

      </section>

      {/* WORKSPACE */}
      <section className="workspace-grid">

        {/* AGENT TABLE */}
        <div className="panel panel--table">

          <div className="panel-heading">

            <div>
              <p className="section-kicker">
                Inventory
              </p>

              <h2>
                Registered endpoints
              </h2>
            </div>

            {lastUpdated && (
              <span className="updated-label">
                Updated{' '}
                {lastUpdated.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}

          </div>

          {isLoading && agents.length === 0 ? (
            <Loading />
          ) : (
            <AgentTable
              agents={agents}
              selectedId={selectedAgent?.agent_id}
              onSelect={(agent) => {
                setSelectedAgent(agent);
                onOpenAgent?.(agent.agent_id);
              }}
            />
          )}

        </div>

        {/* ENDPOINT DETAILS */}
        <aside className="panel detail-panel">

          <div className="panel-heading">

            <div>
              <p className="section-kicker">
                Selection
              </p>

              <h2>
                Endpoint details
              </h2>
            </div>

            <span
              className="detail-icon"
              aria-hidden="true"
            >
              ＋
            </span>

          </div>

          {selectedAgent ? (

            <div className="detail-content">

              <div className="detail-hero">

                <span className="detail-avatar">
                  {(selectedAgent.hostname ||
                    selectedAgent.agent_id)
                    .slice(0, 1)
                    .toUpperCase()}
                </span>

                <div>

                  <h3>
                    {selectedAgent.hostname ||
                      'Unnamed endpoint'}
                  </h3>

                  <span>
                    {selectedAgent.agent_id}
                  </span>

                </div>

              </div>

              <span
                className={`status-pill status-pill--${
                  selectedAgent.status === 'online'
                    ? 'online'
                    : 'offline'
                }`}
              >
                <span />

                {selectedAgent.status || 'offline'}
              </span>

              <dl className="detail-list">

                <div>
                  <dt>
                    IP address
                  </dt>

                  <dd>
                    {selectedAgent.ip_address ||
                      'Unavailable'}
                  </dd>
                </div>

                <div>
                  <dt>
                    Operating system
                  </dt>

                  <dd>
                    {selectedAgent.os || 'Unknown'}{' '}
                    <small>
                      {selectedAgent.os_version || ''}
                    </small>
                  </dd>
                </div>

                <div>
                  <dt>
                    Username
                  </dt>

                  <dd>
                    {selectedAgent.username ||
                      'Unknown'}
                  </dd>
                </div>

                <div>
                  <dt>
                    Agent version
                  </dt>

                  <dd>
                    {selectedAgent.agent_version ||
                      'Unknown'}
                  </dd>
                </div>

                <div>
                  <dt>
                    Last seen
                  </dt>

                  <dd>
                    {formatLastSeen(
                      selectedAgent.last_seen
                    )}
                  </dd>
                </div>

              </dl>

            </div>

          ) : (

            <div className="detail-empty">
              Select an endpoint from the inventory
              to inspect its current profile.
            </div>

          )}

        </aside>

      </section>

    </main>
  );
}
