import { AuthUser, SpaceEmailInvite, SpaceType } from '../types';

const TOKEN_KEY = 'haven_auth_token';
const USER_KEY = 'haven_auth_user';

export function getStoredAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredAuthUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveAuthSession(user: AuthUser, token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {
    // ignore
  }
}

export async function registerUser(params: {
  email: string;
  password: string;
  name: string;
  avatar?: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to register account');
  }

  saveAuthSession(data.user, data.token);
  return { user: data.user, token: data.token };
}

export async function loginUser(params: {
  email: string;
  password: string;
  autoRegister?: boolean;
  name?: string;
  avatar?: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    const error = new Error(data.error || 'Failed to sign in. Please verify your email and password.') as Error & {
      notRegistered?: boolean;
      allowReset?: boolean;
      email?: string;
    };
    error.notRegistered = Boolean(data.notRegistered);
    error.allowReset = Boolean(data.allowReset);
    error.email = data.email || params.email;
    throw error;
  }

  saveAuthSession(data.user, data.token);
  return { user: data.user, token: data.token };
}

export async function resetUserPassword(params: {
  email: string;
  newPassword: string;
}): Promise<{ user: AuthUser; token: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }

  saveAuthSession(data.user, data.token);
  return { user: data.user, token: data.token };
}

export async function getMe(): Promise<{ user: AuthUser; pendingInvites: SpaceEmailInvite[] } | null> {
  const token = getStoredAuthToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        clearAuthSession();
      }
      return null;
    }

    const data = await res.json();
    if (data.user) {
      saveAuthSession(data.user, token);
      return { user: data.user, pendingInvites: data.pendingInvites || [] };
    }
    return null;
  } catch (err) {
    console.warn('Error verifying auth session:', err);
    return null;
  }
}

export async function logoutUser(): Promise<void> {
  const token = getStoredAuthToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
  clearAuthSession();
}

export async function inviteSpouseByEmail(params: {
  roomId: string;
  passkey: string;
  spouseEmail?: string;
  emails?: string[];
  senderName: string;
  senderEmail?: string;
  spaceName?: string;
  spaceType?: SpaceType;
  message?: string;
}): Promise<{
  success: boolean;
  invite: SpaceEmailInvite;
  invites?: SpaceEmailInvite[];
  inviteLink: string;
  generalInviteLink?: string;
  invitedCount?: number;
  registeredCount?: number;
  unregisteredCount?: number;
  message: string;
}> {
  const res = await fetch('/api/space/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send invitation');
  }

  return data;
}

export async function getInvitesForEmail(email?: string, userId?: string): Promise<SpaceEmailInvite[]> {
  if (!email && !userId) return [];
  try {
    const params = new URLSearchParams();
    if (email) params.append('email', email.trim().toLowerCase());
    if (userId) params.append('userId', userId);
    const res = await fetch(`/api/space/invites?${params.toString()}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.invites || [];
  } catch {
    return [];
  }
}

export async function lookupUserByEmail(query: string): Promise<{ exists: boolean; user?: { id: string; name: string; email: string; avatar?: string } }> {
  if (!query || !query.trim()) return { exists: false };
  try {
    const res = await fetch(`/api/users/lookup?query=${encodeURIComponent(query.trim())}`);
    if (!res.ok) return { exists: false };
    const data = await res.json();
    return data;
  } catch {
    return { exists: false };
  }
}

export async function acceptSpaceInvite(inviteId: string, userEmail?: string) {
  const res = await fetch('/api/space/accept-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inviteId, userEmail }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to accept invite');
  }
  return data;
}

export async function cancelSpaceInvite(params: { inviteId?: string; roomId?: string }): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/space/cancel-invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to cancel invite');
  }
  return data;
}

export async function getRoomInvites(roomId: string): Promise<SpaceEmailInvite[]> {
  try {
    const res = await fetch(`/api/space/room-invite?roomId=${encodeURIComponent(roomId)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.invites || [];
  } catch {
    return [];
  }
}

export async function trackUserProfile(params: {
  id: string;
  name: string;
  avatar?: string;
  email?: string;
  spaceId?: string;
}): Promise<void> {
  try {
    await fetch('/api/users/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
  } catch {
    // Non-blocking sync
  }
}
