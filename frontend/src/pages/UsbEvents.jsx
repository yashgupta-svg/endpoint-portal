import { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(
  /\/$/,
  ''
);

function UsbEvents({
  onBack,
  onOpenGroups,
  onOpenReports,
  onOpenFileEvents,
  onOpenFilePolicies,
  onOpenThreatEvents,
}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  /* ===================================================
     FETCH USB EVENTS
  =================================================== */

  const fetchUsbEvents = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(
        `${API_URL}/api/usb-events`,
        {
          credentials: 'include',
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            'Failed to fetch USB events'
        );
      }

      setEvents(
        Array.isArray(data?.events)
          ? data.events
          : []
      );
    } catch (err) {
      console.error(
        'USB events load failed:',
        err
      );

      setError(
        err?.message ||
          'Unable to load USB events'
      );
    } finally {
      setLoading(false);
    }
  };

  /* ===================================================
     INITIAL LOAD + AUTO REFRESH
  =================================================== */

  useEffect(() => {
    fetchUsbEvents();

    const interval = setInterval(() => {
      fetchUsbEvents();
    }, 10000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  /* ===================================================
     DATE FORMAT
  =================================================== */

  const formatDate = (timestamp) => {
    if (!timestamp) {
      return '-';
    }

    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString();
  };

  /* ===================================================
     DASHBOARD
  =================================================== */

  const goToDashboard = () => {
    if (typeof onBack === 'function') {
      onBack();
      return;
    }

    window.history.pushState({}, '', '/');

    window.dispatchEvent(
      new PopStateEvent('popstate')
    );

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  /* ===================================================
     UI
  =================================================== */

  return (
    <main className="usb-events-page">

      <div className="usb-events-container">

        {/* =================================================
            TOP NAVIGATION
        ================================================= */}

        <header className="topbar">

          {/* BRAND */}

          <a
            className="brand"
            href="/"
            aria-label="Go to Endpoint Portal dashboard"
            onClick={(event) => {
              event.preventDefault();
              goToDashboard();
            }}
          >
            <span className="brand-mark">
              <span />
            </span>

            <span>
              Endpoint <b>Portal</b>
            </span>
          </a>

          {/* NAVIGATION */}

          <nav
            className="portal-nav"
            aria-label="Primary navigation"
          >

            {/* DASHBOARD */}

            <button
              type="button"
              onClick={goToDashboard}
            >
              Dashboard
            </button>

            {/* GROUPS */}

            <button
              type="button"
              onClick={onOpenGroups}
            >
              Groups
            </button>

            {/* REPORTS */}

            <button
              type="button"
              onClick={onOpenReports}
            >
              Reports
            </button>

            {/* FILE EVENTS */}

            <button
              type="button"
              onClick={onOpenFileEvents}
            >
              File Events
            </button>

            {/* FILE POLICIES */}

            <button
              type="button"
              onClick={onOpenFilePolicies}
            >
              File Policies
            </button>

            {/* USB EVENTS - ACTIVE */}

            <button
              type="button"
              className="is-active"
            >
              USB Events
            </button>

            {/* THREAT DETECTION */}

            <button
              type="button"
              onClick={onOpenThreatEvents}
            >
              Threat Detection
            </button>

          </nav>

          {/* STATUS */}

          <div className="topbar-meta">

            <span className="live-indicator">
              <span />
              API connected
            </span>

            <span className="environment-label">
              USB Monitoring
            </span>

          </div>

        </header>

        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <section className="usb-events-header">

          <div className="usb-events-title-block">

            <p className="usb-events-eyebrow">
              MONITORING / USB
            </p>

            <h1 className="usb-events-title">
              USB Events
            </h1>

            <p className="usb-events-subtitle">
              USB connection and disconnection activity
            </p>

          </div>

          {/* REFRESH */}

          <button
            type="button"
            className="usb-refresh-button"
            onClick={fetchUsbEvents}
            disabled={loading}
          >

            <span
              className={
                loading
                  ? 'usb-refresh-icon spinning'
                  : 'usb-refresh-icon'
              }
            >
              ↻
            </span>

            {loading
              ? 'Refreshing...'
              : 'Refresh'}

          </button>

        </section>

        {/* =================================================
            CONTENT
        ================================================= */}

        {loading && events.length === 0 ? (

          /* LOADING */

          <div className="usb-message-card">

            <div className="usb-loading-dot" />

            <span>
              Loading USB events...
            </span>

          </div>

        ) : error ? (

          /* ERROR */

          <div className="usb-error-card">

            <strong>
              Unable to load USB events
            </strong>

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={fetchUsbEvents}
            >
              Try again
            </button>

          </div>

        ) : events.length === 0 ? (

          /* EMPTY */

          <div className="usb-message-card">

            <span>
              No USB events found.
            </span>

          </div>

        ) : (

          /* USB TABLE */

          <div className="usb-table-card">

            <div className="usb-table-wrap">

              <table className="usb-events-table">

                <thead>
                  <tr>

                    <th>
                      Event
                    </th>

                    <th>
                      User IP
                    </th>

                    <th>
                      Time
                    </th>

                  </tr>
                </thead>

                <tbody>

                  {events.map((event) => {

                    const connected =
                      event.event_type ===
                      'connected';

                    return (
                      <tr
                        key={event.id}
                      >

                        {/* EVENT */}

                        <td>

                          <span
                            className={
                              connected
                                ? 'usb-event-pill usb-event-pill--connected'
                                : 'usb-event-pill usb-event-pill--disconnected'
                            }
                          >

                            <span className="usb-event-dot" />

                            {connected
                              ? 'USB Connected'
                              : 'USB Disconnected'}

                          </span>

                        </td>

                        {/* IP */}

                        <td className="usb-ip-cell">
                          {event.ip_address || '-'}
                        </td>

                        {/* TIME */}

                        <td className="usb-time-cell">
                          {formatDate(
                            event.timestamp
                          )}
                        </td>

                      </tr>
                    );
                  })}

                </tbody>

              </table>

            </div>

          </div>

        )}

      </div>

    </main>
  );
}

export default UsbEvents;