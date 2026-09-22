import { useEffect, useState } from 'react';

import AgentDetails from './pages/AgentDetails';
import Dashboard from './pages/Dashboard';
import GroupDetails from './pages/GroupDetails';
import Groups from './pages/Groups';
import Reports from './pages/Reports';
import FileEvents from './pages/FileEvents';
import FilePolicies from './pages/FilePolicies';
import UsbEvents from './pages/UsbEvents';
import Login from './pages/Login';

import './styles.css';

const API_URL = import.meta.env.VITE_API_URL;

/* =====================================================
   THEME TOGGLE
===================================================== */

function ThemeToggle({ theme, onToggle, inline = false }) {
  return (
    <button
      type="button"
      className={
        inline
          ? 'theme-toggle theme-toggle--inline'
          : 'theme-toggle'
      }
      onClick={onToggle}
      title={
        theme === 'dark'
          ? 'Switch to light mode'
          : 'Switch to dark mode'
      }
    >
      {theme === 'dark'
        ? '☀️ Light Mode'
        : '🌙 Dark Mode'}
    </button>
  );
}

/* =====================================================
   SESSION CONTROLS
===================================================== */

function SessionControls({
  theme,
  onToggleTheme,
  username,
  onLogout,
}) {
  return (
    <div className="session-controls">
      {username && (
        <span className="session-user">
          {username}
        </span>
      )}

      <button
        type="button"
        className="session-logout-button"
        onClick={onLogout}
      >
        Logout
      </button>

      <ThemeToggle
        theme={theme}
        onToggle={onToggleTheme}
        inline
      />
    </div>
  );
}

/* =====================================================
   APP
===================================================== */

