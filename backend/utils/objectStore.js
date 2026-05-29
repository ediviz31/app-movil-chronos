/**
 * Cliente para Emergent Object Store.
 * Almacenamiento persistente para uploads (videos, imágenes, audio).
 *
 * Patrón:
 *   1. Llamar initStorage() UNA vez al arranque del servidor
 *   2. Usar putObject(path, buffer, contentType) para subir
 *   3. Usar streamObject(path, res) para servir el archivo al cliente
 *
 * Los archivos guardados aquí SOBREVIVEN re-deploys y reinicios.
 */
const axios = require('axios');

const STORAGE_URL = 'https://integrations.emergentagent.com/objstore/api/v1/storage';
const APP_NAME = 'chronos';

let storageKey = null;
let initPromise = null;

async function initStorage() {
  if (storageKey) return storageKey;
  if (initPromise) return initPromise;

  const emergentKey = process.env.EMERGENT_LLM_KEY;
  if (!emergentKey) {
    throw new Error('EMERGENT_LLM_KEY no configurada en .env');
  }

  initPromise = axios.post(`${STORAGE_URL}/init`, {
    emergent_key: emergentKey
  }, { timeout: 30000 })
    .then(resp => {
      storageKey = resp.data?.storage_key;
      console.log('✅ Emergent Object Store inicializado');
      return storageKey;
    })
    .catch(err => {
      initPromise = null;
      console.error('❌ Error inicializando Object Store:', err.message);
      throw err;
    });

  return initPromise;
}

/**
 * Sube un archivo al Object Store.
 * @param {string} path - p.ej. "chronos/uploads/videos/abc-123.mp4"
 * @param {Buffer} data - Contenido del archivo
 * @param {string} contentType - p.ej. "video/mp4"
 * @returns {Promise<{path: string, size: number, etag: string}>}
 */
async function putObject(path, data, contentType) {
  const key = await initStorage();
  try {
    const resp = await axios.put(`${STORAGE_URL}/objects/${path}`, data, {
      headers: {
        'X-Storage-Key': key,
        'Content-Type': contentType || 'application/octet-stream'
      },
      maxContentLength: 200 * 1024 * 1024, // 200MB
      maxBodyLength: 200 * 1024 * 1024,
      timeout: 180000
    });
    return resp.data;
  } catch (err) {
    // Si el key expiró, reinicializar y reintentar 1 vez
    if (err.response?.status === 403) {
      storageKey = null;
      initPromise = null;
      const newKey = await initStorage();
      const resp = await axios.put(`${STORAGE_URL}/objects/${path}`, data, {
        headers: {
          'X-Storage-Key': newKey,
          'Content-Type': contentType || 'application/octet-stream'
        },
        maxContentLength: 200 * 1024 * 1024,
        maxBodyLength: 200 * 1024 * 1024,
        timeout: 180000
      });
      return resp.data;
    }
    throw err;
  }
}

/**
 * Descarga un archivo y lo envía como stream al response de Express.
 * Útil para servir videos sin cargarlos completamente en memoria.
 */
async function streamToResponse(path, res) {
  const key = await initStorage();
  let response;
  try {
    response = await axios.get(`${STORAGE_URL}/objects/${path}`, {
      headers: { 'X-Storage-Key': key },
      responseType: 'stream',
      timeout: 60000
    });
  } catch (err) {
    if (err.response?.status === 403) {
      storageKey = null;
      initPromise = null;
      const newKey = await initStorage();
      response = await axios.get(`${STORAGE_URL}/objects/${path}`, {
        headers: { 'X-Storage-Key': newKey },
        responseType: 'stream',
        timeout: 60000
      });
    } else {
      throw err;
    }
  }
  const ct = response.headers['content-type'] || 'application/octet-stream';
  const cl = response.headers['content-length'];
  res.setHeader('Content-Type', ct);
  if (cl) res.setHeader('Content-Length', cl);
  // Caché agresiva para uploads (los paths llevan UUID, son inmutables)
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  response.data.pipe(res);
}

/**
 * Construye un path canónico para Object Store.
 */
function buildPath(folder, filename) {
  return `${APP_NAME}/uploads/${folder}/${filename}`;
}

/**
 * Devuelve la URL pública (vía nuestro backend) para un objeto.
 */
function publicUrl(objectPath) {
  // objectPath ya viene con prefijo APP_NAME, lo servimos vía /api/files/
  return `/api/files/${objectPath}`;
}

module.exports = { initStorage, putObject, streamToResponse, buildPath, publicUrl, APP_NAME };
