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

  // 2-step confirmation modal state
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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200/80 mb-6" />
        <div className="grid gap-5 md:grid-cols-2">
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200/70" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-up">
      {/* Breadcrumb */}
      <div className="mb-5 flex items-center justify-between">
        <Link
          to="/student"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <span>←</span> Back to Courses
        </Link>
        {course && (
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {course.semester} • {course.professor_name || 'Professor'}
          </span>
        )}
      </div>

      {/* Toast & Error */}
      {toast && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-fade-up">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white animate-check-pop">
            ✓
          </span>
          <span>{toast}</span>
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Course Header + Animated Progress Bar */}
      {course && (
        <div
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ borderTopWidth: '4px', borderTopColor: course.accent_color || '#6366f1' }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span
                className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold tracking-wide text-white"
                style={{ backgroundColor: course.accent_color || '#6366f1' }}
              >
                {course.code}
              </span>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{course.title}</h1>
              <p className="mt-1 text-sm text-slate-600">{course.description}</p>
            </div>

            <div className="min-w-[220px] rounded-xl bg-slate-50 p-4 border border-slate-100">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Course Progress</span>
                <span className="text-indigo-600 font-bold">{progress.percentage}%</span>
              </div>
              <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-xs text-slate-500">
                <span>{progress.completed} Acknowledged</span>
                <span>{progress.pending} Pending</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Grid */}
      {assignments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
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
                className={`flex flex-col justify-between rounded-2xl border bg-white p-6 shadow-sm transition ${
                  a.is_submitted
                    ? 'border-emerald-200 ring-1 ring-emerald-100'
                    : 'border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          isGroup
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-sky-100 text-sky-700'
                        }`}
                      >
                        {isGroup ? 'Group Assignment' : 'Individual'}
                      </span>

                      {a.is_submitted ? (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ${
                            justConfirmedId === a.id ? 'animate-check-pop' : ''
                          }`}
                        >
                          ✓ Acknowledged
                        </span>
                      ) : (
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isOverdue
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {isOverdue ? 'Overdue' : 'Pending'}
                        </span>
                      )}
                    </div>

                    <span className="text-xs font-medium text-slate-500">
                      Due: {new Date(a.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h2 className="mt-3 text-lg font-bold text-slate-900">{a.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{a.description}</p>

                  {/* Per-Assignment Mini Progress Bar */}
                  <div className="mt-4">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          a.is_submitted ? 'w-full bg-emerald-500' : 'w-1/4 bg-amber-400'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 border-t border-slate-100 pt-4 space-y-3">
                  <a
                    href={a.onedrive_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Open OneDrive Submission Folder ↗
                  </a>

                  {a.is_submitted ? (
                    <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold animate-check-pop">
                        ✓
                      </span>
                      <div>
                        <p className="font-semibold">
                          {isGroup
                            ? `Acknowledged by ${latestSub?.submitted_by_name || 'Group Leader'} (${latestSub?.group_name || 'Your Group'})`
                            : 'You acknowledged this individual submission'}
                        </p>
                        {isGroup && (
                          <p className="mt-0.5 text-emerald-700">
                            Status is automatically reflected across all members of your group.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : a.can_acknowledge ? (
                    <button
                      onClick={() => openConfirmModal(a)}
                      className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.99]"
                    >
                      {isGroup
                        ? 'Acknowledge Group Submission (Leader)'
                        : 'Acknowledge Individual Submission'}
                    </button>
                  ) : a.leader_required_message ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <span className="font-bold">🔒 Leader Action Required: </span>
                      {a.leader_required_message}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                      Join or create a group from the Dashboard to acknowledge this group assignment.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 2-Step Confirmation Modal */}
      {modalAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-fade-up">
            <h3 className="text-lg font-bold text-slate-900">
              {confirmStep === 1 ? 'Step 1 of 2: Verify Upload' : 'Step 2 of 2: Final Acknowledgment'}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Assignment: <strong>{modalAssignment.title}</strong>
            </p>

            {modalAssignment.submission_type === 'GROUP' && (
              <div className="mt-4">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Submitting as Group Leader for
                </label>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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

            <div className="mt-4 rounded-xl bg-indigo-50 p-3.5 text-xs text-indigo-900">
              {confirmStep === 1
                ? 'Have you uploaded your work to the official OneDrive link? Click Continue to confirm.'
                : modalAssignment.submission_type === 'GROUP'
                ? 'Confirming will mark this assignment as Acknowledged for you and every member of your group.'
                : 'Confirming will permanently record your individual submission acknowledgment.'}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                onClick={() => setModalAssignment(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              {confirmStep === 1 ? (
                <button
                  onClick={() => setConfirmStep(2)}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Yes, Uploaded →
                </button>
              ) : (
                <button
                  onClick={handleConfirmSubmission}
                  disabled={submitting}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Confirm Acknowledgment ✓'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}