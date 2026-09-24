import { useEffect, useState } from 'react';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function UsbEvents({ onBack }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

      if (!response.ok) {
        throw new Error('Failed to fetch USB events');
      }

      const data = await response.json();

      setEvents(data.events || []);
    } catch (err) {
      console.error('USB events load failed:', err);
      setError('Unable to load USB events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsbEvents();

    const interval = setInterval(() => {
      fetchUsbEvents();
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleString();
  };

  return (
    <div className="usb-events-page">
      <div className="usb-events-container">

        {/* HEADER */}
        <div className="usb-events-header">

          <div className="usb-events-title-block">

            {/* BACK BUTTON */}
            <button
              type="button"
              className="usb-back-button"
              onClick={onBack}
            >
              ← Back
            </button>

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

          {/* REFRESH BUTTON */}
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

            {loading ? 'Refreshing...' : 'Refresh'}
          </button>

        </div>

        {/* CONTENT */}

        {loading && events.length === 0 ? (

          <div className="usb-message-card">

            <div className="usb-loading-dot"></div>

            <span>
              Loading USB events...
            </span>

          </div>

        ) : error ? (

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

          <div className="usb-message-card">

            <span>
              No USB events found.
            </span>

          </div>

        ) : (

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
                      event.event_type === 'connected';

                    return (
                      <tr key={event.id}>

                        <td>

                          <span
                            className={
                              connected
                                ? 'usb-event-pill usb-event-pill--connected'
                                : 'usb-event-pill usb-event-pill--disconnected'
                            }
                          >

                            <span className="usb-event-dot"></span>

                            {connected
                              ? 'USB Connected'
                              : 'USB Disconnected'}

                          </span>

                        </td>

                        <td className="usb-ip-cell">
                          {event.ip_address || '-'}
                        </td>

                        <td className="usb-time-cell">
                          {formatDate(event.timestamp)}
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
    </div>
  );
}

export default UsbEvents;