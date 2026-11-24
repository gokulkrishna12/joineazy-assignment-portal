const db = require('../config/db');

// POST /api/submissions/confirm (Student confirms group submission after 2-step verification)
const confirmSubmission = async (req, res) => {
  try {
    const { assignment_id, group_id, confirmed } = req.body;

    if (!assignment_id || !group_id) {
      return res.status(400).json({ message: 'Assignment ID and Group ID are required.' });
    }

    if (confirmed !== true) {
      return res.status(400).json({ message: 'Two-step submission confirmation is required.' });
    }

    // 1. Verify student belongs to this group
    const memberRes = await db.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [group_id, req.user.id]
    );
    if (memberRes.rows.length === 0) {
      return res.status(403).json({ message: 'You are not a member of the selected group.' });
    }

    // 2. Verify assignment exists and targets this group
    const assignRes = await db.query(
      `SELECT id, title, assign_to_all FROM assignments WHERE id = $1`,
      [assignment_id]
    );
    const assignment = assignRes.rows[0];
    if (!assignment) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    if (!assignment.assign_to_all) {
      const agRes = await db.query(
        `SELECT 1 FROM assignment_groups WHERE assignment_id = $1 AND group_id = $2`,
        [assignment_id, group_id]
      );
      if (agRes.rows.length === 0) {
        return res.status(403).json({ message: 'This assignment is not assigned to your group.' });
      }
    }

    // 3. Record confirmed submission
    const subRes = await db.query(
      `INSERT INTO submissions (assignment_id, group_id, submitted_by, status)
       VALUES ($1, $2, $3, 'CONFIRMED')
       RETURNING *`,
      [assignment_id, group_id, req.user.id]
    );

    res.status(201).json({
      message: 'Submission confirmed successfully!',
      submission: subRes.rows[0],
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Your group has already confirmed this assignment.' });
    }
    res.status(500).json({ message: 'Failed to confirm submission', error: err.message });
  }
};

