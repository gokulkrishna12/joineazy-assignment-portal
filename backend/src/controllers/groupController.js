const db = require('../config/db');

// POST /api/groups (Student creates a group and becomes leader)
const createGroup = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ message: 'Group name is required.' });
  }

  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    const groupResult = await client.query(
      `INSERT INTO groups (name, created_by)
       VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name.trim(), req.user.id]
    );
    const group = groupResult.rows[0];

    await client.query(
      `INSERT INTO group_members (group_id, user_id, is_leader)
       VALUES ($1, $2, TRUE)`,
      [group.id, req.user.id]
    );

    const creatorRes = await client.query(
      `SELECT id, name, email, student_id FROM users WHERE id = $1`,
      [req.user.id]
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Group created successfully',
      group: {
        ...group,
        members: [{ ...creatorRes.rows[0], is_leader: true }],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: 'Failed to create group', error: err.message });
  } finally {
    client.release();
  }
};

// GET /api/groups/my (Student views groups they belong to)
const getMyGroups = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.created_by, g.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'student_id', u.student_id,
              'is_leader', gm_all.is_leader
            ) ORDER BY gm_all.is_leader DESC, gm_all.joined_at ASC
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS members
       FROM groups g
       INNER JOIN group_members gm_me
         ON gm_me.group_id = g.id AND gm_me.user_id = $1
       LEFT JOIN group_members gm_all ON gm_all.group_id = g.id
       LEFT JOIN users u ON u.id = gm_all.user_id
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [req.user.id]
    );

    res.json({ groups: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load groups', error: err.message });
  }
};

// GET /api/groups (Admin views all groups for assignment targeting & tracking)
const getAllGroups = async (req, res) => {
  try {
    const result = await db.query(
      `SELECT g.id, g.name, g.created_by, g.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', u.id,
              'name', u.name,
              'email', u.email,
              'student_id', u.student_id,
              'is_leader', gm.is_leader
            ) ORDER BY gm.is_leader DESC, gm.joined_at ASC
          ) FILTER (WHERE u.id IS NOT NULL),
          '[]'
        ) AS members
       FROM groups g
       LEFT JOIN group_members gm ON gm.group_id = g.id
       LEFT JOIN users u ON u.id = gm.user_id
       GROUP BY g.id
       ORDER BY g.created_at DESC`
    );

    res.json({ groups: result.rows });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch all groups', error: err.message });
  }
};

// POST /api/groups/:groupId/members (Add member by student email or student_id)
const addMember = async (req, res) => {
  try {
    const { groupId } = req.params;
    const identifier = (req.body.identifier || req.body.email || req.body.student_id || '').trim();

    if (!identifier) {
      return res.status(400).json({ message: 'Provide a student email or Student ID.' });
    }

    // Verify requesting user belongs to this group
    const membership = await db.query(
      `SELECT id FROM group_members WHERE group_id = $1 AND user_id = $2`,
      [groupId, req.user.id]
    );
    if (membership.rows.length === 0) {
      return res.status(403).json({ message: 'You must be a member of this group to add teammates.' });
    }

    // Find student by email or student_id
    const studentRes = await db.query(
      `SELECT id, name, email, student_id
       FROM users
       WHERE (LOWER(email) = LOWER($1) OR LOWER(student_id) = LOWER($1))
         AND role = 'STUDENT'`,
      [identifier]
    );

    const student = studentRes.rows[0];
    if (!student) {
      return res.status(404).json({ message: 'No student found with that email or Student ID.' });
    }

    await db.query(
      `INSERT INTO group_members (group_id, user_id, is_leader)
       VALUES ($1, $2, FALSE)`,
      [groupId, student.id]
    );

    res.status(201).json({
      message: `${student.name} added to the group`,
      member: { ...student, is_leader: false },
    });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'This student is already in the group.' });
    }
    res.status(500).json({ message: 'Failed to add member', error: err.message });
  }
};

// DELETE /api/groups/:groupId/members/:userId (Leader removes member, or member leaves)
const removeMember = async (req, res) => {
  try {
    const { groupId, userId } = req.params;
    const targetUserId = Number(userId);

    const groupRes = await db.query(`SELECT created_by FROM groups WHERE id = $1`, [groupId]);
    if (groupRes.rows.length === 0) {
      return res.status(404).json({ message: 'Group not found.' });
    }

    const creatorId = groupRes.rows[0].created_by;
    if (targetUserId === creatorId) {
      return res.status(400).json({ message: 'Group leader cannot be removed.' });
    }

    if (req.user.id !== creatorId && req.user.id !== targetUserId) {
      return res.status(403).json({ message: 'Only the group leader can remove other members.' });
    }

    const delRes = await db.query(
      `DELETE FROM group_members WHERE group_id = $1 AND user_id = $2 RETURNING id`,
      [groupId, targetUserId]
    );

    if (delRes.rows.length === 0) {
      return res.status(404).json({ message: 'Member not found in this group.' });
    }

    res.json({ message: 'Member removed from group.' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to remove member', error: err.message });
  }
};

module.exports = { createGroup, getMyGroups, getAllGroups, addMember, removeMember };