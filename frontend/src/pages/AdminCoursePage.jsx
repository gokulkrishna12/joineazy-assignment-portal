import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';

const emptyForm = {
  title: '',
  description: '',
  submission_type: 'GROUP',
  due_date: '',
  onedrive_link: '',
  assign_to_all: true,
  group_ids: [],
};

export default function AdminCoursePage() {
  const { courseId } = useParams();

  const [course, setCourse] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [groups, setGroups] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [trackingTab, setTrackingTab] = useState('students');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [courseRes, assignRes, analyticsRes, groupsRes] = await Promise.all([
        api.get(`/courses/${courseId}`),
        api.get(`/assignments?course_id=${courseId}`),
        api.get(`/submissions/analytics?course_id=${courseId}&status=${statusFilter}`),
        api.get('/groups'),
      ]);
      setCourse(courseRes.data.course);
      setAssignments(assignRes.data.assignments || []);
      setAnalytics(analyticsRes.data);
      setGroups(groupsRes.data.groups || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load course management data.');
    } finally {
      setLoading(false);
    }
  }, [courseId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      title: a.title || '',
      description: a.description || '',
      submission_type: a.submission_type || 'GROUP',
      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '',
      onedrive_link: a.onedrive_link || '',
      assign_to_all: a.assign_to_all !== false,
      group_ids: a.target_group_ids || [],
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, course_id: Number(courseId) };
      if (editingId) {
        await api.put(`/assignments/${editingId}`, payload);
        setToast('Assignment updated!');
      } else {
        await api.post('/assignments', payload);
        setToast('Assignment created!');
      }
      setShowForm(false);
      await loadData();
      setTimeout(() => setToast(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment?')) return;
    try {
      await api.delete(`/assignments/${id}`);
      setToast('Assignment deleted.');
      await loadData();
      setTimeout(() => setToast(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete assignment.');
    }
  };

  const toggleGroupId = (gid) => {
    setForm((prev) => ({
      ...prev,
      group_ids: prev.group_ids.includes(gid)
        ? prev.group_ids.filter((id) => id !== gid)
        : [...prev.group_ids, gid],
    }));
  };

  if (loading && !course) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[#080d1a] text-slate-300">
        <span className="loading-spinner-lg" />
        <p className="text-sm font-medium text-indigo-300">Loading course workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080d1a] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-6xl animate-fade-up">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <Link
            to="/admin"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-3.5 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-500/50 hover:bg-slate-800"
          >
            ← Back to Professor Dashboard
          </Link>
          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-500"
          >
            + New Course Assignment
          </button>
        </div>

        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300">
            ✓ {toast}
          </div>
        )}
        {error && (
          <div className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm font-medium text-rose-300">
            {error}
          </div>
        )}

        {course && (
          <div
            className="mb-8 rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-6 shadow-xl"
            style={{ borderTopWidth: '3px', borderTopColor: course.accent_color || '#6366f1' }}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <span
                  className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
                  style={{ backgroundColor: course.accent_color || '#6366f1' }}
                >
                  {course.code}
                </span>
                <h1 className="mt-2 text-2xl font-bold text-white">{course.title}</h1>
                <p className="mt-1 text-sm text-slate-400">{course.description}</p>
              </div>
              <div className="flex gap-3">
                <div className="rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-center">
                  <div className="text-xl font-bold text-white">{course.student_count || 0}</div>
                  <div className="text-xs text-slate-400">Enrolled</div>
                </div>
                <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-center">
                  <div className="text-xl font-bold text-indigo-400">
                    {analytics?.summary?.overall_completion_rate || 0}%
                  </div>
                  <div className="text-xs text-indigo-300/80">Completion</div>
                </div>
              </div>
            </div>
          </div>
        )}

        <h2 className="mb-3 text-lg font-bold text-white">
          Course Assignments ({assignments.length})
        </h2>
        <div className="mb-10 grid gap-4 md:grid-cols-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      a.submission_type === 'GROUP'
                        ? 'border border-purple-500/30 bg-purple-500/15 text-purple-300'
                        : 'border border-sky-500/30 bg-sky-500/15 text-sky-300'
                    }`}
                  >
                    {a.submission_type}
                  </span>
                  <h3 className="mt-2 text-base font-bold text-white">{a.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(a)}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/20"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p className="mt-1.5 text-xs text-slate-400">{a.description}</p>

              <div className="mt-4">
                <div className="flex justify-between text-xs font-medium text-slate-400">
                  <span>
                    {a.confirmed_count} / {a.total_target_count} Acknowledged
                  </span>
                  <span className="text-indigo-400">{a.completion_rate}%</span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${a.completion_rate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-6 shadow-xl">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTrackingTab('students')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  trackingTab === 'students'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Student Tracking
              </button>
              <button
                onClick={() => setTrackingTab('groups')}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  trackingTab === 'groups'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Group Tracking
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900 p-1">
              {['ALL', 'CONFIRMED', 'PENDING'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All Statuses' : st === 'CONFIRMED' ? '✓ Acknowledged' : '⏳ Pending'}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">{trackingTab === 'students' ? 'Student' : 'Group'}</th>
                  <th className="py-3 pr-4">Progress</th>
                  <th className="py-3">Filtered Submissions ({statusFilter})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {(trackingTab === 'students'
                  ? analytics?.student_tracking || []
                  : analytics?.group_tracking || []
                ).map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-white">{row.name}</div>
                      <div className="text-xs text-slate-400">
                        {trackingTab === 'students'
                          ? row.student_id || row.email
                          : `${row.member_count} members`}
                      </div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="font-semibold text-indigo-400">{row.completion_rate}%</span>
                      <div className="text-xs text-slate-400">
                        {row.confirmed_count}/{row.assigned_count} done
                      </div>
                    </td>
                    <td className="py-3.5">
                      {row.assignment_statuses.length === 0 ? (
                        <span className="text-xs italic text-slate-500">
                          No {statusFilter.toLowerCase()} assignments
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {row.assignment_statuses.map((st) => (
                            <span
                              key={st.assignment_id}
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                                st.status === 'CONFIRMED'
                                  ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border border-amber-500/30 bg-amber-500/10 text-amber-300'
                              }`}
                            >
                              {st.status === 'CONFIRMED' ? '✓' : '⏳'} {st.assignment_title}
                              {st.group_name ? ` (${st.group_name})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl animate-fade-up"
          >
            <h3 className="text-lg font-bold text-white">
              {editingId ? 'Edit Assignment' : 'Create Course Assignment'}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-400">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Submission Type</label>
                <select
                  value={form.submission_type}
                  onChange={(e) => setForm({ ...form, submission_type: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="GROUP">Group (Leader Acknowledges)</option>
                  <option value="INDIVIDUAL">Individual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400">Due Date *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400">OneDrive Link *</label>
              <input
                required
                type="url"
                value={form.onedrive_link}
                onChange={(e) => setForm({ ...form, onedrive_link: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {form.submission_type === 'GROUP' && (
              <div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <input
                    type="checkbox"
                    checked={form.assign_to_all}
                    onChange={(e) => setForm({ ...form, assign_to_all: e.target.checked })}
                  />
                  Assign to all groups
                </label>

                {!form.assign_to_all && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {groups.map((g) => (
                      <button
                        type="button"
                        key={g.id}
                        onClick={() => toggleGroupId(g.id)}
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                          form.group_ids.includes(g.id)
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-700 bg-slate-800 text-slate-300'
                        }`}
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <span className="loading-spinner" />
                    Saving...
                  </>
                ) : editingId ? (
                  'Save Changes'
                ) : (
                  'Create Assignment'
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}