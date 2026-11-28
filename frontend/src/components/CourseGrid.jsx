import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';

export default function CourseGrid({ role = 'STUDENT' }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await api.get('/courses');
        if (active) setCourses(res.data.courses || []);
      } catch (err) {
        if (active) setError(err.response?.data?.message || 'Failed to load courses.');
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchCourses();
    return () => {
      active = false;
    };
  }, []);

  const isAdmin = role === 'ADMIN';

  if (loading) {
    return (
      <section className="mb-8">
        <div className="mb-4 h-7 w-52 animate-pulse rounded-lg bg-slate-200" />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-52 animate-pulse rounded-2xl bg-slate-200/75" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8 animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isAdmin ? 'Courses Taught' : 'My Enrolled Courses'}
          </h2>
          <p className="text-sm text-slate-500">
            {isAdmin
              ? 'Click any course to manage assignments and filter submission statuses.'
              : 'Click a course card to open its assignments and track progress.'}
          </p>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          {courses.length} {courses.length === 1 ? 'Course' : 'Courses'}
        </span>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      {courses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No courses available yet.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => {
            const targetPath = isAdmin
              ? `/admin/courses/${course.id}`
              : `/student/courses/${course.id}`;
            const rate = course.completion_rate || 0;

            return (
              <Link
                key={course.id}
                to={targetPath}
                className="course-card-hover group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-indigo-300"
                style={{
                  borderTopWidth: '4px',
                  borderTopColor: course.accent_color || '#6366f1',
                }}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="rounded-md px-2.5 py-0.5 text-xs font-bold tracking-wide text-white"
                      style={{ backgroundColor: course.accent_color || '#6366f1' }}
                    >
                      {course.code}
                    </span>
                    <span className="text-xs font-medium text-slate-400">
                      {course.semester || 'Fall 2026'}
                    </span>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-600">
                    {course.description}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100">
                  {isAdmin ? (
                    <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-slate-50 py-1.5">
                        <div className="text-sm font-bold text-slate-900">
                          {course.student_count || 0}
                        </div>
                        <div className="text-[11px] text-slate-500">Students</div>
                      </div>
                      <div className="rounded-lg bg-emerald-50 py-1.5">
                        <div className="text-sm font-bold text-emerald-700">
                          {course.confirmed_submissions || 0}
                        </div>
                        <div className="text-[11px] text-emerald-600">Confirmed</div>
                      </div>
                      <div className="rounded-lg bg-amber-50 py-1.5">
                        <div className="text-sm font-bold text-amber-700">
                          {course.pending_submissions || 0}
                        </div>
                        <div className="text-[11px] text-amber-600">Pending</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>{course.professor_name || 'Professor'}</span>
                      <span>
                        {course.completed_count || 0}/{course.assignment_count || 0} done
                      </span>
                    </div>
                  )}

                  {/* Animated Progress Bar */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>{isAdmin ? 'Submission Rate' : 'Progress'}</span>
                    <span className="text-indigo-600">{rate}%</span>
                  </div>
                  <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-700 ease-out"
                      style={{ width: `${rate}%` }}
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs font-semibold text-indigo-600">
                    <span>
                      {isAdmin
                        ? `${course.assignment_count || 0} Assignments`
                        : course.pending_count > 0
                        ? `${course.pending_count} Pending`
                        : 'All Caught Up ✓'}
                    </span>
                    <span className="transition-transform group-hover:translate-x-1">
                      Open Course →
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}