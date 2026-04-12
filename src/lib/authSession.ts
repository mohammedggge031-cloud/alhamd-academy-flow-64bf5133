const AUTH_ACTIVE_KEY = "auth_active";
const LAST_ACTIVITY_KEY = "last_activity";

const canUseStorage = () => typeof window !== "undefined";

export const hasActiveAuthSession = () => {
  if (!canUseStorage()) return false;
  return sessionStorage.getItem(AUTH_ACTIVE_KEY) === "1";
};

export const markAuthSessionActive = () => {
  if (!canUseStorage()) return;
  sessionStorage.setItem(AUTH_ACTIVE_KEY, "1");
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

export const touchAuthSessionActivity = () => {
  if (!canUseStorage()) return;
  sessionStorage.setItem(LAST_ACTIVITY_KEY, Date.now().toString());
};

export const getLastActivityTimestamp = () => {
  if (!canUseStorage()) return null;

  const rawValue = sessionStorage.getItem(LAST_ACTIVITY_KEY);
  if (!rawValue) return null;

  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : null;
};

export const clearAuthSessionMarkers = () => {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(AUTH_ACTIVE_KEY);
  sessionStorage.removeItem(LAST_ACTIVITY_KEY);
};