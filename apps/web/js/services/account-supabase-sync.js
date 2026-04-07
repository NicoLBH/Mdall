import { supabase, getCurrentUser, signOut } from "../../assets/js/auth.js";
import { store } from "../store.js";

const DELETE_ACCOUNT_FUNCTION_NAME = "delete-account";
export const DELETE_ACCOUNT_CONFIRMATION_TEXT = "supprimer mon compte";

function safeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIdentity(value) {
  return safeString(value).toLowerCase();
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

  const { data, error } = await supabase.functions.invoke(DELETE_ACCOUNT_FUNCTION_NAME, {
    body: {
      identityInput: safeString(identityInput),
      confirmationText: safeString(confirmationText)
    }
  });

  if (error) {
    throw new Error(await resolveFunctionsInvokeError(error));
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


async function resolveFunctionsInvokeError(error) {
  const fallbackMessage = error?.message || "La suppression du compte a échoué.";
  const context = error?.context;

  if (!context) return fallbackMessage;

  try {
    const payload = await context.json();
    return payload?.error || fallbackMessage;
  } catch {
    try {
      const text = await context.text();
      return text || fallbackMessage;
    } catch {
      return fallbackMessage;
    }
  }
}
