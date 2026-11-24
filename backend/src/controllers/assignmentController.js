const db = require('../config/db');

// POST /api/assignments (Admin creates an assignment for all students or specific groups)
const createAssignment = async (req, res) => {
  const {
    title,
    description = '',
    due_date,
    onedrive_link,
    assign_to_all = true,
    group_ids = [],
  } = req.body;

  if (!title || !due_date || !onedrive_link) {
    return res.status(400).json({ message: 'Title, due date, and OneDrive link are required.' });
  }

  if (!assign_to_all && (!Array.isArray(group_ids) || group_ids.length === 0)) {
    return res.status(400).json({ message: 'Select at least one group when not assigning to all.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const assignRes = await client.query(
      `INSERT INTO assignments (title, description, due_date, onedrive_link, assign_to_all, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title.trim(), description.trim(), due_date, onedrive_link.trim(), Boolean(assign_to_all), req.user.id]
    );

    const assignment = assignRes.rows[0];

    if (!assignment.assign_to_all && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          `INSERT INTO assignment_groups (assignment_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [assignment.id, Number(gid)]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Assignment created successfully',
      assignment: {
        ...assignment,
        target_group_ids: assignment.assign_to_all ? [] : group_ids.map(Number),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Failed to create assignment', error: err.message });
  } finally {
    client.release();
  }
};

// PUT /api/assignments/:id (Admin edits an existing assignment)
const updateAssignment = async (req, res) => {
  const { id } = req.params;
  const {
    title,
    description = '',
    due_date,
    onedrive_link,
    assign_to_all = true,
    group_ids = [],
  } = req.body;

  if (!title || !due_date || !onedrive_link) {
    return res.status(400).json({ message: 'Title, due date, and OneDrive link are required.' });
  }

  if (!assign_to_all && (!Array.isArray(group_ids) || group_ids.length === 0)) {
    return res.status(400).json({ message: 'Select at least one group when not assigning to all.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const updateRes = await client.query(
      `UPDATE assignments
       SET title = $1,
           description = $2,
           due_date = $3,
           onedrive_link = $4,
           assign_to_all = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
       RETURNING *`,
      [title.trim(), description.trim(), due_date, onedrive_link.trim(), Boolean(assign_to_all), id]
    );

    if (updateRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Assignment not found.' });
    }

    const assignment = updateRes.rows[0];

    await client.query(`DELETE FROM assignment_groups WHERE assignment_id = $1`, [id]);

    if (!assignment.assign_to_all && group_ids.length > 0) {
      for (const gid of group_ids) {
        await client.query(
          `INSERT INTO assignment_groups (assignment_id, group_id)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [assignment.id, Number(gid)]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      message: 'Assignment updated successfully',
      assignment: {
        ...assignment,
        target_group_ids: assignment.assign_to_all ? [] : group_ids.map(Number),
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Failed to update assignment', error: err.message });
  } finally {
    client.release();
  }
};

// DELETE /api/assignments/:id (Admin deletes an assignment)
const deleteAssignment = async (req, res) => {
  try {
    const result = await db.query(`DELETE FROM assignments WHERE id = $1 RETURNING id`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Assignment not found.' });
    }
    res.json({ message: 'Assignment deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete assignment', error: err.message });
  }
};

// GET /api/assignments (Role-aware: Admin sees all + counts, Student sees eligible + submission progress)
const getAssignments = async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      const [assignRes, agRes, groupsCountRes, subRes] = await Promise.all([
        db.query(
          `SELECT a.*, u.name AS creator_name
           FROM assignments a
           LEFT JOIN users u ON u.id = a.created_by
           ORDER BY a.due_date ASC, a.created_at DESC`
        ),
        db.query(
          `SELECT ag.assignment_id, ag.group_id, g.name AS group_name
           FROM assignment_groups ag
           JOIN groups g ON g.id = ag.group_id`
        ),
        db.query(`SELECT COUNT(*)::int AS count FROM groups`),
        db.query(`SELECT assignment_id, COUNT(*)::int AS confirmed_count FROM submissions GROUP BY assignment_id`),
      ]);

      const totalGroups = groupsCountRes.rows[0].count;
      const agMap = {};
      for (const row of agRes.rows) {
        if (!agMap[row.assignment_id]) agMap[row.assignment_id] = [];
        agMap[row.assignment_id].push({ id: row.group_id, name: row.group_name });
      }

      const subMap = {};
      for (const row of subRes.rows) {
        subMap[row.assignment_id] = row.confirmed_count;
      }

      const assignments = assignRes.rows.map((a) => {
        const targetGroups = a.assign_to_all ? [] : agMap[a.id] || [];
        const totalTargetGroups = a.assign_to_all ? totalGroups : targetGroups.length;
        const confirmedCount = subMap[a.id] || 0;

        return {
          ...a,
          target_groups: targetGroups,
          target_group_ids: targetGroups.map((g) => g.id),
          total_target_groups: totalTargetGroups,
          confirmed_count: confirmedCount,
        };
      });

      return res.json({ assignments });
    }

    // STUDENT VIEW
    const myGroupsRes = await db.query(
      `SELECT g.id, g.name
       FROM groups g
       INNER JOIN group_members gm ON gm.group_id = g.id
       WHERE gm.user_id = $1
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );
    const myGroups = myGroupsRes.rows;
    const myGroupIds = myGroups.map((g) => g.id);

    const [assignRes, agRes, mySubsRes] = await Promise.all([
      db.query(
        `SELECT a.*, u.name AS creator_name
         FROM assignments a
         LEFT JOIN users u ON u.id = a.created_by
         WHERE a.assign_to_all = TRUE
            OR a.id IN (
              SELECT assignment_id FROM assignment_groups WHERE group_id = ANY($1::int[])
            )
         ORDER BY a.due_date ASC, a.created_at DESC`,
        [myGroupIds]
      ),
      db.query(`SELECT assignment_id, group_id FROM assignment_groups`),
      db.query(
        `SELECT s.id, s.assignment_id, s.group_id, s.status, s.confirmed_at,
                u.name AS submitted_by_name, g.name AS group_name
         FROM submissions s
         LEFT JOIN users u ON u.id = s.submitted_by
         JOIN groups g ON g.id = s.group_id
         WHERE s.group_id = ANY($1::int[])`,
        [myGroupIds]
      ),
    ]);

    const agMap = {};
    for (const row of agRes.rows) {
      if (!agMap[row.assignment_id]) agMap[row.assignment_id] = [];
      agMap[row.assignment_id].push(row.group_id);
    }

    const assignments = assignRes.rows.map((a) => {
      const targetedIds = agMap[a.id] || [];
      const eligibleGroups = a.assign_to_all
        ? myGroups
        : myGroups.filter((g) => targetedIds.includes(g.id));

      const groupSubmissions = mySubsRes.rows.filter((s) => s.assignment_id === a.id);
      const isSubmitted = groupSubmissions.length > 0;

      return {
        ...a,
        eligible_groups: eligibleGroups,
        submissions: groupSubmissions,
        is_submitted: isSubmitted,
      };
    });

    const total = assignments.length;
    const completed = assignments.filter((a) => a.is_submitted).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    res.json({
      assignments,
      progress: { total, completed, pending: total - completed, percentage },
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch assignments', error: err.message });
  }
};

module.exports = { createAssignment, updateAssignment, deleteAssignment, getAssignments };