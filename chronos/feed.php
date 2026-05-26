<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$bioUsuario = $usuario['bio'] ?: 'Explorador de historias';
$temaUsuario = $usuario['tema_favorito'] ?: ($usuario['interes'] ?: 'Civilizaciones');
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';
$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();
$vistaFeed = ($_GET['vista'] ?? 'todos') === 'siguiendo' ? 'siguiendo' : 'todos';

$sqlRelatos = "SELECT p.id, p.usuario_id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        u.nombre, u.usuario, u.avatar, u.tema_favorito, u.interes,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados a WHERE a.publicacion_id = p.id) AS total_archivos,
        (SELECT COUNT(*) FROM ecos eu WHERE eu.publicacion_id = p.id AND eu.usuario_id = ?) AS usuario_dio_eco,
        (SELECT COUNT(*) FROM archivados au WHERE au.publicacion_id = p.id AND au.usuario_id = ?) AS usuario_archivado
    FROM publicaciones p
    INNER JOIN usuarios u ON u.id = p.usuario_id";
$paramsRelatos = [(int)$usuario['id'], (int)$usuario['id']];
if ($vistaFeed === 'siguiendo') {
    $sqlRelatos .= " WHERE p.usuario_id IN (SELECT seguido_id FROM seguidores WHERE seguidor_id = ?)";
    $paramsRelatos[] = (int)$usuario['id'];
}
$sqlRelatos .= " ORDER BY p.creado_en DESC LIMIT 25";
$stmtRelatos = $pdo->prepare($sqlRelatos);
$stmtRelatos->execute($paramsRelatos);
$relatos = $stmtRelatos->fetchAll();
$stmtMisRelatos = $pdo->prepare('SELECT COUNT(*) FROM publicaciones WHERE usuario_id = ?');
$stmtMisRelatos->execute([(int)$usuario['id']]);
$totalMisRelatos = (int)$stmtMisRelatos->fetchColumn();
$stmtPreservadosUsuario = $pdo->prepare('SELECT COUNT(*) FROM archivados WHERE usuario_id = ?');
$stmtPreservadosUsuario->execute([(int)$usuario['id']]);
$totalPreservadosUsuario = (int)$stmtPreservadosUsuario->fetchColumn();
$stmtSeguidoresUsuario = $pdo->prepare('SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?');
$stmtSeguidoresUsuario->execute([(int)$usuario['id']]);
$totalSeguidoresUsuario = (int)$stmtSeguidoresUsuario->fetchColumn();
$stmtSiguiendoUsuario = $pdo->prepare('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?');
$stmtSiguiendoUsuario->execute([(int)$usuario['id']]);
$totalSiguiendoUsuario = (int)$stmtSiguiendoUsuario->fetchColumn();
$autoresSugeridos = chronos_autores_sugeridos_inteligentes($pdo, $usuario, 5, false);

$stmtRutasPopulares = $pdo->query("SELECT categoria, COUNT(*) AS total FROM publicaciones WHERE categoria <> '' GROUP BY categoria ORDER BY total DESC, categoria ASC LIMIT 5");
$rutasPopulares = $stmtRutasPopulares->fetchAll() ?: [];

$mensajeRelato = '';
if (isset($_GET['relato'])) {
    if ($_GET['relato'] === 'creado') {
        $mensajeRelato = mensaje_auth('success', 'Tu relato se publicó correctamente en la línea del tiempo.');
    } elseif ($_GET['relato'] === 'editado') {
        $mensajeRelato = mensaje_auth('success', 'Tu relato se actualizó correctamente.');
    } elseif ($_GET['relato'] === 'eliminado') {
        $mensajeRelato = mensaje_auth('success', 'El relato se eliminó correctamente.');
    }
}
if (isset($_GET['archivo'])) {
    if ($_GET['archivo'] === 'guardado') {
        $mensajeRelato = mensaje_auth('success', 'Relato preservado en tu Archivo Histórico privado. Solo tú puedes verlo aquí.');
    } elseif ($_GET['archivo'] === 'quitado') {
        $mensajeRelato = mensaje_auth('info', 'Relato quitado de tu Archivo Histórico privado.');
    }
}
if (isset($_GET['seguir'])) {
    if ($_GET['seguir'] === 'alistado') {
        $mensajeRelato = mensaje_auth('success', 'Ahora sigues este legado. Sus relatos podrán aparecer en tu vista Siguiendo.');
    } elseif ($_GET['seguir'] === 'desalistado') {
        $mensajeRelato = mensaje_auth('info', 'Dejaste de seguir este legado.');
    } elseif ($_GET['seguir'] === 'error') {
        $mensajeRelato = mensaje_auth('error', 'No se pudo actualizar el seguimiento.');
    }
}

