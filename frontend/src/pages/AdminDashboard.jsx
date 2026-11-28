import { useCallback, useEffect, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import api from '../api/axios';
import CourseGrid from '../components/CourseGrid';

const emptyForm = {
  course_id: '',
  title: '',
  description: '',
  submission_type: 'GROUP',
  due_date: '',
  onedrive_link: '',
  assign_to_all: true,
  group_ids: [],
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [courses, setCourses] = useState([]);
  const [activeTab, setActiveTab] = useState('analytics');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Assignment Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [analyticsRes, assignRes, groupsRes, coursesRes] = await Promise.all([
        api.get(`/submissions/analytics?status=${statusFilter}`),
        api.get('/assignments'),
        api.get('/groups'),
        api.get('/courses'),
      ]);
      setAnalytics(analyticsRes.data);
      setAssignments(assignRes.data.assignments || []);
      setGroups(groupsRes.data.groups || []);
      setCourses(coursesRes.data.courses || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load professor dashboard.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, course_id: courses[0]?.id ? String(courses[0].id) : '' });
    setShowModal(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      course_id: a.course_id ? String(a.course_id) : '',
      title: a.title || '',
      description: a.description || '',
      submission_type: a.submission_type || 'GROUP',
      due_date: a.due_date ? new Date(a.due_date).toISOString().slice(0, 16) : '',
      onedrive_link: a.onedrive_link || '',
      assign_to_all: a.assign_to_all !== false,
      group_ids: a.target_group_ids || [],
    });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const payload = {
        ...form,
        course_id: form.course_id ? Number(form.course_id) : undefined,
      };
      if (editingId) {
        await api.put(`/assignments/${editingId}`, payload);
        showToast('Assignment updated!');
      } else {
        await api.post('/assignments', payload);
        showToast('Assignment created!');
      }
      setShowModal(false);
      await loadData();
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
      showToast('Assignment deleted.');
      await loadData();
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

  const summary = analytics?.summary || {};

  return (
    <div className="min-h-screen bg-[#080d1a] px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Professor Control Center</h1>
            <p className="mt-1 text-sm text-slate-400">
              Manage courses, post individual or group assignments, and monitor real-time submissions.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-indigo-500"
          >
            + New Assignment
          </button>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 border-t-2 border-t-indigo-500 bg-[#0f172a]/90 p-5 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</div>
            <div className="mt-2 text-3xl font-bold text-white">{summary.total_students || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 border-t-2 border-t-pink-500 bg-[#0f172a]/90 p-5 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active Groups</div>
            <div className="mt-2 text-3xl font-bold text-white">{summary.total_groups || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 border-t-2 border-t-sky-500 bg-[#0f172a]/90 p-5 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Assignments</div>
            <div className="mt-2 text-3xl font-bold text-white">{summary.total_assignments || 0}</div>
          </div>
          <div className="rounded-2xl border border-slate-800 border-t-2 border-t-emerald-500 bg-[#0f172a]/90 p-5 shadow-lg">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Completion Rate</div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold text-emerald-400">
                {summary.overall_completion_rate || 0}%
              </span>
              <span className="text-xs text-slate-400">
                ({summary.total_confirmed_submissions || 0}/{summary.total_expected_submissions || 0})
              </span>
            </div>
          </div>
        </div>

        {toast && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-4 py-3 text-sm font-medium text-emerald-300">
            ✓ {toast}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/15 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        {/* ROUND 2: Courses Taught Grid */}
        <CourseGrid role="ADMIN" />

        {/* Navigation Tabs + Status Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'analytics', label: 'Analytics & Charts' },
              { id: 'assignments', label: 'Assignments' },
              { id: 'groups', label: 'Group-wise Tracking' },
              { id: 'students', label: 'Student-wise Tracking' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeTab === t.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'border border-slate-800 bg-[#0f172a] text-slate-300 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {(activeTab === 'groups' || activeTab === 'students') && (
            <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#0f172a] p-1">
              {['ALL', 'CONFIRMED', 'PENDING'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                    statusFilter === st
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {st === 'ALL' ? 'All' : st === 'CONFIRMED' ? '✓ Confirmed' : '⏳ Pending'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Recharts Analytics */}
        {activeTab === 'analytics' && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-lg">
              <h3 className="mb-4 text-base font-bold text-white">Submissions by Assignment</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.assignment_stats || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="title" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Legend />
                    <Bar dataKey="confirmed_count" name="Confirmed" fill="#10b981" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="pending_count" name="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-lg">
              <h3 className="mb-4 text-base font-bold text-white">Group Performance (% Completed)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics?.group_tracking || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                      }}
                    />
                    <Bar dataKey="completion_rate" name="Completion %" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Assignments CRUD */}
        {activeTab === 'assignments' && (
          <div className="grid gap-4 md:grid-cols-2">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-lg"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {a.course_code && (
                        <span className="rounded-md bg-indigo-500/20 px-2 py-0.5 text-xs font-bold text-indigo-300">
                          {a.course_code}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          a.submission_type === 'GROUP'
                            ? 'bg-purple-500/15 text-purple-300'
                            : 'bg-sky-500/15 text-sky-300'
                        }`}
                      >
                        {a.submission_type}
                      </span>
                    </div>
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
                <div className="mt-4 flex justify-between text-xs text-slate-400">
                  <span>
                    {a.confirmed_count} / {a.total_target_count} Confirmed
                  </span>
                  <span className="font-semibold text-indigo-400">{a.completion_rate}%</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 3 & 4: Group-wise & Student-wise Tracking */}
        {(activeTab === 'groups' || activeTab === 'students') && (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0f172a]/90 p-5 shadow-lg">
            {loading ? (
              <div className="h-40 animate-pulse rounded-xl bg-slate-800/70" />
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-xs uppercase tracking-wider text-slate-400">
                    <th className="py-3 pr-4">{activeTab === 'groups' ? 'Group' : 'Student'}</th>
                    <th className="py-3 pr-4">Completion</th>
                    <th className="py-3">Submissions ({statusFilter})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {(activeTab === 'groups'
                    ? analytics?.group_tracking || []
                    : analytics?.student_tracking || []
                  ).map((row) => (
                    <tr key={row.id} className="align-top">
                      <td className="py-3.5 pr-4">
                        <div className="font-semibold text-white">{row.name}</div>
                        <div className="text-xs text-slate-400">
                          {activeTab === 'groups'
                            ? `${row.member_count} members`
                            : row.student_id || row.email}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4">
                        <span className="font-bold text-indigo-400">{row.completion_rate}%</span>
                        <div className="text-xs text-slate-400">
                          {row.confirmed_count}/{row.assigned_count} done
                        </div>
                      </td>
                      <td className="py-3.5">
                        {row.assignment_statuses.length === 0 ? (
                          <span className="text-xs italic text-slate-500">
                            No {statusFilter.toLowerCase()} items
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
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-[#0f172a] p-6 shadow-2xl animate-fade-up"
          >
            <h3 className="text-lg font-bold text-white">
              {editingId ? 'Edit Assignment' : 'Create Assignment'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Course</label>
                <select
                  value={form.course_id}
                  onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400">Submission Type</label>
                <select
                  value={form.submission_type}
                  onChange={(e) => setForm({ ...form, submission_type: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                >
                  <option value="GROUP">Group (Leader Acknowledges)</option>
                  <option value="INDIVIDUAL">Individual</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400">Title *</label>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400">Description</label>
              <textarea
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400">Due Date *</label>
                <input
                  required
                  type="datetime-local"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400">OneDrive Link *</label>
                <input
                  required
                  type="url"
                  value={form.onedrive_link}
                  onChange={(e) => setForm({ ...form, onedrive_link: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white"
                />
              </div>
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
                onClick={() => setShowModal(false)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
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