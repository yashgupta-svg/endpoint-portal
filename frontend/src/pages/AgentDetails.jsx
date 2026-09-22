import { useCallback, useEffect, useMemo, useState } from 'react';
import Loading from '../components/Loading';
import MetricChart from '../components/MetricChart';
import MetricHistory from '../components/MetricHistory';
import RecentFileActivity from '../components/RecentFileActivity';
import {
  assignAgentGroup,
  getAgent,
  getAgentMetrics,
  getFileEvents,
  getGroups,
} from '../services/api';

function formatDate(value) {
  if (!value) return 'Never';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? 'Unknown'
    : date.toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
}

function formatOsVersion(value) {
  if (!value) return 'Version unavailable';

  return String(value)
    .replace(/^Microsoft Windows\s*/i, '')
    .replace(/^\[Version\s*/i, '')
    .replace(/\]$/, '')
    .trim();
}

function MetricValue({ label, value, unit, tone }) {
  const number = Number(value);

  return (
    <article className={`current-metric current-metric--${tone}`}>
      <span>{label}</span>

      <strong>
        {Number.isFinite(number) ? number.toFixed(1) : '—'}
        <small>{unit}</small>
      </strong>
    </article>
  );
}

export default function AgentDetails({
  agentId,
  onBack,
  onOpenGroups,
  onOpenFileEvents,
}) {
  const [agent, setAgent] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [groups, setGroups] = useState([]);
  const [assignmentError, setAssignmentError] = useState('');
  const [fileEvents, setFileEvents] = useState([]);

  const loadDetails = useCallback(
    async (showLoading = false) => {
      if (showLoading) {
        setIsLoading(true);
      }

      setError('');

      try {
        const [
          nextAgent,
          nextMetrics,
          nextGroups,
          nextFileEvents,
        ] = await Promise.all([
          getAgent(agentId),
          getAgentMetrics(agentId),
          getGroups(),
          getFileEvents(agentId, 20),
        ]);

        setAgent(nextAgent);
        setMetrics(nextMetrics.slice(0, 50));
        setGroups(nextGroups);
        setFileEvents(nextFileEvents.slice(0, 20));

        setNotFound(false);
        setLastUpdated(new Date());
      } catch (requestError) {
        if (requestError.status === 404) {
          setNotFound(true);
          setAgent(null);
        } else {
          setError(requestError.message);
        }
      } finally {
        if (showLoading) {
          setIsLoading(false);
        }
      }
    },
    [agentId]
  );

  async function handleGroupChange(event) {
    const groupId =
      event.target.value === ''
        ? null
        : Number(event.target.value);

    setAssignmentError('');

    try {
      const updatedAgent = await assignAgentGroup(agentId, groupId);
      setAgent(updatedAgent);
    } catch (requestError) {
      setAssignmentError(requestError.message);
    }
  }

  useEffect(() => {
    loadDetails(true);

    const refreshTimer = window.setInterval(() => {
      loadDetails();
    }, 10000);

    return () => {
      window.clearInterval(refreshTimer);
    };
  }, [loadDetails]);

  const latest = metrics[0];

  const chartData = useMemo(
    () => [...metrics].reverse(),
    [metrics]
  );

  if (isLoading) {
    return (
      <main className="app-shell details-shell">
        <button
          className="back-link"
          type="button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <Loading />
      </main>
    );
  }

  if (notFound) {
    return (
      <main className="app-shell details-shell">
        <button
          className="back-link"
          type="button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div className="state-panel">
          <span className="state-code">404</span>

          <h1>Endpoint not found</h1>

          <p>
            The endpoint <b>{agentId}</b> is not registered
            in this environment.
          </p>

          <button
            className="refresh-button"
            type="button"
            onClick={onBack}
          >
            Return to dashboard
          </button>
        </div>
      </main>
    );
  }

  if (error && !agent) {
    return (
      <main className="app-shell details-shell">
        <button
          className="back-link"
          type="button"
          onClick={onBack}
        >
          ← Back to Dashboard
        </button>

        <div className="state-panel">
          <h1>Unable to load endpoint data.</h1>

          <p>
            {error} Please check that the backend is running.
          </p>

          <button
            className="refresh-button"
            type="button"
            onClick={() => loadDetails(true)}
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell details-shell">
      {/* Top Navigation */}
      <header className="topbar">
        <a
          className="brand"
          href="/"
          aria-label="Endpoint Portal home"
          onClick={(event) => {
            event.preventDefault();
            onBack();
          }}
        >
          <span className="brand-mark">
            <span />
          </span>

          <span>
            Endpoint <b>Portal</b>
          </span>
        </a>

        <span className="live-indicator">
          <span />
          API connected
        </span>
      </header>

      {/* Back */}
      <button
        className="back-link"
        type="button"
        onClick={onBack}
      >
        ← Back to Dashboard
      </button>

      {/* Page Heading */}
      <section className="details-heading">
        <div>
          <p className="eyebrow">
            Endpoint profile / 02
          </p>

          <h1>
            {agent.hostname || 'Unnamed endpoint'}
          </h1>

          <p className="heading-copy">
            Live system profile and recent utilization for this
            endpoint.
          </p>
        </div>

        <div className="details-heading-meta">
          {lastUpdated && (
            <span>
              Synced{' '}
              {lastUpdated.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}

          <span
            className={`status-pill status-pill--${
              agent.status === 'online'
                ? 'online'
                : 'offline'
            }`}
          >
            <span />

            {agent.status || 'offline'}
          </span>
        </div>
      </section>

      {/* Refresh Error */}
      {error && (
        <div className="alert" role="alert">
          <strong>Refresh failed.</strong>

          <span>
            {error} Showing the last available data.
          </span>

          <button
            type="button"
            onClick={() => loadDetails(true)}
          >
            Retry
          </button>
        </div>
      )}

      {/* Profile + Current Metrics */}
      <section className="profile-grid">

        {/* Endpoint Information */}
        <div className="panel profile-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">
                Identity
              </p>

              <h2>
                Endpoint information
              </h2>
            </div>
          </div>

          <dl className="profile-list">

            <div className="profile-item">
              <dt>Agent ID</dt>

              <dd>
                {agent.agent_id}
              </dd>
            </div>

            <div className="profile-item">
              <dt>IP address</dt>

              <dd>
                {agent.ip_address || 'Unavailable'}
              </dd>
            </div>

            <div className="profile-item">
              <dt>Operating system</dt>

              <dd>
                {agent.os || 'Unknown'}
              </dd>
            </div>

            <div className="profile-item">
              <dt>OS version</dt>

              <dd>
                {formatOsVersion(agent.os_version)}
              </dd>
            </div>

            <div className="profile-item">
              <dt>Username</dt>

              <dd>
                {agent.username || 'Unknown'}
              </dd>
            </div>

            <div className="profile-item">
              <dt>Agent version</dt>

              <dd>
                {agent.agent_version || 'Unknown'}
              </dd>
            </div>

            <div className="profile-item">
              <dt>Last seen</dt>

              <dd>
                {formatDate(agent.last_seen)}
              </dd>
            </div>

            <div className="profile-item">
              <dt>Created</dt>

              <dd>
                {formatDate(agent.created_at)}
              </dd>
            </div>

            <div className="profile-item">
              <dt>Group</dt>

              <dd>
                <select
                  className="group-select"
                  value={agent.group?.id || ''}
                  onChange={handleGroupChange}
                >
                  <option value="">
                    No Group
                  </option>

                  {groups.map((group) => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {group.name}
                    </option>
                  ))}
                </select>

                {assignmentError && (
                  <small className="assignment-error">
                    {assignmentError}
                  </small>
                )}
              </dd>
            </div>

          </dl>

          <button
            className="inline-link"
            type="button"
            onClick={onOpenGroups}
          >
            Manage groups →
          </button>
        </div>

        {/* Current Metrics */}
        <div className="metrics-section">
          <div className="panel-heading metrics-heading">
            <div>
              <p className="section-kicker">
                Latest reading
              </p>

              <h2>
                Current utilization
              </h2>
            </div>

            <span className="updated-label">
              Auto-refresh 10s
            </span>
          </div>

          {latest ? (
            <div className="current-metrics">

              <MetricValue
                label="CPU"
                value={latest.cpu_usage}
                unit="%"
                tone="cpu"
              />

              <MetricValue
                label="RAM"
                value={latest.ram_usage}
                unit="%"
                tone="ram"
              />

              <MetricValue
                label="Disk"
                value={latest.disk_usage}
                unit="%"
                tone="disk"
              />

              <MetricValue
                label="Download"
                value={latest.network_download}
                unit=" MB/s"
                tone="network"
              />

              <MetricValue
                label="Upload"
                value={latest.network_upload}
                unit=" MB/s"
                tone="network"
              />

            </div>
          ) : (
            <div className="no-metrics">
              No metrics available yet.
            </div>
          )}
        </div>
      </section>

      {/* Recent File Activity */}
      <RecentFileActivity
        events={fileEvents.slice(0, 10)}
        onViewAll={() =>
          onOpenFileEvents?.(agentId)
        }
      />

      {/* Charts + History */}
      {metrics.length > 0 && (
        <>
          {/* Charts */}
          <section className="panel charts-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  Trend lines
                </p>

                <h2>
                  Recent utilization
                </h2>
              </div>

              <span className="updated-label">
                {metrics.length} readings
              </span>
            </div>

            <div className="charts-grid">
              <MetricChart
                title="CPU usage"
                data={chartData}
                dataKey="cpu_usage"
                color="#1f9c68"
              />

              <MetricChart
                title="RAM usage"
                data={chartData}
                dataKey="ram_usage"
                color="#4576b8"
              />

              <MetricChart
                title="Disk usage"
                data={chartData}
                dataKey="disk_usage"
                color="#d59b32"
              />
            </div>
          </section>

          {/* Metric History */}
          <section className="panel history-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">
                  History
                </p>

                <h2>
                  Metric readings
                </h2>
              </div>

              <span className="updated-label">
                Newest first
              </span>
            </div>

            <MetricHistory metrics={metrics} />
          </section>
        </>
      )}

      {/* No Metrics */}
      {!latest && (
        <div className="panel no-metrics-panel">
          <p>
            No metrics available yet.
          </p>

          <span>
            The endpoint is registered, but it has not
            submitted a system reading.
          </span>
        </div>
      )}
    </main>
  );
}