import { buildSupabaseAuthHeaders, getCurrentUser, getSupabaseUrl, refreshUserSession, signOut } from "../../assets/js/auth.js";
import { store } from "../store.js";

const DELETE_ACCOUNT_FUNCTION_NAME = "delete-account";
export const DELETE_ACCOUNT_CONFIRMATION_TEXT = "supprimer mon compte";

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIdentity(value) {
  return safeString(value).toLowerCase();
}

function maskToken(token) {
  const value = safeString(token);
  if (!value) return "";
  if (value.length <= 12) return `${value.slice(0, 4)}…${value.slice(-2)}`;
  return `${value.slice(0, 8)}…${value.slice(-6)}`;
}

function buildUserIdentityCandidates(user) {
  const firstName = safeString(store.user?.publicProfile?.firstName || store.user?.firstName || user?.user_metadata?.first_name || "");
  const lastName = safeString(store.user?.publicProfile?.lastName || store.user?.lastName || user?.user_metadata?.last_name || "");
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return [
    safeString(store.user?.publicProfile?.publicEmail || ""),
    safeString(store.user?.email || user?.email || ""),
    safeString(store.user?.name || user?.user_metadata?.full_name || user?.user_metadata?.name || ""),
    fullName
  ].filter(Boolean);
}

export async function getCurrentUserDeleteAccountIdentities() {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Utilisateur non authentifié.");
  }

  return buildUserIdentityCandidates(user);
}

export async function deleteCurrentUserAccount({ identityInput = "", confirmationText = "" } = {}) {
  const user = await getCurrentUser();
  if (!user?.id) {
    throw new Error("Utilisateur non authentifié.");
  }

  const normalizedConfirmation = normalizeIdentity(confirmationText);
  if (normalizedConfirmation !== DELETE_ACCOUNT_CONFIRMATION_TEXT) {
    throw new Error("Le texte de confirmation est invalide.");
  }

  const identityCandidates = buildUserIdentityCandidates(user).map(normalizeIdentity);
  const normalizedIdentityInput = normalizeIdentity(identityInput);

  if (!normalizedIdentityInput || !identityCandidates.includes(normalizedIdentityInput)) {
    throw new Error("L'identifiant de confirmation ne correspond pas à votre compte.");
  }

  const payload = {
    identityInput: safeString(identityInput),
    confirmationText: safeString(confirmationText)
  };

  const endpoint = `${getSupabaseUrl()}/functions/v1/${DELETE_ACCOUNT_FUNCTION_NAME}`;
  let requestHeaders = await buildSupabaseAuthHeaders({
    "Content-Type": "application/json"
  });

  console.log("[delete-account] preparing request", {
    endpoint,
    userId: user.id,
    identityCandidates,
    authorizationPreview: maskToken(String(requestHeaders.Authorization || "").replace(/^Bearer\s+/i, "")),
    hasApiKey: Boolean(requestHeaders.apikey)
  });

  let response = await fetch(endpoint, {
    method: "POST",
    headers: requestHeaders,
    body: JSON.stringify(payload)
  });

  console.log("[delete-account] first response", {
    status: response.status,
    ok: response.ok
  });

  if (response.status === 401) {
    console.warn("[delete-account] received 401, forcing session refresh and retrying");
    await refreshUserSession();

    requestHeaders = await buildSupabaseAuthHeaders({
      "Content-Type": "application/json"
    }, {
      forceRefresh: true
    });

    console.log("[delete-account] retry request", {
      endpoint,
      userId: user.id,
      authorizationPreview: maskToken(String(requestHeaders.Authorization || "").replace(/^Bearer\s+/i, "")),
      hasApiKey: Boolean(requestHeaders.apikey)
    });

    response = await fetch(endpoint, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(payload)
    });

    console.log("[delete-account] retry response", {
      status: response.status,
      ok: response.ok
    });
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    throw new Error(data?.error || `La suppression du compte a échoué (${response.status}).`);
  }

  if (!data?.ok) {
    throw new Error(data?.error || "La suppression du compte a échoué.");
  }

  try {
    await signOut();
  } catch {
    // session is expected to become invalid once the user has been deleted
  }

  return data;
}
