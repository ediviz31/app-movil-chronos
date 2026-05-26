<?php
require_once __DIR__ . '/includes/auth.php';
redirigir_si_logueado();

$mensaje = mensaje_auth_vacio();
$datos = [
    'nombre' => '',
    'usuario' => '',
    'correo' => '',
    'interes' => 'Civilizaciones antiguas',
];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $datos['nombre'] = trim($_POST['nombre'] ?? '');
    $datos['usuario'] = trim($_POST['usuario'] ?? '');
    $datos['usuario'] = ltrim($datos['usuario'], '@');
    $datos['correo'] = trim($_POST['correo'] ?? '');
    $datos['interes'] = trim($_POST['interes'] ?? 'Civilizaciones antiguas');
    $password = $_POST['password'] ?? '';
    $confirmar = $_POST['confirmar'] ?? '';
    $codigoLegadoAceptado = isset($_POST['codigo_legado']);

    if ($datos['nombre'] === '' || $datos['usuario'] === '' || $datos['correo'] === '' || $password === '' || $confirmar === '') {
        $mensaje = mensaje_auth('error', 'Completa todos los campos principales para crear tu cuenta.');
    } elseif (!preg_match('/^[a-zA-Z0-9_\.]{3,60}$/', $datos['usuario'])) {
        $mensaje = mensaje_auth('error', 'El usuario debe tener mínimo 3 caracteres y solo puede usar letras, números, punto o guion bajo.');
    } elseif (!filter_var($datos['correo'], FILTER_VALIDATE_EMAIL)) {
        $mensaje = mensaje_auth('error', 'Escribe un correo electrónico válido.');
    } elseif (strlen($password) < 6) {
        $mensaje = mensaje_auth('error', 'La contraseña debe tener mínimo 6 caracteres.');
    } elseif ($password !== $confirmar) {
        $mensaje = mensaje_auth('error', 'Las contraseñas no coinciden.');
    } elseif (!$codigoLegadoAceptado) {
        $mensaje = mensaje_auth('error', 'Debes aceptar el Código del Legado para crear tu cuenta en Chronos.');
    } else {
        $pdo = chronos_pdo();
        $stmt = $pdo->prepare('SELECT id FROM usuarios WHERE usuario = ? OR correo = ? LIMIT 1');
        $stmt->execute([$datos['usuario'], $datos['correo']]);

        if ($stmt->fetch()) {
            $mensaje = mensaje_auth('error', 'Ese usuario o correo ya está registrado. Prueba con otros datos.');
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare('INSERT INTO usuarios (nombre, usuario, correo, password_hash, interes, tema_favorito, codigo_legado_aceptado, codigo_legado_aceptado_en) VALUES (?, ?, ?, ?, ?, ?, 1, NOW())');
            $stmt->execute([$datos['nombre'], $datos['usuario'], $datos['correo'], $hash, $datos['interes'], $datos['interes']]);

            $nuevoId = (int)$pdo->lastInsertId();
            $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE id = ? LIMIT 1');
            $stmt->execute([$nuevoId]);
            $nuevoUsuario = $stmt->fetch();

            iniciar_sesion_usuario($nuevoUsuario);
            header('Location: perfil_inicial.php');
            exit;
        }
    }
}

