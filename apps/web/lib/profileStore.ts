// Removes every saved letter profile from this device (called on logout so a shared phone never leaks details).
export function clearSavedProfiles() {
  try { Object.keys(localStorage).filter(k => k.startsWith('unidesk_profile_')).forEach(k => localStorage.removeItem(k)); } catch {}
}
