import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabase = createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
)

export async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password })
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return await supabase.auth.signOut()
}

export async function requireAuth() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    window.location.href = '/login.html'
  }
  return user
}

export { supabase }
