const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db/postgres');

const JWT_SECRET = process.env.JWT_SECRET;

const COOKIE_NAME = 'portal_token';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not configured');
}

async function login(req, res, next) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required',
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        username,
        password_hash
      FROM admin_users
      WHERE username = $1
      LIMIT 1
      `,
      [username.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid username or password',
      });
    }

    const user = result.rows[0];

    const passwordValid = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordValid) {
      return res.status(401).json({
        error: 'Invalid username or password',
      });
    }

    const token = jwt.sign(
      {
        sub: String(user.id),
        username: user.username,
      },
      JWT_SECRET,
      {
        expiresIn: '8h',
      }
    );

    res.cookie(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 8 * 60 * 60 * 1000,
      path: '/',
    });

    return res.status(200).json({
      message: 'Login successful',
      user: {
        id: user.id,
        username: user.username,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/',
    });

    return res.status(200).json({
      message: 'Logout successful',
    });
  } catch (error) {
    next(error);
  }
}

async function me(req, res) {
  const token = req.cookies[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({
      authenticated: false,
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    return res.status(200).json({
      authenticated: true,
      user: {
        id: decoded.sub,
        username: decoded.username,
      },
    });
  } catch {
    return res.status(401).json({
      authenticated: false,
    });
  }
}

module.exports = {
  login,
  logout,
  me,
};