import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function CourseAssignmentsPage() {
  const { courseId } = useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState({ total: 0, completed: 0, pending: 0, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [justConfirmedId, setJustConfirmedId] = useState(null);

  const [modalAssignment, setModalAssignment] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [confirmStep, setConfirmStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [courseRes, assignRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/assignments?course_id=${courseId}`),
      ]);
      setCourse(courseRes.data.course);
      setAssignments(assignRes.data.assignments || []);
      setProgress(assignRes.data.progress || { total: 0, completed: 0, pending: 0, percentage: 0 });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course assignments.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

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
      const payload = {
        assignment_id: modalAssignment.id,
        confirmed: true,
      };
      if (modalAssignment.submission_type === 'GROUP') {
        payload.group_id = Number(selectedGroupId);
      }

      const res = await api.post('/submissions/confirm', payload);
      setToast(res.data.message || 'Submission acknowledged!');
      setJustConfirmedId(modalAssignment.id);
      setModalAssignment(null);
      await loadData();

      setTimeout(() => setToast(''), 4500);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not acknowledge submission.');
      setModalAssignment(null);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#080d1a] text-slate-300">
        <span className="loading-spinner-lg" />
        <p className="text-sm font-medium text-indigo-300">Loading course assignments...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d1a] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl animate-fade-up">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <Link
            to="/student"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-500/50 hover:bg-slate-800"
          >
            <span>←</span> Back to Courses
          </Link>
          {course && (
            <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-3 py-1 text-xs font-semibold text-indigo-300">
              {course.semester} • {course.professor_name || 'Professor'}
            </span>
          )}
        </div>

        {toast && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300 shadow-sm animate-fade-up">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white animate-check-pop">
              ✓
            </span>
            <span>{toast}</span>
          </div>
        )}
        {error && (
          <div className="mb-5 rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-300">
            {error}
          </div>
        )}

        {course && (
          <div
            className="mb-8 rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-6 shadow-xl backdrop-blur-md"
            style={{ borderTopWidth: '3px', borderTopColor: course.accent_color || '#6366f1' }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span
                  className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold tracking-wide text-white"
                  style={{ backgroundColor: course.accent_color || '#6366f1' }}
                >
                  {course.code}
                </span>
                <h1 className="mt-2 text-2xl font-bold text-white">{course.title}</h1>
                <p className="mt-1 text-sm text-slate-400">{course.description}</p>
              </div>

              <div className="min-w-[230px] rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span>Course Progress</span>
                  <span className="font-bold text-indigo-400">{progress.percentage}%</span>
                </div>
                <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-700 ease-out"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-slate-400">
                  <span>{progress.completed} Acknowledged</span>
                  <span>{progress.pending} Pending</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center text-slate-400">
            No assignments posted for this course yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {assignments.map((a) => {
              const isGroup = a.submission_type === 'GROUP';
              const isOverdue = !a.is_submitted && new Date(a.due_date) < new Date();
              const latestSub = a.submissions?.[0];

              return (
                <div
                  key={a.id}
                  className={`flex flex-col justify-between rounded-2xl border bg-[#0f172a]/90 p-6 shadow-lg transition ${
                    a.is_submitted
                      ? 'border-emerald-500/40 ring-1 ring-emerald-500/20'
                      : 'border-slate-800 hover:border-indigo-500/40'
                  }`}
                >
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            isGroup
                              ? 'border border-purple-500/30 bg-purple-500/15 text-purple-300'
                              : 'border border-sky-500/30 bg-sky-500/15 text-sky-300'
                          }`}
                        >
                          {isGroup ? 'Group Assignment' : 'Individual'}
                        </span>

                        {a.is_submitted ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-xs font-bold text-emerald-300 ${
                              justConfirmedId === a.id ? 'animate-check-pop' : ''
                            }`}
                          >
                            ✓ Acknowledged
                          </span>
                        ) : (
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                              isOverdue
                                ? 'border border-rose-500/30 bg-rose-500/15 text-rose-300'
                                : 'border border-amber-500/30 bg-amber-500/15 text-amber-300'
                            }`}
                          >
                            {isOverdue ? 'Overdue' : 'Pending'}
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-medium text-slate-400">
                        Due:{' '}
                        {new Date(a.due_date).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h2 className="mt-3 text-lg font-bold text-white">{a.title}</h2>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{a.description}</p>

                    <div className="mt-4">
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            a.is_submitted ? 'w-full bg-emerald-400' : 'w-1/4 bg-amber-400'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
                    <a
                      href={a.onedrive_link}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      Open OneDrive Submission Folder ↗
                    </a>

                    {a.is_submitted ? (
                      <div className="flex items-start gap-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 font-bold text-white animate-check-pop">
                          ✓
                        </span>
                        <div>
                          <p className="font-semibold text-emerald-300">
                            {isGroup
                              ? `Acknowledged by ${latestSub?.submitted_by_name || 'Group Leader'} (${latestSub?.group_name || 'Your Group'})`
                              : 'You acknowledged this individual submission'}
                          </p>
                          {isGroup && (
                            <p className="mt-0.5 text-emerald-300/80">
                              Status is automatically reflected across all members of your group.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : a.can_acknowledge ? (
                      <button
                        onClick={() => openConfirmModal(a)}
                        className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500 active:scale-[0.99]"
                      >
                        {isGroup
                          ? 'Acknowledge Group Submission (Leader)'
                          : 'Acknowledge Individual Submission'}
                      </button>
                    ) : a.leader_required_message ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                        <span className="font-bold text-amber-300">🔒 Leader Action Required: </span>
                        {a.leader_required_message}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3 text-xs text-slate-300">
                        Join or create a group from the Dashboard to acknowledge this group assignment.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl animate-fade-up">
            <h3 className="text-lg font-bold text-white">
              {confirmStep === 1 ? 'Step 1 of 2: Verify Upload' : 'Step 2 of 2: Final Acknowledgment'}
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Assignment: <strong className="text-white">{modalAssignment.title}</strong>
            </p>

            {modalAssignment.submission_type === 'GROUP' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Submitting as Group Leader for
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
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

            <div className="mt-4 rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3.5 text-xs text-indigo-200">
              {confirmStep === 1
                ? 'Have you uploaded your work to the official OneDrive link? Click Continue to confirm.'
                : modalAssignment.submission_type === 'GROUP'
                ? 'Confirming will mark this assignment as Acknowledged for you and every member of your group.'
                : 'Confirming will permanently record your individual submission acknowledgment.'}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setModalAssignment(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              {confirmStep === 1 ? (
                <button
                  onClick={() => setConfirmStep(2)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                >
                  Yes, Uploaded →
                </button>
              ) : (
                <button
                  onClick={handleConfirmSubmission}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="loading-spinner" />
                      Saving...
                    </>
                  ) : (
                    'Confirm Acknowledgment ✓'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}