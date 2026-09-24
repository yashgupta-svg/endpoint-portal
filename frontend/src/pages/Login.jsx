const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

import { useState } from 'react';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');
post
    if (!username.trim() || !password) {
      setError(
        'Username and password are required'
      );
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            username,
            password,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Login failed'
        );
      }

      onLogin(data.user);
    } catch (error) {
      console.error(error);

      setError(
        error.message || 'Unable to login'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">

        <div className="login-brand">
          <div className="login-brand-mark">
            <span></span>
          </div>

          <span>
            Endpoint <b>Portal</b>
          </span>
        </div>

        <div className="login-header">
          <p className="login-eyebrow">
            SECURE ACCESS
          </p>

          <h1>Welcome back</h1>

          <p>
            Sign in to your endpoint management
            portal.
          </p>
        </div>

        <form
          className="login-form"
          onSubmit={handleSubmit}
        >
          <label>
            Username

            <input
              type="text"
              value={username}
              onChange={(e) =>
                setUsername(e.target.value)
              }
              placeholder="Enter username"
              autoComplete="username"
              disabled={loading}
            />
          </label>

          <label>
            Password

            <input
              type="password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              placeholder="Enter password"
              autoComplete="current-password"
              disabled={loading}
            />
          </label>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
          >
            {loading
              ? 'Signing in...'
              : 'Sign in'}
          </button>
        </form>

      </div>
    </div>
  );
}

export default Login;