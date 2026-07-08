import { buildJsonResponse, verifyToken } from '../_auth';
import { default as mockData } from '../_mockData';

function buildResponse(body: unknown, status = 200) {
  return buildJsonResponse(body, { status });
}

export async function onRequestGet(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  // If a SNOWFLAKE proxy is configured, forward request (not implemented here)
  // Fallback to mock data
  const records = (mockData as any).records || [];
  return buildResponse(records);
}

export async function onRequestPost(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  try {
    const body = await context.request.json();
    const { name, email, details } = body;
    if (!name || !email) return buildResponse({ error: 'Name and email required' }, 400);

    const id = `rec-${Date.now().toString(36)}-${Math.floor(Math.random()*9000+1000)}`;
    const created = { id, name, email, details: details || '', created_at: new Date().toISOString() };

    // Note: Pages Functions are stateless — we return the created record but do not persist without external storage.
    return buildResponse(created, 201);
  } catch (err) {
    return buildResponse({ error: 'Bad Request' }, 400);
  }
}
