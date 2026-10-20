# Course Studio — Online Course Service

Next.js backend API, React/Vite frontend, and MongoDB persistence. The original two-project structure and API routes are preserved.

## Student information and submission

- Student name: **To be filled by the student**
- Student ID / section: **To be filled by the student**
- Backend repository URL: **Pending publication** (project directory: `next-backend/`)
- Frontend repository URL: **Pending publication** (project directory: `react-frontend/`)
- Deployed backend URL: **Pending deployment**
- Deployed frontend URL: **Pending deployment**
- Screen and camera recording URL: **To be supplied by the student**

## Prerequisites

- Node.js 22.12+ (Node.js 24 recommended) and npm.
- MongoDB running locally, or an accessible MongoDB Atlas database.
- Allow the development machine / deployment host to access MongoDB. Never commit real `.env` files.

## Backend setup

```sh
cd next-backend
npm ci
cp .env.example .env.local
```

Skip the copy if your `.env` or `.env.local` is already configured. Set:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `MONGODB_DB` | Database name, defaults to `course_service` |
| `JWT_SECRET` | A random secret containing at least 32 characters |
| `FRONTEND_URL` | Exact frontend origin, e.g. `http://localhost:5173`. Comma-separated origins supported, without trailing slashes. |

Generate a secret with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`.

```sh
npm run seed
npm run dev
```

Backend: `http://localhost:3000`. The seed creates six accounts and five example courses (Open, Close, Cancel, and a one-seat course). It is safe to rerun: existing accounts, passwords, courses, and enrollments are preserved. Accounts listed below use the documented password on a fresh seed; pre-existing accounts are not reset.

## Frontend setup

In a second terminal:

```sh
cd react-frontend
npm ci
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`. Set `VITE_API_URL` to the backend origin, without `/api`. Rebuild after changing any Vite environment variable.

## Test credentials

Every newly seeded account has password **`Course2026!`**. Login accepts either username or email.

| Role | Username | Email |
| --- | --- | --- |
| Teacher | `teacher1` | `teacher1@example.com` |
| Teacher | `teacher2` | `teacher2@example.com` |
| Teacher | `teacher3` | `teacher3@example.com` |
| Student | `student1` | `student1@example.com` |
| Student | `student2` | `student2@example.com` |
| Student | `student3` | `student3@example.com` |

## Testing walkthrough

1. Sign in as `teacher1`. Only this teacher's courses appear. Create a course with multiple topics, a price, a positive duration, capacity 1, and Open status. View its details and edit it.
2. Sign out, then sign in as `teacher2`. The first teacher's course is absent. Direct API attempts to view, update, or delete it return 403.
3. Sign in as `student1`. Search by part of the course name or teacher username. Closed courses remain visible; canceled courses do not appear. Open a course and enroll. It appears under **My learning** and shows **Enrolled**. Refresh to verify session restoration.
4. Attempt another enrollment in the same course: the API returns 409. Sign in as `student2` and attempt to enroll in the now full one-seat course: the API returns 409.
5. Return as the owning teacher. Details show the student's username and email. Deletion is blocked for enrolled courses, and capacity cannot drop below existing enrollments. Increase capacity to permit more students.
6. Change status to Close: students can view the course but cannot enroll. Change to Cancel: students cannot list, view, or enroll in it, including through direct API requests. The owner retains access. Canceled courses are omitted from My learning as well.
7. Create a separate empty course and delete it. Attempt protected API operations without a token to verify 401 responses. Student mutations and teacher enrollment requests return 403.
8. Sign out. Protected frontend routes return to the login page.

## API overview

