<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();

$usuarioId = (int)$usuario['id'];
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$bioUsuario = $usuario['bio'] ?: 'Explorador de historias';
$temaUsuario = $usuario['tema_favorito'] ?: ($usuario['interes'] ?: 'Civilizaciones');
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos($usuarioId);

$mensaje = mensaje_auth_vacio();
if (isset($_GET['actualizado'])) {
    $mensaje = mensaje_auth('success', 'Tu legado se actualizó correctamente.');
} elseif (isset($_GET['relato'])) {
    if ($_GET['relato'] === 'editado') {
        $mensaje = mensaje_auth('success', 'Tu relato se actualizó correctamente.');
    } elseif ($_GET['relato'] === 'eliminado') {
        $mensaje = mensaje_auth('success', 'Tu relato se eliminó correctamente.');
    } elseif ($_GET['relato'] === 'creado') {
        $mensaje = mensaje_auth('success', 'Tu relato ya forma parte de tu legado público.');
    }
} elseif (isset($_GET['archivo'])) {
    if ($_GET['archivo'] === 'guardado') {
        $mensaje = mensaje_auth('success', 'Relato preservado en tu Archivo Histórico privado. Solo tú puedes verlo aquí.');
    } elseif ($_GET['archivo'] === 'quitado') {
        $mensaje = mensaje_auth('info', 'Relato quitado de tu Archivo Histórico privado.');
    }
}

$stmtTotalRelatos = $pdo->prepare('SELECT COUNT(*) FROM publicaciones WHERE usuario_id = ?');
$stmtTotalRelatos->execute([$usuarioId]);
$totalRelatosUsuario = (int)$stmtTotalRelatos->fetchColumn();

$stmtEcosRecibidos = $pdo->prepare('SELECT COUNT(*) FROM ecos e INNER JOIN publicaciones p ON p.id = e.publicacion_id WHERE p.usuario_id = ?');
$stmtEcosRecibidos->execute([$usuarioId]);
$totalEcosRecibidos = (int)$stmtEcosRecibidos->fetchColumn();

$stmtComentariosRecibidos = $pdo->prepare('SELECT COUNT(*) FROM comentarios c INNER JOIN publicaciones p ON p.id = c.publicacion_id WHERE p.usuario_id = ?');
$stmtComentariosRecibidos->execute([$usuarioId]);
$totalComentariosRecibidos = (int)$stmtComentariosRecibidos->fetchColumn();

$stmtPreservadosUsuario = $pdo->prepare('SELECT COUNT(*) FROM archivados WHERE usuario_id = ?');
$stmtPreservadosUsuario->execute([$usuarioId]);
$totalPreservadosUsuario = (int)$stmtPreservadosUsuario->fetchColumn();

$stmtSeguidores = $pdo->prepare('SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?');
$stmtSeguidores->execute([$usuarioId]);
$totalSeguidores = (int)$stmtSeguidores->fetchColumn();

$stmtSiguiendo = $pdo->prepare('SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?');
$stmtSiguiendo->execute([$usuarioId]);
$totalSiguiendo = (int)$stmtSiguiendo->fetchColumn();

$stmtRutasUsuario = $pdo->prepare("SELECT p.categoria,
        COUNT(*) AS total_relatos,
        (SELECT COUNT(*) FROM ecos e INNER JOIN publicaciones px ON px.id = e.publicacion_id WHERE px.usuario_id = ? AND px.categoria = p.categoria) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c INNER JOIN publicaciones py ON py.id = c.publicacion_id WHERE py.usuario_id = ? AND py.categoria = p.categoria) AS total_comentarios,
        MAX(p.creado_en) AS ultimo_relato
    FROM publicaciones p
    WHERE p.usuario_id = ?
    GROUP BY p.categoria
    ORDER BY total_relatos DESC, ultimo_relato DESC");
$stmtRutasUsuario->execute([$usuarioId, $usuarioId, $usuarioId]);
$rutasUsuario = $stmtRutasUsuario->fetchAll();
$totalRutasUsuario = count($rutasUsuario);
$rutaMasUsada = $rutasUsuario[0]['categoria'] ?? $temaUsuario;

$vista = $_GET['vista'] ?? 'relatos';
$vista = in_array($vista, ['relatos', 'rutas', 'actividad'], true) ? $vista : 'relatos';
$rutaActiva = trim($_GET['ruta'] ?? '');

