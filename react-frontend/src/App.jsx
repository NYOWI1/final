import { useContext, useEffect, useState } from "react";
import { HashRouter, Link, Navigate, Route, Routes, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { UserContext } from "./context/UserContext";
import "./App.css";

const money = value => new Intl.NumberFormat("en-TH", { style: "currency", currency: "THB", maximumFractionDigits: 0 }).format(value);
function Status({ value }) { return <span className={`status ${value.toLowerCase()}`}><i />{value === "Close" ? "Closed" : value === "Cancel" ? "Canceled" : "Open"}</span>; }
function Notice({ error, children }) { return children ? <div role={error ? "alert" : "status"} className={`notice ${error ? "error" : ""}`}>{children}</div> : null; }
function Login() {
  const { login, user } = useContext(UserContext);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try { await login(form.get("login"), form.get("password")); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <main className="login-page"><section className="login-story"><Link to="/" className="brand"><span className="brand-mark">c</span>course<span className="brand-light">studio</span></Link><div><p className="eyebrow">A LITTLE CURIOSITY. A NEW POSSIBILITY.</p><h1>Your next chapter<br />starts here<span>.</span></h1><p>Make room for something new. Explore courses,<br />learn from teachers, and build what comes next.</p><div className="abstract-art" aria-hidden="true"><div /><div /><div /><span>Learn. Create. Grow.</span></div></div><small>Online learning, with a human touch.</small></section><section className="login-form"><p className="eyebrow">WELCOME TO COURSE STUDIO</p><h2>Good to see you.</h2><p className="muted">Sign in to continue your learning journey.</p><form onSubmit={submit}><label>Username or email<input name="login" autoComplete="username" required placeholder="Enter your username or email" /></label><label>Password<input name="password" type="password" autoComplete="current-password" required placeholder="Enter your password" /></label><Notice error>{error}</Notice><button className="button primary" disabled={busy}>{busy ? "Signing in…" : "Sign in →"}</button></form><div className="login-help">Use the test accounts listed in the project README.<br />Your account role determines your workspace.</div></section></main>;
}
function Shell({ children }) {
  const { user, logout } = useContext(UserContext);
  const [params] = useSearchParams();
  const mine = params.get("view") === "enrolled";
  return <div className="workspace"><aside className="sidebar"><Link to="/" className="brand"><span className="brand-mark">c</span>course<span className="brand-light">studio</span></Link><p className="nav-caption">YOUR WORKSPACE</p><nav><Link className={!mine ? "active" : ""} to="/">▦ <span>{user.role === "Teacher" ? "My courses" : "Explore courses"}</span></Link>{user.role === "Student" && <Link className={mine ? "active" : ""} to="/?view=enrolled">▤ <span>My learning</span></Link>}</nav><div className="sidebar-note"><span>✳</span><h3>{user.role === "Teacher" ? "Share what you know." : "Keep your curiosity alive."}</h3><p>{user.role === "Teacher" ? "Your experience could be someone’s next beginning." : "Small steps today. New possibilities tomorrow."}</p></div><div className="profile"><div className="avatar">{user.username.slice(0,1).toUpperCase()}</div><div><strong>{user.username}</strong><small>{user.role} account</small></div><button title="Sign out" aria-label="Sign out" className="icon-button" onClick={logout}>↪</button></div></aside><div className="main-column"><header className="topbar"><span>{user.role === "Teacher" ? "Teaching workspace" : "Learning workspace"}</span><span className="topbar-right">A good day to learn something new <span className="mini-avatar">{user.username.slice(0,1).toUpperCase()}</span></span></header><main className="content">{children}</main><footer>COURSE STUDIO <span>A space to learn. A place to grow.</span></footer></div></div>;
}
function CourseList() {
  const { user, api } = useContext(UserContext);
  const [params] = useSearchParams();
  const mine = params.get("view") === "enrolled";
  const [query, setQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      api(`/course?q=${encodeURIComponent(query)}${mine ? "&enrolled=true" : ""}`)
        .then(data => { if (active) setCourses(data.courses); })
        .catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [api, query, mine]);
  const teacher = user.role === "Teacher";
  return <><div className="page-heading"><div><p className="eyebrow">{teacher ? "INSPIRE THE NEXT CHAPTER" : mine ? "YOUR NEXT CHAPTER" : "INVEST IN YOUR CURIOSITY"}</p><h1>{teacher ? "My courses" : mine ? "My learning" : "Find your next beginning."}</h1><p className="muted">{teacher ? "Create meaningful lessons. See your students grow." : mine ? "Everything you’ve signed up for, all in one place." : "Fresh skills, new perspectives, and a little inspiration along the way."}</p></div>{teacher && <Link className="button primary" to="/courses/new">+ Create course</Link>}</div><section className="feature-banner"><div><span className="banner-label">{teacher ? "MADE FOR GREAT TEACHING" : "LEARNING THAT MOVES YOU FORWARD"}</span><h2>{teacher ? "Big ideas start with you." : "Make time for what’s next."}</h2><p>{teacher ? "Bring your knowledge to life, one course at a time." : "Discover your next skill. Go at your own pace. Keep growing."}</p></div><div className="banner-art" aria-hidden="true"><span /><span /><span /></div></section><div className="catalog-toolbar"><div><h2>{teacher ? "Your course collection" : mine ? "Enrolled courses" : "Explore the collection"}</h2><span className="muted">{loading ? "Loading courses…" : `${courses.length} ${courses.length === 1 ? "course" : "courses"}${query ? " found" : " to discover"}`}</span></div><label className="search"><span aria-hidden="true">⌕</span><input aria-label="Search courses or teachers" placeholder="Search courses or teachers…" value={query} onChange={e => setQuery(e.target.value)} /></label></div><Notice error>{error}</Notice>{loading ? <div className="empty" role="status">Loading your courses…</div> : !courses.length ? <div className="empty"><h3>{mine ? "Your learning journey starts here" : "No courses found"}</h3><p>{mine ? "Explore the collection and enroll in an open course." : "Try another search or create your first course."}</p>{mine && <Link className="button primary" to="/">Explore courses →</Link>}</div> : <div className="course-grid">{courses.map((course, index) => <Link className="course-card" to={`/courses/${course.id}`} key={course.id}><div className={`card-art art-${index % 4}`}><span className="art-number">{String(index + 1).padStart(2, "0")}</span><div className="art-shape" /><span className="art-label">{course.topics[0]}</span><Status value={course.status} /></div><div className="card-body"><div className="course-meta"><span>{course.duration} DAYS</span><span>{course.topics.length} TOPICS</span></div><h3>{course.name}</h3><p className="teacher-line"><span className="teacher-avatar">{course.teacherName.slice(0,1).toUpperCase()}</span>{course.teacherName}</p><div className="capacity-line"><span>{course.enrolledCount} / {course.maxStudent} enrolled</span><span>{course.seatsAvailable ? `${course.seatsAvailable} seats left` : "Full"}</span></div><div className="capacity-track"><div style={{ width: `${course.enrolledCount / course.maxStudent * 100}%` }} /></div><div className="card-bottom"><strong>{course.price ? money(course.price) : "Free"}</strong><span>{course.enrolled ? "Enrolled ✓" : "View course ↗"}</span></div></div></Link>)}</div>}</>;
}
function CourseForm({ initial, onSave, busy }) {
  const [topics, setTopics] = useState(initial?.topics.join("\n") || "");
  function submit(e) {
    e.preventDefault(); const values = new FormData(e.currentTarget);
    onSave({ name: values.get("name"), duration: Number(values.get("duration")), topics: topics.split(/\n|,/).map(t => t.trim()).filter(Boolean), price: Number(values.get("price")), maxStudent: Number(values.get("maxStudent")), status: values.get("status") });
  }
  return <form className="course-form" onSubmit={submit}><label>Course name<input name="name" required maxLength={150} defaultValue={initial?.name} placeholder="e.g. Modern Web Development" /></label><div className="form-grid"><label>Duration (days)<input type="number" name="duration" min="1" max="3650" required defaultValue={initial?.duration || 14} /></label><label>Price (THB)<input type="number" name="price" min="0" max="10000000" step="0.01" required defaultValue={initial?.price ?? 0} /></label><label>Max Student<input type="number" name="maxStudent" min={Math.max(1, initial?.enrolledCount || 0)} max="10000" required defaultValue={initial?.maxStudent || 20} /></label><label>Status<select name="status" defaultValue={initial?.status || "Open"}><option>Open</option><option>Close</option><option>Cancel</option></select></label></div><label>Topics<textarea required rows={5} value={topics} onChange={e => setTopics(e.target.value)} placeholder="Add one topic per line, or separate topics with commas" /></label><p className="muted form-hint">Open courses accept enrollments. Closed courses remain visible. Canceled courses are hidden from students.</p><div className="form-actions"><Link className="button secondary" to={initial ? `/courses/${initial.id}` : "/"}>Cancel</Link><button className="button primary" disabled={busy}>{busy ? "Saving…" : initial ? "Save changes" : "Create course"}</button></div></form>;
}
function CourseEditor({ create = false }) {
  const { api } = useContext(UserContext);
  const { id } = useParams(); const navigate = useNavigate();
  const [course, setCourse] = useState(null); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (create) return;
    let active = true;
    api(`/course/${id}`).then(data => { if (active) setCourse(data.course); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [api, id, create]);
  async function save(values) {
    setBusy(true); setError("");
    try { const data = await api(create ? "/course" : `/course/${id}`, { method: create ? "POST" : "PUT", body: JSON.stringify(values) }); navigate(`/courses/${data.course.id}`); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return <><Link className="back-link" to={create ? "/" : `/courses/${id}`}>← Back</Link><div className="page-heading"><div><p className="eyebrow">SHARE YOUR EXPERTISE</p><h1>{create ? "Create a course" : "Edit your course"}</h1><p className="muted">Give your students something to look forward to.</p></div></div><Notice error>{error}</Notice>{create || course ? <CourseForm key={course?.id || "new"} initial={course} onSave={save} busy={busy} /> : !error && <p>Loading course…</p>}</>;
}
function CourseDetail() {
  const { user, api } = useContext(UserContext); const { id } = useParams(); const navigate = useNavigate();
  const [course, setCourse] = useState(null); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    let active = true;
    api(`/course/${id}`).then(data => { if (active) setCourse(data.course); }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [api, id]);
  async function enroll() {
    setBusy(true); setError("");
    try { const data = await api(`/course/${id}/enroll`, { method: "POST" }); setCourse(data.course); setMessage("You’re enrolled! Your next chapter is ready."); }
    catch (e) { setError(e.message); const data = await api(`/course/${id}`).catch(() => null); if (data) setCourse(data.course); }
    finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError("");
    try { await api(`/course/${id}`, { method: "DELETE" }); navigate("/"); } catch (e) { setError(e.message); setConfirmDelete(false); } finally { setBusy(false); }
  }
  return <><Link className="back-link" to="/">← Back to courses</Link><Notice error>{error}</Notice><Notice>{message}</Notice>{!course ? !error && <p>Loading course…</p> : <><div className="detail-heading"><Status value={course.status} /><h1>{course.name}</h1><p className="muted">A course by <strong>{course.teacherName}</strong></p></div><div className="detail-grid"><section className="panel"><p className="eyebrow">THE NEXT STEPS IN YOUR JOURNEY</p><h2>What you’ll explore</h2><ol className="topic-list">{course.topics.map((topic,i) => <li key={topic}><span>{String(i+1).padStart(2,"0")}</span>{topic}</li>)}</ol>{user.role === "Teacher" && <div className="roster"><h2>Enrolled students <span className="count-pill">{course.enrolledCount}</span></h2>{!course.students?.length ? <p className="muted">No students yet. Your next great class starts here.</p> : <ul>{course.students.map(student => <li key={student.id}><span className="avatar">{student.username.slice(0,1).toUpperCase()}</span><div><strong>{student.username}</strong><small>{student.email}</small></div></li>)}</ul>}</div>}</section><aside className="panel enrollment-panel"><p className="eyebrow">YOUR NEXT CHAPTER</p><h2>{course.price ? money(course.price) : "Free"}</h2><dl><div><dt>Duration</dt><dd>{course.duration} days</dd></div><div><dt>Topics</dt><dd>{course.topics.length}</dd></div><div><dt>Enrolled</dt><dd>{course.enrolledCount} / {course.maxStudent}</dd></div><div><dt>Seats available</dt><dd>{course.seatsAvailable}</dd></div></dl>{user.role === "Teacher" ? <><Link className="button primary" to={`/courses/${id}/edit`}>Edit course</Link><button className="button danger" disabled={!!course.enrolledCount || busy} onClick={() => setConfirmDelete(true)}>Delete course</button>{course.enrolledCount > 0 && <p className="muted form-hint">Courses with enrolled students cannot be deleted.</p>}{confirmDelete && <div className="delete-confirm" role="alert"><p>Delete this course permanently?</p><button className="button danger" disabled={busy} onClick={remove}>Confirm delete</button><button className="button secondary" onClick={() => setConfirmDelete(false)}>Keep course</button></div>}</> : <><button className="button primary" disabled={busy || course.enrolled || course.status !== "Open" || !course.seatsAvailable} onClick={enroll}>{busy ? "Enrolling…" : course.enrolled ? "Enrolled ✓" : course.status !== "Open" ? "Enrollment closed" : !course.seatsAvailable ? "Course full" : "Enroll in this course →"}</button><p className="muted form-hint">{course.enrolled ? "Find this course in My learning." : "Find your inspiration. Make your next move."}</p></>}</aside></div></>}</>;
}
function Protected({ children, teacherOnly = false }) {
  const { user, loading } = useContext(UserContext);
  if (loading) return <div className="initial-loading">Opening Course Studio…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (teacherOnly && user.role !== "Teacher") return <Navigate to="/" replace />;
  return <Shell>{children}</Shell>;
}
export default function App() {
  return <HashRouter><Routes><Route path="/login" element={<Login />} /><Route path="/" element={<Protected><CourseList /></Protected>} /><Route path="/courses/new" element={<Protected teacherOnly><CourseEditor create /></Protected>} /><Route path="/courses/:id" element={<Protected><CourseDetail /></Protected>} /><Route path="/courses/:id/edit" element={<Protected teacherOnly><CourseEditor /></Protected>} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></HashRouter>;
}
