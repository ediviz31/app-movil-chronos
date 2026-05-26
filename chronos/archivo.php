<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';
$temaUsuario = $usuario['tema_favorito'] ?: ($usuario['interes'] ?: 'Civilizaciones');
$pdo = chronos_pdo();
$usuarioId = (int)$usuario['id'];

// Privacidad estricta: este módulo siempre carga únicamente el archivo del usuario en sesión.
// Si alguien intenta pasar usuario_id/id_usuario por URL, se ignora y se redirige limpio.
if (isset($_GET['usuario_id']) || isset($_GET['id_usuario']) || isset($_GET['user'])) {
    header('Location: archivo.php');
    exit;
}

$busqueda = trim((string)($_GET['q'] ?? ''));
$categoriaFiltro = trim((string)($_GET['categoria'] ?? ''));
$orden = (string)($_GET['orden'] ?? 'recientes');
$ordenesPermitidos = ['recientes', 'antiguos', 'relato_reciente', 'titulo'];
if (!in_array($orden, $ordenesPermitidos, true)) {
    $orden = 'recientes';
}

$stmtCategorias = $pdo->prepare("SELECT DISTINCT p.categoria
    FROM archivados a
    INNER JOIN publicaciones p ON p.id = a.publicacion_id
    WHERE a.usuario_id = ?
    ORDER BY p.categoria ASC");
$stmtCategorias->execute([$usuarioId]);
$categoriasArchivo = array_values(array_filter(array_map(static fn($fila) => (string)$fila['categoria'], $stmtCategorias->fetchAll())));

$stmtResumen = $pdo->prepare("SELECT
        COUNT(*) AS total,
        COUNT(DISTINCT p.usuario_id) AS autores,
        COUNT(DISTINCT p.categoria) AS categorias
    FROM archivados a
    INNER JOIN publicaciones p ON p.id = a.publicacion_id
    WHERE a.usuario_id = ?");
$stmtResumen->execute([$usuarioId]);
$resumenArchivo = $stmtResumen->fetch() ?: ['total' => 0, 'autores' => 0, 'categorias' => 0];
$totalPreservados = (int)($resumenArchivo['total'] ?? 0);
$totalAutoresArchivo = (int)($resumenArchivo['autores'] ?? 0);
$totalCategoriasArchivo = (int)($resumenArchivo['categorias'] ?? 0);

$where = ['a.usuario_id = ?'];
$params = [$usuarioId];

if ($busqueda !== '') {
    $where[] = '(p.titulo LIKE ? OR p.contenido LIKE ? OR p.categoria LIKE ? OR u.nombre LIKE ? OR u.usuario LIKE ? OR u.interes LIKE ? OR u.tema_favorito LIKE ?)';
    $like = '%' . $busqueda . '%';
    array_push($params, $like, $like, $like, $like, $like, $like, $like);
}

if ($categoriaFiltro !== '') {
    $where[] = 'p.categoria = ?';
    $params[] = $categoriaFiltro;
}

$orderSql = 'a.creado_en DESC';
if ($orden === 'antiguos') {
    $orderSql = 'a.creado_en ASC';
} elseif ($orden === 'relato_reciente') {
    $orderSql = 'p.creado_en DESC';
} elseif ($orden === 'titulo') {
    $orderSql = 'p.titulo ASC';
}

$sqlPreservados = "SELECT p.id, p.usuario_id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        u.nombre, u.usuario, u.avatar, u.tema_favorito, u.interes,
        a.creado_en AS archivado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados ar WHERE ar.publicacion_id = p.id) AS total_archivos,
        (SELECT COUNT(*) FROM ecos eu WHERE eu.publicacion_id = p.id AND eu.usuario_id = ?) AS usuario_dio_eco
    FROM archivados a
    INNER JOIN publicaciones p ON p.id = a.publicacion_id
    INNER JOIN usuarios u ON u.id = p.usuario_id
    WHERE " . implode(' AND ', $where) . "
    ORDER BY {$orderSql}
    LIMIT 80";
$stmtPreservados = $pdo->prepare($sqlPreservados);
$stmtPreservados->execute(array_merge([$usuarioId], $params));
$archivados = $stmtPreservados->fetchAll();
$totalResultados = count($archivados);
$tieneFiltros = $busqueda !== '' || $categoriaFiltro !== '' || $orden !== 'recientes';

$mensaje = mensaje_auth_vacio();
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
  <title>Chronos · Archivo privado</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell archive-shell private-archive-v140">
  <section class="profile-hero-card archive-hero-card archive-private-hero">
    <div class="profile-hero-cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
    <div class="profile-hero-content">
      <img class="profile-hero-avatar" src="<?= e($avatarUsuario) ?>" alt="Avatar">
      <div class="profile-hero-main">
        <span class="kicker"><i class="ri-lock-2-line"></i> Espacio privado</span>
        <h1>Mi Archivo Histórico</h1>
        <p>@<?= e($aliasUsuario) ?> · <?= e($temaUsuario) ?></p>
        <p class="profile-bio">Aquí conservas relatos para volver a leerlos después. Este archivo no aparece en tu perfil público y nadie puede verlo aunque siga tu legado.</p>
      </div>
      <div class="profile-hero-actions archive-privacy-actions">
        <span class="archive-privacy-pill"><i class="ri-shield-check-line"></i> Solo visible para ti</span>
        <a class="head-btn" href="feed.php"><i class="ri-home-5-line"></i> Línea del tiempo</a>
        <a class="auth-secondary profile-logout" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar</a>
      </div>
    </div>
    <div class="profile-hero-stats archive-private-stats">
      <div><strong><?= e((string)$totalPreservados) ?></strong><span>Guardados privados</span></div>
      <div><strong><?= e((string)$totalAutoresArchivo) ?></strong><span>Autores conservados</span></div>
      <div><strong><?= e((string)$totalCategoriasArchivo) ?></strong><span>Temas guardados</span></div>
      <div><strong><i class="ri-lock-2-line"></i></strong><span>No público</span></div>
    </div>
  </section>

  <section class="archive-privacy-note">
    <div>
      <i class="ri-lock-password-line"></i>
      <strong>Privacidad primero</strong>
    </div>
    <p>Guardar un relato aquí no lo comparte con seguidores ni lo muestra en tu perfil público. Chronos siempre carga este archivo usando tu sesión actual, no por enlaces de otros usuarios.</p>
  </section>

  <section class="profile-posts archive-posts">
    <?= $mensaje ?>
    <div class="feed-head profile-mini-head archive-mini-head">
      <div>
        <span class="kicker">Biblioteca personal</span>
        <h1>Relatos guardados</h1>
        <p>Busca por título, autor o ruta histórica, y quita del archivo lo que ya no quieras conservar.</p>
      </div>
      <a class="head-btn" href="feed.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar más</a>
    </div>

    <form class="archive-filter-panel" action="archivo.php" method="get">
      <label>
        <span>Buscar en mi archivo</span>
        <input type="search" name="q" value="<?= e($busqueda) ?>" placeholder="Título, autor, usuario, tema o palabra clave">
      </label>
      <label>
        <span>Ruta histórica</span>
        <select name="categoria">
          <option value="">Todas las rutas</option>
          <?php foreach ($categoriasArchivo as $categoria): ?>
            <option value="<?= e($categoria) ?>" <?= $categoriaFiltro === $categoria ? 'selected' : '' ?>><?= e($categoria) ?></option>
          <?php endforeach; ?>
        </select>
      </label>
      <label>
        <span>Orden</span>
        <select name="orden">
          <option value="recientes" <?= $orden === 'recientes' ? 'selected' : '' ?>>Guardados recientes</option>
          <option value="antiguos" <?= $orden === 'antiguos' ? 'selected' : '' ?>>Guardados antiguos</option>
          <option value="relato_reciente" <?= $orden === 'relato_reciente' ? 'selected' : '' ?>>Relatos más nuevos</option>
          <option value="titulo" <?= $orden === 'titulo' ? 'selected' : '' ?>>Título A-Z</option>
        </select>
      </label>
      <div class="archive-filter-actions">
        <button class="head-btn" type="submit"><i class="ri-search-line"></i> Filtrar</button>
        <?php if ($tieneFiltros): ?><a class="auth-secondary compact-link" href="archivo.php"><i class="ri-close-circle-line"></i> Limpiar</a><?php endif; ?>
      </div>
    </form>

    <?php if ($tieneFiltros): ?>
      <div class="archive-results-summary"><i class="ri-filter-3-line"></i> <?= (int)$totalResultados ?> resultado<?= $totalResultados === 1 ? '' : 's' ?> dentro de tu archivo privado.</div>
    <?php endif; ?>

    <?php if (!empty($archivados)): ?>
      <section class="profile-real-list archive-real-list">
        <?php foreach ($archivados as $relato): ?>
          <?php
            $relatoAvatar = $relato['avatar'] ?: 'assets/img/avatar.svg';
            $autorPerfilUrl = ((int)$relato['usuario_id'] === $usuarioId) ? 'perfil.php' : ('autor.php?id=' . (int)$relato['usuario_id']);
            $rutaInfoRelato = chronos_ruta_info($relato['categoria'] ?? '');
          ?>
          <article class="post real-post profile-story-card archive-story-card archive-private-card">
            <div class="post-head">
              <a class="author-mini-link" href="<?= e($autorPerfilUrl) ?>"><img class="post-user-img" src="<?= e($relatoAvatar) ?>" alt="Avatar"></a>
              <div><strong><a class="author-name-link" href="<?= e($autorPerfilUrl) ?>"><?= e($relato['nombre']) ?></a> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relato['categoria']) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relato['categoria']) ?></a></strong><small>@<?= e($relato['usuario']) ?> · Guardado <?= e(chronos_fecha_relativa($relato['archivado_en'])) ?></small></div>
              <div class="private-badge-mini"><i class="ri-lock-2-line"></i> Privado</div>
            </div>
            <h2><a class="story-title-link" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></h2>
            <p><?= nl2br(e(chronos_resumen($relato['contenido'], 430))) ?></p>
            <?php if (!empty($relato['imagen'])): ?>
              <a class="post-img" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"></a>
            <?php endif; ?>
            <div class="post-actions story-actions archive-card-actions">
              <span class="<?= ((int)($relato['usuario_dio_eco'] ?? 0) > 0) ? 'active-action' : '' ?>"><span class="chronos-ui-icon icon-eco" aria-hidden="true"></span><?= (int)($relato['total_ecos'] ?? 0) ?> ecos</span>
              <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>#comentarios"><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span><?= (int)($relato['total_comentarios'] ?? 0) ?> comentarios</a>
              <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><i class="ri-eye-line"></i>Ver relato</a>
                <button type="button" class="story-inline-action chronos-diffuse-btn" data-copy-path="relato_ver.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-compartir" aria-hidden="true"></span>Difundir</button>
                <?php if ((int)$relato['usuario_id'] !== (int)$usuario['id']): ?><a class="story-inline-action report-inline-action" href="reportar.php?tipo=relato&id=<?= (int)$relato['id'] ?>"><i class="ri-flag-line"></i>Reportar</a><?php endif; ?>
              <form class="inline-action-form" method="post" action="archivo_toggle.php">
                <input type="hidden" name="id" value="<?= (int)$relato['id'] ?>">
                <input type="hidden" name="volver" value="archivo">
                <button type="submit" class="story-inline-action active-action"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span>Quitar del Archivo</button>
              </form>
            </div>
          </article>
        <?php endforeach; ?>
      </section>
    <?php elseif ($tieneFiltros && $totalPreservados > 0): ?>
      <section class="profile-empty-state archive-empty-state">
        <div class="profile-empty-visual">
          <img src="assets/icons/explorar.webp" alt="Sin resultados">
          <div class="empty-glow"></div>
        </div>
        <div class="profile-empty-copy">
          <span class="mini-label">Sin coincidencias</span>
          <h3>No encontramos relatos con esos filtros.</h3>
          <p>Tu archivo sigue siendo privado. Prueba con otra palabra, otro tema o limpia los filtros.</p>
          <a class="head-btn profile-empty-btn" href="archivo.php"><i class="ri-close-circle-line"></i> Limpiar filtros</a>
        </div>
      </section>
    <?php else: ?>
      <section class="profile-empty-state archive-empty-state">
        <div class="profile-empty-visual">
          <img src="assets/icons/archivar.webp" alt="Archivo personal">
          <div class="empty-glow"></div>
        </div>
        <div class="profile-empty-copy">
          <span class="mini-label">Archivo privado vacío</span>
          <h3>Aún no has guardado relatos.</h3>
          <p>Cuando encuentres una crónica que quieras conservar, toca <strong>Preservar</strong>. Quedará guardada aquí solo para ti.</p>
          <a class="head-btn profile-empty-btn" href="feed.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar relatos</a>
        </div>
      </section>
    <?php endif; ?>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
<script src="assets/js/social_actions.js?v=502"></script>
</body>
</html>
