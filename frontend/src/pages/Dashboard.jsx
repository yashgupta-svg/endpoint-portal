import { useEffect, useState } from 'react';
import AgentTable from '../components/AgentTable';
import Loading from '../components/Loading';
import StatCard from '../components/StatCard';
import { fetchAgents } from '../services/api';

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
}) {
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

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

  useEffect(() => {
    loadAgents();
  }, []);

  const onlineCount = agents.filter(
    (agent) => agent.status === 'online'
  ).length;

  const offlineCount = agents.length - onlineCount;

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
          onClick={loadAgents}
          disabled={isLoading}
        >
          <span
            aria-hidden="true"
            className={
              isLoading
                ? 'refresh-icon is-spinning'
                : 'refresh-icon'
            }
          >
            ↻
          </span>

          {isLoading
            ? 'Refreshing'
            : 'Refresh data'}
        </button>

      </section>

      {/* ERROR */}
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

      {/* STATS */}
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