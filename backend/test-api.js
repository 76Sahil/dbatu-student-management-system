/**
 * Verification & Test Suite for Student Management API
 * Can be run via: npm test (from backend directory)
 */
const http = require('http');

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

const request = (method, path, body = null, headers = {}) => {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, data: json, headers: res.headers });
      });
    });

    req.on('error', (err) => reject(err));

    if (body !== null) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
};

const runTests = async () => {
  console.log('====================================================');
  console.log('🧪 Starting Student Management System Verification');
  console.log(`Target: ${BASE_URL}`);
  console.log('====================================================\n');

  let passes = 0;
  let failures = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`  ✅ PASS: ${title}`);
      passes++;
    } else {
      console.error(`  ❌ FAIL: ${title}`);
      failures++;
    }
  };

  try {
    // Test 1: Health check
    console.log('[1/4] Testing GET /api/health...');
    const health = await request('GET', '/api/health');
    assert(health.status === 200, 'Health endpoint responds with HTTP 200');
    assert(health.data && health.data.status === 'ok', 'Health status reports "ok"');
    console.log(`  ℹ️  Database status: "${health.data.database.status}"`);

    const isDbConnected = health.data.database.status === 'connected';

    // Test 2: Undefined endpoint (404)
    console.log('\n[2/4] Testing undefined route 404 handling...');
    const notFound = await request('GET', '/api/route-that-does-not-exist');
    assert(notFound.status === 404, 'Undefined route returns HTTP 404');

    // Test 3: Malformed JSON payload
    console.log('\n[3/4] Testing malformed JSON body handling...');
    const malformed = await request('POST', '/api/students', '{ bad json: true ', { 'Content-Type': 'application/json' });
    assert(malformed.status === 400, 'Malformed JSON returns HTTP 400 Bad Request');

    // Test 4: Database operations
    console.log('\n[4/4] Testing Database Endpoints & CRUD...');
    if (!isDbConnected) {
      console.log('  ⚠️  MongoDB is not connected (MONGODB_URI not configured or cluster unreachable).');
      console.log('  Testing safe 503 fallback behavior:');
      const studentsReq = await request('GET', '/api/students');
      assert(studentsReq.status === 503, 'GET /api/students returns 503 Service Unavailable when DB is down');
      assert(studentsReq.data.dbStatus === 'disconnected' || studentsReq.data.dbStatus === 'connecting', 'Response correctly flags dbStatus as unavailable');
      console.log('  ℹ️  CRUD persistence tests SKIPPED (Awaiting user MONGODB_URI in backend/.env).');
    } else {
      console.log('  ✅ Database is connected! Running live CRUD suite:');
      
      const testId = `TEST-${Date.now().toString().slice(-4)}`;
      const testStudent = {
        studentId: testId,
        name: 'Test Student',
        email: `test.${testId.toLowerCase()}@university.edu`,
        department: 'Computer Science',
        semester: 4,
        contact: '+1 555-0199'
      };

      // POST create
      const createRes = await request('POST', '/api/students', testStudent);
      assert(createRes.status === 201, `POST /api/students creates student (HTTP 201)`);
      const mongoId = createRes.data?.data?._id;

      // Duplicate check
      const dupRes = await request('POST', '/api/students', testStudent);
      assert(dupRes.status === 409, `POST /api/students rejects duplicate studentId (HTTP 409)`);

      // Semester boundary & validation checks
      // Valid lower bound: semester 1
      const sem1Res = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-sem1`, semester: 1 });
      assert(sem1Res.status === 201, `POST /api/students accepts valid lower boundary semester 1 (HTTP 201)`);
      if (sem1Res.data?.data?._id) await request('DELETE', `/api/students/${sem1Res.data.data._id}`);

      // Valid upper bound: semester 8
      const sem8Res = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-sem8`, semester: 8 });
      assert(sem8Res.status === 201, `POST /api/students accepts valid upper boundary semester 8 (HTTP 201)`);
      if (sem8Res.data?.data?._id) await request('DELETE', `/api/students/${sem8Res.data.data._id}`);

      // Invalid lower bound: semester 0 rejected
      const sem0Res = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-sem0`, semester: 0 });
      assert(sem0Res.status === 400, `POST /api/students rejects invalid semester 0 (HTTP 400)`);

      // Invalid upper bound: semester 9 rejected
      const sem9Res = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-sem9`, semester: 9 });
      assert(sem9Res.status === 400, `POST /api/students rejects invalid semester 9 (HTTP 400)`);

      // Invalid legacy bound: semester 12 rejected
      const sem12Res = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-sem12`, semester: 12 });
      assert(sem12Res.status === 400, `POST /api/students rejects invalid semester 12 (HTTP 400)`);

      // Invalid non-integer: semester 3.5 rejected
      const floatSemRes = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-float`, semester: 3.5 });
      assert(floatSemRes.status === 400, `POST /api/students rejects non-integer semester 3.5 (HTTP 400)`);

      // Invalid string: semester 'invalid' rejected
      const strSemRes = await request('POST', '/api/students', { ...testStudent, studentId: `${testId}-str`, semester: 'invalid' });
      assert(strSemRes.status === 400, `POST /api/students rejects non-numeric semester 'invalid' (HTTP 400)`);

      // GET list
      const listRes = await request('GET', `/api/students?search=${testId}`);
      assert(listRes.status === 200 && listRes.data?.data?.length > 0, `GET /api/students?search finds created student`);

      // GET single
      const singleRes = await request('GET', `/api/students/${mongoId}`);
      assert(singleRes.status === 200 && singleRes.data?.data?.studentId === testId, `GET /api/students/:id retrieves student`);

      // PUT update
      const updateRes = await request('PUT', `/api/students/${mongoId}`, {
        name: 'Updated Test Student',
        semester: 5
      });
      assert(updateRes.status === 200 && updateRes.data?.data?.semester === 5, `PUT /api/students/:id updates details (HTTP 200)`);

      // DELETE
      const deleteRes = await request('DELETE', `/api/students/${mongoId}`);
      assert(deleteRes.status === 200, `DELETE /api/students/:id deletes record (HTTP 200)`);

      // Verify deletion
      const checkDeleted = await request('GET', `/api/students/${mongoId}`);
      assert(checkDeleted.status === 404, `GET deleted student returns HTTP 404`);
    }

    console.log('\n====================================================');
    console.log(`Test Results: ${passes} Passed, ${failures} Failed`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('Test execution error:', err.message);
  }
};

runTests();
