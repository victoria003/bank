import { buildJsonResponse, verifyToken } from '../_auth';
import { uploadResult } from '../_mockData';

export async function onRequestPost(context: any) {
  const authHeader = context.request.headers.get('Authorization');
  const user = verifyToken(authHeader);
  if (!user) {
    return buildJsonResponse({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await context.request.json();
  if (!body.fileName || !body.fileFormat) {
    return buildJsonResponse({ success: false, error: 'File name and format are required.' }, { status: 400 });
  }

  return buildJsonResponse(uploadResult);
}
