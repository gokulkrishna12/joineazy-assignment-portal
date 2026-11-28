Markdown
# Joineazy Portal — Course, Group & Assignment Management System

A full-stack academic assignment management and submission-tracking portal built for **Joineazy (Round 2)**. It connects **Students** and **Professors** through course-centric dashboards, OneDrive submission workflows, strict group-leader-only acknowledgment rules, real-time analytics, and role-gated authentication.

- **Live Frontend (Netlify):** [https://voluble-starburst-5ed85d.netlify.app](https://voluble-starburst-5ed85d.netlify.app)
- **Live Backend API (Railway):** [https://joineazy-assignment-portal-production.up.railway.app](https://joineazy-assignment-portal-production.up.railway.app)
- **Database:** PostgreSQL (Neon Cloud)

---

## Key Features & Round 2 Enhancements

### 1. Course-Centric Dashboards
- **Student Workspace:** Responsive course-card grid (`CS301`, `CS302`, `CS303`) displaying instructor details, completed vs. pending counts, and animated progress bars. Newly registered students are auto-enrolled so they never land on an empty workspace.
- **Professor Control Center:** Displays all courses taught with enrolled student counts, confirmed vs. pending submission totals, overall completion rate, and interactive **Recharts** analytics.

### 2. Individual vs. Group Submissions & Leader-Only Rule
- Professors can create course-linked assignments as either **Individual** or **Group** (`GROUP` / `INDIVIDUAL`) and target all groups or specific groups.
- **Strict Group-Leader Enforcement:** For `GROUP` assignments, only the verified Group Leader (`is_leader` / `groups.leader_id`) can acknowledge a submission via a **2-step confirmation modal**. Non-leader members see a clear **🔒 Leader Action Required** banner and are blocked at the API level (`403 Forbidden`).
- **Automatic Group Propagation:** Once the leader acknowledges a group assignment, the `✓ Acknowledged` status immediately reflects across every member in that group.

### 3. Professor Status Filtering & CRUD
- Full Create, Edit, and Delete support for course-scoped assignments.
- Interactive status filter pills (**`All Statuses`**, **`✓ Acknowledged`**, **`⏳ Pending`**) across both **Student-wise Tracking** and **Group-wise Tracking** tables.

### 4. Multi-Layer Authentication & Security
- **JWT Role-Based Access Control** (`STUDENT` / `ADMIN`) with protected routes and middleware guards.
- **Professor / Faculty Access ID Verification:** Registering as a Professor requires a valid institutional Faculty ID (`PROF2026`, `FAC101`, `FAC102` — configurable via `PROFESSOR_ACCESS_CODES`), enforced on both Email/OTP registration and Google OAuth sign-up.
- **Gmail 6-Digit OTP Verification & Password Recovery** + **Google OAuth 2.0 Sign-In**.

---

## UI/UX Design Rationale

- **Dark Navy Glassmorphism Theme (`#080d1a` canvas + `#0f172a` elevated cards):** Reduces visual fatigue during long academic sessions while giving high contrast to status indicators.
- **Semantic Color Coding:** Emerald (`#10b981`) for acknowledged submissions, Amber (`#f59e0b`) for pending/leader-locked items, Rose (`#f43f5e`) for overdue alerts, and Purple/Sky pills to distinguish Group vs. Individual assignments at a glance.
- **Micro-Interactions (`_animations.scss`):** Smooth `fadeSlideUp` page transitions, `course-card-hover` lift states, `checkPop` completion checkmark bounce, and animated gradient progress bars.
- **2-Step Confirmation Modal:** Prevents accidental submission acknowledgments by verifying OneDrive upload before writing to PostgreSQL.

---

## Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, SCSS, Axios, Recharts, Lucide React, `@react-oauth/google` |
| **Backend** | Node.js, Express.js, JWT (`jsonwebtoken`), `bcryptjs`, `google-auth-library`, Nodemailer |
| **Database** | PostgreSQL (9 normalized tables on Neon Cloud) |
| **Deployment** | Netlify (Frontend SPA with `_redirects`), Railway (Backend API), Docker Compose (Local) |

---

## Database Schema (9 PostgreSQL Tables)

1. `users` — Students and Professors (`id`, `name`, `email`, `student_id`, `password_hash`, `role`, `is_verified`, `google_id`)
2. `email_otps` — 6-digit OTP codes with 10-minute expiry for registration & password reset
3. `courses` — Course catalog (`code`, `title`, `description`, `semester`, `accent_color`, `professor_id`)
4. `course_enrollments` — Many-to-many student enrollment mapping
5. `groups` — Student teams with explicit `leader_id` foreign key
6. `group_members` — Team membership with `is_leader` flag
7. `assignments` — Course-linked assignments (`course_id`, `submission_type`: `INDIVIDUAL` | `GROUP`, `due_date`, `onedrive_link`, `assign_to_all`)
8. `assignment_groups` — Targeted group mapping for selective group assignments
9. `submissions` — Tracks both Group (`group_id`) and Individual (`student_id`) acknowledgments with partial unique indexes preventing duplicates

---

## Key API Endpoints

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/send-register-otp` | Public | Sends 6-digit verification OTP to Gmail |
| `POST` | `/api/auth/register` | Public | Registers Student or Professor (verifies OTP + Faculty Access ID for `ADMIN`) |
| `POST` | `/api/auth/login` | Public | Authenticates user and returns JWT |
| `POST` | `/api/auth/google` | Public | Google OAuth Sign-In / Sign-Up |
| `GET` | `/api/courses` | Auth | Returns enrolled courses (Student) or courses taught with stats (Professor) |
| `GET` | `/api/courses/:id` | Auth | Returns course metadata and summary metrics |
| `GET` | `/api/assignments?course_id=` | Auth | Lists assignments with `can_acknowledge` & `leader_required_message` flags |
| `POST/PUT/DELETE` | `/api/assignments/:id` | Professor | Create, update, or delete Individual/Group course assignments |
| `POST` | `/api/submissions/confirm` | Student | Records Individual or Leader-only Group acknowledgment |
| `GET` | `/api/submissions/analytics` | Professor | Returns charts data + Student/Group tracking filtered by `?course_id=&status=ALL\|CONFIRMED\|PENDING` |

---

## Local Setup Instructions

### Prerequisites
- Node.js v18+
- PostgreSQL database URL (local or Neon Cloud)

### 1. Clone the Repository
```bash
git clone [https://github.com/gokulkrishna12/joineazy-assignment-portal.git](https://github.com/gokulkrishna12/joineazy-assignment-portal.git)
cd joineazy-assignment-portal
2. Backend Setup
Bash
cd backend
npm install
Create backend/.env:

Code snippet
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
PROFESSOR_ACCESS_CODES=PROF2026,FAC101,FAC102
GOOGLE_CLIENT_ID=your_google_oauth_client_id
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password
Initialize the 9 tables, seed sample courses/users/assignments, and start the server:

Bash
node src/config/seed.js
npm run dev
3. Frontend Setup
Bash
cd ../frontend
npm install
Create frontend/.env:

Code snippet
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_oauth_client_id
Start the Vite dev server:

Bash
npm run dev
Open http://localhost:5173.