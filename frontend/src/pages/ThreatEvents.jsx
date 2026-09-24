import { useEffect, useMemo, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function ThreatEvents({ onBack }) {
  const [threats, setThreats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [severityFilter, setSeverityFilter] =
    useState('all');

  const [statusFilter, setStatusFilter] =
    useState('all');

  /* ===================================================
     LOAD THREATS
  =================================================== */

  async function loadThreats() {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/api/threat-events`,
        {
          credentials: 'include',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Failed to load threats'
        );
      }

      setThreats(
        Array.isArray(data.threats)
          ? data.threats
          : []
      );

    } catch (error) {
      console.error(
        'Threat events load failed:',
        error
      );

      setError(
        error.message ||
          'Unable to load threat events'
      );

    } finally {
      setLoading(false);
    }
  }

  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {
    loadThreats();
  }, []);

  /* ===================================================
     FILTERED THREATS
  =================================================== */

  const filteredThreats = useMemo(() => {
    return threats.filter((threat) => {

      const severityMatch =
        severityFilter === 'all' ||
        threat.severity === severityFilter;

      const statusMatch =
        statusFilter === 'all' ||
        threat.status === statusFilter;

      return (
        severityMatch &&
        statusMatch
      );
    });
  }, [
    threats,
    severityFilter,
    statusFilter,
  ]);

  /* ===================================================
     COUNTS
  =================================================== */

  const counts = useMemo(() => {
    return {
      critical: threats.filter(
        (item) =>
          item.severity === 'critical'
      ).length,

      high: threats.filter(
        (item) =>
          item.severity === 'high'
      ).length,

      medium: threats.filter(
        (item) =>
          item.severity === 'medium'
      ).length,

      low: threats.filter(
        (item) =>
          item.severity === 'low'
      ).length,
    };
  }, [threats]);

  /* ===================================================
     HELPERS
  =================================================== */

  function formatDate(value) {
    if (!value) {
      return '—';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString();
  }

  function severityClass(severity) {
    return `threat-severity threat-severity--${severity || 'unknown'}`;
  }

  function statusClass(status) {
    return `threat-status threat-status--${status || 'unknown'}`;
  }

  /* ===================================================
     UI
  =================================================== */

  return (
    <div className="app-shell">

      {/* ============================================
          TOP BAR
      ============================================ */}

      <div className="topbar">

        <div className="brand">

          <div className="brand-mark">
            <span></span>
          </div>

          <span>
            Endpoint <b>Portal</b>
          </span>

        </div>

        <div className="topbar-meta">

          <span className="live-indicator">
            <span></span>
            API connected
          </span>

          <span>
            Threat Monitoring
          </span>

        </div>

      </div>

      {/* ============================================
          PAGE HEADING
      ============================================ */}

      <div className="page-heading">

        <div>

          {/* BACK BUTTON */}

          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back
          </button>

          <p className="eyebrow">
            SECURITY
          </p>

          <h1>
            Threat Detection
          </h1>

          <p className="heading-copy">
            Monitor security threats detected
            across managed endpoints.
          </p>

        </div>

        {/* REFRESH BUTTON */}

        <button
          type="button"
          className="refresh-button"
          onClick={loadThreats}
          disabled={loading}
        >
          {loading
            ? 'Refreshing...'
            : 'Refresh'}
        </button>

      </div>

      {/* ============================================
          ERROR
      ============================================ */}

      {error && (
        <div className="alert alert--error">

          <strong>
            Threat API error
          </strong>

          <span>
            {error}
          </span>

        </div>
      )}

      {/* ============================================
          SUMMARY
      ============================================ */}

      <div className="stats-grid threat-stats-grid">

        {/* CRITICAL */}

        <div className="stat-card threat-stat-card threat-stat-card--critical">

          <div className="stat-card__topline">

            <span className="stat-card__label">
              Critical
            </span>

            <span className="stat-card__mark"></span>

          </div>

          <strong className="stat-card__value">
            {counts.critical}
          </strong>

          <span className="stat-card__detail">
            Critical threats
          </span>

        </div>

        {/* HIGH */}

        <div className="stat-card threat-stat-card threat-stat-card--high">

          <div className="stat-card__topline">

            <span className="stat-card__label">
              High
            </span>

            <span className="stat-card__mark"></span>

          </div>

          <strong className="stat-card__value">
            {counts.high}
          </strong>

          <span className="stat-card__detail">
            High severity threats
          </span>

        </div>

        {/* MEDIUM */}

        <div className="stat-card threat-stat-card threat-stat-card--medium">

          <div className="stat-card__topline">

            <span className="stat-card__label">
              Medium
            </span>

            <span className="stat-card__mark"></span>

          </div>

          <strong className="stat-card__value">
            {counts.medium}
          </strong>

          <span className="stat-card__detail">
            Medium severity threats
          </span>

        </div>

        {/* LOW */}

        <div className="stat-card threat-stat-card threat-stat-card--low">

          <div className="stat-card__topline">

            <span className="stat-card__label">
              Low
            </span>

            <span className="stat-card__mark"></span>

          </div>

          <strong className="stat-card__value">
            {counts.low}
          </strong>

          <span className="stat-card__detail">
            Low severity threats
          </span>

        </div>

      </div>

      {/* ============================================
          FILTERS
      ============================================ */}

      <div className="panel threat-filter-panel">

        <div className="panel-heading">

          <div>

            <h2>
              Threat Filters
            </h2>

            <span className="updated-label">
              {filteredThreats.length} visible
            </span>

          </div>

        </div>

        <div className="threat-filters">

          {/* SEVERITY */}

          <label>

            Severity

            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Severities
              </option>

              <option value="critical">
                Critical
              </option>

              <option value="high">
                High
              </option>

              <option value="medium">
                Medium
              </option>

              <option value="low">
                Low
              </option>

            </select>

          </label>

          {/* STATUS */}

          <label>

            Status

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >

              <option value="all">
                All Status
              </option>

              <option value="open">
                Open
              </option>

              <option value="investigating">
                Investigating
              </option>

              <option value="resolved">
                Resolved
              </option>

            </select>

          </label>

        </div>

      </div>

      {/* ============================================
          THREAT TABLE
      ============================================ */}

      <div className="panel threat-table-panel">

        <div className="panel-heading">

          <div>

            <h2>
              Detected Threats
            </h2>

            <span className="updated-label">
              Latest events first
            </span>

          </div>

        </div>

        {/* LOADING */}

        {loading ? (

          <div className="threat-empty">

            <h2>
              Loading threats...
            </h2>

            <p>
              Fetching security events.
            </p>

          </div>

        ) : filteredThreats.length === 0 ? (

          /* NO THREATS */

          <div className="threat-empty">

            <h2>
              No threats found
            </h2>

            <p>
              No threat events match the
              current filters.
            </p>

          </div>

        ) : (

          /* TABLE */

          <div className="table-wrap">

            <table className="threat-table">

              <thead>

                <tr>

                  <th>
                    Threat
                  </th>

                  <th>
                    Severity
                  </th>

                  <th>
                    Endpoint
                  </th>

                  <th>
                    User
                  </th>

                  <th>
                    IP
                  </th>

                  <th>
                    Process
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Detected
                  </th>

                </tr>

              </thead>

              <tbody>

                {filteredThreats.map(
                  (threat) => (

                    <tr key={threat.id}>

                      {/* THREAT */}

                      <td>

                        <strong>
                          {threat.title ||
                            'Unnamed threat'}
                        </strong>

                        <small>
                          {threat.threat_type ||
                            'unknown'}
                        </small>

                      </td>

                      {/* SEVERITY */}

                      <td>

                        <span
                          className={severityClass(
                            threat.severity
                          )}
                        >
                          {threat.severity ||
                            'unknown'}
                        </span>

                      </td>

                      {/* ENDPOINT */}

                      <td>

                        <strong>
                          {threat.agent_id ||
                            '—'}
                        </strong>

                      </td>

                      {/* USER */}

                      <td>
                        {threat.username ||
                          '—'}
                      </td>

                      {/* IP */}

                      <td>
                        {threat.ip_address ||
                          '—'}
                      </td>

                      {/* PROCESS */}

                      <td>
                        {threat.process_name ||
                          '—'}
                      </td>

                      {/* STATUS */}

                      <td>

                        <span
                          className={statusClass(
                            threat.status
                          )}
                        >
                          {threat.status ||
                            'unknown'}
                        </span>

                      </td>

                      {/* DETECTED */}

                      <td>
                        {formatDate(
                          threat.detected_at
                        )}
                      </td>

                    </tr>

                  )
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </div>
  );
}

export default ThreatEvents;