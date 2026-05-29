/**
 * Helper para encontrar el binario Python correcto.
 * NO intenta instalar nada. Solo busca pythons que YA tengan los módulos.
 * Si no encuentra ninguno, los endpoints IA/TTS responden 503 claramente.
 */
const { spawnSync } = require('child_process');
const fs = require('fs');

let CACHED_PYTHON = null;
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
 * Búsqueda rápida (sin red, sin instalar). Retorna python listo o null.
 * En PREVIEW: encuentra /root/.venv/bin/python3 con todo instalado.
 * En PRODUCCIÓN: muy probablemente null → IA/TTS responden 503.
 */
function findPython() {
  if (CACHED_PYTHON) return CACHED_PYTHON;
  const ready = pickReadyPython();
  if (ready) {
    CACHED_PYTHON = ready;
    console.log(`[python] using ${ready}`);
    return ready;
  }
  return null;
}

/**
 * Versión async: igual que findPython (no instala). Mantenida por compatibilidad.
 */
async function findPythonAsync() {
  return findPython();
}

module.exports = { findPython, findPythonAsync };
