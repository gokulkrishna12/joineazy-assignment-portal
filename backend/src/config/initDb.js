const db = require('./db');

const initDb = async () => {
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(150) UNIQUE NOT NULL,
      student_id VARCHAR(50) UNIQUE,
      password_hash TEXT NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('STUDENT', 'ADMIN')),
      is_verified BOOLEAN DEFAULT TRUE,
      google_id VARCHAR(255) UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;

    CREATE TABLE IF NOT EXISTS email_otps (
      id SERIAL PRIMARY KEY,
      email VARCHAR(150) NOT NULL,
      otp_code VARCHAR(6) NOT NULL,
      purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('REGISTER', 'RESET')),
      expires_at TIMESTAMP NOT NULL,
      used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      code VARCHAR(20) UNIQUE NOT NULL,
      title VARCHAR(160) NOT NULL,
      description TEXT,
      semester VARCHAR(40) DEFAULT 'Fall 2026',
      accent_color VARCHAR(20) DEFAULT '#6366f1',
      professor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS course_enrollments (
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (course_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE CASCADE,
      leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE groups ADD COLUMN IF NOT EXISTS leader_id INTEGER REFERENCES users(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS group_members (
      id SERIAL PRIMARY KEY,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      is_leader BOOLEAN DEFAULT FALSE,
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (group_id, user_id)
    );

    -- Backfill leader_id on existing groups from group_members
    UPDATE groups g
    SET leader_id = gm.user_id
    FROM group_members gm
    WHERE gm.group_id = g.id AND gm.is_leader = TRUE AND g.leader_id IS NULL;

    CREATE TABLE IF NOT EXISTS assignments (
      id SERIAL PRIMARY KEY,
      course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      submission_type VARCHAR(20) NOT NULL DEFAULT 'GROUP' CHECK (submission_type IN ('INDIVIDUAL', 'GROUP')),
      due_date TIMESTAMP NOT NULL,
      onedrive_link TEXT NOT NULL,
      assign_to_all BOOLEAN DEFAULT TRUE,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE;
    ALTER TABLE assignments ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) NOT NULL DEFAULT 'GROUP';

    CREATE TABLE IF NOT EXISTS assignment_groups (
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      PRIMARY KEY (assignment_id, group_id)
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id SERIAL PRIMARY KEY,
      assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
      group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
      student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'CONFIRMED',
      confirmed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (assignment_id, group_id)
    );

    ALTER TABLE submissions ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_individual_unique
      ON submissions (assignment_id, student_id)
      WHERE group_id IS NULL AND student_id IS NOT NULL;
  `;

  await db.query(schemaSQL);
  console.log('PostgreSQL connected & all 9 Round-2 tables ready!');
};

module.exports = initDb;