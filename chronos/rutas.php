<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();

$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$temaUsuario = $usuario['tema_favorito'] ?: ($usuario['interes'] ?: 'Civilizaciones');
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);

$rutaSeleccionada = trim((string)($_GET['ruta'] ?? ''));
$catalogo = chronos_rutas_catalogo();

$stmtConteos = $pdo->query("SELECT categoria, COUNT(*) AS total_relatos, COUNT(DISTINCT usuario_id) AS total_autores, MAX(creado_en) AS ultimo_relato
    FROM publicaciones
    WHERE categoria <> ''
    GROUP BY categoria
    ORDER BY total_relatos DESC, categoria ASC");
$conteosDb = [];
foreach (($stmtConteos->fetchAll() ?: []) as $fila) {
    $conteosDb[(string)$fila['categoria']] = [
        'total_relatos' => (int)$fila['total_relatos'],
        'total_autores' => (int)$fila['total_autores'],
        'ultimo_relato' => $fila['ultimo_relato'],
    ];
}

$rutas = [];
foreach ($catalogo as $nombre => $info) {
    $rutas[$nombre] = $info + ($conteosDb[$nombre] ?? ['total_relatos' => 0, 'total_autores' => 0, 'ultimo_relato' => null]);
    $rutas[$nombre]['nombre'] = $nombre;
}
foreach ($conteosDb as $nombre => $conteo) {
    if (!isset($rutas[$nombre])) {
        $rutas[$nombre] = chronos_ruta_info($nombre) + $conteo;
    }
}

uasort($rutas, static function ($a, $b) {
    if ((int)$a['total_relatos'] === (int)$b['total_relatos']) {
        return strcmp((string)$a['nombre'], (string)$b['nombre']);
    }
    return (int)$b['total_relatos'] <=> (int)$a['total_relatos'];
});

$rutaActiva = $rutaSeleccionada !== '' ? chronos_ruta_info($rutaSeleccionada) : chronos_ruta_info(null);

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
if ($rutaSeleccionada !== '') {
    $sqlRelatos .= " WHERE p.categoria = ?";
    $paramsRelatos[] = $rutaSeleccionada;
}
$sqlRelatos .= " ORDER BY p.creado_en DESC LIMIT 24";
$stmtRelatos = $pdo->prepare($sqlRelatos);
$stmtRelatos->execute($paramsRelatos);
$relatos = $stmtRelatos->fetchAll() ?: [];

$sqlAutores = "SELECT u.id, u.nombre, u.usuario, u.avatar, u.portada, u.bio, u.tema_favorito, u.interes,
        COUNT(p.id) AS total_relatos_ruta,
        (SELECT COUNT(*) FROM publicaciones px WHERE px.usuario_id = u.id) AS total_relatos,
        (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS total_seguidores,
        (SELECT COUNT(*) FROM seguidores su WHERE su.seguidor_id = ? AND su.seguido_id = u.id) AS usuario_sigue
    FROM usuarios u
    INNER JOIN publicaciones p ON p.usuario_id = u.id";
$paramsAutores = [(int)$usuario['id']];
if ($rutaSeleccionada !== '') {
    $sqlAutores .= " WHERE p.categoria = ?";
    $paramsAutores[] = $rutaSeleccionada;
}
$sqlAutores .= " GROUP BY u.id, u.nombre, u.usuario, u.avatar, u.portada, u.bio, u.tema_favorito, u.interes
    ORDER BY total_relatos_ruta DESC, total_seguidores DESC, u.nombre ASC
    LIMIT 8";
$stmtAutores = $pdo->prepare($sqlAutores);
$stmtAutores->execute($paramsAutores);
$autoresRuta = $stmtAutores->fetchAll() ?: [];

$stmtTotales = $pdo->prepare("SELECT COUNT(*) AS total_relatos, COUNT(DISTINCT usuario_id) AS total_autores, COUNT(DISTINCT categoria) AS total_rutas FROM publicaciones" . ($rutaSeleccionada !== '' ? " WHERE categoria = ?" : ""));
$stmtTotales->execute($rutaSeleccionada !== '' ? [$rutaSeleccionada] : []);
$totales = $stmtTotales->fetch() ?: ['total_relatos' => 0, 'total_autores' => 0, 'total_rutas' => 0];

$mensaje = '';
if (isset($_GET['archivo'])) {
    if ($_GET['archivo'] === 'guardado') {
        $mensaje = mensaje_auth('success', 'Relato preservado en tu Archivo Histórico privado.');
    } elseif ($_GET['archivo'] === 'quitado') {
        $mensaje = mensaje_auth('info', 'Relato quitado de tu Archivo Histórico privado.');
    }
}
if (isset($_GET['seguir'])) {
    if ($_GET['seguir'] === 'alistado') {
        $mensaje = mensaje_auth('success', 'Ahora sigues este legado.');
    } elseif ($_GET['seguir'] === 'desalistado') {
        $mensaje = mensaje_auth('info', 'Dejaste de seguir este legado.');
    } elseif ($_GET['seguir'] === 'error') {
        $mensaje = mensaje_auth('error', 'No se pudo actualizar el seguimiento.');
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Rutas históricas</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="rutas-shell-v141">
  <section class="rutas-hero-v141">
    <div class="rutas-hero-map-v141"></div>
    <div class="rutas-hero-copy-v141">
      <span class="kicker"><i class="<?= e($rutaActiva['icono']) ?>"></i> <?= $rutaSeleccionada !== '' ? 'Ruta abierta' : 'Mapa de rutas' ?></span>
      <h1><?= e($rutaSeleccionada !== '' ? $rutaActiva['nombre'] : 'Rutas históricas de Chronos') ?></h1>
      <p><?= e($rutaActiva['descripcion']) ?></p>
      <div class="rutas-hero-actions-v141">
        <a class="head-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a>
        <?php if ($rutaSeleccionada !== ''): ?><a class="compact-link" href="rutas.php"><i class="ri-compass-discover-line"></i> Ver todas las rutas</a><?php endif; ?>
      </div>
    </div>
    <div class="rutas-hero-stats-v141">
      <div><strong><?= (int)$totales['total_relatos'] ?></strong><span>Relatos</span></div>
      <div><strong><?= (int)$totales['total_autores'] ?></strong><span>Autores</span></div>
      <div><strong><?= $rutaSeleccionada !== '' ? e($rutaActiva['epoca']) : (int)$totales['total_rutas'] ?></strong><span><?= $rutaSeleccionada !== '' ? 'Época / enfoque' : 'Rutas vivas' ?></span></div>
    </div>
  </section>

  <?php if ($mensaje): ?><?= $mensaje ?><?php endif; ?>

  <section class="rutas-layout-v141">
    <aside class="rutas-index-v141">
      <div class="rutas-panel-head-v141">
        <span class="mini-label">Catálogo</span>
        <h2>Rutas del relato</h2>
        <p>Son como categorías, pero con identidad histórica: civilización, época, lugar o memoria.</p>
      </div>
      <div class="rutas-list-v141">
        <?php foreach ($rutas as $ruta): ?>
          <a class="ruta-mini-card-v141 <?= $rutaSeleccionada === $ruta['nombre'] ? 'active' : '' ?>" href="rutas.php?ruta=<?= urlencode($ruta['nombre']) ?>">
            <span class="ruta-mini-icon-v141"><i class="<?= e($ruta['icono']) ?>"></i></span>
            <span><strong><?= e($ruta['nombre']) ?></strong><small><?= (int)$ruta['total_relatos'] ?> relatos · <?= e($ruta['epoca']) ?></small></span>
          </a>
        <?php endforeach; ?>
      </div>
    </aside>

    <section class="rutas-content-v141">
      <section class="rutas-section-head-v141">
        <div>
          <span class="mini-label"><?= $rutaSeleccionada !== '' ? 'Contenido conectado' : 'Rutas destacadas' ?></span>
          <h2><?= $rutaSeleccionada !== '' ? 'Relatos dentro de esta ruta' : 'Mapa vivo de la comunidad' ?></h2>
          <p><?= $rutaSeleccionada !== '' ? 'Todo lo publicado bajo esta ruta aparece conectado para que el usuario explore por tema y no solo por fecha.' : 'Cada tarjeta agrupa relatos reales de MySQL y prepara a Chronos para organizar mejor el contenido histórico.' ?></p>
        </div>
      </section>

      <?php if ($rutaSeleccionada === ''): ?>
        <div class="rutas-grid-v141">
          <?php foreach ($rutas as $ruta): ?>
            <a class="ruta-card-v141 ruta-color-<?= e($ruta['color']) ?>" href="rutas.php?ruta=<?= urlencode($ruta['nombre']) ?>">
              <span class="ruta-card-icon-v141"><i class="<?= e($ruta['icono']) ?>"></i></span>
              <div>
                <span><?= e($ruta['epoca']) ?></span>
                <strong><?= e($ruta['nombre']) ?></strong>
                <p><?= e($ruta['descripcion']) ?></p>
                <small><?= (int)$ruta['total_relatos'] ?> relatos · <?= (int)$ruta['total_autores'] ?> autores</small>
              </div>
              <i class="ri-arrow-right-up-line"></i>
            </a>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>

      <?php if ($rutaSeleccionada !== ''): ?>
        <?php if (!empty($autoresRuta)): ?>
          <section class="rutas-authors-v141">
            <div class="rutas-section-head-v141 compact">
              <div><span class="mini-label">Autores de la ruta</span><h2>Exploradores relacionados</h2></div>
            </div>
            <div class="rutas-author-grid-v141">
              <?php foreach ($autoresRuta as $autor): ?>
                <?php $autorUrl = ((int)$autor['id'] === (int)$usuario['id']) ? 'perfil.php' : ('autor.php?id=' . (int)$autor['id']); ?>
                <article class="rutas-author-card-v141">
                  <a href="<?= e($autorUrl) ?>"><img src="<?= e($autor['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar"></a>
                  <div><strong><a href="<?= e($autorUrl) ?>"><?= e($autor['nombre']) ?></a></strong><small>@<?= e($autor['usuario']) ?> · <?= (int)$autor['total_relatos_ruta'] ?> en esta ruta</small></div>
                  <?php if ((int)$autor['id'] !== (int)$usuario['id']): ?>
                    <form method="post" action="seguir_toggle.php">
                      <input type="hidden" name="seguido_id" value="<?= (int)$autor['id'] ?>">
                      <input type="hidden" name="volver" value="rutas">
                      <input type="hidden" name="ruta" value="<?= e($rutaSeleccionada) ?>">
                      <input type="hidden" name="accion" value="<?= ((int)$autor['usuario_sigue'] > 0) ? 'desalistar' : 'alistar' ?>">
                      <button class="follow <?= ((int)$autor['usuario_sigue'] > 0) ? 'is-following' : '' ?>" type="submit"><?= ((int)$autor['usuario_sigue'] > 0) ? 'Siguiendo' : 'Seguir' ?></button>
                    </form>
                  <?php endif; ?>
                </article>
              <?php endforeach; ?>
            </div>
          </section>
        <?php endif; ?>
      <?php endif; ?>

      <?php if (!empty($relatos)): ?>
        <section class="rutas-relatos-v141">
          <?php foreach ($relatos as $relato): ?>
            <?php
              $relatoAvatar = $relato['avatar'] ?: 'assets/img/avatar.svg';
              $relatoCategoria = $relato['categoria'] ?: ($relato['tema_favorito'] ?: ($relato['interes'] ?: 'Historia'));
              $autorPerfilUrl = ((int)$relato['usuario_id'] === (int)$usuario['id']) ? 'perfil.php' : ('autor.php?id=' . (int)$relato['usuario_id']);
              $rutaInfoRelato = chronos_ruta_info($relatoCategoria);
            ?>
            <article class="post real-post ruta-relato-card-v141">
              <div class="post-head">
                <a class="author-mini-link" href="<?= e($autorPerfilUrl) ?>"><img class="post-user-img" src="<?= e($relatoAvatar) ?>" alt="Avatar"></a>
                <div><strong><a class="author-name-link" href="<?= e($autorPerfilUrl) ?>"><?= e($relato['nombre']) ?></a> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relatoCategoria) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relatoCategoria) ?></a></strong><small>@<?= e($relato['usuario']) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?></small></div>
                <div class="post-menu">···</div>
              </div>
              <h2><a class="story-title-link" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></h2>
              <p><?= nl2br(e(chronos_resumen($relato['contenido'], 360))) ?></p>
              <?php if (!empty($relato['imagen'])): ?><a class="post-img" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"></a><?php endif; ?>
              <div class="post-actions story-actions">
                <span class="<?= ((int)($relato['usuario_dio_eco'] ?? 0) > 0) ? 'active-action' : '' ?>"><span class="chronos-ui-icon icon-eco" aria-hidden="true"></span><?= (int)($relato['total_ecos'] ?? 0) ?> ecos</span>
                <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>#comentarios"><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span><?= (int)($relato['total_comentarios'] ?? 0) ?> comentarios</a>
                <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><i class="ri-eye-line"></i>Ver completo</a>
                <button type="button" class="story-inline-action chronos-diffuse-btn" data-copy-path="relato_ver.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-compartir" aria-hidden="true"></span>Difundir</button>
                <?php if ((int)$relato['usuario_id'] !== (int)$usuario['id']): ?><a class="story-inline-action report-inline-action" href="reportar.php?tipo=relato&id=<?= (int)$relato['id'] ?>"><i class="ri-flag-line"></i>Reportar</a><?php endif; ?>
                <form class="inline-action-form" method="post" action="archivo_toggle.php">
                  <input type="hidden" name="id" value="<?= (int)$relato['id'] ?>">
                  <input type="hidden" name="volver" value="rutas">
                  <input type="hidden" name="ruta" value="<?= e($rutaSeleccionada) ?>">
                  <button type="submit" class="story-inline-action <?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'active-action' : '' ?>"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span><?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'Preservado' : 'Preservar' ?></button>
                </form>
              </div>
            </article>
          <?php endforeach; ?>
        </section>
      <?php else: ?>
        <section class="profile-empty-state archive-empty-state rutas-empty-v141">
          <div class="profile-empty-visual"><img src="assets/img/post-map.svg" alt="Ruta vacía"><div class="empty-glow"></div></div>
          <div class="profile-empty-copy">
            <span class="mini-label">Ruta por iniciar</span>
            <h3>Aún no hay relatos en esta ruta.</h3>
            <p>Chronos empieza a formar su mapa cuando alguien publica el primer relato con esta ruta histórica.</p>
            <a class="head-btn profile-empty-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a>
          </div>
        </section>
      <?php endif; ?>
    </section>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
<script src="assets/js/social_actions.js?v=502"></script>
</body>
</html>
