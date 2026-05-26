<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();

$autorId = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$autorId) {
    header('Location: explore.php?perfil=no_encontrado');
    exit;
}

if ((int)$autorId === (int)$usuario['id']) {
    header('Location: perfil.php');
    exit;
}

$stmtAutor = $pdo->prepare('SELECT id, nombre, usuario, interes, bio, tema_favorito, avatar, portada, perfil_completo, creado_en FROM usuarios WHERE id = ? LIMIT 1');
$stmtAutor->execute([$autorId]);
$autor = $stmtAutor->fetch();

if (!$autor) {
    header('Location: explore.php?perfil=no_encontrado');
    exit;
}

$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);

$autorNombre = $autor['nombre'] ?: 'Explorador Chronos';
$autorAlias = $autor['usuario'] ?: 'autor';
$autorTema = $autor['tema_favorito'] ?: ($autor['interes'] ?: 'Historia');
$autorBio = $autor['bio'] ?: 'Este explorador todavía está preparando la descripción de su legado.';
$autorAvatar = $autor['avatar'] ?: 'assets/img/avatar.svg';
$autorPortada = $autor['portada'] ?: 'assets/img/cover.svg';
$autorSiguiendo = chronos_esta_alistado((int)$usuario['id'], (int)$autor['id']);

$stmtStats = $pdo->prepare('SELECT
    (SELECT COUNT(*) FROM publicaciones WHERE usuario_id = ?) AS total_relatos,
    (SELECT COUNT(*) FROM ecos e INNER JOIN publicaciones p ON p.id = e.publicacion_id WHERE p.usuario_id = ?) AS total_ecos_recibidos,
    (SELECT COUNT(*) FROM comentarios c INNER JOIN publicaciones p ON p.id = c.publicacion_id WHERE p.usuario_id = ?) AS total_comentarios_recibidos,
    (SELECT COUNT(*) FROM archivados a INNER JOIN publicaciones p ON p.id = a.publicacion_id WHERE p.usuario_id = ?) AS total_archivos_recibidos,
    (SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?) AS total_seguidores,
    (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?) AS total_siguiendo');
$stmtStats->execute([$autorId, $autorId, $autorId, $autorId, $autorId, $autorId]);
$statsAutor = $stmtStats->fetch() ?: [
    'total_relatos' => 0,
    'total_ecos_recibidos' => 0,
    'total_comentarios_recibidos' => 0,
    'total_archivos_recibidos' => 0,
    'total_seguidores' => 0,
    'total_siguiendo' => 0,
];

$stmtRelatos = $pdo->prepare('SELECT p.id, p.usuario_id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados a WHERE a.publicacion_id = p.id) AS total_archivos,
        (SELECT COUNT(*) FROM ecos eu WHERE eu.publicacion_id = p.id AND eu.usuario_id = ?) AS usuario_dio_eco,
        (SELECT COUNT(*) FROM archivados au WHERE au.publicacion_id = p.id AND au.usuario_id = ?) AS usuario_archivado
    FROM publicaciones p
    WHERE p.usuario_id = ?
    ORDER BY p.creado_en DESC
    LIMIT 30');
$stmtRelatos->execute([(int)$usuario['id'], (int)$usuario['id'], $autorId]);
$relatosAutor = $stmtRelatos->fetchAll() ?: [];

$stmtRutasAutor = $pdo->prepare("SELECT categoria, COUNT(*) AS total_relatos, MAX(creado_en) AS ultimo_relato
    FROM publicaciones
    WHERE usuario_id = ? AND categoria <> ''
    GROUP BY categoria
    ORDER BY total_relatos DESC, ultimo_relato DESC
    LIMIT 8");
$stmtRutasAutor->execute([$autorId]);
$rutasAutor = $stmtRutasAutor->fetchAll() ?: [];
$totalRutasAutor = count($rutasAutor);

$stmtRelatoDestacadoAutor = $pdo->prepare("SELECT p.id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados a WHERE a.publicacion_id = p.id) AS total_archivos
    FROM publicaciones p
    WHERE p.usuario_id = ?
    ORDER BY (total_ecos + total_comentarios + total_archivos) DESC, p.creado_en DESC
    LIMIT 1");
$stmtRelatoDestacadoAutor->execute([$autorId]);
$relatoDestacadoAutor = $stmtRelatoDestacadoAutor->fetch();
$insigniaAutor = chronos_insignia_legado((int)$statsAutor['total_relatos'], $totalRutasAutor, (int)$statsAutor['total_ecos_recibidos'] + (int)$statsAutor['total_comentarios_recibidos']);

$rutasTextoAutor = implode('||', array_map(static fn($ruta) => (string)($ruta['categoria'] ?? ''), $rutasAutor));
$especialidadAutor = chronos_especialidad_autor([
    'tema_favorito' => $autorTema,
    'interes' => $autor['interes'] ?? '',
    'rutas_autor' => $rutasTextoAutor,
]);
$estadoLegadoAutor = chronos_estado_legado_texto((int)$statsAutor['total_relatos'], $totalRutasAutor, (int)$statsAutor['total_ecos_recibidos'] + (int)$statsAutor['total_comentarios_recibidos']);
$insigniasBasicasAutor = chronos_insignias_basicas((int)$statsAutor['total_relatos'], $totalRutasAutor, (int)$statsAutor['total_ecos_recibidos'], (int)$statsAutor['total_comentarios_recibidos'], (int)$statsAutor['total_seguidores'], 0);

$stmtRelatosDestacadosAutor = $pdo->prepare("SELECT p.id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados a WHERE a.publicacion_id = p.id) AS total_archivos
    FROM publicaciones p
    WHERE p.usuario_id = ?
    ORDER BY (total_ecos + total_comentarios + total_archivos) DESC, p.creado_en DESC
    LIMIT 3");
$stmtRelatosDestacadosAutor->execute([$autorId]);
$relatosDestacadosAutor = $stmtRelatosDestacadosAutor->fetchAll() ?: [];

$mensaje = '';
if (isset($_GET['seguir'])) {
    if ($_GET['seguir'] === 'alistado') {
        $mensaje = mensaje_auth('success', 'Ahora sigues el legado de ' . $autorNombre . '.');
    } elseif ($_GET['seguir'] === 'desalistado') {
        $mensaje = mensaje_auth('info', 'Dejaste de seguir este legado.');
    } elseif ($_GET['seguir'] === 'error') {
        $mensaje = mensaje_auth('error', 'No se pudo actualizar el seguimiento.');
    }
}
if (isset($_GET['archivo'])) {
    if ($_GET['archivo'] === 'guardado') {
        $mensaje = mensaje_auth('success', 'Relato preservado en tu Archivo Histórico privado. Solo tú puedes verlo aquí.');
    } elseif ($_GET['archivo'] === 'quitado') {
        $mensaje = mensaje_auth('info', 'Relato quitado de tu Archivo Histórico privado.');
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Legado de <?= e($autorNombre) ?></title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell public-author-shell">
  <section class="profile-hero-card public-author-hero">
    <div class="profile-hero-cover" style="background-image:url('<?= e($autorPortada) ?>')"></div>
    <div class="profile-hero-content">
      <img class="profile-hero-avatar" src="<?= e($autorAvatar) ?>" alt="Avatar de <?= e($autorNombre) ?>">
      <div class="profile-hero-main">
        <span class="kicker">Legado público</span>
        <h1><?= e($autorNombre) ?></h1>
        <p>@<?= e($autorAlias) ?> · <?= e($autorTema) ?></p>
        <p class="profile-bio"><?= e($autorBio) ?></p>
        <div class="legacy-badge-v150"><i class="<?= e($insigniaAutor['icono']) ?>"></i><span><strong><?= e($insigniaAutor['titulo']) ?></strong><small><?= e($insigniaAutor['descripcion']) ?></small></span></div>
        <div class="legacy-specialty-v151"><i class="ri-focus-3-line"></i><span>Especialidad histórica</span><strong><?= e($especialidadAutor) ?></strong></div>
      </div>
      <div class="profile-hero-actions author-public-actions">
        <form method="post" action="seguir_toggle.php" class="public-follow-form">
          <input type="hidden" name="seguido_id" value="<?= (int)$autor['id'] ?>">
          <input type="hidden" name="accion" value="<?= $autorSiguiendo ? 'desalistar' : 'alistar' ?>">
          <input type="hidden" name="volver" value="autor">
          <button type="submit" class="head-btn public-follow-btn <?= $autorSiguiendo ? 'is-following' : '' ?>">
            <i class="<?= $autorSiguiendo ? 'ri-user-follow-line' : 'ri-user-add-line' ?>"></i>
            <?= $autorSiguiendo ? 'Siguiendo' : 'Seguir legado' ?>
          </button>
        </form>
        <a class="auth-secondary profile-logout" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar</a>
      </div>
    </div>
    <div class="profile-hero-stats public-author-stats">
      <div><strong><?= (int)$statsAutor['total_relatos'] ?></strong><span>Relatos</span></div>
      <div><strong><?= (int)$totalRutasAutor ?></strong><span>Rutas</span></div>
      <div><strong><?= (int)$statsAutor['total_ecos_recibidos'] ?></strong><span>Ecos recibidos</span></div>
      <div><strong><?= (int)$statsAutor['total_comentarios_recibidos'] ?></strong><span>Comentarios</span></div>
      <div><strong><?= (int)$statsAutor['total_archivos_recibidos'] ?></strong><span>Guardados</span></div>
      <div><strong><?= (int)$statsAutor['total_seguidores'] ?></strong><span>Seguidores</span></div>
      <div><strong><?= (int)$statsAutor['total_siguiendo'] ?></strong><span>Siguiendo</span></div>
    </div>
    <div class="profile-quick-actions public-author-quick">
      <a href="feed.php"><i class="ri-home-5-line"></i><span><strong>Volver al inicio</strong><small>Regresar a la línea del tiempo</small></span></a>
      <a href="explore.php?q=<?= urlencode($autorTema) ?>"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span><span><strong>Explorar su tema</strong><small>Buscar más sobre <?= e($autorTema) ?></small></span></a>
      <a href="#relatos-autor"><i class="ri-scroll-to-bottom-line"></i><span><strong>Ver sus relatos</strong><small>Leer sus relatos públicos</small></span></a>
      <a href="perfil.php"><i class="ri-user-star-line"></i><span><strong>Mi legado</strong><small>Volver a tu perfil personal</small></span></a>
    </div>
  </section>

  <?= $mensaje ?>

  <section class="profile-content-grid public-author-grid">
    <aside class="profile-about sidebox public-author-about">
      <h3><i class="ri-user-star-line"></i> Sobre este legado</h3>
      <div class="profile-info-row"><span>Autor</span><strong><?= e($autorNombre) ?></strong></div>
      <div class="profile-info-row"><span>Usuario</span><strong>@<?= e($autorAlias) ?></strong></div>
      <div class="profile-info-row"><span>Interés principal</span><strong><?= e($autorTema) ?></strong></div>
      <div class="profile-info-row"><span>Perfil</span><strong><?= (int)$autor['perfil_completo'] === 1 ? 'Completo' : 'En construcción' ?></strong></div>
      <div class="profile-info-row"><span>En Chronos desde</span><strong><?= e(chronos_fecha_relativa($autor['creado_en'])) ?></strong></div>
      <p class="public-author-note">Este perfil muestra solo la parte pública del usuario: su nombre, alias, biografía, intereses, estadísticas y relatos publicados.</p>
      <div class="profile-codex-card-v151 public-codex-card-v151">
        <span class="mini-label"><i class="ri-book-2-line"></i> Ficha del Códice</span>
        <h3><?= e($estadoLegadoAutor) ?></h3>
        <p>Este registro resume la identidad pública del cronista sin mostrar su Archivo Histórico privado.</p>
        <div><span>Especialidad</span><strong><?= e($especialidadAutor) ?></strong></div>
        <div><span>Afiliación</span><strong><?= e($autorTema) ?></strong></div>
      </div>
      <div class="profile-featured-v150 public-featured-v150">
        <span class="mini-label"><i class="ri-sparkling-2-line"></i> Pieza destacada</span>
        <?php if ($relatoDestacadoAutor): ?>
          <?php $rutaDestacadaAutor = chronos_ruta_info($relatoDestacadoAutor['categoria'] ?? ''); ?>
          <a href="relato_ver.php?id=<?= (int)$relatoDestacadoAutor['id'] ?>">
            <strong><?= e($relatoDestacadoAutor['titulo']) ?></strong>
            <small><i class="<?= e($rutaDestacadaAutor['icono']) ?>"></i> <?= e($relatoDestacadoAutor['categoria']) ?> · <?= (int)$relatoDestacadoAutor['total_ecos'] ?> ecos</small>
          </a>
        <?php else: ?>
          <p>Este legado aún no tiene una crónica destacada.</p>
        <?php endif; ?>
      </div>
      <?php if (!empty($rutasAutor)): ?>
        <div class="public-routes-v150">
          <span class="mini-label"><i class="ri-compass-3-line"></i> Rutas exploradas</span>
          <?php foreach ($rutasAutor as $rutaAutor): ?>
            <?php $rutaAutorInfo = chronos_ruta_info($rutaAutor['categoria'] ?? ''); ?>
            <a href="rutas.php?ruta=<?= urlencode($rutaAutor['categoria']) ?>"><i class="<?= e($rutaAutorInfo['icono']) ?>"></i><?= e($rutaAutor['categoria']) ?><b><?= (int)$rutaAutor['total_relatos'] ?></b></a>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
      <a class="create-side profile-create" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Descubrir más autores</a>
    </aside>

    <section class="profile-posts" id="relatos-autor">
      <section class="profile-codex-grid-v151 public-codex-grid-v151">
        <article class="profile-codex-panel-v151">
          <span class="mini-label"><i class="ri-shield-star-line"></i> Insignias visibles</span>
          <h3>Señales de este legado</h3>
          <p>Reconocimientos básicos que ayudan a entender la actividad pública del autor sin convertir Chronos en una competencia.</p>
          <div class="profile-badges-v151">
            <?php foreach ($insigniasBasicasAutor as $insigniaItem): ?>
              <?php if (!empty($insigniaItem['privada'])) continue; ?>
              <div class="profile-badge-token-v151 <?= !empty($insigniaItem['activa']) ? 'is-active' : 'is-locked' ?>">
                <i class="<?= e($insigniaItem['icono']) ?>"></i>
                <span><strong><?= e($insigniaItem['titulo']) ?></strong><small><?= e($insigniaItem['descripcion']) ?></small></span>
              </div>
            <?php endforeach; ?>
          </div>
        </article>

        <?php if (!empty($relatosDestacadosAutor)): ?>
          <article class="profile-codex-panel-v151 profile-featured-public-v151">
            <span class="mini-label"><i class="ri-sparkling-2-line"></i> Piezas destacadas</span>
            <h3>Crónicas con más resonancia</h3>
            <div class="profile-featured-list-compact-v151">
              <?php foreach ($relatosDestacadosAutor as $destacado): ?>
                <?php $rutaDest = chronos_ruta_info($destacado['categoria'] ?? ''); ?>
                <a href="relato_ver.php?id=<?= (int)$destacado['id'] ?>">
                  <i class="<?= e($rutaDest['icono']) ?>"></i>
                  <span><strong><?= e($destacado['titulo']) ?></strong><small><?= e($destacado['categoria']) ?> · <?= (int)$destacado['total_ecos'] ?> ecos · <?= (int)$destacado['total_comentarios'] ?> comentarios</small></span>
                </a>
              <?php endforeach; ?>
            </div>
          </article>
        <?php else: ?>
          <article class="profile-codex-panel-v151 profile-featured-public-v151">
            <span class="mini-label"><i class="ri-sparkling-2-line"></i> Piezas destacadas</span>
            <h3>Sin crónicas destacadas todavía</h3>
            <p>Cuando este autor publique relatos, Chronos podrá resaltar las piezas con más ecos y comentarios.</p>
          </article>
        <?php endif; ?>
      </section>

      <div class="feed-head profile-mini-head public-author-head">
        <div>
          <span class="kicker">Relatos del autor</span>
          <h1>Relatos de <?= e($autorNombre) ?></h1>
          <p>Publicaciones reales compartidas por este explorador dentro de Chronos.</p>
        </div>
      </div>

      <?php if (!empty($relatosAutor)): ?>
        <section class="profile-real-list public-author-list">
          <?php foreach ($relatosAutor as $relato): ?>
            <?php $rutaInfoRelato = chronos_ruta_info($relato['categoria'] ?? ''); ?>
            <article class="post real-post profile-story-card">
              <div class="post-head">
                <a class="author-mini-link" href="autor.php?id=<?= (int)$autor['id'] ?>"><img class="post-user-img" src="<?= e($autorAvatar) ?>" alt="Avatar"></a>
                <div><strong><a class="author-name-link" href="autor.php?id=<?= (int)$autor['id'] ?>"><?= e($autorNombre) ?></a> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relato['categoria']) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relato['categoria']) ?></a></strong><small>@<?= e($autorAlias) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?></small></div>
                <div class="post-menu">···</div>
              </div>
              <h2><a class="story-title-link" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></h2>
              <p><?= nl2br(e(chronos_resumen($relato['contenido'], 430))) ?></p>
              <?php if (!empty($relato['imagen'])): ?>
                <a class="post-img" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"></a>
              <?php endif; ?>
              <div class="post-actions story-actions">
                <span class="<?= ((int)($relato['usuario_dio_eco'] ?? 0) > 0) ? 'active-action' : '' ?>"><span class="chronos-ui-icon icon-eco" aria-hidden="true"></span><?= (int)($relato['total_ecos'] ?? 0) ?> ecos</span>
                <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>#comentarios"><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span><?= (int)($relato['total_comentarios'] ?? 0) ?> comentarios</a>
                <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><i class="ri-eye-line"></i>Ver completo</a>
                <button type="button" class="story-inline-action chronos-diffuse-btn" data-copy-path="relato_ver.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-compartir" aria-hidden="true"></span>Difundir</button>
                <?php if ((int)$relato['usuario_id'] !== (int)$usuario['id']): ?><a class="story-inline-action report-inline-action" href="reportar.php?tipo=relato&id=<?= (int)$relato['id'] ?>"><i class="ri-flag-line"></i>Reportar</a><?php endif; ?>
                <form class="inline-action-form" method="post" action="archivo_toggle.php">
                  <input type="hidden" name="id" value="<?= (int)$relato['id'] ?>">
                  <input type="hidden" name="volver" value="autor">
                  <input type="hidden" name="autor_id" value="<?= (int)$autor['id'] ?>">
                  <button type="submit" class="story-inline-action <?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'active-action' : '' ?>">
                    <span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span><?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'Preservado' : 'Preservar' ?>
                  </button>
                </form>
              </div>
            </article>
          <?php endforeach; ?>
        </section>
      <?php else: ?>
        <section class="profile-empty-state archive-empty-state public-author-empty">
          <div class="profile-empty-visual"><img src="assets/img/post-library.svg" alt="Relatos del autor"><div class="empty-glow"></div></div>
          <div class="profile-empty-copy">
            <span class="mini-label">Legado en construcción</span>
            <h3>Este autor aún no tiene relatos públicos.</h3>
            <p>Cuando publique su primera crónica, aparecerá aquí con sus ecos y comentarios públicos.</p>
            <a class="head-btn profile-empty-btn" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar otros autores</a>
          </div>
        </section>
      <?php endif; ?>
    </section>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=511"></script>
<script src="assets/js/social_actions.js?v=511"></script>
</body>
</html>