$intereses = ['Civilizaciones antiguas', 'Personajes históricos', 'Leyendas y mitos', 'Mapas y exploraciones', 'Archivos y manuscritos'];
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Crear cuenta</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="auth-body">
  <main class="auth-shell register-shell">
    <section class="auth-visual register-visual">
      <a class="auth-brand" href="login.php">
        <span class="brand-mark">C</span>
        <span><strong>Chronos</strong><small>Sala histórica digital</small></span>
      </a>

      <div class="auth-hero-card register-hero-card">
        <div class="register-gallery">
          <img src="assets/img/hallazgo-1.svg" alt="Ruinas históricas">
          <img src="assets/img/post-map.svg" alt="Mapa histórico">
          <img src="assets/img/post-battle.svg" alt="Escena histórica">
          <img src="assets/img/hallazgo-3.svg" alt="Archivo histórico">
        </div>
        <div class="auth-hero-copy">
          <span class="kicker">Crea tu legado</span>
          <h1>Comienza a guardar y compartir fragmentos del tiempo.</h1>
          <p>Tu perfil será tu legado público: relatos, imágenes históricas, civilizaciones favoritas y publicaciones que quieras compartir.</p>
        </div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card register-card">
        <div class="auth-card-head">
          <span class="auth-icon"><i class="ri-quill-pen-line"></i></span>
          <div>
            <h2>Crear cuenta</h2>
            <p>Únete a la sala histórica de Chronos.</p>
          </div>
        </div>

        <?= $mensaje ?>

        <form class="auth-form" action="registro.php" method="post" data-auth-form data-real-form="true" novalidate>
          <div class="auth-two-cols">
            <label>
              <span>Nombre</span>
              <div class="auth-input"><i class="ri-user-smile-line"></i><input type="text" name="nombre" placeholder="Tu nombre" value="<?= e($datos['nombre']) ?>" data-required="nombre"></div>
            </label>
            <label>
              <span>Usuario</span>
              <div class="auth-input"><i class="ri-at-line"></i><input type="text" name="usuario" placeholder="@usuario" value="<?= e($datos['usuario']) ?>" data-required="usuario"></div>
            </label>
          </div>

          <label>
            <span>Correo electrónico</span>
            <div class="auth-input"><i class="ri-mail-line"></i><input type="email" name="correo" placeholder="correo@ejemplo.com" autocomplete="email" value="<?= e($datos['correo']) ?>" data-required="correo electrónico" data-email></div>
          </label>

          <div class="auth-two-cols">
            <label>
              <span>Contraseña</span>
              <div class="auth-input password-wrap">
                <i class="ri-lock-2-line"></i>
                <input type="password" name="password" placeholder="Contraseña" autocomplete="new-password" data-required="contraseña" data-min="6">
                <button class="password-toggle" type="button" aria-label="Mostrar contraseña"><i class="ri-eye-line"></i></button>
              </div>
            </label>
            <label>
              <span>Confirmar</span>
              <div class="auth-input password-wrap">
                <i class="ri-shield-check-line"></i>
                <input type="password" name="confirmar" placeholder="Confirmar" data-required="confirmar contraseña" data-match="password">
                <button class="password-toggle" type="button" aria-label="Mostrar contraseña"><i class="ri-eye-line"></i></button>
              </div>
            </label>
          </div>

          <label>
            <span>Interés principal</span>
            <div class="auth-input"><i class="ri-ancient-gate-line"></i><select name="interes">
              <?php foreach ($intereses as $interes): ?>
                <option value="<?= e($interes) ?>" <?= $datos['interes'] === $interes ? 'selected' : '' ?>><?= e($interes) ?></option>
              <?php endforeach; ?>
            </select></div>
          </label>

          <div class="legacy-accept-box">
            <div class="legacy-accept-head">
              <span><i class="ri-shield-check-line"></i></span>
              <div>
                <strong>Código del Legado</strong>
                <small>Chronos es una comunidad para compartir historia con respeto, contexto y seriedad.</small>
              </div>
            </div>
            <label class="check-row terms legacy-terms">
              <input type="checkbox" name="codigo_legado" value="1" data-required-check="aceptar el Código del Legado">
              <span>Acepto el <a href="codigo_legado.php" target="_blank" rel="noopener">Código del Legado</a> y entiendo que Chronos es una comunidad de respeto histórico.</span>
            </label>
          </div>

          <button class="auth-submit" type="submit" data-loading-text="Creando tu archivo…"><i class="ri-user-add-line"></i> <span>Crear mi cuenta</span></button>
        </form>

        <div class="auth-mini-note">
          <i class="ri-sparkling-2-line"></i>
          <span>Después de crear tu cuenta podrás completar tu legado: foto, portada y biografía.</span>
        </div>

        <div class="auth-divider"><span>ya tengo cuenta</span></div>
        <a class="auth-secondary" href="login.php"><i class="ri-login-circle-line"></i> Iniciar sesión</a>
      </div>
    </section>
  </main>
  <script src="assets/js/auth.js?v=491"></script>
  <script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
