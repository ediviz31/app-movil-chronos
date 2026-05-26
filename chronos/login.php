<?php
require_once __DIR__ . '/includes/auth.php';
redirigir_si_logueado();

$mensaje = mensaje_auth_vacio();
$valorLogin = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $valorLogin = trim($_POST['usuario'] ?? '');
    $password = $_POST['password'] ?? '';

    if ($valorLogin === '' || $password === '') {
        $mensaje = mensaje_auth('error', 'Completa tu usuario/correo y contraseña para entrar a Chronos.');
    } else {
        $pdo = chronos_pdo();
        $stmt = $pdo->prepare('SELECT * FROM usuarios WHERE usuario = :login OR correo = :login LIMIT 1');
        $stmt->execute(['login' => $valorLogin]);
        $usuario = $stmt->fetch();

        if ($usuario && password_verify($password, $usuario['password_hash'])) {
            iniciar_sesion_usuario($usuario);
            header('Location: feed.php');
            exit;
        }

        $mensaje = mensaje_auth('error', 'El usuario/correo o la contraseña no son correctos.');
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Iniciar sesión</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="auth-body">
  <main class="auth-shell">
    <section class="auth-visual">
      <a class="auth-brand" href="login.php">
        <span class="brand-mark">C</span>
        <span><strong>Chronos</strong><small>Sala histórica digital</small></span>
      </a>

      <div class="auth-hero-card">
        <div class="auth-image-stack">
          <img class="auth-main-img" src="assets/img/post-library.svg" alt="Biblioteca histórica">
          <img class="auth-floating-img img-one" src="assets/img/post-temple.svg" alt="Templo histórico">
          <img class="auth-floating-img img-two" src="assets/img/post-scroll.svg" alt="Pergamino histórico">
        </div>
        <div class="auth-hero-copy">
          <span class="kicker">Bienvenido a Chronos</span>
          <h1>Entra a una sala donde la historia vuelve a hablar.</h1>
          <p>Explora relatos, civilizaciones, personajes y hallazgos compartidos por una comunidad hecha para amantes de la historia.</p>
        </div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card">
        <div class="auth-card-head">
          <span class="auth-icon"><i class="ri-door-open-line"></i></span>
          <div>
            <h2>Iniciar sesión</h2>
            <p>Accede a tu línea del tiempo histórica.</p>
          </div>
        </div>

        <?= $mensaje ?>

        <form class="auth-form" action="login.php" method="post" data-auth-form data-real-form="true" novalidate>
          <label>
            <span>Usuario o correo</span>
            <div class="auth-input"><i class="ri-user-line"></i><input type="text" name="usuario" placeholder="Ej. keilin" autocomplete="username" value="<?= e($valorLogin) ?>" data-required="usuario o correo"></div>
          </label>
          <label>
            <span>Contraseña</span>
            <div class="auth-input password-wrap">
              <i class="ri-lock-2-line"></i>
              <input type="password" name="password" placeholder="Tu contraseña" autocomplete="current-password" data-required="contraseña">
              <button class="password-toggle" type="button" aria-label="Mostrar contraseña"><i class="ri-eye-line"></i></button>
            </div>
          </label>

          <div class="auth-options">
            <label class="check-row"><input type="checkbox" name="recordarme"> <span>Recordarme</span></label>
            <a href="#" data-demo-alert="La recuperación de contraseña la conectaremos en una fase posterior.">Olvidé mi contraseña</a>
          </div>

          <button class="auth-submit" type="submit" data-loading-text="Entrando a la sala…"><i class="ri-login-circle-line"></i> <span>Entrar a Chronos</span></button>
        </form>

        <div class="auth-divider"><span>o</span></div>

        <a class="auth-secondary" href="registro.php"><i class="ri-user-add-line"></i> Crear una cuenta nueva</a>
      </div>
    </section>
  </main>
  <script src="assets/js/auth.js?v=17"></script>
  <script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
