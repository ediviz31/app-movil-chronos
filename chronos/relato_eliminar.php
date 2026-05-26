<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    header('Location: perfil.php');
    exit;
}

$pdo = chronos_pdo();
$stmt = $pdo->prepare('SELECT id, usuario_id, titulo, categoria, contenido, imagen, creado_en FROM publicaciones WHERE id = ? AND usuario_id = ? LIMIT 1');
$stmt->execute([$id, (int)$usuario['id']]);
$relato = $stmt->fetch();

if (!$relato) {
    header('Location: perfil.php');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (($_POST['confirmar'] ?? '') === 'si') {
        $stmt = $pdo->prepare('DELETE FROM publicaciones WHERE id = ? AND usuario_id = ?');
        $stmt->execute([$id, (int)$usuario['id']]);
        chronos_eliminar_archivo_relato($relato['imagen'] ?? null);
        header('Location: perfil.php?relato=eliminado');
        exit;
    }
    header('Location: relato_ver.php?id=' . $id);
    exit;
}

$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Eliminar relato</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="delete-shell">
  <section class="delete-card">
    <span class="auth-icon danger-icon"><i class="ri-delete-bin-6-line"></i></span>
    <span class="kicker">Confirmar eliminación</span>
    <h1>¿Eliminar este relato?</h1>
    <p>Esta acción quitará el relato de tu perfil y de la línea del tiempo. Si tenía imagen subida, también se eliminará del servidor.</p>
    <article class="delete-preview">
      <strong><?= e($relato['titulo']) ?></strong>
      <span><?= e($relato['categoria']) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?></span>
      <p><?= e(chronos_resumen($relato['contenido'], 180)) ?></p>
      <?php if (!empty($relato['imagen'])): ?><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"><?php endif; ?>
    </article>
    <form method="post" class="delete-actions">
      <button class="auth-secondary" type="submit" name="confirmar" value="no"><i class="ri-arrow-left-line"></i> Cancelar</button>
      <button class="auth-submit danger-submit" type="submit" name="confirmar" value="si"><i class="ri-delete-bin-6-line"></i> Sí, eliminar</button>
    </form>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
