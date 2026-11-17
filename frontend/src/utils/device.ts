/**
 * Client-Side Persistent Device UUID Helper
 *
 * NOTE ON SECURITY LIMITATIONS:
 * A cryptographically random UUID is generated on the client via crypto.randomUUID()
 * and stored in localStorage. This provides a persistent identifier across sessions
 * on the same browser for 1:1 student-to-device prototype binding.
 *
 * Limitations:
 * - LocalStorage can be cleared by the user (which triggers warden reset or re-bind).
 * - Advanced users can copy/export localStorage values to another browser.
 * - It does not constitute cryptographic hardware-backed proof of device possession.
 * - Hardware-bound credentials (e.g. WebAuthn) are recommended for future enterprise deployment.
 */

const DEVICE_STORAGE_KEY = 'geomark_device_uuid';

export function getOrCreateDeviceUuid(): string {
  try {
    let deviceId = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (!deviceId) {
      if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        deviceId = crypto.randomUUID();
      } else {
        // Fallback for older browsers
        deviceId = 'dev-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
      }
      localStorage.setItem(DEVICE_STORAGE_KEY, deviceId);
    }
    return deviceId;
  } catch (err) {
    console.warn('LocalStorage not accessible for device ID, generating ephemeral fallback:', err);
    return 'ephemeral-' + Date.now().toString(36);
  }
}

export function getDeviceUuid(): string | null {
  try {
    return localStorage.getItem(DEVICE_STORAGE_KEY);
  } catch {
    return null;
  }
}
