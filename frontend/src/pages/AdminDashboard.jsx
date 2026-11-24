import { useEffect, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Users,
  GraduationCap,
  Plus,
  Pencil,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import api from '../api/axios';
import ConfirmModal from '../components/ConfirmModal';

const formatForDatetimeInput = (isoString) => {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
};

const emptyForm = {
  title: '',
  description: '',
  due_date: '',
  onedrive_link: '',
  assign_to_all: true,
  group_ids: [],
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analytics');
  const [analytics, setAnalytics] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  // Create / Edit Assignment Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Custom SCSS Confirm Delete Modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const showFeedback = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const fetchAll = async () => {
    try {
      const [analyticsRes, assignRes, groupsRes] = await Promise.all([
        api.get('/submissions/analytics'),
        api.get('/assignments'),
        api.get('/groups'),
      ]);
      setAnalytics(analyticsRes.data);
      setAssignments(assignRes.data.assignments || []);
      setGroups(groupsRes.data.groups || []);
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEditModal = (a) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      description: a.description || '',
      due_date: formatForDatetimeInput(a.due_date),
      onedrive_link: a.onedrive_link,
      assign_to_all: Boolean(a.assign_to_all),
      group_ids: a.target_group_ids || [],
    });
    setModalOpen(true);
  };

  const toggleGroupSelection = (gid) => {
    setForm((prev) => {
      const exists = prev.group_ids.includes(gid);
      return {
        ...prev,
        group_ids: exists
          ? prev.group_ids.filter((id) => id !== gid)
          : [...prev.group_ids, gid],
      };
    });
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    if (!form.assign_to_all && form.group_ids.length === 0) {
      showFeedback('error', 'Select at least one group or switch to All Students.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        due_date: new Date(form.due_date).toISOString(),
      };

      if (editingId) {
        await api.put(`/assignments/${editingId}`, payload);
        showFeedback('success', 'Assignment updated successfully.');
      } else {
        await api.post('/assignments', payload);
        showFeedback('success', 'Assignment published successfully.');
      }

      setModalOpen(false);
      await fetchAll();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Failed to save assignment.');
    } finally {
      setSaving(false);
    }
  };

  const executeDeleteAssignment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/assignments/${deleteTarget.id}`);
      const deletedTitle = deleteTarget.title;
      setDeleteTarget(null);
      showFeedback('success', `"${deletedTitle}" deleted.`);
      await fetchAll();
    } catch (err) {
      showFeedback('error', err.response?.data?.message || 'Could not delete assignment.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const summary = analytics?.summary || {
    total_students: 0,
    total_groups: 0,
    total_assignments: 0,
    total_confirmed_submissions: 0,
    total_expected_submissions: 0,
    overall_completion_rate: 0,
  };

  const assignmentChartData = (analytics?.assignment_stats || []).map((a) => ({
    name: a.title.length > 20 ? `${a.title.slice(0, 20)}...` : a.title,
    Confirmed: a.confirmed_count,
    Pending: a.pending_count,
  }));

  const groupChartData = (analytics?.group_tracking || []).map((g) => ({
    name: g.name,
    'Completion %': g.completion_rate,
  }));

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

      {/* Header + Action */}
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Professor Control Center</h2>
          <p className="text-sm text-slate-500">
            Manage assignments, target student groups, and track real-time submission progress.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          New Assignment
        </button>
      </div>

      {/* Summary Stat Cards */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Students
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total_students}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active Groups
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total_groups}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assignments
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary.total_assignments}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Completion Rate
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            <p className="text-2xl font-bold text-emerald-600">
              {summary.overall_completion_rate}%
            </p>
            <span className="text-xs text-slate-500">
              ({summary.total_confirmed_submissions}/{summary.total_expected_submissions})
            </span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        {[
          { id: 'analytics', label: 'Analytics & Charts', icon: BarChart3 },
          { id: 'assignments', label: 'Assignments', icon: ClipboardList },
          { id: 'groups', label: 'Group-wise Tracking', icon: Users },
          { id: 'students', label: 'Student-wise Tracking', icon: GraduationCap },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                active
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: ANALYTICS & CHARTS */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-slate-900">
                Submissions by Assignment
              </h3>
              {assignmentChartData.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">
                  No assignment data yet.
                </p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assignmentChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Confirmed" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Pending" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-base font-bold text-slate-900">
                Group Performance (% Completed)
              </h3>
              {groupChartData.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">No groups created yet.</p>
              ) : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={groupChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="Completion %" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-base font-bold text-slate-900">Recent Confirmations</h3>
            {!analytics?.recent_confirmations?.length ? (
              <p className="text-sm text-slate-500">No submissions confirmed yet.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {analytics.recent_confirmations.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{item.group_name}</span>{' '}
                      confirmed{' '}
                      <span className="font-medium text-indigo-700">{item.assignment_title}</span>{' '}
                      <span className="text-xs text-slate-500">
                        (by {item.submitted_by_name})
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(item.confirmed_at).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE ASSIGNMENTS */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No assignments yet. Click <strong>New Assignment</strong> to post your first one.
            </div>
          ) : (
            assignments.map((a) => {
              const pct =
                a.total_target_groups > 0
                  ? Math.round((a.confirmed_count / a.total_target_groups) * 100)
                  : 0;
              return (
                <div
                  key={a.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900">{a.title}</h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            a.assign_to_all
                              ? 'bg-sky-50 text-sky-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {a.assign_to_all
                            ? 'All Students'
                            : `Groups: ${(a.target_groups || []).map((g) => g.name).join(', ')}`}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">{a.description}</p>
                      <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span>
                          Due:{' '}
                          <strong className="text-slate-700">
                            {new Date(a.due_date).toLocaleString([], {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </strong>
                        </span>
                        <a
                          href={a.onedrive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                        >
                          OneDrive Folder <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(a)}
                        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(a)}
                        className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs font-medium text-slate-600">
                      <span>
                        {a.confirmed_count} / {a.total_target_groups} target groups confirmed
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: GROUP-WISE TRACKING */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          {!analytics?.group_tracking?.length ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
              No student groups created yet.
            </div>
          ) : (
            analytics.group_tracking.map((g) => (
              <div
                key={g.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{g.name}</h3>
                    <p className="text-xs text-slate-500">
                      Members:{' '}
                      {(g.members || [])
                        .map((m) => `${m.name}${m.student_id ? ` (${m.student_id})` : ''}`)
                        .join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32">
                      <div className="mb-1 flex justify-between text-[11px] font-semibold text-slate-600">
                        <span>
                          {g.confirmed_count}/{g.assigned_count}
                        </span>
                        <span>{g.completion_rate}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${g.completion_rate}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {(g.assignment_statuses || []).map((st) => (
                    <div
                      key={st.assignment_id}
                      className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs ${
                        st.status === 'CONFIRMED'
                          ? 'border-emerald-200 bg-emerald-50/70 text-emerald-900'
                          : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 pr-2">
                        <p className="truncate font-semibold">{st.assignment_title}</p>
                        {st.submitted_by_name && (
                          <p className="text-[11px] text-emerald-700">
                            By {st.submitted_by_name}
                          </p>
                        )}
                      </div>
                      {st.status === 'CONFIRMED' ? (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Done
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Clock className="h-3 w-3" /> Pending
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: STUDENT-WISE TRACKING */}
      {activeTab === 'students' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Groups</th>
                  <th className="px-4 py-3">Completion</th>
                  <th className="px-4 py-3">Assignment Statuses</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(analytics?.student_tracking || []).map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{st.name}</p>
                      <p className="text-xs text-slate-500">
                        {st.email} {st.student_id ? `• ${st.student_id}` : ''}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {(st.groups || []).length > 0 ? (
                        st.groups.map((g) => (
                          <span
                            key={g.id}
                            className="mr-1 inline-block rounded-md bg-indigo-50 px-2 py-0.5 font-medium text-indigo-700"
                          >
                            {g.name}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">No group</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${st.completion_rate}%` }}
                          />
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {st.confirmed_count}/{st.assigned_count} ({st.completion_rate}%)
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(st.assignment_statuses || []).map((as) => (
                          <span
                            key={as.assignment_id}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              as.status === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {as.assignment_title}: {as.status === 'CONFIRMED' ? '✓' : 'Pending'}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Assignment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                {editingId ? 'Edit Assignment' : 'Create New Assignment'}
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAssignment} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
                <input
                  type="text"
                  required
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Microservices Architecture Lab"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Instructions and deliverables..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Due Date</label>
                  <input
                    type="datetime-local"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm((p) => ({ ...p, due_date: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    OneDrive Link
                  </label>
                  <input
                    type="url"
                    required
                    value={form.onedrive_link}
                    onChange={(e) => setForm((p) => ({ ...p, onedrive_link: e.target.value }))}
                    placeholder="https://onedrive.live.com/..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Assign To
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, assign_to_all: true, group_ids: [] }))}
                    className={`rounded-xl border py-2 text-xs font-semibold cursor-pointer ${
                      form.assign_to_all
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    All Students
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, assign_to_all: false }))}
                    className={`rounded-xl border py-2 text-xs font-semibold cursor-pointer ${
                      !form.assign_to_all
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    Specific Groups
                  </button>
                </div>

                {!form.assign_to_all && (
                  <div className="mt-3 max-h-36 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50 p-3">
                    {groups.length === 0 ? (
                      <p className="text-xs text-slate-500">No groups available yet.</p>
                    ) : (
                      groups.map((g) => (
                        <label
                          key={g.id}
                          className="flex cursor-pointer items-center gap-2 text-xs text-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={form.group_ids.includes(g.id)}
                            onChange={() => toggleGroupSelection(g.id)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                          />
                          <span className="font-medium">{g.name}</span>
                          <span className="text-slate-400">
                            ({(g.members || []).length} members)
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60 cursor-pointer"
                >
                  {saving ? 'Saving...' : editingId ? 'Update Assignment' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Obsidian SCSS Confirm Modal for Deleting Assignment */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Assignment?"
        message={
          deleteTarget
            ? `This will permanently delete "${deleteTarget.title}" along with all confirmed group submissions linked to it. This action cannot be undone.`
            : ''
        }
        confirmText="Delete Assignment"
        busy={deleting}
        onConfirm={executeDeleteAssignment}
        onCancel={() => setDeleteTarget(null)}
      />
    </main>
  );
}