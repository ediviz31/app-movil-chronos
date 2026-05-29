/**
 * Helper para encontrar el binario Python correcto.
 * NO bloquea startup. NO retry-loop. Si falla, los endpoints responden 503.
 */
const { spawnSync, exec } = require('child_process');
const fs = require('fs');

let CACHED_PYTHON = null;
let INSTALL_ATTEMPTED = false; // Solo un intento por proceso
let INSTALL_PROMISE = null;

const REQUIRED_MODULES = ['dotenv', 'emergentintegrations'];

function moduleAvailable(py, mod) {
  try {
    const r = spawnSync(py, ['-c', `import ${mod}`], { timeout: 3000 });
    return r.status === 0;
  } catch (_) {
    return false;
  }
}

function pickReadyPython() {
  const candidates = [
    '/root/.venv/bin/python3',
    '/usr/bin/python3',
    'python3'
  ];
  for (const py of candidates) {
    if (py.startsWith('/') && !fs.existsSync(py)) continue;
    if (REQUIRED_MODULES.every(m => moduleAvailable(py, m))) {
      return py;
    }
  }
  return null;
}

/**
 * Búsqueda rápida (sin red). NO instala. Retorna python listo o null.
 */
function findPython() {
  if (CACHED_PYTHON) return CACHED_PYTHON;
  const ready = pickReadyPython();
  if (ready) {
    CACHED_PYTHON = ready;
    console.log(`[python] using ${ready} (modules present)`);
    return ready;
  }
  return null;
}

/**
 * Intenta instalar UNA SOLA VEZ por proceso. Si falla, no reintenta.
 */
function tryInstallOnce() {
  if (INSTALL_ATTEMPTED) return INSTALL_PROMISE;
  INSTALL_ATTEMPTED = true;

  INSTALL_PROMISE = new Promise((resolve) => {
    const candidates = ['/root/.venv/bin/python3', '/usr/bin/python3'];
    const next = (i) => {
      if (i >= candidates.length) {
        console.warn('[python] no python could be set up — IA/TTS endpoints will return 503');
        return resolve(null);
      }
      const py = candidates[i];
      if (py.startsWith('/') && !fs.existsSync(py)) return next(i + 1);
      console.log(`[python] one-time install attempt into ${py}…`);
      const cmd = `${py} -m pip install --quiet --no-warn-script-location ` +
                  `python-dotenv emergentintegrations ` +
                  `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`;
      exec(cmd, { timeout: 90000 }, (err) => {
        if (err) {
          console.warn(`[python] install failed on ${py}: ${err.code || err.message}`);
          return next(i + 1);
        }
        if (REQUIRED_MODULES.every(m => moduleAvailable(py, m))) {
          CACHED_PYTHON = py;
          console.log(`[python] ${py} ready (modules installed)`);
          return resolve(py);
        }
        next(i + 1);
      });
    };
    next(0);
  });

  return INSTALL_PROMISE;
}

/**
 * Para endpoints: espera hasta `timeoutMs` por un python listo.
 * Si no hay y ya intentamos instalar, devuelve null inmediatamente.
 */
async function findPythonAsync(timeoutMs = 15000) {
  if (CACHED_PYTHON) return CACHED_PYTHON;
  const ready = pickReadyPython();
  if (ready) { CACHED_PYTHON = ready; return ready; }

  // Si ya se intentó instalar y falló: no esperar
  if (INSTALL_ATTEMPTED && !INSTALL_PROMISE) return null;

  // Disparar único intento de instalación
  const p = tryInstallOnce();
  return Promise.race([
    p,
    new Promise(res => setTimeout(() => res(null), timeoutMs))
  ]);
}

module.exports = { findPython, findPythonAsync, tryInstallOnce };
