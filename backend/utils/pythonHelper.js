/**
 * Helper para encontrar el binario Python correcto y asegurar
 * que tenga los módulos Python necesarios para los scripts (TTS, IA imagen).
 *
 * En PREVIEW: /root/.venv/bin/python3 tiene todo instalado.
 * En PRODUCCIÓN: solo existe /usr/bin/python3 SIN módulos → pip install on-demand.
 */
const { execSync, spawnSync } = require('child_process');
const fs = require('fs');

let CACHED_PYTHON = null;

const REQUIRED_MODULES = ['dotenv', 'emergentintegrations'];

function moduleAvailable(py, mod) {
  try {
    const r = spawnSync(py, ['-c', `import ${mod}`]);
    return r.status === 0;
  } catch (_) {
    return false;
  }
}

function findPython() {
  if (CACHED_PYTHON) return CACHED_PYTHON;

  // Candidatos por orden de preferencia
  const candidates = [
    '/root/.venv/bin/python3',
    '/usr/bin/python3',
    'python3',
    'python'
  ];

  // 1) Buscar uno que ya tenga los módulos
  for (const py of candidates) {
    if (py.startsWith('/') && !fs.existsSync(py)) continue;
    const allOk = REQUIRED_MODULES.every(m => moduleAvailable(py, m));
    if (allOk) {
      CACHED_PYTHON = py;
      console.log(`[python] using ${py} (all modules present)`);
      return py;
    }
  }

  // 2) Si ninguno tiene los módulos, intentar instalar en el primero válido
  for (const py of candidates) {
    if (py.startsWith('/') && !fs.existsSync(py)) continue;
    console.log(`[python] installing missing modules into ${py}…`);
    try {
      // python-dotenv + emergentintegrations (con índice extra de Emergent)
      execSync(
        `${py} -m pip install --quiet --no-warn-script-location ` +
        `python-dotenv emergentintegrations ` +
        `--extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/`,
        { stdio: 'inherit', timeout: 180000 }
      );
      const allOk = REQUIRED_MODULES.every(m => moduleAvailable(py, m));
      if (allOk) {
        CACHED_PYTHON = py;
        console.log(`[python] ${py} ready (modules installed)`);
        return py;
      }
    } catch (e) {
      console.warn(`[python] install failed for ${py}: ${e.message}`);
    }
  }

  // 3) Fallback: lo que sea (los scripts fallarán con mensaje claro)
  CACHED_PYTHON = 'python3';
  console.warn('[python] no candidate has the required modules; scripts may fail');
  return CACHED_PYTHON;
}

module.exports = { findPython };
