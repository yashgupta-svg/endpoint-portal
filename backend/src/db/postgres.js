const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const config = require('../config/env');

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.database,
  user: config.db.user,
  password: config.db.password,

  max: 10,

  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error(
    'Unexpected PostgreSQL client error:',
    err
  );
});

/*
 * =====================================================
 * TEST CONNECTION
 * =====================================================
 */

async function testConnection() {
  try {
    const result = await pool.query(
      'SELECT NOW()'
    );

    console.log(
      'PostgreSQL ready:',
      result.rows[0].now
    );

    return true;
  } catch (error) {
    console.error(
      'PostgreSQL connection failed:',
      error.message
    );

    return false;
  }
}

/*
 * =====================================================
 * DEFAULT ADMIN
 * =====================================================
 *
 * Local/Lab credentials:
 *
 * Username: admin
 * Password: Admin@12345
 *
 * The password is stored only as a bcrypt hash.
 *
 * IMPORTANT:
 * This default credential is intended for local/lab use.
 */

async function ensureDefaultAdmin() {
  const adminUsername =
    process.env.ADMIN_USERNAME || 'admin';

  const adminPassword =
    process.env.ADMIN_PASSWORD || 'Admin@12345';

  try {
    const passwordHash =
      await bcrypt.hash(
        adminPassword,
        12
      );

    await pool.query(
      `
      INSERT INTO admin_users (
        username,
        password_hash
      )
      VALUES ($1, $2)
      ON CONFLICT (username)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash
      `,
      [
        adminUsername,
        passwordHash,
      ]
    );

    console.log(
      `Admin user ready: ${adminUsername}`
    );

    return true;
  } catch (error) {
    console.error(
      'Failed to create/update admin user:',
      error.message
    );

    return false;
  }
}

/*
 * =====================================================
 * INITIALIZE DATABASE
 * =====================================================
 */

