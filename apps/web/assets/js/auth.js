import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const SUPABASE_URL = String(
  window.MDALL_CONFIG?.supabaseUrl ||
  window.SUPABASE_URL ||
  'https://olgxhfgdzyghlzxmremz.supabase.co'
).trim();

const SUPABASE_ANON_KEY = String(
  window.MDALL_CONFIG?.supabaseAnonKey ||
  window.SUPABASE_ANON_KEY ||
  'sb_publishable_08nUL61_ATl-6KpD8dOYPw_RM5lMtEz'
).trim();

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
})

function resolveAppUrl(target = 'index.html') {
  return new URL(target, window.location.href).toString()
}

function sleep(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function isAuthSessionMissingError(error) {
  const message = String(error?.message || '')
  const name = String(error?.name || '')
  return name === 'AuthSessionMissingError' || /auth session missing/i.test(message)
}

export function isRateLimitError(error) {
  const status = Number(error?.status || error?.statusCode || error?.code || 0)
  const message = String(error?.message || '')
  return status === 429 || /too many requests/i.test(message) || /rate limit/i.test(message)
}

export function getSupabaseUrl() {
  return SUPABASE_URL
}

export function getSupabaseAnonKey() {
  return SUPABASE_ANON_KEY
}

export function getEmailRedirectUrl() {
  return resolveAppUrl('login.html')
}

export async function signUp(email, password, options = {}) {
  const emailRedirectTo = String(options.emailRedirectTo || getEmailRedirectUrl()).trim()
  return await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo
    }
  })
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data?.session || null
}

export async function getSessionSafe() {
  try {
    return await getSession()
  } catch (error) {
    if (isAuthSessionMissingError(error)) {
      return null
    }
    throw error
  }
}

export async function waitForSession(options = {}) {
  const timeoutMs = Number.isFinite(options.timeoutMs) ? Number(options.timeoutMs) : 2500
  const intervalMs = Number.isFinite(options.intervalMs) ? Number(options.intervalMs) : 100
  const deadline = Date.now() + Math.max(0, timeoutMs)

  while (Date.now() <= deadline) {
    const session = await getSessionSafe()
    if (session?.user) {
      return session
    }
    await sleep(intervalMs)
  }

  return null
}

export async function getCurrentUser() {
  const session = await getSessionSafe()
  return session?.user || null
}

export async function getAccessToken() {
  const session = await getSessionSafe()
  return session?.access_token || ''
}

export async function buildSupabaseAuthHeaders(extra = {}) {
  const accessToken = await getAccessToken()
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    ...extra
  }
}

export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    window.location.replace(resolveAppUrl('login.html'))
    return null
  }
  return user
}

export function redirectToAppHome() {
  window.location.replace(resolveAppUrl('./'))
}


export function isPasswordRecoveryLink(url = window.location.href) {
  const text = String(url || '')
  return /type=recovery/.test(text)
}

export async function requestPasswordReset(email, options = {}) {
  const redirectTo = String(options.emailRedirectTo || getEmailRedirectUrl()).trim()
  return await supabase.auth.resetPasswordForEmail(email, { redirectTo })
}

export async function updatePassword(password) {
  return await supabase.auth.updateUser({ password })
}
