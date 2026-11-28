import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import CourseGrid from '../components/CourseGrid';
import DeleteModal from '../components/DeleteModal';

export default function StudentDashboard() {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, pending: 0, percentage: 0 });
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Group management state
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [memberInputs, setMemberInputs] = useState({});

  // Custom Remove Member Modal state
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  // 2-step confirmation modal state
  const [modalAssignment, setModalAssignment] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [confirmStep, setConfirmStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [assignRes, groupRes] = await Promise.all([
        api.get('/assignments'),
        api.get('/groups/my'),
      ]);
      setAssignments(assignRes.data.assignments || []);
      setProgress(assignRes.data.progress || { total: 0, completed: 0, pending: 0, percentage: 0 });
      setGroups(groupRes.data.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    try {
      setCreatingGroup(true);
      setError('');
      await api.post('/groups', { name: newGroupName.trim() });
      setNewGroupName('');
      showToast('Group created! You are now the Group Leader.');
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create group.');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleAddMember = async (e, groupId) => {
    e.preventDefault();
    const identifier = (memberInputs[groupId] || '').trim();
    if (!identifier) return;
    try {
      setError('');
      const res = await api.post(`/groups/${groupId}/members`, { identifier });
      setMemberInputs((prev) => ({ ...prev, [groupId]: '' }));
      showToast(res.data.message || 'Member added!');
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not add member.');
    }
  };

  const confirmRemoveMember = async () => {
    if (!removeTarget) return;
    try {
      setRemoving(true);
      setError('');
      await api.delete(`/groups/${removeTarget.groupId}/members/${removeTarget.userId}`);
      setRemoveTarget(null);
      showToast(`${removeTarget.memberName} removed from ${removeTarget.groupName}.`);
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not remove member.');
      setRemoveTarget(null);
    } finally {
      setRemoving(false);
    }
  };

  const openConfirmModal = (assignment) => {
    setModalAssignment(assignment);
    setConfirmStep(1);
    if (assignment.submission_type === 'GROUP') {
      const leaderGroups = (assignment.eligible_groups || []).filter(
        (g) => g.is_leader || g.leader_id === user?.id
      );
      setSelectedGroupId(leaderGroups[0]?.id ? String(leaderGroups[0].id) : '');
    } else {
      setSelectedGroupId('');
    }
  };

  const handleConfirmSubmission = async () => {
    if (!modalAssignment) return;
    try {
      setSubmitting(true);
      setError('');
      const payload = { assignment_id: modalAssignment.id, confirmed: true };
      if (modalAssignment.submission_type === 'GROUP') {
        payload.group_id = Number(selectedGroupId);
      }
      const res = await api.post('/submissions/confirm', payload);
      setModalAssignment(null);
      showToast(res.data.message || 'Submission acknowledged!');
      await loadDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Submission confirmation failed.');
      setModalAssignment(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080d1a] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Welcome Banner & Overall Progress */}
        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-6 shadow-xl backdrop-blur-md">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome back, {user?.name || 'Student'}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Select a course below, upload your work to OneDrive, and acknowledge your submission.
              </p>
            </div>

            <div className="flex gap-3">
              <div className="min-w-[88px] rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-emerald-400">{progress.completed}</div>
                <div className="text-xs text-emerald-300/80">Confirmed</div>
              </div>
              <div className="min-w-[88px] rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-amber-400">{progress.pending}</div>
                <div className="text-xs text-amber-300/80">Pending</div>
              </div>
              <div className="min-w-[88px] rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-center">
                <div className="text-xl font-bold text-indigo-400">{progress.percentage}%</div>
                <div className="text-xs text-indigo-300/80">Progress</div>
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-400">
              <span>Overall Assignment Completion</span>
              <span>
                {progress.completed} of {progress.total} completed
              </span>
            </div>
            <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${progress.percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Alerts */}
        {toast && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 animate-fade-up">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white animate-check-pop">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* Course-Centric Cards Grid */}
        <CourseGrid role="STUDENT" />

        {/* Main 2-Column Workspace: All Assignments + My Groups */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Assignments Overview */}
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">All Assignments</h2>
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-0.5 text-xs font-semibold text-slate-300">
                {assignments.length} total
              </span>
            </div>

            {loading ? (
              <div className="filter-loading-box">
                <div className="filter-rotate-ring" />
                <p className="filter-loading-text">Loading assignments...</p>
              </div>
            ) : assignments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-10 text-center text-sm text-slate-400">
                No assignments assigned yet.
              </div>
            ) : (
              assignments.map((a) => {
                const isGroup = a.submission_type === 'GROUP';
                const latestSub = a.submissions?.[0];

                return (
                  <div
                    key={a.id}
                    className={`rounded-2xl border bg-[#0f172a]/90 p-5 shadow-lg transition ${
                      a.is_submitted
                        ? 'border-emerald-500/30'
                        : 'border-slate-800 hover:border-indigo-500/40'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-bold text-white">{a.title}</h3>
                          {a.course_code && (
                            <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-[11px] font-bold text-indigo-300">
                              {a.course_code}
                            </span>
                          )}
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              isGroup
                                ? 'border border-purple-500/30 bg-purple-500/15 text-purple-300'
                                : 'border border-sky-500/30 bg-sky-500/15 text-sky-300'
                            }`}
                          >
                            {isGroup ? 'Group' : 'Individual'}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-slate-400">{a.description}</p>
                        <p className="mt-2 text-xs text-slate-500">
                          Due: {new Date(a.due_date).toLocaleString()} • Posted by:{' '}
                          <span className="text-slate-300">{a.creator_name || 'Professor'}</span>
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          a.is_submitted
                            ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                            : 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
                        }`}
                      >
                        {a.is_submitted ? '✓ Confirmed' : 'Pending'}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      {a.is_submitted && (
                        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-2.5 text-xs text-emerald-300">
                          <span>
                            {isGroup
                              ? `Confirmed for ${latestSub?.group_name || 'Group'} by ${latestSub?.submitted_by_name || 'Leader'}`
                              : 'Confirmed individually by you'}
                          </span>
                          {latestSub?.confirmed_at && (
                            <span className="text-emerald-400/80">
                              {new Date(latestSub.confirmed_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <a
                          href={a.onedrive_link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 hover:bg-indigo-500/20"
                        >
                          Open OneDrive Link ↗
                        </a>

                        {!a.is_submitted && a.can_acknowledge && (
                          <button
                            onClick={() => openConfirmModal(a)}
                            className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500 cursor-pointer"
                          >
                            {isGroup ? 'Acknowledge as Leader' : 'Acknowledge Submission'}
                          </button>
                        )}
                      </div>

                      {!a.is_submitted && a.leader_required_message && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
                          <strong className="text-amber-300">🔒 Leader Only: </strong>
                          {a.leader_required_message}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right: My Groups */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">My Groups</h2>
              <span className="rounded-full border border-slate-700 bg-slate-800/80 px-3 py-0.5 text-xs font-semibold text-slate-300">
                {groups.length} active
              </span>
            </div>

            <form
              onSubmit={handleCreateGroup}
              className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg"
            >
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Create a New Group
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Cloud Ninjas"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={creatingGroup}
                  className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 cursor-pointer"
                >
                  {creatingGroup ? <span className="filter-rotate-sm" /> : '+ Create'}
                </button>
              </div>
            </form>

            {groups.map((g) => {
              const isLeader = g.leader_id === user?.id || g.created_by === user?.id;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-4 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">{g.name}</h3>
                      <p className="text-xs text-slate-400">{g.members?.length || 0} members</p>
                    </div>
                    {isLeader && (
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                        👑 Leader
                      </span>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    {(g.members || []).map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-3 py-2"
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">
                            {m.name}{' '}
                            {m.is_leader && <span className="text-amber-400">(Leader)</span>}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {m.email} {m.student_id ? `• ${m.student_id}` : ''}
                          </div>
                        </div>

                        {!m.is_leader && (isLeader || m.id === user?.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveTarget({
                                groupId: g.id,
                                userId: m.id,
                                memberName: m.name,
                                groupName: g.name,
                              })
                            }
                            className="member-remove-btn"
                            title="Remove member"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={(e) => handleAddMember(e, g.id)}
                    className="mt-3 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Email or Student ID (e.g. STU104)"
                      value={memberInputs[g.id] || ''}
                      onChange={(e) =>
                        setMemberInputs((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 cursor-pointer"
                    >
                      + Add
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2-Step Confirmation Modal */}
      {modalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl animate-fade-up">
            <h3 className="text-lg font-bold text-white">
              {confirmStep === 1 ? 'Step 1 of 2: Verify Upload' : 'Step 2 of 2: Confirm Acknowledgment'}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Assignment: <strong className="text-white">{modalAssignment.title}</strong>
            </p>

            {modalAssignment.submission_type === 'GROUP' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase text-slate-400">
                  Submitting as Leader for Group
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  {(modalAssignment.eligible_groups || [])
                    .filter((g) => g.is_leader || g.leader_id === user?.id)
                    .map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} (Leader)
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-xs text-indigo-200">
              {confirmStep === 1
                ? 'Please ensure your work is uploaded to the OneDrive link before proceeding.'
                : 'Once confirmed, your submission status will be recorded immediately.'}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModalAssignment(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              {confirmStep === 1 ? (
                <button
                  onClick={() => setConfirmStep(2)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 cursor-pointer"
                >
                  Yes, Uploaded →
                </button>
              ) : (
                <button
                  onClick={handleConfirmSubmission}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <span className="filter-rotate-sm" />
                      Saving...
                    </>
                  ) : (
                    'Confirm ✓'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Glassmorphism Remove Member Modal */}
      <DeleteModal
        isOpen={Boolean(removeTarget)}
        title="Remove Group Member"
        subtitle={`From ${removeTarget?.groupName || 'Group'}`}
        message={
          <>
            Are you sure you want to remove <strong>{removeTarget?.memberName}</strong> from{' '}
            <strong>{removeTarget?.groupName}</strong>?
          </>
        }
        confirmLabel="Yes, Remove"
        loading={removing}
        onCancel={() => setRemoveTarget(null)}
        onConfirm={confirmRemoveMember}
      />
    </div>
  );
}