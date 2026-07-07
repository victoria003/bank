import { buildJsonResponse, getUserForCredentials, createToken } from '../_auth';

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { username, password } = body;

    if (!username || !password) {
      return buildJsonResponse({ success: false, error: 'Username and password are required.' }, { status: 400 });
    }

    const user = getUserForCredentials(username, password);
    if (!user) {
      return buildJsonResponse({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    return buildJsonResponse({
      success: true,
      token: createToken(user.username),
      user: {
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err: any) {
    return buildJsonResponse({ success: false, error: 'Bad Request' }, { status: 400 });
  }
}