async function initializeDatabase() {
  try {
    // =================================================
    // Groups
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,

        name VARCHAR(255)
          UNIQUE NOT NULL,

        description TEXT,

        created_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),

        updated_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW()
      );
    `);

    // =================================================
    // Admin Users
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id BIGSERIAL PRIMARY KEY,

        username VARCHAR(100)
          UNIQUE NOT NULL,

        password_hash TEXT
          NOT NULL,

        created_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW()
      );
    `);

    // Create/update default admin
    await ensureDefaultAdmin();

    // =================================================
    // Agents
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id SERIAL PRIMARY KEY,

        agent_id VARCHAR(255)
          UNIQUE NOT NULL,

        hostname VARCHAR(255)
          NOT NULL,

        ip_address VARCHAR(45),

        os VARCHAR(100),

        os_version VARCHAR(255),

        username VARCHAR(255),

        agent_version VARCHAR(50),

        status VARCHAR(50)
          NOT NULL DEFAULT 'offline',

        last_seen TIMESTAMPTZ,

        group_id INTEGER,

        created_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),

        updated_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW()
      );
    `);

    // =================================================
    // Agents Group Column
    // =================================================

    await pool.query(`
      ALTER TABLE agents
      ADD COLUMN IF NOT EXISTS group_id INTEGER;
    `);

    await pool.query(`
      DO $$
      BEGIN

        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname =
            'agents_group_id_fkey'
        ) THEN

          ALTER TABLE agents
          ADD CONSTRAINT
            agents_group_id_fkey

          FOREIGN KEY (group_id)
          REFERENCES groups(id)

          ON DELETE SET NULL;

        END IF;

      END
      $$;
    `);

    // =================================================
    // Metrics
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS metrics (
        id BIGSERIAL PRIMARY KEY,

        agent_id INTEGER NOT NULL
          REFERENCES agents(id)
          ON DELETE CASCADE,

        timestamp TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),

        cpu_usage NUMERIC(5,2),

        ram_usage NUMERIC(5,2),

        disk_usage NUMERIC(5,2),

        network_download NUMERIC(12,2),

        network_upload NUMERIC(12,2)
      );
    `);

    // =================================================
    // File Events
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_events (
        id BIGSERIAL PRIMARY KEY,

        agent_id INTEGER NOT NULL
          REFERENCES agents(id)
          ON DELETE CASCADE,

        file_name VARCHAR(1024)
          NOT NULL,

        file_path TEXT
          NOT NULL,

        file_extension VARCHAR(10)
          NOT NULL,

        event_type VARCHAR(20)
          NOT NULL,

        file_size BIGINT,

        username VARCHAR(255),

        timestamp TIMESTAMPTZ
          NOT NULL DEFAULT NOW()
      );
    `);

    // =================================================
    // File Policies
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS file_policies (
        id SERIAL PRIMARY KEY,

        name VARCHAR(255)
          NOT NULL,

        description TEXT,

        extension VARCHAR(10)
          NOT NULL,

        action VARCHAR(20)
          NOT NULL,

        enabled BOOLEAN
          NOT NULL DEFAULT TRUE,

        group_id INTEGER
          REFERENCES groups(id)
          ON DELETE CASCADE,

        created_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),

        updated_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),

        CONSTRAINT
          file_policies_scope_extension_action_key

        UNIQUE (
          group_id,
          extension,
          action
        )
      );
    `);

    // =================================================
    // File Event Policy Metadata
    // =================================================

    await pool.query(`
      ALTER TABLE file_events
      ADD COLUMN IF NOT EXISTS policy_id INTEGER
      REFERENCES file_policies(id)
      ON DELETE SET NULL;
    `);

    await pool.query(`
      ALTER TABLE file_events
      ADD COLUMN IF NOT EXISTS policy_action VARCHAR(20);
    `);

    await pool.query(`
      ALTER TABLE file_events
      ADD COLUMN IF NOT EXISTS policy_name VARCHAR(255);
    `);

    // =================================================
    // USB Events
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS usb_events (
        id BIGSERIAL PRIMARY KEY,

        ip_address VARCHAR(45)
          NOT NULL,

        event_type VARCHAR(20)
          NOT NULL,

        timestamp TIMESTAMPTZ
          NOT NULL DEFAULT NOW()
      );
    `);

    // =================================================
    // Threat Events
    // =================================================

    await pool.query(`
      CREATE TABLE IF NOT EXISTS threat_events (
        id BIGSERIAL PRIMARY KEY,

        agent_id VARCHAR(255) NOT NULL,

        threat_type VARCHAR(100) NOT NULL,

        severity VARCHAR(20) NOT NULL
          CHECK (
            severity IN (
              'low',
              'medium',
              'high',
              'critical'
            )
          ),

        title VARCHAR(255) NOT NULL,

        description TEXT,

        file_name TEXT,

        file_path TEXT,

        process_name VARCHAR(255),

        command_line TEXT,

        username VARCHAR(255),

        ip_address VARCHAR(45),

        sha256 VARCHAR(64),

        status VARCHAR(20)
          NOT NULL DEFAULT 'open'
          CHECK (
            status IN (
              'open',
              'investigating',
              'resolved'
            )
          ),

        detected_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW(),

        created_at TIMESTAMPTZ
          NOT NULL DEFAULT NOW()
      );
    `);

    // =================================================
    // Indexes
    // =================================================

    await pool.query(`
      CREATE INDEX IF NOT EXISTS
        idx_agents_agent_id

      ON agents (agent_id);

      CREATE INDEX IF NOT EXISTS
        idx_agents_status

      ON agents (status);

      CREATE INDEX IF NOT EXISTS
        idx_agents_group_id

      ON agents (group_id);

      CREATE INDEX IF NOT EXISTS
        idx_metrics_agent_id

      ON metrics (agent_id);

      CREATE INDEX IF NOT EXISTS
        idx_metrics_timestamp

      ON metrics (timestamp);

      CREATE INDEX IF NOT EXISTS
        idx_file_events_agent_id

      ON file_events (agent_id);

      CREATE INDEX IF NOT EXISTS
        idx_file_events_timestamp

      ON file_events (timestamp);

      CREATE INDEX IF NOT EXISTS
        idx_file_events_extension

      ON file_events (file_extension);

      CREATE INDEX IF NOT EXISTS
        idx_file_policies_group_id

      ON file_policies (group_id);

      CREATE INDEX IF NOT EXISTS
        idx_file_policies_extension

      ON file_policies (extension);

      CREATE INDEX IF NOT EXISTS
        idx_usb_events_ip_address

      ON usb_events (ip_address);

      CREATE INDEX IF NOT EXISTS
        idx_usb_events_timestamp

      ON usb_events (timestamp);

      CREATE INDEX IF NOT EXISTS
        idx_threat_events_agent

      ON threat_events (agent_id);

      CREATE INDEX IF NOT EXISTS
        idx_threat_events_severity

      ON threat_events (severity);

      CREATE INDEX IF NOT EXISTS
        idx_threat_events_status

      ON threat_events (status);

      CREATE INDEX IF NOT EXISTS
        idx_threat_events_detected_at

      ON threat_events (detected_at);

      CREATE UNIQUE INDEX IF NOT EXISTS
        idx_file_policies_effective_scope

      ON file_policies (
        COALESCE(group_id, 0),
        extension,
        action
      );
    `);

    console.log(
      'Database schema initialized successfully'
    );

    return true;

  } catch (error) {
    console.error(
      'Database initialization failed:',
      error.message
    );

    return false;
  }
}

/*
 * =====================================================
 * EXPORTS
 * =====================================================
 */

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
};