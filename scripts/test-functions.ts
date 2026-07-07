import { onRequestPost as loginFn } from '../functions/api/login';
import { onRequestPost as authLoginFn } from '../functions/api/auth/login';
import { onRequestGet as authMeFn } from '../functions/api/auth/me';

async function callPost(fn: any, body: any, label: string) {
  const req = new Request('http://localhost/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const ctx = { request: req } as any;
  const res: Response = await fn(ctx);
  const status = res.status || 200;
  let text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
  console.log(`== ${label} == status=${status}`);
  console.log(parsed);
}

async function callGet(fn: any, headers: Record<string,string>, label: string) {
  const req = new Request('http://localhost/api', { method: 'GET', headers });
  const ctx = { request: req } as any;
  const res: Response = await fn(ctx);
  const status = res.status || 200;
  let text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
  console.log(`== ${label} == status=${status}`);
  console.log(parsed);
}

(async () => {
  console.log('Testing functions locally...');
  await callPost(loginFn, { username: 'admin', password: 'admin123' }, '/api/login');
  await callPost(authLoginFn, { username: 'admin', password: 'admin123' }, '/api/auth/login');
  await callGet(authMeFn, { Authorization: 'Bearer dummy-token-admin' }, '/api/auth/me');

  // Negative tests
  await callPost(loginFn, { username: 'fake', password: 'nope' }, '/api/login (bad creds)');
  await callPost(authLoginFn, { username: '', password: '' }, '/api/auth/login (bad request)');
})();