export default function App() {
  const [path, setPath] = useState(
    window.location.pathname
  );

  const [theme, setTheme] = useState(
    localStorage.getItem('theme') || 'dark'
  );

  /*
   * null  = authentication check in progress
   * true  = authenticated
   * false = not authenticated
   */
  const [authenticated, setAuthenticated] =
    useState(null);

  const [currentUser, setCurrentUser] =
    useState(null);

  /* ===================================================
     BROWSER NAVIGATION
  =================================================== */

  useEffect(() => {
    const handlePopState = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener(
      'popstate',
      handlePopState
    );

    return () => {
      window.removeEventListener(
        'popstate',
        handlePopState
      );
    };
  }, []);

  /* ===================================================
     THEME
  =================================================== */

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      theme
    );

    localStorage.setItem(
      'theme',
      theme
    );
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) =>
      currentTheme === 'dark'
        ? 'light'
        : 'dark'
    );
  }

  /* ===================================================
     NAVIGATION
  =================================================== */

  function navigate(nextPath) {
    window.history.pushState(
      {},
      '',
      nextPath
    );

    setPath(nextPath);

    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  }

  /* ===================================================
     AUTHENTICATION CHECK
  =================================================== */

  useEffect(() => {
    let cancelled = false;

    async function checkAuthentication() {
      try {
        const response = await fetch(
          `${API_URL}/api/auth/me`,
          {
            method: 'GET',
            credentials: 'include',
          }
        );

        const data = await response.json();

        if (cancelled) {
          return;
        }

        if (
          response.ok &&
          data.authenticated
        ) {
          setAuthenticated(true);
          setCurrentUser(
            data.user || null
          );
        } else {
          setAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (error) {
        console.error(
          'Authentication check failed:',
          error
        );

        if (!cancelled) {
          setAuthenticated(false);
          setCurrentUser(null);
        }
      }
    }

    checkAuthentication();

    return () => {
      cancelled = true;
    };
  }, []);

  /* ===================================================
     LOGIN
  =================================================== */

  function handleLogin(user) {
    setCurrentUser(user || null);
    setAuthenticated(true);

    navigate('/');
  }

  /* ===================================================
     LOGOUT
  =================================================== */

  async function handleLogout() {
    try {
      await fetch(
        `${API_URL}/api/auth/logout`,
        {
          method: 'POST',
          credentials: 'include',
        }
      );
    } catch (error) {
      console.error(
        'Logout request failed:',
        error
      );
    } finally {
      setCurrentUser(null);
      setAuthenticated(false);

      window.history.pushState(
        {},
        '',
        '/login'
      );

      setPath('/login');

      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    }
  }

  /* ===================================================
     AUTH CHECK LOADING
  =================================================== */

  if (authenticated === null) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="loading-dot"></div>

          <span>
            Checking authentication...
          </span>
        </div>
      </div>
    );
  }

  /* ===================================================
     LOGIN PAGE
  =================================================== */

  if (!authenticated) {
    return (
      <>
        <ThemeToggle
          theme={theme}
          onToggle={toggleTheme}
        />

        <Login
          onLogin={handleLogin}
        />
      </>
    );
  }

  /* ===================================================
     LOGGED-IN SESSION CONTROLS
  =================================================== */

  const sessionControls = (
    <SessionControls
      theme={theme}
      onToggleTheme={toggleTheme}
      username={
        currentUser?.username || ''
      }
      onLogout={handleLogout}
    />
  );

  /* ===================================================
     AGENT DETAILS
  =================================================== */

  const match = path.match(
    /^\/agents\/(.+)$/
  );

  if (match) {
    return (
      <>
        {sessionControls}

        <AgentDetails
          agentId={decodeURIComponent(
            match[1]
          )}
          onBack={() =>
            navigate('/')
          }
          onOpenGroups={() =>
            navigate('/groups')
          }
          onOpenFileEvents={(agentId) =>
            navigate(
              `/file-events?agent_id=${encodeURIComponent(
                agentId
              )}`
            )
          }
        />
      </>
    );
  }

  /* ===================================================
     GROUP DETAILS
  =================================================== */

  const groupMatch = path.match(
    /^\/groups\/(\d+)$/
  );

  if (groupMatch) {
    return (
      <>
        {sessionControls}

        <GroupDetails
          groupId={groupMatch[1]}
          onBack={() =>
            navigate('/groups')
          }
          onOpenAgent={(agentId) =>
            navigate(
              `/agents/${encodeURIComponent(
                agentId
              )}`
            )
          }
        />
      </>
    );
  }

  /* ===================================================
     GROUPS
  =================================================== */

  if (path === '/groups') {
    return (
      <>
        {sessionControls}

        <Groups
          onBack={() =>
            navigate('/')
          }
          onOpenGroup={(groupId) =>
            navigate(
              `/groups/${groupId}`
            )
          }
          onOpenReports={() =>
            navigate('/reports')
          }
          onOpenFileEvents={() =>
            navigate('/file-events')
          }
        />
      </>
    );
  }

  /* ===================================================
     REPORTS
  =================================================== */

  if (path === '/reports') {
    return (
      <>
        {sessionControls}

        <Reports
          onBack={() =>
            navigate('/')
          }
          onOpenGroups={() =>
            navigate('/groups')
          }
          onOpenAgent={(agentId) =>
            navigate(
              `/agents/${encodeURIComponent(
                agentId
              )}`
            )
          }
          onOpenFileEvents={() =>
            navigate('/file-events')
          }
        />
      </>
    );
  }

  /* ===================================================
     FILE EVENTS
  =================================================== */

  if (path === '/file-events') {
    const queryAgentId =
      new URLSearchParams(
        window.location.search
      ).get('agent_id') || '';

    return (
      <>
        {sessionControls}

        <FileEvents
          initialAgentId={queryAgentId}
          onBack={() =>
            navigate('/')
          }
          onOpenGroups={() =>
            navigate('/groups')
          }
          onOpenReports={() =>
            navigate('/reports')
          }
        />
      </>
    );
  }

  /* ===================================================
     FILE POLICIES
  =================================================== */

  if (path === '/file-policies') {
    return (
      <>
        {sessionControls}

        <FilePolicies
          onBack={() =>
            navigate('/')
          }
          onOpenGroups={() =>
            navigate('/groups')
          }
          onOpenReports={() =>
            navigate('/reports')
          }
          onOpenFileEvents={() =>
            navigate('/file-events')
          }
        />
      </>
    );
  }

  /* ===================================================
     USB EVENTS
  =================================================== */

  if (path === '/usb-events') {
    return (
      <>
        {sessionControls}

        <UsbEvents
          onBack={() =>
            navigate('/')
          }
          onOpenGroups={() =>
            navigate('/groups')
          }
          onOpenReports={() =>
            navigate('/reports')
          }
          onOpenFileEvents={() =>
            navigate('/file-events')
          }
        />
      </>
    );
  }

  /* ===================================================
     DASHBOARD
  =================================================== */

  return (
    <>
      {sessionControls}

      <Dashboard
        onOpenAgent={(agentId) =>
          navigate(
            `/agents/${encodeURIComponent(
              agentId
            )}`
          )
        }
        onOpenGroups={() =>
          navigate('/groups')
        }
        onOpenReports={() =>
          navigate('/reports')
        }
        onOpenFileEvents={() =>
          navigate('/file-events')
        }
        onOpenFilePolicies={() =>
          navigate('/file-policies')
        }
        onOpenUsbEvents={() =>
          navigate('/usb-events')
        }
      />
    </>
  );
}