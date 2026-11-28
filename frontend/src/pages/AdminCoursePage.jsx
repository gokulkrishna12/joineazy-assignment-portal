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

  // Create / Edit modal state
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
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-200/80 mb-6" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-fade-up">
      {/* Top Bar */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          ← Back to Professor Dashboard
        </Link>
        <button
          onClick={openCreate}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
        >
          + New Course Assignment
        </button>
      </div>

      {toast && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          ✓ {toast}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      )}

      {/* Course Header */}
      {course && (
        <div
          className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          style={{ borderTopWidth: '4px', borderTopColor: course.accent_color || '#6366f1' }}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span
                className="inline-block rounded-md px-2.5 py-0.5 text-xs font-bold text-white"
                style={{ backgroundColor: course.accent_color || '#6366f1' }}
              >
                {course.code}
              </span>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">{course.title}</h1>
              <p className="mt-1 text-sm text-slate-600">{course.description}</p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center border border-slate-100">
                <div className="text-xl font-bold text-slate-900">{course.student_count || 0}</div>
                <div className="text-xs text-slate-500">Enrolled</div>
              </div>
              <div className="rounded-xl bg-slate-50 px-4 py-3 text-center border border-slate-100">
                <div className="text-xl font-bold text-indigo-600">
                  {analytics?.summary?.overall_completion_rate || 0}%
                </div>
                <div className="text-xs text-slate-500">Completion</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Assignments Section */}
      <h2 className="mb-3 text-lg font-bold text-slate-900">Course Assignments ({assignments.length})</h2>
      <div className="mb-10 grid gap-4 md:grid-cols-2">
        {assignments.map((a) => (
          <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    a.submission_type === 'GROUP'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-sky-100 text-sky-700'
                  }`}
                >
                  {a.submission_type}
                </span>
                <h3 className="mt-2 text-base font-bold text-slate-900">{a.title}</h3>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(a)}
                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                >
                  Delete
                </button>
              </div>
            </div>

            <p className="mt-1.5 text-xs text-slate-600">{a.description}</p>

            <div className="mt-4">
              <div className="flex justify-between text-xs font-medium text-slate-600">
                <span>
                  {a.confirmed_count} / {a.total_target_count} Acknowledged
                </span>
                <span>{a.completion_rate}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${a.completion_rate}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Submission Status Monitoring + Filter Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTrackingTab('students')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                trackingTab === 'students'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Student Tracking
            </button>
            <button
              onClick={() => setTrackingTab('groups')}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                trackingTab === 'groups'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Group Tracking
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {['ALL', 'CONFIRMED', 'PENDING'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === st
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'All Statuses' : st === 'CONFIRMED' ? '✓ Acknowledged' : '⏳ Pending'}
              </button>
            ))}
          </div>
        </div>

        {/* Tracking Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                <th className="py-3 pr-4">{trackingTab === 'students' ? 'Student' : 'Group'}</th>
                <th className="py-3 pr-4">Progress</th>
                <th className="py-3">Filtered Submissions ({statusFilter})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(trackingTab === 'students'
                ? analytics?.student_tracking || []
                : analytics?.group_tracking || []
              ).map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="py-3.5 pr-4">
                    <div className="font-semibold text-slate-900">{row.name}</div>
                    <div className="text-xs text-slate-500">
                      {trackingTab === 'students'
                        ? row.student_id || row.email
                        : `${row.member_count} members`}
                    </div>
                  </td>
                  <td className="py-3.5 pr-4">
                    <span className="font-semibold text-indigo-600">{row.completion_rate}%</span>
                    <div className="text-xs text-slate-500">
                      {row.confirmed_count}/{row.assigned_count} done
                    </div>
                  </td>
                  <td className="py-3.5">
                    {row.assignment_statuses.length === 0 ? (
                      <span className="text-xs italic text-slate-400">
                        No {statusFilter.toLowerCase()} assignments
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {row.assignment_statuses.map((st) => (
                          <span
                            key={st.assignment_id}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold ${
                              st.status === 'CONFIRMED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
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

      {/* Create / Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl space-y-4 animate-fade-up"
          >
            <h3 className="text-lg font-bold text-slate-900">
              {editingId ? 'Edit Assignment' : 'Create Course Assignment'}
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-600">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600">Submission Type</label>
                <select
                  value={form.submission_type}
                  onChange={(e) => setForm({ ...form, submission_type: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="GROUP">Group (Leader Acknowledges)</option>
                  <option value="INDIVIDUAL">Individual</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600">Due Date *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600">OneDrive Link *</label>
              <input
                required
                type="url"
                value={form.onedrive_link}
                onChange={(e) => setForm({ ...form, onedrive_link: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            {form.submission_type === 'GROUP' && (
              <div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
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
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold border ${
                          form.group_ids.includes(g.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
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
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Create Assignment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}