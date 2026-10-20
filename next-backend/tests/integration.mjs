import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { MongoMemoryServer } from 'mongodb-memory-server';

const port = Number(process.env.TEST_PORT || 3101);
const base = `http://localhost:${port}/api`;
let server, mongo, checks = 0;
function check(value, message) { assert.ok(value, message); checks++; console.log(`✓ ${message}`); }
async function request(path, { token, body, method = 'GET', headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers,
  }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data, headers: response.headers };
}
const courseData = { name: 'Integration Course', duration: 7, topics: ['React', 'MongoDB'], price: 100, maxStudent: 1, status: 'Open' };
let logs = '';
try {
  mongo = await MongoMemoryServer.create();
  const env = { ...process.env, MONGODB_URI: mongo.getUri(), MONGODB_DB: 'course_integration', JWT_SECRET: 'test-secret-only-for-isolated-integration-2026', FRONTEND_URL: 'http://localhost:5173' };
  const seed = spawn(process.execPath, ['scripts/seed.mjs'], { env, stdio: 'inherit' });
  const [seedCode] = await once(seed, 'exit');
  assert.equal(seedCode, 0);
  // Use a separate build directory to avoid touching a running developer session.
  server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--webpack', '-p', String(port)], { env: { ...env, NEXT_TEST_DIST: '.next-integration' }, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', chunk => { logs = (logs + chunk).slice(-20000); });
  server.stderr.on('data', chunk => { logs = (logs + chunk).slice(-20000); });
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (server.exitCode !== null) throw new Error(`Backend exited: ${logs}`);
    try { if ((await fetch(`http://localhost:${port}`)).ok) { ready = true; break; } } catch {}
    await delay(500);
  }
  assert.ok(ready, `Backend failed to start: ${logs}`);
  check((await request('/course')).status === 401, 'Unauthenticated course list rejected');
  check((await request('/course', { method: 'POST', body: courseData })).status === 401, 'Unauthenticated mutation rejected');
  check((await request('/course', { token: 'forged', headers: { 'x-user-id': 'spoofed', 'x-user-role': 'Teacher' } })).status === 401, 'Forged tokens and identity headers rejected');
  check((await request('/auth/login', { method: 'POST', body: { login: 'student1', password: 'wrong' } })).status === 401, 'Incorrect login rejected');
  const tokens = {};
  for (const name of ['teacher1','teacher2','teacher3','student1','student2','student3']) {
    const result = await request('/auth/login', { method: 'POST', body: { login: name === 'student3' ? `${name}@example.com` : name, password: 'Course2026!' } });
    check(result.status === 200 && result.data.token && !result.data.user.password, `${name} login works without exposing a password`);
    tokens[name] = result.data.token;
  }
  const t1 = tokens.teacher1, t2 = tokens.teacher2, s1 = tokens.student1;
  check((await request('/user', { token: s1 })).data.user.role === 'Student', 'Authenticated session restored');
  check((await request('/user/000000000000000000000000', { token: s1 })).status === 403, 'Other user profiles protected');
  const preflight = await request('/course', { method: 'OPTIONS', headers: { Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST' } });
  check(preflight.status === 204 && preflight.headers.get('access-control-allow-origin') === 'http://localhost:5173', 'CORS preflight works without authentication');
  check((await request('/course', { token: s1, headers: { Origin: 'https://untrusted.example' } })).status === 403, 'Unconfigured browser origin rejected');
  check((await request('/course', { token: s1, method: 'POST', body: courseData })).status === 403, 'Student cannot create courses');
  check((await request('/course', { token: t1, method: 'POST', body: { ...courseData, maxStudent: 0 } })).status === 400, 'Invalid course capacity rejected');
  check((await request('/course', { token: t1, method: 'POST', body: { ...courseData, topics: [] } })).status === 400, 'Empty topics rejected');
  const created = await request('/course', { token: t1, method: 'POST', body: courseData });
  check(created.status === 201 && created.data.course.teacherName === 'teacher1', 'Teacher creates owned course');
  const id = created.data.course.id;
  check((await request(`/course/${id}`, { token: t2 })).status === 403, 'Teacher cannot view another teacher course');
  check((await request(`/course/${id}`, { token: t2, method: 'PUT', body: courseData })).status === 403, 'Teacher cannot edit another teacher course');
  check((await request(`/course/${id}`, { token: t2, method: 'DELETE' })).status === 403, 'Teacher cannot delete another teacher course');
  check(!(await request('/course', { token: t2 })).data.courses.some(c => c.id === id), 'Teacher list includes own courses only');
  check((await request(`/course/${id}`, { token: s1, method: 'PUT', body: courseData })).status === 403, 'Student cannot edit courses');
  check((await request(`/course/${id}`, { token: s1, method: 'DELETE' })).status === 403, 'Student cannot delete courses');
  check((await request(`/course/${id}/enroll`, { token: t1, method: 'POST' })).status === 403, 'Teacher cannot enroll');
  const races = await Promise.all([s1,tokens.student2,tokens.student3].map(token => request(`/course/${id}/enroll`, { token, method: 'POST' })));
  check(races.filter(r => r.status === 201).length === 1 && races.filter(r => r.status === 409).length === 2, 'Concurrent enrollment cannot exceed final seat');
  const winner = [s1,tokens.student2,tokens.student3][races.findIndex(r => r.status === 201)];
  check((await request(`/course/${id}/enroll`, { token: winner, method: 'POST' })).status === 409, 'Duplicate enrollment rejected');
  check((await request(`/course/${id}`, { token: t1, method: 'DELETE' })).status === 409, 'Enrolled course cannot be deleted');
  const detail = (await request(`/course/${id}`, { token: t1 })).data.course;
  check(detail.enrolledCount === 1 && detail.students.length === 1 && !detail.students[0].password, 'Teacher details show safe enrolled student profiles');
  check(!('students' in (await request(`/course/${id}`, { token: s1 })).data.course), 'Student details do not expose class roster');
  check((await request('/course?enrolled=true', { token: winner })).data.courses.some(c => c.id === id), 'Student can list own enrollments');
  await request(`/course/${id}`, { token: t1, method: 'PUT', body: { ...courseData, maxStudent: 2 } });
  const loser = [s1,tokens.student2,tokens.student3].find(token => token !== winner);
  check((await request(`/course/${id}/enroll`, { token: loser, method: 'POST' })).status === 201, 'Increasing capacity makes another seat available');
  check((await request(`/course/${id}`, { token: t1, method: 'PUT', body: courseData })).status === 409, 'Capacity cannot fall below existing enrollment count');
  const closed = await request('/course', { token: t1, method: 'POST', body: { ...courseData, name: 'Closed test', status: 'Close' } });
  check((await request(`/course/${closed.data.course.id}/enroll`, { token: s1, method: 'POST' })).status === 409, 'Closed course rejects enrollment');
  check((await request('/course', { token: s1 })).data.courses.some(c => c.id === closed.data.course.id), 'Closed course remains visible');
  check((await request(`/course/${closed.data.course.id}`, { token: t1, method: 'DELETE' })).status === 200, 'Empty course can be deleted');
  check((await request(`/course/${closed.data.course.id}`, { token: s1 })).status === 404, 'Deleted course is no longer available');
  await request(`/course/${id}`, { token: t1, method: 'PUT', body: { ...courseData, maxStudent: 2, status: 'Cancel' } });
  check(!(await request('/course', { token: s1 })).data.courses.some(c => c.id === id), 'Canceled course hidden from student catalog');
  check(!(await request('/course?enrolled=true', { token: winner })).data.courses.some(c => c.id === id), 'Canceled course hidden from student enrolled list');
  check((await request(`/course/${id}`, { token: s1 })).status === 404, 'Canceled course inaccessible to student by direct ID');
  check((await request(`/course/${id}/enroll`, { token: s1, method: 'POST' })).status === 404, 'Canceled course rejects enrollment');
  check((await request(`/course/${id}`, { token: t1 })).data.course.status === 'Cancel', 'Owner can still manage canceled course');
  check((await request('/course?q=modern', { token: s1 })).data.courses.some(c => c.name === 'Modern Web Development'), 'Partial case-insensitive course name filter works');
  check((await request('/course?q=teacher2', { token: s1 })).data.courses.every(c => c.teacherName === 'teacher2'), 'Teacher name filter works');
  check((await request('/course?q=%5B', { token: s1 })).status === 200, 'Search treats regex characters literally');
  check((await request('/course/not-an-id', { token: s1 })).status === 400, 'Malformed course ID rejected');
  console.log(`\n${checks} integration checks passed against isolated MongoDB.`);
} catch (error) {
  console.error(error);
  if (logs) console.error(logs);
  process.exitCode = 1;
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([once(server,'exit'), delay(5000)]);
    if (server.exitCode === null) server.kill('SIGKILL');
  }
  if (mongo) await mongo.stop();
}
