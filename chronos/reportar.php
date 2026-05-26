<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();
chronos_asegurar_tabla_reportes();

$tipo = $_POST['tipo'] ?? ($_GET['tipo'] ?? '');
$tipo = in_array($tipo, ['relato', 'comentario'], true) ? $tipo : '';
$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT) ?: filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);

if (!$tipo || !$id) {
    header('Location: feed.php');
    exit;
}

$target = null;
$volverUrl = 'feed.php';
$targetTitulo = '';
$targetContenido = '';
$autorReportadoId = null;
$publicacionId = null;
$comentarioId = null;

if ($tipo === 'relato') {
    $stmt = $pdo->prepare("SELECT p.id, p.usuario_id, p.titulo, p.categoria, p.contenido, p.creado_en,
            u.nombre, u.usuario, u.avatar
        FROM publicaciones p
        INNER JOIN usuarios u ON u.id = p.usuario_id
        WHERE p.id = ?
        LIMIT 1");
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) {
        header('Location: feed.php');
        exit;
    }
    $publicacionId = (int)$target['id'];
    $autorReportadoId = (int)$target['usuario_id'];
    $targetTitulo = (string)$target['titulo'];
    $targetContenido = (string)$target['contenido'];
    $volverUrl = 'relato_ver.php?id=' . $publicacionId;
} else {
    $stmt = $pdo->prepare("SELECT c.id, c.publicacion_id, c.usuario_id, c.contenido, c.creado_en,
            p.titulo, p.categoria,
            u.nombre, u.usuario, u.avatar
        FROM comentarios c
        INNER JOIN publicaciones p ON p.id = c.publicacion_id
        INNER JOIN usuarios u ON u.id = c.usuario_id
        WHERE c.id = ?
        LIMIT 1");
    $stmt->execute([$id]);
    $target = $stmt->fetch();
    if (!$target) {
        header('Location: feed.php');
        exit;
    }
    $publicacionId = (int)$target['publicacion_id'];
    $comentarioId = (int)$target['id'];
    $autorReportadoId = (int)$target['usuario_id'];
    $targetTitulo = 'Comentario en: ' . (string)$target['titulo'];
    $targetContenido = (string)$target['contenido'];
    $volverUrl = 'relato_ver.php?id=' . $publicacionId . '#comentarios';
}

$motivos = chronos_motivos_reporte();
$mensaje = '';
$contenidoPropio = false;

if ($autorReportadoId === (int)$usuario['id']) {
    $contenidoPropio = true;
    $mensaje = mensaje_auth('info', 'Este contenido pertenece a tu legado. Si necesitas cambiarlo, usa editar o eliminar en lugar de reportarlo.');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !$mensaje) {
    $motivo = $_POST['motivo'] ?? '';
    $detalle = trim((string)($_POST['detalle'] ?? ''));

    if (!isset($motivos[$motivo])) {
        $mensaje = mensaje_auth('error', 'Elige un motivo para enviar el reporte.');
    } elseif (($_POST['acepta_codigo'] ?? '') !== '1') {
        $mensaje = mensaje_auth('error', 'Confirma que tu reporte respeta el Código del Legado.');
    } elseif ((function_exists('mb_strlen') ? mb_strlen($detalle, 'UTF-8') : strlen($detalle)) > 900) {
        $mensaje = mensaje_auth('error', 'El detalle del reporte es muy largo. Usa máximo 900 caracteres.');
    } else {
        if ($tipo === 'relato') {
            $stmtDuplicado = $pdo->prepare("SELECT id FROM reportes WHERE reportante_id = ? AND tipo = 'relato' AND publicacion_id = ? AND comentario_id IS NULL AND estado IN ('pendiente', 'revision') LIMIT 1");
            $stmtDuplicado->execute([(int)$usuario['id'], $publicacionId]);
        } else {
            $stmtDuplicado = $pdo->prepare("SELECT id FROM reportes WHERE reportante_id = ? AND tipo = 'comentario' AND comentario_id = ? AND estado IN ('pendiente', 'revision') LIMIT 1");
            $stmtDuplicado->execute([(int)$usuario['id'], $comentarioId]);
        }

        if ($stmtDuplicado->fetchColumn()) {
            $destinoDuplicado = 'relato_ver.php?id=' . $publicacionId . '&reporte=duplicado' . ($tipo === 'comentario' ? '#comentarios' : '');
            header('Location: ' . $destinoDuplicado);
            exit;
        }

        $stmtInsert = $pdo->prepare('INSERT INTO reportes (reportante_id, autor_reportado_id, tipo, publicacion_id, comentario_id, motivo, detalle) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmtInsert->execute([
            (int)$usuario['id'],
            $autorReportadoId,
            $tipo,
            $publicacionId,
            $comentarioId,
            $motivo,
            $detalle !== '' ? $detalle : null,
        ]);

        $destino = 'relato_ver.php?id=' . $publicacionId . '&reporte=creado' . ($tipo === 'comentario' ? '#comentarios' : '');
        header('Location: ' . $destino);
        exit;
    }
}

