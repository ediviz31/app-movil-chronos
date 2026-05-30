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
 *
 * SOPORTE DE HTTP RANGE (esencial para videos): si el cliente envía un
 * header "Range: bytes=N-M", devolvemos sólo ese tramo con status 206
 * y headers Content-Range / Content-Length correctos. Esto permite al
 * navegador hacer streaming progresivo y seek (saltar a cualquier punto)
 * sin descargar el archivo completo.
 *
 * Estrategia:
 *   1. Pasamos el Range al Object Store por si lo soporta nativamente.
 *   2. Si el Object Store NO devuelve 206 (lo ignora), buffereamos la
 *      respuesta y servimos nosotros el slice. No es ideal para archivos
 *      enormes (>100MB) pero garantiza compatibilidad.
 *
 * @param {string} path
 * @param {object} res - Express response
 * @param {object} req - Express request (para leer header Range)
 */
async function streamToResponse(path, res, req) {
  const key = await initStorage();
  const rangeHeader = req?.headers?.range || null;

  const buildAxiosConfig = (storageKey, opts = {}) => {
    const headers = { 'X-Storage-Key': storageKey };
    if (rangeHeader) headers['Range'] = rangeHeader;
    return {
      headers,
      responseType: opts.buffer ? 'arraybuffer' : 'stream',
      timeout: 60000,
      maxContentLength: 200 * 1024 * 1024,
      validateStatus: (s) => s === 200 || s === 206
    };
  };

  const fetchOnce = async (cfg) => {
    try {
      return await axios.get(`${STORAGE_URL}/objects/${path}`, cfg);
    } catch (err) {
      if (err.response?.status === 403) {
        storageKey = null;
        initPromise = null;
        const newKey = await initStorage();
        return axios.get(`${STORAGE_URL}/objects/${path}`, {
          ...cfg,
          headers: { ...cfg.headers, 'X-Storage-Key': newKey }
        });
      }
      throw err;
    }
  };

  // Si el cliente NO pidió Range, usamos stream directo (rápido, eficiente)
  if (!rangeHeader) {
    const response = await fetchOnce(buildAxiosConfig(key));
    const ct = response.headers['content-type'] || 'application/octet-stream';
    const cl = response.headers['content-length'];
    res.setHeader('Content-Type', ct);
    res.setHeader('Accept-Ranges', 'bytes');
    if (cl) res.setHeader('Content-Length', cl);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    response.data.pipe(res);
    res.on('close', () => { try { response.data.destroy(); } catch (_) {} });
    return;
  }

  // CON Range — primero intentamos pasar el header al Object Store.
  // Si responde 206, lo propagamos tal cual.
  const streamResp = await fetchOnce(buildAxiosConfig(key));
  if (streamResp.status === 206 && streamResp.headers['content-range']) {
    const ct = streamResp.headers['content-type'] || 'application/octet-stream';
    const cl = streamResp.headers['content-length'];
    const cr = streamResp.headers['content-range'];
    res.status(206);
    res.setHeader('Content-Type', ct);
    res.setHeader('Accept-Ranges', 'bytes');
    if (cl) res.setHeader('Content-Length', cl);
    res.setHeader('Content-Range', cr);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    streamResp.data.pipe(res);
    res.on('close', () => { try { streamResp.data.destroy(); } catch (_) {} });
    return;
  }

  // Fallback: el Object Store ignoró el Range y devolvió el archivo completo.
  // Descartamos el stream actual y hacemos otra petición buffereada para
  // poder slicear nosotros el tramo solicitado.
  try { streamResp.data.destroy(); } catch (_) {}

  const fullResp = await fetchOnce(buildAxiosConfig(key, { buffer: true }));
  const fullBuffer = Buffer.from(fullResp.data);
  const totalSize = fullBuffer.length;
  const ct = fullResp.headers['content-type'] || 'application/octet-stream';

  // Parsear "bytes=start-end" — admite también "bytes=start-" (hasta el final)
  // y "bytes=-N" (últimos N bytes).
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader);
  let start = 0;
  let end = totalSize - 1;
  if (m) {
    if (m[1] === '' && m[2] !== '') {
      // suffix range: "bytes=-500" → últimos 500
      start = Math.max(0, totalSize - parseInt(m[2], 10));
      end = totalSize - 1;
    } else {
      start = parseInt(m[1], 10) || 0;
      end = m[2] !== '' ? parseInt(m[2], 10) : totalSize - 1;
    }
  }
  // Validar rango
  if (start >= totalSize || start < 0 || end < start) {
    res.status(416);
    res.setHeader('Content-Range', `bytes */${totalSize}`);
    return res.end();
  }
  if (end >= totalSize) end = totalSize - 1;

  const chunk = fullBuffer.slice(start, end + 1);
  res.status(206);
  res.setHeader('Content-Type', ct);
  res.setHeader('Accept-Ranges', 'bytes');
  res.setHeader('Content-Length', chunk.length);
  res.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.end(chunk);
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
