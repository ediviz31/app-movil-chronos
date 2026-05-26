<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();

$mensaje = mensaje_auth_vacio();
$visible = $usuario['nombre'] ?? '';
$bio = $usuario['bio'] ?? '';
$tema = $usuario['tema_favorito'] ?: ($usuario['interes'] ?? 'Egipto antiguo');
$avatarActual = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$portadaActual = $usuario['portada'] ?: 'assets/img/cover.svg';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $visible = trim($_POST['visible'] ?? '');
    $bio = trim($_POST['bio'] ?? '');
    $tema = trim($_POST['tema'] ?? '');

    if ($visible === '' || $bio === '' || $tema === '') {
        $mensaje = mensaje_auth('error', 'Completa tu nombre visible, biografía y tema favorito.');
    } elseif (mb_strlen($bio) > 255) {
        $mensaje = mensaje_auth('error', 'La biografía debe tener máximo 255 caracteres.');
    } else {
        try {
            $nuevoAvatar = chronos_subir_imagen_usuario('avatar', (int)$usuario['id'], 'perfiles') ?: $avatarActual;
            $nuevaPortada = chronos_subir_imagen_usuario('portada', (int)$usuario['id'], 'portadas') ?: $portadaActual;

            $pdo = chronos_pdo();
            $stmt = $pdo->prepare('UPDATE usuarios SET nombre = ?, bio = ?, tema_favorito = ?, avatar = ?, portada = ?, perfil_completo = 1 WHERE id = ?');
            $stmt->execute([$visible, $bio, $tema, $nuevoAvatar, $nuevaPortada, $usuario['id']]);
            $_SESSION['usuario_nombre'] = $visible;
            header('Location: perfil.php?actualizado=1');
            exit;
        } catch (RuntimeException $e) {
            $mensaje = mensaje_auth('error', $e->getMessage());
        }
    }
}

$temas = ['Egipto antiguo', 'Roma imperial', 'Grecia clásica', 'Leyendas y mitos', 'Mapas y exploraciones', 'Archivos y manuscritos', 'Personajes históricos'];
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Completa tu legado</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="auth-body">
  <main class="auth-shell setup-shell">
    <section class="auth-visual setup-visual">
      <a class="auth-brand" href="feed.php">
        <span class="brand-mark">C</span>
        <span><strong>Chronos</strong><small>Sala histórica digital</small></span>
      </a>

      <div class="auth-hero-card setup-preview-card">
        <div class="setup-profile-preview">
          <div class="setup-cover"><img src="<?= e($portadaActual) ?>" alt="Portada histórica"></div>
          <img class="setup-avatar" src="<?= e($avatarActual) ?>" alt="Avatar">
          <h2><?= e($visible ?: 'Tu legado en Chronos') ?></h2>
          <p>@<?= e($usuario['usuario']) ?> · <?= e($tema ?: 'Explorador de historias') ?></p>
          <div class="setup-stats"><span><strong>0</strong>Relatos</span><span><strong>0</strong>Ecos</span><span><strong>0</strong>Archivo</span></div>
        </div>
        <div class="auth-hero-copy">
          <span class="kicker">Perfil real</span>
          <h1>Completa tu legado antes de entrar a la sala.</h1>
          <p>Ahora tu nombre, biografía, tema favorito, foto de perfil y portada se guardan para mostrarse en tu feed y en tu perfil.</p>
        </div>
      </div>
    </section>

    <section class="auth-panel">
      <div class="auth-card register-card">
        <div class="auth-card-head">
          <span class="auth-icon"><i class="ri-user-star-line"></i></span>
          <div>
            <h2>Completa tu legado</h2>
            <p>Dale identidad a tu perfil histórico.</p>
          </div>
        </div>

        <?= $mensaje ?>

        <form class="auth-form" action="perfil_inicial.php" method="post" enctype="multipart/form-data" data-auth-form data-real-form="true" novalidate>
          <label>
            <span>Nombre visible</span>
            <div class="auth-input"><i class="ri-user-line"></i><input type="text" name="visible" placeholder="Ej. Keilin Vizcarra" value="<?= e($visible) ?>" data-required="nombre visible"></div>
          </label>
          <label>
            <span>Biografía corta</span>
            <div class="auth-input auth-textarea"><i class="ri-quill-pen-line"></i><textarea name="bio" placeholder="Ej. Explorador de historias, civilizaciones y relatos antiguos." data-required="biografía corta"><?= e($bio) ?></textarea></div>
          </label>
          <label>
            <span>Tema favorito</span>
            <div class="auth-input"><i class="ri-ancient-gate-line"></i><select name="tema">
              <?php foreach ($temas as $opcion): ?>
                <option value="<?= e($opcion) ?>" <?= $tema === $opcion ? 'selected' : '' ?>><?= e($opcion) ?></option>
              <?php endforeach; ?>
            </select></div>
          </label>
          <div class="setup-upload-grid">
            <label class="setup-upload file-upload-card">
              <input type="file" name="avatar" accept="image/png,image/jpeg,image/webp,image/gif">
              <i class="ri-image-add-line"></i><strong>Foto de perfil</strong><small>JPG, PNG, WEBP · máx. 3 MB</small>
            </label>
            <label class="setup-upload file-upload-card">
              <input type="file" name="portada" accept="image/png,image/jpeg,image/webp,image/gif">
              <i class="ri-landscape-line"></i><strong>Portada</strong><small>Imagen horizontal · máx. 3 MB</small>
            </label>
          </div>
          <button class="auth-submit" type="submit" data-loading-text="Guardando legado…"><i class="ri-sparkling-2-line"></i> <span>Guardar y entrar</span></button>
        </form>

        <a class="auth-link-muted" href="feed.php">Omitir por ahora y ver feed</a>
      </div>
    </section>
  </main>
  <script src="assets/js/auth.js?v=17"></script>
  <script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
