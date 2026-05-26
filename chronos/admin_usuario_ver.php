<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_admin();
$nombreUsuario = $usuario['nombre'] ?: 'Administrador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'admin';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$pdo = chronos_pdo();
chronos_asegurar_columna_usuario_rol($pdo);
chronos_asegurar_columnas_codigo_legado($pdo);
chronos_asegurar_primer_admin($pdo);
chronos_asegurar_tabla_seguidores();

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    header('Location: admin_usuarios.php');
    exit;
}

$stmtAutor = $pdo->prepare("SELECT u.id, u.nombre, u.usuario, u.correo, u.interes, u.bio, u.tema_favorito, u.avatar, u.portada, u.perfil_completo, u.rol, u.codigo_legado_aceptado, u.codigo_legado_aceptado_en, u.creado_en,
        (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id) AS total_relatos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.usuario_id = u.id) AS total_comentarios,
        (SELECT COUNT(*) FROM ecos e WHERE e.usuario_id = u.id) AS total_ecos,
        (SELECT COUNT(*) FROM archivados a WHERE a.usuario_id = u.id) AS total_archivos,
        (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS total_seguidores,
        (SELECT COUNT(*) FROM seguidores s2 WHERE s2.seguidor_id = u.id) AS total_siguiendo
    FROM usuarios u
    WHERE u.id = ?
    LIMIT 1");
$stmtAutor->execute([$id]);
$autor = $stmtAutor->fetch();

if (!$autor) {
    header('Location: admin_usuarios.php');
    exit;
}

$stmtRelatos = $pdo->prepare("SELECT p.id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios
    FROM publicaciones p
    WHERE p.usuario_id = ?
    ORDER BY p.creado_en DESC
    LIMIT 8");
$stmtRelatos->execute([(int)$autor['id']]);
$relatos = $stmtRelatos->fetchAll() ?: [];

$stmtComentarios = $pdo->prepare("SELECT c.id, c.contenido, c.creado_en, p.id AS relato_id, p.titulo
    FROM comentarios c
    INNER JOIN publicaciones p ON p.id = c.publicacion_id
    WHERE c.usuario_id = ?
    ORDER BY c.creado_en DESC
    LIMIT 8");
$stmtComentarios->execute([(int)$autor['id']]);
$comentarios = $stmtComentarios->fetchAll() ?: [];

$bioAutor = $autor['bio'] ?: 'Este autor aún no agrega una biografía.';
$temaAutor = $autor['tema_favorito'] ?: ($autor['interes'] ?: 'Sin tema definido');
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Detalle de usuario</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell admin-shell">
  <section class="profile-hero-card admin-user-hero">
    <div class="profile-hero-cover" style="background-image:url('<?= e($autor['portada'] ?: 'assets/img/cover.svg') ?>')"></div>
    <div class="profile-hero-content">
      <img class="profile-hero-avatar" src="<?= e($autor['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar del usuario">
      <div class="profile-hero-main">
        <span class="kicker">Ficha de autor</span>
        <h1><?= e($autor['nombre']) ?></h1>
        <p>@<?= e($autor['usuario']) ?> · <?= e($temaAutor) ?><?= ($autor['rol'] ?? '') === 'admin' ? ' · Administrador' : '' ?></p>
        <p class="profile-bio"><?= e($bioAutor) ?></p>
      </div>
      <div class="profile-hero-actions">
        <a class="head-btn" href="admin_usuarios.php"><i class="ri-arrow-left-line"></i> Volver a usuarios</a>
        <a class="auth-secondary profile-logout" href="feed.php"><i class="ri-home-5-line"></i> Feed</a>
      </div>
    </div>
    <div class="profile-hero-stats admin-stats-grid wide">
      <div><strong><?= (int)$autor['total_relatos'] ?></strong><span>Relatos</span></div>
      <div><strong><?= (int)$autor['total_comentarios'] ?></strong><span>Comentarios hechos</span></div>
      <div><strong><?= (int)$autor['total_ecos'] ?></strong><span>Ecos dados</span></div>
      <div><strong><?= (int)$autor['total_archivos'] ?></strong><span>Guardados</span></div>
      <div><strong><?= (int)$autor['total_seguidores'] ?></strong><span>Seguidores</span></div>
      <div><strong><?= (int)$autor['total_siguiendo'] ?></strong><span>Siguiendo</span></div>
    </div>
  </section>

  <section class="admin-content-grid detail">
    <aside class="sidebox admin-side-panel">
      <h3><i class="ri-id-card-line"></i> Datos del registro</h3>
      <div class="profile-info-row"><span>Nombre</span><strong><?= e($autor['nombre']) ?></strong></div>
      <div class="profile-info-row"><span>Usuario</span><strong>@<?= e($autor['usuario']) ?></strong></div>
      <div class="profile-info-row"><span>Correo</span><strong><?= e($autor['correo']) ?></strong></div>
      <div class="profile-info-row"><span>Interés</span><strong><?= e($temaAutor) ?></strong></div>
      <div class="profile-info-row"><span>Rol</span><strong><?= e(($autor['rol'] ?? '') === 'admin' ? 'Administrador' : 'Usuario') ?></strong></div>
      <div class="profile-info-row"><span>Perfil</span><strong><?= ((int)$autor['perfil_completo'] === 1) ? 'Completo' : 'Pendiente' ?></strong></div>
      <div class="profile-info-row"><span>Código del Legado</span><strong><?= ((int)($autor['codigo_legado_aceptado'] ?? 0) === 1) ? 'Aceptado' : 'Pendiente' ?></strong></div>
      <?php if (!empty($autor['codigo_legado_aceptado_en'])): ?>
        <div class="profile-info-row"><span>Aceptado el</span><strong><?= e(date('d/m/Y H:i', strtotime($autor['codigo_legado_aceptado_en']))) ?></strong></div>
      <?php endif; ?>
      <div class="profile-info-row"><span>Registrado</span><strong><?= e(date('d/m/Y H:i', strtotime($autor['creado_en']))) ?></strong></div>
      <a class="create-side profile-create" href="admin_usuarios.php"><i class="ri-arrow-left-line"></i> Volver al listado</a>
    </aside>

    <section class="admin-detail-main">
      <div class="admin-section-card panel">
        <div class="admin-list-head simple">
          <div><span class="kicker">Publicaciones</span><h2>Relatos recientes</h2></div>
        </div>
        <?php if (!empty($relatos)): ?>
          <div class="admin-activity-list">
            <?php foreach ($relatos as $relato): ?>
              <article class="admin-activity-item">
                <?php if (!empty($relato['imagen'])): ?><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"><?php else: ?><div class="admin-activity-icon"><i class="ri-scroll-to-bottom-line"></i></div><?php endif; ?>
                <div>
                  <strong><a href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></strong>
                  <p><?= e(chronos_resumen($relato['contenido'], 170)) ?></p>
                  <small><?= e($relato['categoria']) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?> · <?= (int)$relato['total_ecos'] ?> ecos · <?= (int)$relato['total_comentarios'] ?> comentarios</small>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        <?php else: ?>
          <p class="admin-muted">Este usuario todavía no ha publicado relatos.</p>
        <?php endif; ?>
      </div>

      <div class="admin-section-card panel">
        <div class="admin-list-head simple">
          <div><span class="kicker">Interacción</span><h2>Comentarios recientes</h2></div>
        </div>
        <?php if (!empty($comentarios)): ?>
          <div class="admin-activity-list comments">
            <?php foreach ($comentarios as $comentario): ?>
              <article class="admin-activity-item comment">
                <div class="admin-activity-icon"><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span></div>
                <div>
                  <strong><a href="relato_ver.php?id=<?= (int)$comentario['relato_id'] ?>#comentarios"><?= e($comentario['titulo']) ?></a></strong>
                  <p><?= e(chronos_resumen($comentario['contenido'], 220)) ?></p>
                  <small><?= e(chronos_fecha_relativa($comentario['creado_en'])) ?></small>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        <?php else: ?>
          <p class="admin-muted">Este usuario todavía no ha comentado relatos.</p>
        <?php endif; ?>
      </div>
    </section>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
