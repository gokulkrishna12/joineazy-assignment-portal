const db = require('../config/db');

// GET /api/courses (Role-aware: Student sees enrolled courses + progress; Admin sees courses taught + analytics)
const getCourses = async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      const [coursesRes, enrollRes, assignRes, groupsCountRes, subRes] = await Promise.all([
        db.query(
          `SELECT c.*, u.name AS professor_name
           FROM courses c
           LEFT JOIN users u ON u.id = c.professor_id
           ORDER BY c.code ASC`
        ),
        db.query(`SELECT course_id, COUNT(*)::int AS student_count FROM course_enrollments GROUP BY course_id`),
        db.query(`SELECT id, course_id, submission_type, assign_to_all FROM assignments`),
        db.query(`SELECT COUNT(*)::int AS count FROM groups`),
        db.query(`SELECT assignment_id, COUNT(*)::int AS confirmed_count FROM submissions GROUP BY assignment_id`),
      ]);

      const totalGroups = groupsCountRes.rows[0].count;
      const enrollMap = {};
      for (const r of enrollRes.rows) enrollMap[r.course_id] = r.student_count;

      const subMap = {};
      for (const r of subRes.rows) subMap[r.assignment_id] = r.confirmed_count;

      const courses = coursesRes.rows.map((c) => {
        const studentCount = enrollMap[c.id] || 0;
        const courseAssignments = assignRes.rows.filter((a) => a.course_id === c.id);
        let expectedSubmissions = 0;
        let confirmedSubmissions = 0;

        for (const a of courseAssignments) {
          const expected = a.submission_type === 'INDIVIDUAL' ? studentCount : totalGroups;
          expectedSubmissions += expected;
          confirmedSubmissions += subMap[a.id] || 0;
        }

        const pendingSubmissions = Math.max(0, expectedSubmissions - confirmedSubmissions);
        const completionRate =
          expectedSubmissions > 0
            ? Math.min(100, Math.round((confirmedSubmissions / expectedSubmissions) * 100))
            : 0;

        return {
          ...c,
          student_count: studentCount,
          assignment_count: courseAssignments.length,
          confirmed_submissions: confirmedSubmissions,
          pending_submissions: pendingSubmissions,
          expected_submissions: expectedSubmissions,
          completion_rate: completionRate,
        };
      });

      return res.json({ courses });
    }

    // STUDENT VIEW: Auto-enroll newly registered students if they have 0 enrollments
    const existingEnroll = await db.query(
      `SELECT COUNT(*)::int AS count FROM course_enrollments WHERE student_id = $1`,
      [req.user.id]
    );
    if (existingEnroll.rows[0].count === 0) {
      await db.query(
        `INSERT INTO course_enrollments (course_id, student_id)
         SELECT id, $1 FROM courses ON CONFLICT DO NOTHING`,
        [req.user.id]
      );
    }

    const [coursesRes, myGroupsRes, assignRes, mySubsRes] = await Promise.all([
      db.query(
        `SELECT c.*, u.name AS professor_name, ce.enrolled_at
         FROM courses c
         INNER JOIN course_enrollments ce ON ce.course_id = c.id AND ce.student_id = $1
         LEFT JOIN users u ON u.id = c.professor_id
         ORDER BY c.code ASC`,
        [req.user.id]
      ),
      db.query(`SELECT group_id FROM group_members WHERE user_id = $1`, [req.user.id]),
      db.query(
        `SELECT a.id, a.course_id, a.submission_type, a.assign_to_all, a.due_date
         FROM assignments a
         WHERE a.course_id IN (SELECT course_id FROM course_enrollments WHERE student_id = $1)`,
        [req.user.id]
      ),
      db.query(
        `SELECT assignment_id, group_id, student_id
         FROM submissions
         WHERE student_id = $1
            OR group_id IN (SELECT group_id FROM group_members WHERE user_id = $1)`,
        [req.user.id]
      ),
    ]);

    const submittedAssignmentIds = new Set(mySubsRes.rows.map((s) => s.assignment_id));

    const courses = coursesRes.rows.map((c) => {
      const courseAssignments = assignRes.rows.filter((a) => a.course_id === c.id);
      const total = courseAssignments.length;
      const completed = courseAssignments.filter((a) => submittedAssignmentIds.has(a.id)).length;
      const pending = total - completed;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const upcoming = courseAssignments
        .filter((a) => !submittedAssignmentIds.has(a.id))
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))[0];

      return {
        ...c,
        assignment_count: total,
        completed_count: completed,
        pending_count: pending,
        completion_rate: completionRate,
        next_due_date: upcoming ? upcoming.due_date : null,
      };
    });

    res.json({ courses, my_group_count: myGroupsRes.rows.length });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load courses', error: err.message });
  }
};

// GET /api/courses/:id (Single course details)
const getCourseById = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT c.*, u.name AS professor_name,
              (SELECT COUNT(*)::int FROM course_enrollments WHERE course_id = c.id) AS student_count
       FROM courses c
       LEFT JOIN users u ON u.id = c.professor_id
       WHERE c.id = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json({ course: result.rows[0] });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch course', error: err.message });
  }
};

module.exports = { getCourses, getCourseById };