All routes except login/logout and OPTIONS require `Authorization: Bearer <token>`.

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/auth/login` | JSON `{ "login": "student1", "password": "Course2026!" }`; returns token and profile |
| POST | `/api/auth/logout` | Client discards bearer session |
| GET | `/api/user` | Current profile |
| GET | `/api/user/:id` | Own profile only |
| GET | `/api/course?q=text&enrolled=true` | Role-filtered list; optional name/teacher search and student enrollment filter |
| POST | `/api/course` | Teacher creates own course |
| GET | `/api/course/:id` | Role/ownership checked details; teacher includes enrolled student profiles |
| PUT | `/api/course/:id` | Owner updates complete editable fields |
| DELETE | `/api/course/:id` | Owner deletes only if no students enrolled |
| POST | `/api/course/:id/enroll` | Student enrolls if Open, not already enrolled, and space remains |

Course body: `{ "name": "React basics", "duration": 14, "topics": ["Components", "State"], "price": 990, "maxStudent": 20, "status": "Open" }`.

Passwords use bcrypt. Signed tokens expire in eight hours and live in sessionStorage, preserving refreshes within the current tab and supporting separately hosted frontends/backends without third-party cookies. Logout clears the local session; an already copied bearer token remains valid until expiration. API authorization reads the current account and role from MongoDB, never trusting caller-supplied identity or ownership. Student profiles never reveal the roster. Enrollment, capacity edits, and conditional deletion operate atomically on the same MongoDB course document, preventing overbooking and duplicate enrollment even under concurrent requests. Search strings are escaped before MongoDB regex matching.

## Automated validation

```sh
cd next-backend
npm run lint
npm run build
npm test
cd ../react-frontend
npm run lint
npm run build
```

The integration suite launches a temporary real MongoDB server and a separate Next.js process on port 3101. It seeds a disposable database and checks authentication, ownership, privacy, course CRUD, status behavior, search, concurrent last-seat enrollment, duplicates, capacity reductions, and CORS. It never connects to your configured database. The first run downloads a MongoDB binary and requires Internet access; use `MONGOMS_SYSTEM_BINARY=/path/to/mongod npm test` to supply an existing binary. Set `TEST_PORT` if port 3101 is occupied.

## Validation results

- Both application production builds and ESLint checks passed.
- All 46 isolated MongoDB/API integration checks passed, including simultaneous requests for the last seat.
- Browser verified student login, enrollment, My learning after refresh, teacher login, roster display, editor fields, and saving an owned course.
- The configured MongoDB database was seeded successfully. A browser test enrolled `student1` in Modern Web Development as sample roster data.
- Next.js was updated from the starter's 16.3.1 to the patched 16.4.2 release. The frontend audit and backend production-only audit report zero vulnerabilities. The backend full audit still reports five high findings in the development-only ESLint/fast-glob/braces dependency chain; npm's suggested force fix downgrades the framework's lint configuration and was not applied.
- Deployment and submission URLs are pending hosting/repository setup and the student's recording link.

## Deployment (Vercel)

1. Publish source to your GitHub repository. Both source links can refer to the relevant directories of the same repository, or use separate repositories if required by the lecturer.
2. Create a Vercel project with root directory **next-backend** and framework **Next.js**. Set `MONGODB_URI`, `MONGODB_DB`, `JWT_SECRET`, and `FRONTEND_URL` in Vercel environment settings. Use MongoDB Atlas or another reachable MongoDB server, not localhost.
3. Run `npm run seed` locally against that same database. Do not expose a public seed/reset API.
4. Create another Vercel project with root directory **react-frontend**, framework **Vite**, build `npm run build`, output **dist**. Set `VITE_API_URL` to the deployed backend origin.
5. Set the backend's `FRONTEND_URL` to the exact deployed frontend origin. Redeploy both projects after setting environment variables. HashRouter supports deep links without a server rewrite.
6. Verify login, course creation, enrollment, and student roster on the deployed frontend. API calls should reach the deployed backend successfully. Disable Vercel deployment protection for the grading URLs if it blocks public access.
7. Fill in the repository URLs, deployed URLs, name/ID/section, and recording link above. The student's full screen and camera recording must be arranged separately; the application cannot recreate an exam recording.
