export const GUEST_USER_ID_KEY = "chinese-rummy.guest-user-id";
export const EXPLICIT_SIGN_OUT_KEY = "chinese-rummy.explicit-sign-out";

export function rememberGuestUserId(userId: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(GUEST_USER_ID_KEY, userId);
}

export function readGuestUserId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.sessionStorage.getItem(GUEST_USER_ID_KEY);
}

export function clearGuestUserId() {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(GUEST_USER_ID_KEY);
}

export function markExplicitSignOut() {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.setItem(EXPLICIT_SIGN_OUT_KEY, "1");
}

export function clearExplicitSignOut() {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(EXPLICIT_SIGN_OUT_KEY);
}

export function wasExplicitSignOut() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.sessionStorage.getItem(EXPLICIT_SIGN_OUT_KEY) === "1";
}