?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Feed visual</title>
  <link rel="stylesheet" href="assets/css/styles-improved.css?v=600">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="shell">
  <aside class="sidebar">
    <section class="profile-card">
      <div class="cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
      <div class="profile-main">
        <img class="avatar" src="<?= e($avatarUsuario) ?>" alt="Avatar de usuario">
        <h2><?= e($nombreUsuario) ?></h2>
        <p>@<?= e($aliasUsuario) ?> · <?= e($temaUsuario) ?></p>
        <span class="badge">Beta visual</span>
      </div>
      <div class="stats stats-links-v137">
        <a href="perfil.php"><strong><?= e((string)$totalMisRelatos) ?></strong><span>Relatos</span></a>
        <a href="legados.php?tab=seguidores"><strong><?= e((string)$totalSeguidoresUsuario) ?></strong><span>Seguidores</span></a>
        <a href="legados.php?tab=siguiendo"><strong><?= e((string)$totalSiguiendoUsuario) ?></strong><span>Siguiendo</span></a>
      </div>
      <div class="nav-title">Navegación</div>
      <nav class="side-nav">
        <a class="<?= $vistaFeed === 'todos' ? 'active' : '' ?>" href="feed.php"><i class="ri-sparkling-2-line"></i> Línea del tiempo</a>
        <a class="<?= $vistaFeed === 'siguiendo' ? 'active' : '' ?>" href="feed.php?vista=siguiendo"><i class="ri-user-follow-line"></i> Siguiendo</a>
        <a href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar</a>
        <a href="rutas.php"><i class="ri-compass-3-line"></i> Rutas históricas</a>
        <a href="archivo.php"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span> Archivo</a>
      </nav>
      <div class="nav-title">Comunidad</div>
      <nav class="side-nav">
        <a href="legados.php"><i class="ri-user-follow-line"></i> Legados</a>
      <?php if (chronos_es_admin($usuario)): ?><a href="admin_usuarios.php"><i class="ri-shield-user-line"></i> Usuarios</a><a href="admin_reportes.php"><i class="ri-flag-line"></i> Moderación</a><?php endif; ?>
        <a href="archivo.php"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span> Guardados</a>
        <a href="perfil.php"><i class="ri-user-star-line"></i> Mi legado</a>
        <a href="perfil_inicial.php"><i class="ri-settings-3-line"></i> Editar legado</a>
        <a href="logout.php"><i class="ri-logout-circle-line"></i> Cerrar sesión</a>
      </nav>
      <a class="create-side" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a>
    </section>
  </aside>

  <section class="feed">
    <div class="feed-head">
      <div>
        <span class="kicker">Sala Chronos</span>
        <h1>Línea del tiempo</h1>
        <p>Relatos, hallazgos y fragmentos del pasado compartidos por la comunidad.</p>
      </div>
      <a class="head-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a>
    </div>

    <section class="featured-strip">
      <article>
        <img src="assets/img/hallazgo-1.svg" alt="Hallazgo ficticio">
        <span>Hallazgo del día</span>
        <strong>Templos perdidos</strong>
      </article>
      <article>
        <img src="assets/img/hallazgo-2.svg" alt="Mapa ficticio">
        <span>Ruta antigua</span>
        <strong>Caminos del imperio</strong>
      </article>
      <article>
        <img src="assets/img/hallazgo-3.svg" alt="Archivo ficticio">
        <span>Archivo visual</span>
        <strong>Columnas y memoria</strong>
      </article>
    </section>

    <section class="composer composer-chronos">
      <a class="composer-entry" href="relato.php" aria-label="Crear un nuevo relato histórico">
        <img class="mini-avatar" src="<?= e($avatarUsuario) ?>" alt="">
        <span class="composer-copy">
          <span class="composer-label">Nuevo legado</span>
          <strong>¿Qué historia quieres compartir hoy?</strong>
          <small>Escribe un relato, agrega una imagen y compártelo en la línea del tiempo.</small>
        </span>
        <span class="composer-cta"><i class="ri-quill-pen-line"></i> Crear relato</span>
      </a>
    </section>

    <?php if ($mensajeRelato): ?>
      <?= $mensajeRelato ?>
    <?php endif; ?>

    <nav class="feed-tabs-v136" aria-label="Vista de la línea del tiempo">
      <a class="<?= $vistaFeed === 'todos' ? 'active' : '' ?>" href="feed.php"><i class="ri-global-line"></i> Todos los relatos</a>
      <a class="<?= $vistaFeed === 'siguiendo' ? 'active' : '' ?>" href="feed.php?vista=siguiendo"><i class="ri-user-follow-line"></i> Legados que sigues</a>
    </nav>

    <?php if (!empty($relatos)): ?>
      <section class="real-feed-head panel">
        <div>
          <span class="kicker"><?= $vistaFeed === 'siguiendo' ? 'Legados que sigues' : 'Legados recientes' ?></span>
          <h3><?= $vistaFeed === 'siguiendo' ? 'Relatos de tus autores' : 'Relatos compartidos' ?></h3>
          <p><?= $vistaFeed === 'siguiendo' ? 'Historias nuevas de los autores cuyo legado sigues.' : 'Historias publicadas por exploradores de Chronos.' ?></p>
        </div>
        <a class="head-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Nuevo relato</a>
      </section>
      <?php foreach ($relatos as $relato): ?>
        <?php
          $relatoAvatar = $relato['avatar'] ?: 'assets/img/avatar.svg';
          $relatoCategoria = $relato['categoria'] ?: ($relato['tema_favorito'] ?: ($relato['interes'] ?: 'Historia'));
          $autorPerfilUrl = ((int)$relato['usuario_id'] === (int)$usuario['id']) ? 'perfil.php' : ('autor.php?id=' . (int)$relato['usuario_id']);
          $rutaInfoRelato = chronos_ruta_info($relatoCategoria);
        ?>
        <article class="post real-post">
          <div class="post-head">
            <a class="author-mini-link" href="<?= e($autorPerfilUrl) ?>"><img class="post-user-img" src="<?= e($relatoAvatar) ?>" alt="Avatar"></a>
            <div><strong><a class="author-name-link" href="<?= e($autorPerfilUrl) ?>"><?= e($relato['nombre']) ?></a> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relatoCategoria) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relatoCategoria) ?></a></strong><small>@<?= e($relato['usuario']) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?></small></div>
            <div class="post-menu">···</div>
          </div>
          <h2><a class="story-title-link" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></h2>
          <p><?= nl2br(e(chronos_resumen($relato['contenido'], 460))) ?></p>
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
              <input type="hidden" name="volver" value="feed">
              <button type="submit" class="story-inline-action <?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'active-action' : '' ?>">
                <span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span><?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'Preservado' : 'Preservar' ?>
              </button>
            </form>
            <?php if ((int)$relato['usuario_id'] === (int)$usuario['id']): ?>
              <a href="relato_editar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span>Editar</a>
              <a class="danger-link" href="relato_eliminar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-eliminar" aria-hidden="true"></span>Eliminar</a>
            <?php endif; ?>
          </div>
        </article>
      <?php endforeach; ?>
    <?php else: ?>
      <section class="empty-feed-state panel">
        <span class="kicker"><?= $vistaFeed === 'siguiendo' ? 'Sin relatos todavía' : 'Primer legado' ?></span>
        <h3><?= $vistaFeed === 'siguiendo' ? 'Aún no hay relatos de los legados que sigues' : 'Aún no hay relatos publicados' ?></h3>
        <p><?= $vistaFeed === 'siguiendo' ? 'Cuando los autores que sigues publiquen nuevas historias, aparecerán aquí. También puedes descubrir más perfiles en Explorar.' : 'Cuando la comunidad empiece a compartir historias, aparecerán aquí. Puedes iniciar la línea del tiempo con tu primer relato.' ?></p>
        <a class="head-btn" href="<?= $vistaFeed === 'siguiendo' ? 'explore.php?tipo=autores' : 'relato.php' ?>"><i class="<?= $vistaFeed === 'siguiendo' ? 'ri-user-search-line' : 'ri-quill-pen-line' ?>"></i> <?= $vistaFeed === 'siguiendo' ? 'Descubrir autores' : 'Crear primer relato' ?></a>
      </section>
    <?php endif; ?>

  </section>

  <aside class="rightbar">
    <section class="sidebox">
      <h3><i class="ri-sparkling-2-fill"></i> Rutas activas</h3>
      <?php if (!empty($rutasPopulares)): ?>
        <?php foreach ($rutasPopulares as $rutaPopular): ?>
          <?php $rutaInfoPopular = chronos_ruta_info($rutaPopular['categoria']); ?>
          <a class="trend trend-route-v141" href="rutas.php?ruta=<?= urlencode($rutaPopular['categoria']) ?>"><i class="<?= e($rutaInfoPopular['icono']) ?>"></i><span><?= e($rutaPopular['categoria']) ?></span><strong><?= (int)$rutaPopular['total'] ?></strong></a>
        <?php endforeach; ?>
      <?php else: ?>
        <p class="explore-side-copy">Cuando la comunidad publique relatos, aquí aparecerán las rutas con más actividad.</p>
      <?php endif; ?>
      <a class="text-link" href="rutas.php">Ver todas las rutas →</a>
    </section>

    <section class="sidebox">
      <h3><i class="ri-user-star-line"></i> Legados sugeridos</h3>
      <p class="smart-suggestion-intro">Chronos prioriza autores conectados con tus rutas, tu interés y la actividad reciente.</p>
      <?php if (!empty($autoresSugeridos)): ?>
        <?php foreach ($autoresSugeridos as $autorSugerido): ?>
          <?php
            $autorTemaSugerido = $autorSugerido['tema_favorito'] ?: ($autorSugerido['interes'] ?: 'Historia');
            $autorUrlSugerido = 'autor.php?id=' . (int)$autorSugerido['id'];
          ?>
          <div class="person-row dynamic-author-row">
            <a class="who" href="<?= e($autorUrlSugerido) ?>">
              <img class="person-img" src="<?= e($autorSugerido['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar de <?= e($autorSugerido['nombre']) ?>">
              <span><strong><?= e($autorSugerido['nombre']) ?></strong><small>@<?= e($autorSugerido['usuario']) ?> · <?= e($autorTemaSugerido) ?></small><em><?= e($autorSugerido['sugerencia_motivo'] ?? 'Autor por descubrir') ?></em></span>
            </a>
            <form method="post" action="seguir_toggle.php" class="follow-form">
              <input type="hidden" name="seguido_id" value="<?= (int)$autorSugerido['id'] ?>">
              <input type="hidden" name="volver" value="feed">
              <input type="hidden" name="vista" value="<?= e($vistaFeed) ?>">
              <input type="hidden" name="accion" value="alistar">
              <button class="follow" type="submit">Seguir</button>
            </form>
          </div>
        <?php endforeach; ?>
      <?php else: ?>
        <p class="explore-side-copy">Ya sigues a los autores disponibles o todavía no hay perfiles suficientes para sugerir.</p>
      <?php endif; ?>
      <a class="text-link" href="explore.php?tipo=autores">Ver más autores →</a>
    </section>

    <section class="sidebox mini-gallery">
      <h3>Hallazgos visuales</h3>
      <div class="gallery-grid">
        <img src="assets/img/post-battle.svg" alt="">
        <img src="assets/img/post-scroll.svg" alt="">
        <img src="assets/img/post-temple.svg" alt="">
        <img src="assets/img/hallazgo-2.svg" alt="">
      </div>
    </section>

    <section class="sidebox routes-box">
      <h3>Rutas recomendadas</h3>
      <?php foreach (array_slice(chronos_rutas_catalogo(), 0, 2, true) as $nombreRutaBase => $infoRutaBase): ?>
        <a class="route-card" href="rutas.php?ruta=<?= urlencode($nombreRutaBase) ?>"><img src="assets/img/post-map.svg" alt=""><div><strong><?= e($nombreRutaBase) ?></strong><small><?= e($infoRutaBase['epoca']) ?></small></div></a>
      <?php endforeach; ?>
    </section>

    <section class="sidebox compass">
      <h3>Mapa de Chronos</h3>
      <a class="topic-row" href="rutas.php"><strong>Rutas históricas</strong><small>Civilizaciones, épocas y memorias.</small></a>
      <a class="topic-row" href="explore.php?tipo=relatos"><strong>Relatos recientes</strong><small>Hallazgos publicados por la comunidad.</small></a>
      <a class="topic-row" href="explore.php?tipo=autores"><strong>Autores</strong><small>Legados públicos por descubrir.</small></a>
      <a class="text-link" href="rutas.php">Abrir mapa de rutas →</a>
    </section>
  </aside>
</main>
  <script src="assets/js/no_zoom.js?v=502"></script>
<script src="assets/js/social_actions.js?v=502"></script>
</body>
</html>
