const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./db');
const initDb = require('./initDb');

const seed = async () => {
  await initDb();
  const hash = await bcrypt.hash('password123', 10);

  // 1. Upsert Demo Professor & 4 Demo Students
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

  // 2. Upsert 3 Demo Courses
  const upsertCourse = async (code, title, description, semester, accentColor) => {
    const res = await db.query(
      `INSERT INTO courses (code, title, description, semester, accent_color, professor_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (code) DO UPDATE
       SET title = EXCLUDED.title,
           description = EXCLUDED.description,
           semester = EXCLUDED.semester,
           accent_color = EXCLUDED.accent_color,
           professor_id = EXCLUDED.professor_id
       RETURNING id, code`,
      [code, title, description, semester, accentColor, prof.id]
    );
    return res.rows[0];
  };

  const c1 = await upsertCourse(
    'CS301',
    'Full Stack Web Engineering',
    'Modern React, Node.js, REST APIs, JWT security, and responsive UI architecture.',
    'Fall 2026',
    '#6366f1'
  );
  const c2 = await upsertCourse(
    'CS302',
    'Database Management Systems',
    'Relational modeling, PostgreSQL indexing, transactions, and query optimization.',
    'Fall 2026',
    '#10b981'
  );
  const c3 = await upsertCourse(
    'CS303',
    'Cloud & DevOps Architecture',
    'Docker containers, CI/CD pipelines, cloud deployments, and observability.',
    'Fall 2026',
    '#f59e0b'
  );

  // 3. Enroll All 4 Students into the Courses
  const studentIds = [gokul.id, arjun.id, priya.id, karthik.id];
  const courseIds = [c1.id, c2.id, c3.id];
  for (const cid of courseIds) {
    for (const sid of studentIds) {
      await db.query(
        `INSERT INTO course_enrollments (course_id, student_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [cid, sid]
      );
    }
  }

  // 4. Ensure Demo Groups Exist with Explicit leader_id
  const ensureGroup = async (name, leaderId) => {
    const existing = await db.query(`SELECT id FROM groups WHERE name = $1 LIMIT 1`, [name]);
    if (existing.rows.length > 0) {
      await db.query(`UPDATE groups SET leader_id = $1 WHERE id = $2`, [leaderId, existing.rows[0].id]);
      return existing.rows[0].id;
    }
    const created = await db.query(
      `INSERT INTO groups (name, created_by, leader_id) VALUES ($1, $2, $2) RETURNING id`,
      [name, leaderId]
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

  // 5. Ensure Course-Linked Assignments (Mix of GROUP & INDIVIDUAL)
  const ensureAssignment = async (courseId, title, description, submissionType, daysAhead, link, assignToAll) => {
    const existing = await db.query(`SELECT id FROM assignments WHERE title = $1 LIMIT 1`, [title]);
    if (existing.rows.length > 0) {
      await db.query(
        `UPDATE assignments SET course_id = $1, submission_type = $2 WHERE id = $3`,
        [courseId, submissionType, existing.rows[0].id]
      );
      return existing.rows[0].id;
    }
    const created = await db.query(
      `INSERT INTO assignments (course_id, title, description, submission_type, due_date, onedrive_link, assign_to_all, created_by)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' days')::interval, $6, $7, $8)
       RETURNING id`,
      [courseId, title, description, submissionType, daysAhead, link, assignToAll, prof.id]
    );
    return created.rows[0].id;
  };

  // CS302 - DBMS
  const a1 = await ensureAssignment(
    c2.id,
    'System Design & ER Modeling',
    'Design the normalized PostgreSQL schema and upload your ER diagram PDF to OneDrive.',
    'GROUP',
    4,
    'https://onedrive.live.com/?id=joineazy-assignment-1',
    true
  );
  const a2 = await ensureAssignment(
    c2.id,
    'SQL Indexing & Query Plan Lab',
    'Benchmark B-Tree vs GIN indexes on 100k rows and upload your EXPLAIN ANALYZE report.',
    'INDIVIDUAL',
    6,
    'https://onedrive.live.com/?id=joineazy-assignment-sql',
    true
  );

  // CS301 - Full Stack
  const a3 = await ensureAssignment(
    c1.id,
    'REST API & JWT Security Report',
    'Implement role-based JWT auth endpoints and upload Postman test screenshots.',
    'INDIVIDUAL',
    5,
    'https://onedrive.live.com/?id=joineazy-assignment-2',
    true
  );
  await ensureAssignment(
    c1.id,
    'Responsive Dashboard & Micro-Interactions',
    'Build the course-centric student & professor dashboards with Tailwind CSS and animations.',
    'GROUP',
    8,
    'https://onedrive.live.com/?id=joineazy-assignment-ui',
    true
  );

  // CS303 - Cloud & DevOps
  const a5 = await ensureAssignment(
    c3.id,
    'Docker Deployment Bonus Lab',
    'Containerize the full stack with docker-compose and upload compose logs.',
    'GROUP',
    10,
    'https://onedrive.live.com/?id=joineazy-assignment-3',
    false
  );
  await ensureAssignment(
    c3.id,
    'CI/CD Pipeline & Health Monitoring',
    'Configure automated builds on Netlify + Railway and submit your deployment checklist.',
    'INDIVIDUAL',
    12,
    'https://onedrive.live.com/?id=joineazy-assignment-cicd',
    true
  );

  await db.query(
    `INSERT INTO assignment_groups (assignment_id, group_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [a5, g1]
  );

  // 6. Seed Sample Group & Individual Submissions
  await db.query(
    `INSERT INTO submissions (assignment_id, group_id, submitted_by, status) VALUES
      ($1, $2, $3, 'CONFIRMED'),
      ($1, $4, $5, 'CONFIRMED')
     ON CONFLICT (assignment_id, group_id) DO NOTHING`,
    [a1, g1, gokul.id, g2, priya.id]
  );

  await db.query(
    `INSERT INTO submissions (assignment_id, group_id, student_id, submitted_by, status) VALUES
      ($1, NULL, $2, $2, 'CONFIRMED'),
      ($3, NULL, $2, $2, 'CONFIRMED'),
      ($3, NULL, $4, $4, 'CONFIRMED')
     ON CONFLICT DO NOTHING`,
    [a2, gokul.id, a3, priya.id]
  );

  console.log('Round 2 Demo seed synced! Logins (password: password123):');
  console.log('  Professor: prof@joineazy.com');
  console.log('  Student (Leader): gokul@joineazy.com (STU101) | priya@joineazy.com (STU103)');
  console.log('  Student (Member): arjun@joineazy.com (STU102) | karthik@joineazy.com (STU104)');
  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});