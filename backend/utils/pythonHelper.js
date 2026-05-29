/**
 * Helper para encontrar el binario Python correcto.
 * No bloquea el startup. Si no encuentra un python con los módulos, los
 * endpoints de IA/TTS responderán con un error claro al usuario.
 */
const { spawnSync, exec } = require('child_process');
const fs = require('fs');

let CACHED_PYTHON = null;
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
 * Devuelve un python listo o null si ninguno tiene los módulos.
 * NO bloquea ni instala síncronamente. La instalación ocurre en background
 * la PRIMERA vez que se llame, sin esperar al primer request.
 */
function findPython() {
  if (CACHED_PYTHON) return CACHED_PYTHON;

  // 1) Buscar uno ya listo (rápido, sin red)
  const ready = pickReadyPython();
  if (ready) {
    CACHED_PYTHON = ready;
    console.log(`[python] using ${ready} (all modules present)`);
    return ready;
  }

  // 2) Intentar instalar en background (no bloquea). Solo una vez por proceso.
  if (!INSTALL_PROMISE) {
    INSTALL_PROMISE = new Promise((resolve) => {
      const candidates = ['/root/.venv/bin/python3', '/usr/bin/python3', 'python3'];
      const next = (i) => {
        if (i >= candidates.length) return resolve(null);
        const py = candidates[i];
        if (py.startsWith('/') && !fs.existsSync(py)) return next(i + 1);
        console.log(`[python] background install into ${py}…`);
        const cmd = `${py} -m pip install --quiet --no-warn-script-location ` +
                    `python-dotenv emergentintegrations ` +
                    `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`;
        exec(cmd, { timeout: 120000 }, (err) => {
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
  }

  return null; // por ahora no hay python listo
}

/**
 * Versión async para los endpoints: espera a que termine la instalación
 * en background si está en curso, hasta cierto timeout.
 */
async function findPythonAsync(timeoutMs = 15000) {
  if (CACHED_PYTHON) return CACHED_PYTHON;
  const ready = pickReadyPython();
  if (ready) { CACHED_PYTHON = ready; return ready; }
  // Disparar instalación si no se ha intentado
  findPython();
  if (!INSTALL_PROMISE) return null;
  return Promise.race([
    INSTALL_PROMISE,
    new Promise(res => setTimeout(() => res(null), timeoutMs))
  ]);
}

module.exports = { findPython, findPythonAsync };
