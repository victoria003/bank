import { buildJsonResponse, verifyToken } from '../_auth';
import mockData from '../_mockData';

function buildResponse(body: unknown, status = 200) {
  return buildJsonResponse(body, { status });
}

export async function onRequestGet(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  const id = context.params.id;
  const records = (mockData as any).records || [];
  const found = records.find((r: any) => r.id === id);
  if (!found) return buildResponse({ error: 'Not found' }, 404);
  return buildResponse(found);
}

export async function onRequestPut(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  try {
    const id = context.params.id;
    const body = await context.request.json();
    const { name, email, details } = body;
    if (!name || !email) return buildResponse({ error: 'Name and email required' }, 400);

    // Stateless update: return updated object
    const updated = { id, name, email, details: details || '', updated_at: new Date().toISOString() };
    return buildResponse(updated);
  } catch (err) {
    return buildResponse({ error: 'Bad Request' }, 400);
  }
}

export async function onRequestDelete(context: any) {
  const auth = context.request.headers.get('Authorization');
  const user = verifyToken(auth);
  if (!user) return buildResponse({ error: 'Unauthorized' }, 401);

  // Stateless delete: return success
  return buildResponse({ success: true });
}