$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$rutaInfo = chronos_ruta_info($target['categoria'] ?? '');
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Reportar <?= e($tipo === 'relato' ? 'crónica' : 'comentario') ?></title>
  <link rel="stylesheet" href="assets/css/styles.css?v=522">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="shell single-column-shell">
  <section class="moderation-report-wrap">
    <div class="profile-hero moderation-hero">
      <img class="profile-hero-avatar" src="assets/icons/avisos.webp" alt="Guardia de Chronos">
      <div>
        <span class="kicker">Código del legado</span>
        <h1>Reportar <?= e($tipo === 'relato' ? 'crónica' : 'comentario') ?></h1>
        <p>Ayuda a mantener Chronos como una comunidad seria, respetuosa y enfocada en historia, memoria y legado. Antes de enviar una señal, revisa el <a class="inline-gold-link" href="codigo_legado.php">Código del Legado</a>.</p>
      </div>
      <a class="auth-secondary" href="<?= e($volverUrl) ?>"><i class="ri-arrow-left-line"></i> Volver</a>
    </div>

    <?php if ($mensaje): ?><?= $mensaje ?><?php endif; ?>

    <div class="moderation-grid moderation-report-grid-v522">
      <article class="moderation-target-card panel moderation-target-card-v522">
        <span class="kicker"><?= e($tipo === 'relato' ? 'Crónica señalada' : 'Comentario señalado') ?></span>
        <h2><?= e($targetTitulo) ?></h2>
        <div class="post-head compact-report-author">
          <img class="post-user-img" src="<?= e($target['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar">
          <div><strong><?= e($target['nombre']) ?></strong><small>@<?= e($target['usuario']) ?> · <?= e(chronos_fecha_relativa($target['creado_en'] ?? null)) ?></small></div>
        </div>
        <?php if (!empty($target['categoria'])): ?><a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($target['categoria']) ?>"><i class="<?= e($rutaInfo['icono']) ?>"></i><?= e($target['categoria']) ?></a><?php endif; ?>
        <div class="reported-content-box reported-content-box-v522">
          <strong>Extracto que será revisado</strong>
          <p><?= nl2br(e(chronos_resumen($targetContenido, 520))) ?></p>
        </div>
        <div class="moderation-note moderation-note-v522">
          <i class="ri-eye-line"></i>
          <span>Tu señal llegará a los guardianes de Chronos para revisión manual. Nada se elimina automáticamente.</span>
        </div>
      </article>

      <form class="moderation-form panel moderation-form-v522" method="post">
        <input type="hidden" name="tipo" value="<?= e($tipo) ?>">
        <input type="hidden" name="id" value="<?= (int)$id ?>">
        <span class="kicker">Señal para guardianes</span>
        <h2>¿Qué ocurre con este contenido?</h2>
        <p class="muted-copy">El reporte no elimina nada automáticamente. Primero queda en revisión para que un administrador decida con calma.</p>

        <div class="report-reasons">
          <?php foreach ($motivos as $valor => $label): ?>
            <label>
              <input type="radio" name="motivo" value="<?= e($valor) ?>" required>
              <span><i class="ri-flag-line"></i><?= e($label) ?></span>
            </label>
          <?php endforeach; ?>
        </div>

        <label class="field-label" for="detalle">Detalle opcional</label>
        <textarea id="detalle" name="detalle" rows="4" maxlength="900" placeholder="Explica brevemente por qué esta crónica o comentario debe revisarse..."></textarea>

        <label class="legacy-confirm-check">
          <input type="checkbox" name="acepta_codigo" value="1" required>
          <span>Confirmo que este reporte es responsable y respeta el <a href="codigo_legado.php">Código del Legado</a>.</span>
        </label>

        <div class="moderation-note">
          <i class="ri-shield-check-line"></i>
          <span>Chronos permite debatir ideas históricas, pero no ataques personales, burlas, acoso, spam ni contenido fuera de la comunidad.</span>
        </div>

        <button class="auth-submit report-submit-btn-v522" type="submit" <?= $contenidoPropio ? 'disabled' : '' ?>><i class="ri-flag-line"></i> Enviar reporte</button>
      </form>
    </div>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
