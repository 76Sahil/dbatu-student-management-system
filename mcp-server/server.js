import crypto from 'node:crypto';
import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

const PORT = process.env.PORT || 3000;
const STUDENT_API_URL = (
  process.env.STUDENT_API_URL || 'https://dbatu-student-management-system.onrender.com/api'
).replace(/\/+$/, '');
const AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('MCP_AUTH_TOKEN is not set. Refusing to start an unauthenticated MCP server.');
  process.exit(1);
}

// ---- Student API client -------------------------------------------------
async function api(path, options = {}) {
  const res = await fetch(`${STUDENT_API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    signal: AbortSignal.timeout(60000) // free-tier Render services can take ~1 min to wake
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = body.message || body.error || (body.errors || []).join(' ') || res.statusText;
    throw new Error(`Student API ${res.status}: ${detail}`);
  }
  return body;
}

const asText = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] });
const asError = (err) => ({ isError: true, content: [{ type: 'text', text: err.message }] });

// ---- MCP server ---------------------------------------------------------
function buildServer() {
  const server = new McpServer({ name: 'sims-mcp-server', version: '1.0.0' });

  server.tool(
    'list_students',
    'List students, optionally filtered by a search term (matches student ID, name, email or department).',
    { search: z.string().optional().describe('Optional search text') },
    async ({ search }) => {
      try {
        const qs = search ? `?search=${encodeURIComponent(search)}` : '';
        return asText(await api(`/students${qs}`));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    'get_student',
    'Get one student by their MongoDB _id.',
    { id: z.string().describe('MongoDB _id of the student') },
    async ({ id }) => {
      try {
        return asText(await api(`/students/${encodeURIComponent(id)}`));
      } catch (e) {
        return asError(e);
      }
    }
  );

  server.tool(
    'enroll_student',
    'Enroll (create) a new student record.',
    {
      studentId: z.string().min(2).max(30).describe('Unique student ID'),
      name: z.string().min(2).max(100).describe('Full name'),
      email: z.string().email().describe('Email address'),
      contact: z.string().describe('Contact number, 7-15 digits'),
      department: z.string().describe('Academic department'),
      semester: z.number().int().min(1).max(8).describe('Semester, 1-8')
    },
    async (student) => {
      try {
        return asText(await api('/students', { method: 'POST', body: JSON.stringify(student) }));
      } catch (e) {
        return asError(e);
      }
    }
  );

  return server;
}

// ---- HTTP app -----------------------------------------------------------
const app = express();
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

function requireAuth(req, res, next) {
  const header = req.get('authorization') || '';
  const given = Buffer.from(header.replace(/^Bearer\s+/i, ''));
  const expected = Buffer.from(AUTH_TOKEN);
  const ok = given.length === expected.length && crypto.timingSafeEqual(given, expected);
  if (!ok) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Stateless Streamable HTTP: a fresh server + transport per request.
app.post('/mcp', requireAuth, async (req, res) => {
  const server = buildServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    transport.close();
    server.close();
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error('MCP request failed:', err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: { code: -32603, message: 'Internal server error' },
        id: null
      });
    }
  }
});

const methodNotAllowed = (_req, res) =>
  res.status(405).json({
    jsonrpc: '2.0',
    error: { code: -32000, message: 'Method not allowed.' },
    id: null
  });
app.get('/mcp', methodNotAllowed);
app.delete('/mcp', methodNotAllowed);

app.listen(PORT, () => {
  console.log(`SIMS MCP server listening on port ${PORT}, proxying ${STUDENT_API_URL}`);
});
