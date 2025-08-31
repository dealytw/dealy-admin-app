// Read base URL from Vite env (required)
const BASE = (import.meta.env.VITE_STRAPI_URL || '').replace(/\/$/, '');
if (!BASE) throw new Error('VITE_STRAPI_URL environment variable is required');

// --- simple auth helpers (store the Strapi JWT client-side) ---
export type AuthState = { jwt: string; user: any } | null;

export function getAuth(): AuthState {
  try { return JSON.parse(sessionStorage.getItem('auth') || 'null'); } catch { return null; }
}
export function setAuth(state: AuthState) {
  if (state) sessionStorage.setItem('auth', JSON.stringify(state));
  else sessionStorage.removeItem('auth');
}

// Login to Strapi Users & Permissions -> returns { jwt, user }
export async function login(identifier: string, password: string): Promise<AuthState> {
  const res = await fetch(`${BASE}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const state: AuthState = { jwt: data.jwt, user: data.user };
  setAuth(state);
  return state;
}

export function logout() {
  setAuth(null);
  location.assign('/login');
}

// API Token for Strapi Cloud authentication
const API_TOKEN = '78691c3d235968dc74694b86e2806cf5b982f373a89feae13b2195c740f58829144a8f0ac34f3652fcdf4d28a2eb8c1da457b7c53e70a9eb7b4602a0460aab4a70202e093a2c5a8c29ed8e02b686c8e437c7df758c75bfee6cae7db659c1bbc2472f54b82e476fd492721cefac6fc4c3d8125363a0ff90c5b534050ac5f4bc3e';

// --- fetch wrapper that uses API token for all operations ---
export async function sfetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  if (res.status === 401) { 
    throw new Error('Unauthorized - Check API token permissions'); 
  }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  
  // Handle empty responses (like DELETE operations)
  const contentType = res.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return null; // Return null for non-JSON responses
  }
  
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// Quick health check helper
export async function health() {
  return sfetch('/api/coupons?pagination[pageSize]=1');
}
