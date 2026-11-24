import { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  UserPlus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Award,
  X,
  AlertCircle,
  Crown,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from '../components/ConfirmModal';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, pending: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);

  const [newGroupName, setNewGroupName] = useState('');
  const [memberInputs, setMemberInputs] = useState({});
  const [feedback, setFeedback] = useState({ type: '', text: '' });
  const [confirmModal, setConfirmModal] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null); // { groupId, groupName, member }
  const [busy, setBusy] = useState(false);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const fetchDashboard = async () => {
    try {
      const [groupsRes, assignRes] = await Promise.all([
        api.get('/groups/my'),
        api.get('/assignments'),
      ]);
      setGroups(groupsRes.data.groups || []);
      setAssignments(assignRes.data.assignments || []);
      setProgress(
        assignRes.data.progress || { total: 0, completed: 0, pending: 0, percentage: 0 }
      );
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to load student dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setBusy(true);
    try {
      await api.post('/groups', { name: newGroupName.trim() });
      setNewGroupName('');
      showFeedback('success', 'Group created! You can now add teammates by email or Student ID.');
      await fetchDashboard();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Could not create group.');
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async (e, groupId) => {
    e.preventDefault();
    const identifier = (memberInputs[groupId] || '').trim();
    if (!identifier) return;
    setBusy(true);
    try {
      const res = await api.post(`/groups/${groupId}/members`, { identifier });
      setMemberInputs((prev) => ({ ...prev, [groupId]: '' }));
      showFeedback('success', res.data.message);
      await fetchDashboard();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Could not add member.');
    } finally {
      setBusy(false);
    }
  };

  const executeRemoveMember = async () => {
    if (!removeTarget) return;
    setBusy(true);
    try {
      await api.delete(`/groups/${removeTarget.groupId}/members/${removeTarget.member.id}`);
      const removedName = removeTarget.member.name;
      const groupName = removeTarget.groupName;
      setRemoveTarget(null);
      showFeedback('success', `${removedName} removed from ${groupName}.`);
      await fetchDashboard();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Could not remove member.');
    } finally {
      setBusy(false);
    }
  };

  // Step 1: Student clicks "Yes, I have submitted"
  const openConfirmModal = (assignment) => {
    const submittedGroupIds = new Set((assignment.submissions || []).map((s) => s.group_id));
    const availableGroups = (assignment.eligible_groups || []).filter(
      (g) => !submittedGroupIds.has(g.id)
    );

    if (availableGroups.length === 0) {
      showFeedback('error', 'Create or join a group first before confirming a submission.');
      return;
    }

    setConfirmModal({
      assignment,
      availableGroups,
      selectedGroupId: availableGroups[0].id,
      checked: false,
    });
  };

  // Step 2: Final confirmation inside modal
  const handleFinalConfirm = async () => {
    if (!confirmModal || !confirmModal.checked) return;
    setBusy(true);
    try {
      await api.post('/submissions/confirm', {
        assignment_id: confirmModal.assignment.id,
        group_id: Number(confirmModal.selectedGroupId),
        confirmed: true,
      });
      setConfirmModal(null);
      showFeedback('success', 'Submission confirmed and recorded for your group!');
      await fetchDashboard();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to confirm submission.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* Feedback Banner */}
      {feedback.text && (
        <div
          className={`mb-5 flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback({ type: '', text: '' })}
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Progress Banner */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                Welcome back, {user?.name}
              </h2>
              {progress.percentage === 100 && progress.total > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <Award className="h-3.5 w-3.5" /> All Caught Up
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Upload your group work to OneDrive, then confirm your submission below.
            </p>
          </div>

          <div className="flex items-center gap-4 text-center">
            <div className="rounded-xl bg-emerald-50 px-4 py-2">
              <p className="text-xl font-bold text-emerald-700">{progress.completed}</p>
              <p className="text-xs font-medium text-emerald-600">Confirmed</p>
            </div>
            <div className="rounded-xl bg-amber-50 px-4 py-2">
              <p className="text-xl font-bold text-amber-700">{progress.pending}</p>
              <p className="text-xs font-medium text-amber-600">Pending</p>
            </div>
            <div className="rounded-xl bg-indigo-50 px-4 py-2">
              <p className="text-xl font-bold text-indigo-700">{progress.percentage}%</p>
              <p className="text-xs font-medium text-indigo-600">Progress</p>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">
            <span>Group Assignment Completion</span>
            <span>
              {progress.completed} of {progress.total} completed
            </span>
          </div>
          <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Assignments Column */}
        <section className="space-y-4 lg:col-span-7">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Your Assignments</h3>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {assignments.length} total
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              No assignments posted yet. Check back once your professor publishes one.
            </div>
          ) : (
            assignments.map((a) => {
              const dueDate = new Date(a.due_date);
              const isOverdue = !a.is_submitted && dueDate < new Date();
              const submittedGroupIds = new Set((a.submissions || []).map((s) => s.group_id));
              const remainingEligible = (a.eligible_groups || []).filter(
                (g) => !submittedGroupIds.has(g.id)
              );

              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-200"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900">{a.title}</h4>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            a.assign_to_all
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {a.assign_to_all ? 'All Students' : 'Targeted Group'}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{a.description}</p>
                    </div>

                    {a.is_submitted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirmed
                      </span>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${
                          isOverdue
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        {isOverdue ? 'Overdue' : 'Pending'}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                    <span>
                      Due:{' '}
                      <strong className="text-slate-700">
                        {dueDate.toLocaleString([], {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </strong>
                    </span>
                    {a.creator_name && (
                      <span>
                        Posted by: <strong className="text-slate-700">{a.creator_name}</strong>
                      </span>
                    )}
                  </div>

                  {(a.submissions || []).length > 0 && (
                    <div className="mt-3 space-y-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                      {a.submissions.map((sub) => (
                        <div key={sub.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span>
                            Confirmed for <strong>{sub.group_name}</strong> by{' '}
                            <strong>{sub.submitted_by_name}</strong>
                          </span>
                          <span className="text-emerald-700">
                            {new Date(sub.confirmed_at).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <a
                      href={a.onedrive_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open OneDrive Link
                    </a>

                    {remainingEligible.length > 0 ? (
                      <button
                        type="button"
                        onClick={() => openConfirmModal(a)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Yes, I have submitted
                      </button>
                    ) : (
                      !a.is_submitted && (
                        <span className="text-xs font-medium text-amber-700">
                          Create or join a group to confirm submission
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })
          )}
        </section>

        {/* Groups Column */}
        <section className="space-y-4 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">My Groups</h3>
            <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
              {groups.length} active
            </span>
          </div>

          <form
            onSubmit={handleCreateGroup}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Create a New Group
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                placeholder="e.g. Cloud Ninjas"
                required
                className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                Create
              </button>
            </div>
          </form>

          {groups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
              You aren&apos;t in any group yet. Create one above or ask a teammate to add you using
              your email or Student ID (<strong>{user?.student_id || user?.email}</strong>).
            </div>
          ) : (
            groups.map((g) => {
              const members = g.members || [];
              const isLeader = g.created_by === user?.id;
              return (
                <div
                  key={g.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{g.name}</h4>
                        <p className="text-xs text-slate-500">
                          {members.length} {members.length === 1 ? 'member' : 'members'}
                        </p>
                      </div>
                    </div>
                    {isLeader && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                        <Crown className="h-3 w-3" /> Leader
                      </span>
                    )}
                  </div>

                  <ul className="mb-3 divide-y divide-slate-100 rounded-xl border border-slate-100 bg-slate-50/70">
                    {members.map((m) => (
                      <li
                        key={m.id}
                        className="flex items-center justify-between px-3 py-2 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {m.name}{' '}
                            {m.is_leader && (
                              <span className="ml-1 text-[10px] font-bold text-amber-600">
                                (Leader)
                              </span>
                            )}
                          </p>
                          <p className="text-slate-500">
                            {m.email} {m.student_id ? `• ${m.student_id}` : ''}
                          </p>
                        </div>

                        {!m.is_leader && (isLeader || m.id === user?.id) && (
                          <button
                            type="button"
                            onClick={() =>
                              setRemoveTarget({ groupId: g.id, groupName: g.name, member: m })
                            }
                            title="Remove member"
                            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <form onSubmit={(e) => handleAddMember(e, g.id)} className="flex gap-2">
                    <input
                      type="text"
                      value={memberInputs[g.id] || ''}
                      onChange={(e) =>
                        setMemberInputs((prev) => ({ ...prev, [g.id]: e.target.value }))
                      }
                      placeholder="Add by email or Student ID (e.g. STU104)"
                      className="flex-1 rounded-xl border border-slate-300 px-3 py-1.5 text-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <button
                      type="submit"
                      disabled={busy}
                      className="inline-flex items-center gap-1 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-60 cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </section>
      </div>

      {/* Step 2: Two-Step Submission Verification Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                  Step 2 of 2 — Final Verification
                </span>
                <h3 className="mt-1.5 text-lg font-bold text-slate-900">
                  Confirm Assignment Submission
                </h3>
              </div>
              <button
                onClick={() => setConfirmModal(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
              <p className="font-semibold text-slate-900">{confirmModal.assignment.title}</p>
              <a
                href={confirmModal.assignment.onedrive_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                Verify OneDrive link <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            <div className="mb-4">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Submitting On Behalf Of Group
              </label>
              <select
                value={confirmModal.selectedGroupId}
                onChange={(e) =>
                  setConfirmModal((prev) => ({ ...prev, selectedGroupId: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
              >
                {confirmModal.availableGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="mb-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-slate-200 p-3 text-xs text-slate-700 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={confirmModal.checked}
                onChange={(e) =>
                  setConfirmModal((prev) => ({ ...prev, checked: e.target.checked }))
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                I confirm that our group has uploaded the final files to the provided OneDrive
                folder and this submission is ready for grading.
              </span>
            </label>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!confirmModal.checked || busy}
                onClick={handleFinalConfirm}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                {busy ? 'Confirming...' : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Obsidian SCSS Confirm Modal for Removing Member / Leaving Group */}
      <ConfirmModal
        open={Boolean(removeTarget)}
        title={removeTarget?.member?.id === user?.id ? 'Leave Group?' : 'Remove Group Member?'}
        message={
          removeTarget
            ? removeTarget.member.id === user?.id
              ? `Are you sure you want to leave "${removeTarget.groupName}"? You will lose access to this group's assignment submissions.`
              : `Are you sure you want to remove ${removeTarget.member.name} (${removeTarget.member.email}) from "${removeTarget.groupName}"?`
            : ''
        }
        confirmText={removeTarget?.member?.id === user?.id ? 'Leave Group' : 'Remove Member'}
        busy={busy}
        onConfirm={executeRemoveMember}
        onCancel={() => setRemoveTarget(null)}
      />
    </main>
  );
}