import api from '../services/api';

// Convierte una clave VAPID base64-url a Uint8Array (formato requerido por la Push API)
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Registra el service worker — debe llamarse una sola vez al cargar la app. */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (err) {
    console.warn('SW registration failed:', err);
    return null;
  }
}

export function pushSupported() {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** Devuelve 'granted' | 'denied' | 'default' | 'unsupported'. */
export async function getPushPermissionState() {
  if (!pushSupported()) return 'unsupported';
  return Notification.permission;
}

/** Devuelve la subscripción activa de este navegador (si existe). */
export async function getCurrentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/**
 * Pide permiso si hace falta, se suscribe vía VAPID, y la envía al backend.
 * Retorna el objeto subscription o null si falla / usuario rechaza.
 */
export async function subscribeToPush() {
  if (!pushSupported()) return null;

  // Pedir permiso (si default; granted/denied no requieren prompt)
  let perm = Notification.permission;
  if (perm === 'default') {
    perm = await Notification.requestPermission();
  }
  if (perm !== 'granted') return null;

  // Obtener clave VAPID pública desde el backend
  const { data } = await api.get('/push/public-key');
  if (!data?.key) return null;

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(data.key)
    });
  }

  // Enviar al backend
  await api.post('/push/suscribir', {
    endpoint: sub.endpoint,
    keys: {
      p256dh: arrayBufferToBase64(sub.getKey('p256dh')),
      auth: arrayBufferToBase64(sub.getKey('auth'))
    }
  });
  return sub;
}

/** Desuscribe del browser + del backend. */
export async function unsubscribeFromPush() {
  const sub = await getCurrentSubscription();
  if (!sub) return;
  try {
    await api.post('/push/desuscribir', { endpoint: sub.endpoint });
  } catch (_) { /* ignore */ }
  try { await sub.unsubscribe(); } catch (_) { /* ignore */ }
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let bin = '';
  for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
