<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_admin();
$pdo = chronos_pdo();
chronos_asegurar_tabla_reportes();
chronos_asegurar_tabla_avisos();

$mensaje = '';
$estados = chronos_estados_reporte();
$motivos = chronos_motivos_reporte();

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $reporteId = filter_input(INPUT_POST, 'reporte_id', FILTER_VALIDATE_INT);
    $estadoNuevo = $_POST['estado'] ?? '';
    $nota = trim((string)($_POST['nota_admin'] ?? ''));

    if ($reporteId && isset($estados[$estadoNuevo])) {
        $stmt = $pdo->prepare('UPDATE reportes SET estado = ?, admin_id = ?, nota_admin = ? WHERE id = ? LIMIT 1');
        $stmt->execute([$estadoNuevo, (int)$usuario['id'], $nota !== '' ? $nota : null, $reporteId]);
        $mensaje = mensaje_auth('success', 'Reporte actualizado dentro de la bitácora de moderación.');
    } else {
        $mensaje = mensaje_auth('error', 'No se pudo actualizar el reporte.');
    }
}

$filtroEstado = $_GET['estado'] ?? 'pendiente';
if (!isset($estados[$filtroEstado]) && $filtroEstado !== 'todos') {
    $filtroEstado = 'pendiente';
}
$filtroTipo = $_GET['tipo'] ?? 'todos';
if (!in_array($filtroTipo, ['todos', 'relato', 'comentario'], true)) {
    $filtroTipo = 'todos';
}
$q = trim((string)($_GET['q'] ?? ''));