// GET /api/submissions/analytics (Admin dashboard: summary, charts, group-wise & student-wise tracking)
const getAnalytics = async (req, res) => {
  try {
    const [studentsRes, groupsRes, membersRes, assignmentsRes, agRes, submissionsRes] =
      await Promise.all([
        db.query(
          `SELECT id, name, email, student_id, created_at
           FROM users
           WHERE role = 'STUDENT'
           ORDER BY name ASC`
        ),
        db.query(`SELECT id, name, created_by, created_at FROM groups ORDER BY name ASC`),
        db.query(
          `SELECT gm.group_id, gm.user_id, gm.is_leader, u.name, u.email, u.student_id
           FROM group_members gm
           JOIN users u ON u.id = gm.user_id`
        ),
        db.query(`SELECT id, title, due_date, assign_to_all, onedrive_link FROM assignments ORDER BY due_date ASC`),
        db.query(`SELECT assignment_id, group_id FROM assignment_groups`),
        db.query(
          `SELECT s.id, s.assignment_id, s.group_id, s.submitted_by, s.status, s.confirmed_at,
                  a.title AS assignment_title, g.name AS group_name, u.name AS submitted_by_name
           FROM submissions s
           JOIN assignments a ON a.id = s.assignment_id
           JOIN groups g ON g.id = s.group_id
           LEFT JOIN users u ON u.id = s.submitted_by
           ORDER BY s.confirmed_at DESC`
        ),
      ]);

    const students = studentsRes.rows;
    const groups = groupsRes.rows;
    const members = membersRes.rows;
    const assignments = assignmentsRes.rows;
    const assignmentGroups = agRes.rows;
    const submissions = submissionsRes.rows;

    // Helper lookup maps
    const agByAssignment = {};
    for (const row of assignmentGroups) {
      if (!agByAssignment[row.assignment_id]) agByAssignment[row.assignment_id] = new Set();
      agByAssignment[row.assignment_id].add(row.group_id);
    }

    const subKeySet = new Set(submissions.map((s) => `${s.assignment_id}:${s.group_id}`));
    const subByKey = {};
    for (const s of submissions) {
      subByKey[`${s.assignment_id}:${s.group_id}`] = s;
    }

    // 1. Assignment-wise stats (for bar chart)
    let totalExpectedSubmissions = 0;
    const assignmentStats = assignments.map((a) => {
      const targetGroupIds = a.assign_to_all
        ? groups.map((g) => g.id)
        : Array.from(agByAssignment[a.id] || []);

      const targetCount = targetGroupIds.length;
      const confirmedCount = targetGroupIds.filter((gid) => subKeySet.has(`${a.id}:${gid}`)).length;
      totalExpectedSubmissions += targetCount;

      return {
        id: a.id,
        title: a.title,
        due_date: a.due_date,
        assign_to_all: a.assign_to_all,
        target_groups_count: targetCount,
        confirmed_count: confirmedCount,
        pending_count: Math.max(0, targetCount - confirmedCount),
        completion_rate: targetCount > 0 ? Math.round((confirmedCount / targetCount) * 100) : 0,
      };
    });

    // 2. Group-wise tracking & performance
    const groupTracking = groups.map((g) => {
      const groupMembers = members
        .filter((m) => m.group_id === g.id)
        .map((m) => ({
          id: m.user_id,
          name: m.name,
          email: m.email,
          student_id: m.student_id,
          is_leader: m.is_leader,
        }));

      const applicableAssignments = assignments.filter(
        (a) => a.assign_to_all || (agByAssignment[a.id] && agByAssignment[a.id].has(g.id))
      );

      const assignmentStatuses = applicableAssignments.map((a) => {
        const sub = subByKey[`${a.id}:${g.id}`];
        return {
          assignment_id: a.id,
          assignment_title: a.title,
          due_date: a.due_date,
          status: sub ? 'CONFIRMED' : 'PENDING',
          confirmed_at: sub ? sub.confirmed_at : null,
          submitted_by_name: sub ? sub.submitted_by_name : null,
        };
      });

      const confirmedCount = assignmentStatuses.filter((s) => s.status === 'CONFIRMED').length;
      const assignedCount = applicableAssignments.length;

      return {
        id: g.id,
        name: g.name,
        member_count: groupMembers.length,
        members: groupMembers,
        assigned_count: assignedCount,
        confirmed_count: confirmedCount,
        completion_rate: assignedCount > 0 ? Math.round((confirmedCount / assignedCount) * 100) : 0,
        assignment_statuses: assignmentStatuses,
      };
    });

    // 3. Student-wise tracking
    const studentTracking = students.map((st) => {
      const studentGroupIds = members.filter((m) => m.user_id === st.id).map((m) => m.group_id);
      const studentGroups = groups
        .filter((g) => studentGroupIds.includes(g.id))
        .map((g) => ({ id: g.id, name: g.name }));

      const applicableAssignments = assignments.filter(
        (a) =>
          a.assign_to_all ||
          studentGroupIds.some((gid) => agByAssignment[a.id] && agByAssignment[a.id].has(gid))
      );

      let confirmedCount = 0;
      const assignmentStatuses = applicableAssignments.map((a) => {
        const matchedSub = studentGroupIds
          .map((gid) => subByKey[`${a.id}:${gid}`])
          .find(Boolean);

        if (matchedSub) confirmedCount += 1;
        return {
          assignment_id: a.id,
          assignment_title: a.title,
          status: matchedSub ? 'CONFIRMED' : 'PENDING',
          group_name: matchedSub ? matchedSub.group_name : null,
          confirmed_at: matchedSub ? matchedSub.confirmed_at : null,
        };
      });

      const assignedCount = applicableAssignments.length;
      return {
        id: st.id,
        name: st.name,
        email: st.email,
        student_id: st.student_id,
        groups: studentGroups,
        assigned_count: assignedCount,
        confirmed_count: confirmedCount,
        completion_rate: assignedCount > 0 ? Math.round((confirmedCount / assignedCount) * 100) : 0,
        assignment_statuses: assignmentStatuses,
      };
    });

    const totalConfirmed = submissions.length;
    const overallCompletionRate =
      totalExpectedSubmissions > 0
        ? Math.round((totalConfirmed / totalExpectedSubmissions) * 100)
        : 0;

    res.json({
      summary: {
        total_students: students.length,
        total_groups: groups.length,
        total_assignments: assignments.length,
        total_expected_submissions: totalExpectedSubmissions,
        total_confirmed_submissions: totalConfirmed,
        overall_completion_rate: overallCompletionRate,
      },
      assignment_stats: assignmentStats,
      group_tracking: groupTracking,
      student_tracking: studentTracking,
      recent_confirmations: submissions.slice(0, 10),
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load analytics', error: err.message });
  }
};

module.exports = { confirmSubmission, getAnalytics };