$sqlRelatos = "SELECT p.id, p.usuario_id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios
    FROM publicaciones p
    WHERE p.usuario_id = ?";
$paramsRelatos = [$usuarioId];
if ($rutaActiva !== '') {
    $sqlRelatos .= ' AND p.categoria = ?';
    $paramsRelatos[] = $rutaActiva;
}
$sqlRelatos .= ' ORDER BY p.creado_en DESC LIMIT 30';
$stmtRelatosUsuario = $pdo->prepare($sqlRelatos);
$stmtRelatosUsuario->execute($paramsRelatos);
$relatosUsuario = $stmtRelatosUsuario->fetchAll();

$stmtComentariosRecientes = $pdo->prepare("SELECT c.id, c.contenido, c.creado_en,
        p.id AS publicacion_id, p.titulo,
        u.id AS actor_id, u.nombre, u.usuario, u.avatar
    FROM comentarios c
    INNER JOIN publicaciones p ON p.id = c.publicacion_id
    INNER JOIN usuarios u ON u.id = c.usuario_id
    WHERE p.usuario_id = ? AND c.usuario_id <> ?
    ORDER BY c.creado_en DESC
    LIMIT 6");
$stmtComentariosRecientes->execute([$usuarioId, $usuarioId]);
$comentariosRecientes = $stmtComentariosRecientes->fetchAll();

$stmtEcosRecientes = $pdo->prepare("SELECT e.creado_en,
        p.id AS publicacion_id, p.titulo,
        u.id AS actor_id, u.nombre, u.usuario, u.avatar
    FROM ecos e
    INNER JOIN publicaciones p ON p.id = e.publicacion_id
    INNER JOIN usuarios u ON u.id = e.usuario_id
    WHERE p.usuario_id = ? AND e.usuario_id <> ?
    ORDER BY e.creado_en DESC
    LIMIT 6");
$stmtEcosRecientes->execute([$usuarioId, $usuarioId]);
$ecosRecientes = $stmtEcosRecientes->fetchAll();

$stmtRelatoDestacado = $pdo->prepare("SELECT p.id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados a WHERE a.publicacion_id = p.id) AS total_archivos
    FROM publicaciones p
    WHERE p.usuario_id = ?
    ORDER BY (total_ecos + total_comentarios + total_archivos) DESC, p.creado_en DESC
    LIMIT 1");
$stmtRelatoDestacado->execute([$usuarioId]);
$relatoDestacado = $stmtRelatoDestacado->fetch();
$insigniaLegado = chronos_insignia_legado($totalRelatosUsuario, $totalRutasUsuario, $totalEcosRecibidos + $totalComentariosRecibidos);

$rutasTextoUsuario = implode('||', array_map(static fn($ruta) => (string)($ruta['categoria'] ?? ''), $rutasUsuario));
$especialidadUsuario = chronos_especialidad_autor([
    'tema_favorito' => $temaUsuario,
    'interes' => $usuario['interes'] ?? '',
    'rutas_autor' => $rutasTextoUsuario,
]);
$estadoLegadoUsuario = chronos_estado_legado_texto($totalRelatosUsuario, $totalRutasUsuario, $totalEcosRecibidos + $totalComentariosRecibidos);
$insigniasBasicasUsuario = chronos_insignias_basicas($totalRelatosUsuario, $totalRutasUsuario, $totalEcosRecibidos, $totalComentariosRecibidos, $totalSeguidores, $totalPreservadosUsuario);

$stmtRelatosDestacados = $pdo->prepare("SELECT p.id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        (SELECT COUNT(*) FROM ecos e WHERE e.publicacion_id = p.id) AS total_ecos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.publicacion_id = p.id) AS total_comentarios,
        (SELECT COUNT(*) FROM archivados a WHERE a.publicacion_id = p.id) AS total_archivos
    FROM publicaciones p
    WHERE p.usuario_id = ?
    ORDER BY (total_ecos + total_comentarios + total_archivos) DESC, p.creado_en DESC
    LIMIT 3");
$stmtRelatosDestacados->execute([$usuarioId]);
$relatosDestacadosUsuario = $stmtRelatosDestacados->fetchAll() ?: [];

$stmtSeguidoresRecientes = $pdo->prepare("SELECT u.id, u.nombre, u.usuario, u.avatar, u.tema_favorito, u.interes, s.creado_en
    FROM seguidores s
    INNER JOIN usuarios u ON u.id = s.seguidor_id
    WHERE s.seguido_id = ?
    ORDER BY s.creado_en DESC
    LIMIT 4");
$stmtSeguidoresRecientes->execute([$usuarioId]);
$seguidoresRecientes = $stmtSeguidoresRecientes->fetchAll() ?: [];

$stmtSiguiendoRecientes = $pdo->prepare("SELECT u.id, u.nombre, u.usuario, u.avatar, u.tema_favorito, u.interes, s.creado_en
    FROM seguidores s
    INNER JOIN usuarios u ON u.id = s.seguido_id
    WHERE s.seguidor_id = ?
    ORDER BY s.creado_en DESC
    LIMIT 4");
$stmtSiguiendoRecientes->execute([$usuarioId]);
$siguiendoRecientes = $stmtSiguiendoRecientes->fetchAll() ?: [];

$perfilChecks = [
    'Foto de perfil' => !empty($usuario['avatar']),
    'Portada' => !empty($usuario['portada']),
    'Biografía' => !empty($usuario['bio']),
    'Tema favorito' => !empty($temaUsuario),
    'Primer relato' => $totalRelatosUsuario > 0,
];
$perfilCompletos = count(array_filter($perfilChecks));
$perfilTotal = count($perfilChecks);
$porcentajePerfil = (int)(($perfilCompletos / max(1, $perfilTotal)) * 100);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Mi legado</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell profile-v142-shell">
  <section class="profile-hero-card profile-legacy-hero-v142">
    <div class="profile-hero-cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
    <div class="profile-hero-content">
      <img class="profile-hero-avatar" src="<?= e($avatarUsuario) ?>" alt="Avatar">
      <div class="profile-hero-main">
        <span class="kicker"><i class="ri-quill-pen-line"></i> Centro de mi legado</span>
        <h1><?= e($nombreUsuario) ?></h1>
        <p>@<?= e($aliasUsuario) ?> · <?= e($temaUsuario) ?></p>
        <p class="profile-bio"><?= e($bioUsuario) ?></p>
        <div class="legacy-badge-v150"><i class="<?= e($insigniaLegado['icono']) ?>"></i><span><strong><?= e($insigniaLegado['titulo']) ?></strong><small><?= e($insigniaLegado['descripcion']) ?></small></span></div>
        <div class="legacy-specialty-v151"><i class="ri-focus-3-line"></i><span>Especialidad histórica</span><strong><?= e($especialidadUsuario) ?></strong></div>
      </div>
      <div class="profile-hero-actions profile-actions-v142">
        <a class="head-btn" href="relato.php"><i class="ri-add-line"></i> Crear relato</a>
        <a class="auth-secondary profile-public-btn-v142" href="autor.php?id=<?= $usuarioId ?>"><i class="ri-eye-line"></i> Ver vista pública</a>
        <a class="auth-secondary profile-logout" href="logout.php"><i class="ri-logout-circle-line"></i> Cerrar sesión</a>
      </div>
    </div>
    <div class="profile-hero-stats profile-hero-stats-v142">
      <a href="perfil.php?vista=relatos"><strong><?= e((string)$totalRelatosUsuario) ?></strong><span>Relatos</span></a>
      <a href="perfil.php?vista=rutas"><strong><?= e((string)$totalRutasUsuario) ?></strong><span>Rutas</span></a>
      <a href="legados.php?tab=seguidores"><strong><?= e((string)$totalSeguidores) ?></strong><span>Seguidores</span></a>
      <a href="legados.php?tab=siguiendo"><strong><?= e((string)$totalSiguiendo) ?></strong><span>Siguiendo</span></a>
      <a href="perfil.php?vista=actividad"><strong><?= e((string)$totalEcosRecibidos) ?></strong><span>Ecos</span></a>
      <a href="archivo.php"><strong><?= e((string)$totalPreservadosUsuario) ?></strong><span>Archivo privado</span></a>
    </div>
    <div class="profile-quick-actions profile-quick-actions-v142">
      <a href="perfil_inicial.php"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span><span><strong>Editar identidad</strong><small>Foto, portada, biografía e interés</small></span></a>
      <a href="autor.php?id=<?= $usuarioId ?>"><i class="ri-user-star-line"></i><span><strong>Vista pública</strong><small>Así ven otros tu legado</small></span></a>
      <a href="rutas.php"><i class="ri-compass-3-line"></i><span><strong>Mapa de rutas</strong><small>Civilizaciones y épocas activas</small></span></a>
      <a href="archivo.php"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span><span><strong>Archivo privado</strong><small>Solo visible para ti</small></span></a>
    </div>
  </section>

  <section class="profile-content-grid profile-content-grid-v142">
    <aside class="profile-about sidebox profile-identity-v142">
      <h3><i class="ri-user-star-line"></i> Identidad del explorador</h3>
      <?= $mensaje ?>
      <div class="profile-progress">
        <div class="profile-progress-head"><span>Fuerza del perfil</span><strong><?= $perfilCompletos ?>/<?= $perfilTotal ?></strong></div>
        <div class="profile-progress-bar"><span style="width:<?= $porcentajePerfil ?>%"></span></div>
        <div class="profile-checks">
          <?php foreach ($perfilChecks as $label => $ok): ?>
            <div class="<?= $ok ? 'ok' : '' ?>"><i class="<?= $ok ? 'ri-check-line' : 'ri-time-line' ?>"></i> <?= e($label) ?></div>
          <?php endforeach; ?>
        </div>
      </div>

      <div class="profile-privacy-note-v142">
        <i class="ri-lock-2-line"></i>
        <div><strong>Tu Archivo Histórico es privado.</strong><span>El perfil muestra tu legado público; tus guardados solo aparecen para ti.</span></div>
      </div>

      <div class="profile-codex-card-v151">
        <span class="mini-label"><i class="ri-book-2-line"></i> Códice personal</span>
        <h3><?= e($estadoLegadoUsuario) ?></h3>
        <p>Tu perfil funciona como carta de presentación ante otros cronistas: muestra lo público, protege lo privado y resume tu ruta dentro de Chronos.</p>
        <div><span>Especialidad</span><strong><?= e($especialidadUsuario) ?></strong></div>
        <div><span>Ruta dominante</span><strong><?= e($rutaMasUsada) ?></strong></div>
      </div>

      <div class="profile-featured-v150">
        <span class="mini-label"><i class="ri-sparkling-2-line"></i> Relato destacado</span>
        <?php if ($relatoDestacado): ?>
          <?php $rutaDestacada = chronos_ruta_info($relatoDestacado['categoria'] ?? ''); ?>
          <a href="relato_ver.php?id=<?= (int)$relatoDestacado['id'] ?>">
            <strong><?= e($relatoDestacado['titulo']) ?></strong>
            <small><i class="<?= e($rutaDestacada['icono']) ?>"></i> <?= e($relatoDestacado['categoria']) ?> · <?= (int)$relatoDestacado['total_ecos'] ?> ecos · <?= (int)$relatoDestacado['total_comentarios'] ?> comentarios</small>
          </a>
        <?php else: ?>
          <p>Publica tu primera crónica para que Chronos pueda destacar una pieza de tu legado.</p>
        <?php endif; ?>
      </div>

      <div class="profile-info-row"><span>Nombre</span><strong><?= e($nombreUsuario) ?></strong></div>
      <div class="profile-info-row"><span>Usuario</span><strong>@<?= e($aliasUsuario) ?></strong></div>
      <div class="profile-info-row"><span>Correo</span><strong><?= e($usuario['correo']) ?></strong></div>
      <div class="profile-info-row"><span>Ruta principal</span><strong><?= e($rutaMasUsada) ?></strong></div>
      <div class="profile-info-row"><span>Interés personal</span><strong><?= e($temaUsuario) ?></strong></div>
      <a class="create-side profile-create" href="perfil_inicial.php"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span> Editar mi identidad</a>
    </aside>

    <section class="profile-posts profile-main-v142">
      <div class="profile-overview-v142">
        <article>
          <span><i class="ri-scroll-line"></i></span>
          <div><strong><?= (int)$totalRelatosUsuario ?></strong><small>relatos publicados</small></div>
        </article>
        <article>
          <span><i class="ri-compass-3-line"></i></span>
          <div><strong><?= (int)$totalRutasUsuario ?></strong><small>rutas exploradas</small></div>
        </article>
        <article>
          <span><i class="ri-chat-smile-2-line"></i></span>
          <div><strong><?= (int)($totalEcosRecibidos + $totalComentariosRecibidos) ?></strong><small>interacciones recibidas</small></div>
        </article>
        <article>
          <span><i class="<?= e($insigniaLegado['icono']) ?>"></i></span>
          <div><strong><?= e($insigniaLegado['titulo']) ?></strong><small>insignia actual</small></div>
        </article>
      </div>

      <section class="profile-codex-grid-v151">
        <article class="profile-codex-panel-v151">
          <span class="mini-label"><i class="ri-shield-star-line"></i> Insignias del legado</span>
          <h3>Reconocimientos iniciales</h3>
          <p>Estas señales muestran el avance de tu perfil sin convertirlo en competencia vacía.</p>
          <div class="profile-badges-v151">
            <?php foreach ($insigniasBasicasUsuario as $insigniaItem): ?>
              <?php if (!empty($insigniaItem['privada'])) continue; ?>
              <div class="profile-badge-token-v151 <?= !empty($insigniaItem['activa']) ? 'is-active' : 'is-locked' ?>">
                <i class="<?= e($insigniaItem['icono']) ?>"></i>
                <span><strong><?= e($insigniaItem['titulo']) ?></strong><small><?= e($insigniaItem['descripcion']) ?></small></span>
              </div>
            <?php endforeach; ?>
          </div>
        </article>

        <article class="profile-codex-panel-v151 profile-network-panel-v151">
          <span class="mini-label"><i class="ri-group-line"></i> Consejo cercano</span>
          <h3>Movimiento alrededor de tu legado</h3>
          <div class="profile-mini-people-v151">
            <div>
              <strong>Últimos seguidores</strong>
              <?php if (!empty($seguidoresRecientes)): ?>
                <?php foreach ($seguidoresRecientes as $persona): ?>
                  <a href="autor.php?id=<?= (int)$persona['id'] ?>"><img src="<?= e($persona['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar"><span><?= e($persona['nombre'] ?: $persona['usuario']) ?><small>@<?= e($persona['usuario']) ?></small></span></a>
                <?php endforeach; ?>
              <?php else: ?>
                <p>Aún no hay seguidores recientes.</p>
              <?php endif; ?>
            </div>
            <div>
              <strong>Legados que sigues</strong>
              <?php if (!empty($siguiendoRecientes)): ?>
                <?php foreach ($siguiendoRecientes as $persona): ?>
                  <a href="autor.php?id=<?= (int)$persona['id'] ?>"><img src="<?= e($persona['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar"><span><?= e($persona['nombre'] ?: $persona['usuario']) ?><small><?= e($persona['tema_favorito'] ?: $persona['interes'] ?: '@' . $persona['usuario']) ?></small></span></a>
                <?php endforeach; ?>
              <?php else: ?>
                <p>Explora cronistas para seguir sus legados.</p>
              <?php endif; ?>
            </div>
          </div>
        </article>
      </section>

      <?php if (!empty($relatosDestacadosUsuario)): ?>
        <section class="profile-featured-row-v151">
          <div class="profile-section-title-v151"><span class="kicker">Piezas visibles</span><h2>Relatos destacados de tu legado</h2><p>Chronos destaca las crónicas con más ecos, comentarios o preservados.</p></div>
          <div class="profile-featured-cards-v151">
            <?php foreach ($relatosDestacadosUsuario as $destacado): ?>
              <?php $rutaDest = chronos_ruta_info($destacado['categoria'] ?? ''); ?>
              <a href="relato_ver.php?id=<?= (int)$destacado['id'] ?>" class="profile-featured-card-v151">
                <span><i class="<?= e($rutaDest['icono']) ?>"></i><?= e($destacado['categoria']) ?></span>
                <strong><?= e($destacado['titulo']) ?></strong>
                <small><?= (int)$destacado['total_ecos'] ?> ecos · <?= (int)$destacado['total_comentarios'] ?> comentarios · <?= (int)$destacado['total_archivos'] ?> preservados</small>
              </a>
            <?php endforeach; ?>
          </div>
        </section>
      <?php endif; ?>

      <div class="feed-head profile-mini-head profile-head-v142">
        <div>
          <span class="kicker">Mi legado en Chronos</span>
          <h1><?= $vista === 'rutas' ? 'Rutas de mi historia' : ($vista === 'actividad' ? 'Actividad recibida' : 'Relatos de mi legado') ?></h1>
          <p><?= $vista === 'rutas' ? 'Un mapa de las civilizaciones, épocas y temas que ya forman parte de tu perfil.' : ($vista === 'actividad' ? 'Ecos y comentarios que otros exploradores han dejado en tus relatos.' : 'Tus publicaciones públicas aparecen aquí y construyen la memoria visible de tu perfil.') ?></p>
        </div>
        <a class="head-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Nuevo relato</a>
      </div>

      <nav class="profile-tabs-v142" aria-label="Secciones del perfil">
        <a class="<?= $vista === 'relatos' ? 'active' : '' ?>" href="perfil.php?vista=relatos"><i class="ri-scroll-line"></i> Relatos</a>
        <a class="<?= $vista === 'rutas' ? 'active' : '' ?>" href="perfil.php?vista=rutas"><i class="ri-compass-3-line"></i> Rutas</a>
        <a class="<?= $vista === 'actividad' ? 'active' : '' ?>" href="perfil.php?vista=actividad"><i class="ri-pulse-line"></i> Actividad</a>
      </nav>

      <?php if ($vista === 'relatos'): ?>
        <?php if (!empty($rutasUsuario)): ?>
          <div class="profile-route-filter-v142">
            <a class="<?= $rutaActiva === '' ? 'active' : '' ?>" href="perfil.php?vista=relatos">Todos</a>
            <?php foreach ($rutasUsuario as $ruta): ?>
              <?php $rutaNombre = (string)$ruta['categoria']; $rutaInfo = chronos_ruta_info($rutaNombre); ?>
              <a class="<?= $rutaActiva === $rutaNombre ? 'active' : '' ?>" href="perfil.php?vista=relatos&ruta=<?= urlencode($rutaNombre) ?>"><i class="<?= e($rutaInfo['icono']) ?>"></i><?= e($rutaNombre) ?></a>
            <?php endforeach; ?>
          </div>
        <?php endif; ?>

        <?php if (!empty($relatosUsuario)): ?>
          <section class="profile-real-list">
            <?php foreach ($relatosUsuario as $relato): ?>
              <?php $rutaInfoRelato = chronos_ruta_info($relato['categoria'] ?? ''); ?>
              <article class="post real-post profile-story-card profile-story-card-v142">
                <div class="post-head">
                  <a href="autor.php?id=<?= $usuarioId ?>"><img class="post-user-img" src="<?= e($avatarUsuario) ?>" alt="Avatar"></a>
                  <div><strong><?= e($nombreUsuario) ?> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relato['categoria']) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relato['categoria']) ?></a></strong><small><?= e(chronos_fecha_relativa($relato['creado_en'])) ?></small></div>
                  <a class="profile-story-menu-v142" href="relato_editar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span> Editar</a>
                </div>
                <h2><a class="story-title-link" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></h2>
                <p><?= nl2br(e(chronos_resumen($relato['contenido'], 430))) ?></p>
                <?php if (!empty($relato['imagen'])): ?>
                  <a class="post-img" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"></a>
                <?php endif; ?>
                <div class="post-actions story-actions profile-story-actions-v142">
                  <span><span class="chronos-ui-icon icon-eco" aria-hidden="true"></span><?= (int)($relato['total_ecos'] ?? 0) ?> ecos</span>
                  <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>#comentarios"><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span><?= (int)($relato['total_comentarios'] ?? 0) ?> comentarios</a>
                  <a href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><i class="ri-eye-line"></i>Ver completo</a>
                <button type="button" class="story-inline-action chronos-diffuse-btn" data-copy-path="relato_ver.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-compartir" aria-hidden="true"></span>Difundir</button>
                  <a class="danger-link" href="relato_eliminar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-eliminar" aria-hidden="true"></span>Eliminar</a>
                </div>
              </article>
            <?php endforeach; ?>
          </section>
        <?php else: ?>
          <section class="profile-empty-state">
            <div class="profile-empty-visual">
              <img src="assets/img/post-library.svg" alt="Archivo personal">
              <div class="empty-glow"></div>
            </div>
            <div class="profile-empty-copy">
              <span class="mini-label">Tu primera huella</span>
              <h3>Aquí vivirán tus relatos.</h3>
              <p>Publica tu primer fragmento histórico para que tu perfil empiece a sentirse como un verdadero legado.</p>
              <div class="profile-next-steps">
                <div><i class="ri-quill-pen-line"></i><strong>Escribe</strong><small>Cuenta el relato con tu voz.</small></div>
                <div><i class="ri-compass-3-line"></i><strong>Elige ruta</strong><small>Ubícalo por época o tema.</small></div>
                <div><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span><strong>Recibe ecos</strong><small>La comunidad podrá interactuar.</small></div>
              </div>
              <a class="head-btn profile-empty-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear primer relato</a>
            </div>
          </section>
        <?php endif; ?>
      <?php elseif ($vista === 'rutas'): ?>
        <?php if (!empty($rutasUsuario)): ?>
          <section class="profile-routes-grid-v142">
            <?php foreach ($rutasUsuario as $ruta): ?>
              <?php $rutaNombre = (string)$ruta['categoria']; $rutaInfo = chronos_ruta_info($rutaNombre); ?>
              <article class="profile-route-card-v142">
                <div class="profile-route-icon-v142"><i class="<?= e($rutaInfo['icono']) ?>"></i></div>
                <div>
                  <span><?= e($rutaInfo['epoca']) ?></span>
                  <h3><?= e($rutaNombre) ?></h3>
                  <p><?= e($rutaInfo['descripcion']) ?></p>
                  <div class="profile-route-stats-v142">
                    <b><?= (int)$ruta['total_relatos'] ?> relatos</b>
                    <b><?= (int)$ruta['total_ecos'] ?> ecos</b>
                    <b><?= (int)$ruta['total_comentarios'] ?> comentarios</b>
                  </div>
                  <div class="profile-route-actions-v142">
                    <a href="perfil.php?vista=relatos&ruta=<?= urlencode($rutaNombre) ?>">Ver mis relatos</a>
                    <a href="rutas.php?ruta=<?= urlencode($rutaNombre) ?>">Abrir ruta</a>
                  </div>
                </div>
              </article>
            <?php endforeach; ?>
          </section>
        <?php else: ?>
          <section class="profile-empty-state">
            <div class="profile-empty-visual"><img src="assets/img/epoch-explore.svg" alt="Rutas de Chronos"><div class="empty-glow"></div></div>
            <div class="profile-empty-copy"><span class="mini-label">Mapa personal</span><h3>Aún no tienes rutas exploradas.</h3><p>Cuando publiques relatos, Chronos irá construyendo aquí tu mapa de civilizaciones, épocas y memorias.</p><a class="head-btn profile-empty-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a></div>
          </section>
        <?php endif; ?>
      <?php else: ?>
        <section class="profile-activity-grid-v142">
          <article class="sidebox profile-activity-card-v142">
            <h3><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span> Comentarios recientes</h3>
            <?php if (!empty($comentariosRecientes)): ?>
              <div class="profile-activity-list-v142">
                <?php foreach ($comentariosRecientes as $comentario): ?>
                  <a href="relato_ver.php?id=<?= (int)$comentario['publicacion_id'] ?>#comentarios">
                    <img src="<?= e($comentario['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar">
                    <span><strong><?= e($comentario['nombre'] ?: $comentario['usuario']) ?></strong><small>comentó en “<?= e(chronos_resumen($comentario['titulo'], 60)) ?>” · <?= e(chronos_fecha_relativa($comentario['creado_en'])) ?></small><em><?= e(chronos_resumen($comentario['contenido'], 110)) ?></em></span>
                  </a>
                <?php endforeach; ?>
              </div>
            <?php else: ?>
              <p class="profile-activity-empty-v142">Todavía no tienes comentarios de otros exploradores.</p>
            <?php endif; ?>
          </article>

          <article class="sidebox profile-activity-card-v142">
            <h3><span class="chronos-ui-icon icon-eco" aria-hidden="true"></span> Ecos recientes</h3>
            <?php if (!empty($ecosRecientes)): ?>
              <div class="profile-activity-list-v142">
                <?php foreach ($ecosRecientes as $eco): ?>
                  <a href="relato_ver.php?id=<?= (int)$eco['publicacion_id'] ?>">
                    <img src="<?= e($eco['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar">
                    <span><strong><?= e($eco['nombre'] ?: $eco['usuario']) ?></strong><small>dejó eco en “<?= e(chronos_resumen($eco['titulo'], 70)) ?>” · <?= e(chronos_fecha_relativa($eco['creado_en'])) ?></small></span>
                  </a>
                <?php endforeach; ?>
              </div>
            <?php else: ?>
              <p class="profile-activity-empty-v142">Aún no hay ecos nuevos en tus relatos.</p>
            <?php endif; ?>
          </article>
        </section>
      <?php endif; ?>
    </section>
  </section>
</main>
  <script src="assets/js/no_zoom.js?v=511"></script>
<script src="assets/js/social_actions.js?v=511"></script>
</body>
</html>