$stmtStats = $pdo->query("SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) AS pendientes,
    SUM(CASE WHEN estado = 'revision' THEN 1 ELSE 0 END) AS revision,
    SUM(CASE WHEN estado = 'resuelto' THEN 1 ELSE 0 END) AS resueltos,
    SUM(CASE WHEN estado = 'descartado' THEN 1 ELSE 0 END) AS descartados,
    SUM(CASE WHEN tipo = 'relato' THEN 1 ELSE 0 END) AS relatos,
    SUM(CASE WHEN tipo = 'comentario' THEN 1 ELSE 0 END) AS comentarios
    FROM reportes");
$stats = $stmtStats->fetch() ?: [];

$where = [];
$params = [];
if ($filtroEstado !== 'todos') {
    $where[] = 'r.estado = ?';
    $params[] = $filtroEstado;
}
if ($filtroTipo !== 'todos') {
    $where[] = 'r.tipo = ?';
    $params[] = $filtroTipo;
}
if ($q !== '') {
    $where[] = '(rep.nombre LIKE ? OR rep.usuario LIKE ? OR ar.nombre LIKE ? OR ar.usuario LIKE ? OR p.titulo LIKE ? OR r.detalle LIKE ? OR c.contenido LIKE ?)';
    $like = '%' . $q . '%';
    array_push($params, $like, $like, $like, $like, $like, $like, $like);
}
$whereSql = $where ? ('WHERE ' . implode(' AND ', $where)) : '';

$sql = "SELECT r.id, r.tipo, r.publicacion_id, r.comentario_id, r.motivo, r.detalle, r.estado, r.nota_admin, r.creado_en, r.actualizado_en,
        rep.id AS reportante_id, rep.nombre AS reportante_nombre, rep.usuario AS reportante_usuario, rep.avatar AS reportante_avatar,
        ar.id AS autor_id, ar.nombre AS autor_nombre, ar.usuario AS autor_usuario, ar.avatar AS autor_avatar,
        p.titulo AS relato_titulo, p.categoria AS relato_categoria, p.contenido AS relato_contenido,
        c.contenido AS comentario_contenido, c.creado_en AS comentario_fecha,
        adm.nombre AS admin_nombre, adm.usuario AS admin_usuario
    FROM reportes r
    INNER JOIN usuarios rep ON rep.id = r.reportante_id
    LEFT JOIN usuarios ar ON ar.id = r.autor_reportado_id
    LEFT JOIN publicaciones p ON p.id = r.publicacion_id
    LEFT JOIN comentarios c ON c.id = r.comentario_id
    LEFT JOIN usuarios adm ON adm.id = r.admin_id
    $whereSql
    ORDER BY FIELD(r.estado, 'pendiente', 'revision', 'resuelto', 'descartado'), r.creado_en DESC
    LIMIT 80";
$stmt = $pdo->prepare($sql);
$stmt->execute($params);
$reportes = $stmt->fetchAll() ?: [];

$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$totalReportesPendientes = chronos_contar_reportes_pendientes();
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';

$tabsEstado = [
    'pendiente' => ['label' => 'Pendientes', 'count' => (int)($stats['pendientes'] ?? 0)],
    'revision' => ['label' => 'En revisión', 'count' => (int)($stats['revision'] ?? 0)],
    'todos' => ['label' => 'Todos', 'count' => (int)($stats['total'] ?? 0)],
    'resuelto' => ['label' => 'Atendidos', 'count' => (int)($stats['resueltos'] ?? 0)],
    'descartado' => ['label' => 'Descartados', 'count' => (int)($stats['descartados'] ?? 0)],
];
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Moderación</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="shell single-column-shell">
  <section class="moderation-dashboard">
    <div class="profile-hero moderation-hero">
      <img class="profile-hero-avatar" src="assets/icons/avisos.webp" alt="Moderación Chronos">
      <div>
        <span class="kicker">Guardianes de Chronos</span>
        <h1>Moderación y reportes</h1>
        <p>Revisa señales de contenido ofensivo, spam o fuera de la comunidad sin borrar nada automáticamente.</p>
      </div>
      <a class="head-btn" href="feed.php"><i class="ri-arrow-left-line"></i> Volver al feed</a>
    </div>

    <?php if ($mensaje): ?><?= $mensaje ?><?php endif; ?>

    <div class="profile-stats wide moderation-stats">
      <div><strong><?= (int)($stats['pendientes'] ?? 0) ?></strong><span>Pendientes</span></div>
      <div><strong><?= (int)($stats['revision'] ?? 0) ?></strong><span>En revisión</span></div>
      <div><strong><?= (int)($stats['relatos'] ?? 0) ?></strong><span>Crónicas</span></div>
      <div><strong><?= (int)($stats['comentarios'] ?? 0) ?></strong><span>Comentarios</span></div>
      <div><strong><?= (int)($stats['total'] ?? 0) ?></strong><span>Total</span></div>
    </div>

    <div class="activity-filters moderation-filters">
      <?php foreach ($tabsEstado as $key => $tab): ?>
        <?php $url = 'admin_reportes.php?estado=' . urlencode($key) . '&tipo=' . urlencode($filtroTipo) . ($q !== '' ? '&q=' . urlencode($q) : ''); ?>
        <a class="<?= $filtroEstado === $key ? 'active' : '' ?>" href="<?= e($url) ?>"><?= e($tab['label']) ?> <b><?= (int)$tab['count'] ?></b></a>
      <?php endforeach; ?>
    </div>

    <form class="archive-filters moderation-search" method="get">
      <input type="hidden" name="estado" value="<?= e($filtroEstado) ?>">
      <select name="tipo">
        <option value="todos" <?= $filtroTipo === 'todos' ? 'selected' : '' ?>>Todo tipo</option>
        <option value="relato" <?= $filtroTipo === 'relato' ? 'selected' : '' ?>>Solo crónicas</option>
        <option value="comentario" <?= $filtroTipo === 'comentario' ? 'selected' : '' ?>>Solo comentarios</option>
      </select>
      <input type="search" name="q" value="<?= e($q) ?>" placeholder="Buscar por usuario, título o detalle del reporte">
      <button class="head-btn" type="submit"><i class="ri-search-line"></i> Filtrar</button>
    </form>

    <div class="moderation-layout">
      <section class="report-list">
        <?php if ($reportes): ?>
          <?php foreach ($reportes as $reporte): ?>
            <?php
              $esComentario = ($reporte['tipo'] ?? '') === 'comentario';
              $motivoLabel = $motivos[$reporte['motivo'] ?? ''] ?? ($reporte['motivo'] ?? 'Motivo no definido');
              $estado = $reporte['estado'] ?? 'pendiente';
              $targetTexto = $esComentario ? ($reporte['comentario_contenido'] ?? '') : ($reporte['relato_contenido'] ?? '');
              $targetUrl = !empty($reporte['publicacion_id']) ? ('relato_ver.php?id=' . (int)$reporte['publicacion_id'] . ($esComentario ? '#comentarios' : '')) : '#';
              $rutaInfo = chronos_ruta_info($reporte['relato_categoria'] ?? '');
            ?>
            <article class="report-card panel report-status-<?= e($estado) ?>">
              <div class="report-card-head">
                <div>
                  <span class="kicker"><?= $esComentario ? 'Comentario reportado' : 'Crónica reportada' ?></span>
                  <h2><?= e($reporte['relato_titulo'] ?: 'Contenido no disponible') ?></h2>
                </div>
                <span class="report-status-pill <?= e($estado) ?>"><?= e(chronos_estado_reporte_label($estado)) ?></span>
              </div>

              <div class="report-meta-grid">
                <div><small>Reportó</small><strong>@<?= e($reporte['reportante_usuario']) ?></strong></div>
                <div><small>Autor señalado</small><strong>@<?= e($reporte['autor_usuario'] ?: 'usuario eliminado') ?></strong></div>
                <div><small>Motivo</small><strong><?= e($motivoLabel) ?></strong></div>
                <div><small>Fecha</small><strong><?= e(chronos_fecha_relativa($reporte['creado_en'])) ?></strong></div>
              </div>

              <?php if (!empty($reporte['relato_categoria'])): ?>
                <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($reporte['relato_categoria']) ?>"><i class="<?= e($rutaInfo['icono']) ?>"></i><?= e($reporte['relato_categoria']) ?></a>
              <?php endif; ?>

              <div class="reported-content-box">
                <strong><?= $esComentario ? 'Comentario señalado' : 'Fragmento de la crónica' ?></strong>
                <p><?= nl2br(e(chronos_resumen($targetTexto, 460))) ?></p>
              </div>

              <?php if (!empty($reporte['detalle'])): ?>
                <div class="report-detail-box"><strong>Detalle del reporte</strong><p><?= nl2br(e($reporte['detalle'])) ?></p></div>
              <?php endif; ?>

              <?php if (!empty($reporte['nota_admin'])): ?>
                <div class="report-admin-note"><strong>Nota administrativa</strong><p><?= nl2br(e($reporte['nota_admin'])) ?></p><small>Actualizado por @<?= e($reporte['admin_usuario'] ?: 'admin') ?></small></div>
              <?php endif; ?>

              <form method="post" class="report-actions-form">
                <input type="hidden" name="reporte_id" value="<?= (int)$reporte['id'] ?>">
                <label class="field-label" for="nota_<?= (int)$reporte['id'] ?>">Nota interna</label>
                <textarea id="nota_<?= (int)$reporte['id'] ?>" name="nota_admin" rows="2" placeholder="Ejemplo: Revisado, se mantiene visible porque no rompe el Código del Legado."><?= e($reporte['nota_admin'] ?? '') ?></textarea>
                <div class="report-actions-row">
                  <a class="auth-secondary" href="<?= e($targetUrl) ?>"><i class="ri-eye-line"></i> Ver contenido</a>
                  <button name="estado" value="revision" class="auth-secondary" type="submit"><i class="ri-search-eye-line"></i> Revisar</button>
                  <button name="estado" value="resuelto" class="head-btn" type="submit"><i class="ri-shield-check-line"></i> Atendido</button>
                  <button name="estado" value="descartado" class="auth-secondary" type="submit"><i class="ri-close-circle-line"></i> Descartar</button>
                </div>
              </form>
            </article>
          <?php endforeach; ?>
        <?php else: ?>
          <div class="empty-feed-state panel moderation-empty">
            <span class="kicker">Bitácora limpia</span>
            <h3>No hay reportes para este filtro</h3>
            <p>Cuando la comunidad señale una crónica o comentario, aparecerá aquí para revisión.</p>
            <a class="head-btn" href="admin_reportes.php?estado=todos"><i class="ri-archive-drawer-line"></i> Ver todos</a>
          </div>
        <?php endif; ?>
      </section>

      <aside class="sidebox moderation-guide">
        <h3><i class="ri-shield-star-line"></i> Código del Legado</h3>
        <p>Chronos permite debatir historia, corregir datos y aportar contexto. Lo que no se debe permitir es usar la comunidad para humillar, acosar, hacer spam o sacar el tema histórico de su propósito.</p>
        <ul>
          <li><strong>Pendiente:</strong> aún no se revisa.</li>
          <li><strong>En revisión:</strong> un guardián ya lo está analizando.</li>
          <li><strong>Atendido:</strong> se tomó una decisión.</li>
          <li><strong>Descartado:</strong> no rompe reglas.</li>
        </ul>
        <p class="privacy-note"><i class="ri-lock-line"></i> Los reportes no dan acceso al Archivo Histórico privado de ningún usuario.</p>
        <a class="auth-secondary code-guide-btn" href="codigo_legado.php"><i class="ri-shield-check-line"></i> Ver Código completo</a>
      </aside>
    </div>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
