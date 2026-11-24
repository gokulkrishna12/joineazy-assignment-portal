const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./db');
const initDb = require('./initDb');

const seed = async () => {
  await initDb();
  const hash = await bcrypt.hash('password123', 10);

  // 1. Upsert Demo Professor & 4 Demo Students (always resets demo password to password123)
  const upsertUser = async (name, email, studentId, role) => {
    const res = await db.query(
      `INSERT INTO users (name, email, student_id, password_hash, role, is_verified)
       VALUES ($1, $2, $3, $4, $5, TRUE)
       ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           role = EXCLUDED.role,
           is_verified = TRUE
       RETURNING id, email`,
      [name, email, studentId, hash, role]
    );
    return res.rows[0];
  };

  const prof = await upsertUser('Dr. Meera Nair', 'prof@joineazy.com', null, 'ADMIN');
  const gokul = await upsertUser('Gokul Krishna', 'gokul@joineazy.com', 'STU101', 'STUDENT');
  const arjun = await upsertUser('Arjun Menon', 'arjun@joineazy.com', 'STU102', 'STUDENT');
  const priya = await upsertUser('Priya Sharma', 'priya@joineazy.com', 'STU103', 'STUDENT');
  const karthik = await upsertUser('Karthik Raj', 'karthik@joineazy.com', 'STU104', 'STUDENT');

  // 2. Ensure Demo Groups Exist
  const ensureGroup = async (name, creatorId) => {
    const existing = await db.query(`SELECT id FROM groups WHERE name = $1 LIMIT 1`, [name]);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const created = await db.query(
      `INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id`,
      [name, creatorId]
    );
    return created.rows[0].id;
  };

  const g1 = await ensureGroup('Team Alpha', gokul.id);
  const g2 = await ensureGroup('Code Wizards', priya.id);

  await db.query(
    `INSERT INTO group_members (group_id, user_id, is_leader) VALUES
      ($1, $2, TRUE), ($1, $3, FALSE),
      ($4, $5, TRUE), ($4, $6, FALSE)
     ON CONFLICT (group_id, user_id) DO NOTHING`,
    [g1, gokul.id, arjun.id, g2, priya.id, karthik.id]
  );

  // 3. Ensure Demo Assignments Exist
  const ensureAssignment = async (title, description, daysAhead, link, assignToAll) => {
    const existing = await db.query(`SELECT id FROM assignments WHERE title = $1 LIMIT 1`, [title]);
    if (existing.rows.length > 0) return existing.rows[0].id;
    const created = await db.query(
      `INSERT INTO assignments (title, description, due_date, onedrive_link, assign_to_all, created_by)
       VALUES ($1, $2, NOW() + ($3 || ' days')::interval, $4, $5, $6)
       RETURNING id`,
      [title, description, daysAhead, link, assignToAll, prof.id]
    );
    return created.rows[0].id;
  };

  const a1 = await ensureAssignment(
    'System Design & ER Modeling',
    'Design the normalized PostgreSQL schema and upload your ER diagram PDF to OneDrive.',
    4,
    'https://onedrive.live.com/?id=joineazy-assignment-1',
    true
  );

  await ensureAssignment(
    'REST API & JWT Security Report',
    'Implement role-based JWT auth endpoints and upload Postman test screenshots.',
    7,
    'https://onedrive.live.com/?id=joineazy-assignment-2',
    true
  );

  const a3 = await ensureAssignment(
    'Docker Deployment Bonus Lab',
    'Containerize the full stack with docker-compose and upload compose logs.',
    10,
    'https://onedrive.live.com/?id=joineazy-assignment-3',
    false
  );

  await db.query(
    `INSERT INTO assignment_groups (assignment_id, group_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [a3, g1]
  );

  // 4. Ensure Sample Confirmed Submissions Exist
  await db.query(
    `INSERT INTO submissions (assignment_id, group_id, submitted_by, status) VALUES
      ($1, $2, $3, 'CONFIRMED'),
      ($1, $4, $5, 'CONFIRMED')
     ON CONFLICT (assignment_id, group_id) DO NOTHING`,
    [a1, g1, gokul.id, g2, priya.id]
  );

  console.log('Demo seed synced! Logins (password: password123):');
  console.log('  Admin:   prof@joineazy.com');
  console.log('  Student: gokul@joineazy.com (STU101) | priya@joineazy.com (STU103)');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});