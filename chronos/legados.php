<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();

$usuarioId = (int)$usuario['id'];
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$temaUsuario = $usuario['tema_favorito'] ?: ($usuario['interes'] ?: 'Historia');
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos($usuarioId);

$tab = $_GET['tab'] ?? 'seguidores';
$tabsPermitidos = ['seguidores', 'siguiendo'];
if (!in_array($tab, $tabsPermitidos, true)) {
    $tab = 'seguidores';
}

$busqueda = trim((string)($_GET['q'] ?? ''));

$stmtStats = $pdo->prepare('SELECT
    (SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?) AS total_seguidores,
    (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?) AS total_siguiendo,
    (SELECT COUNT(*) FROM publicaciones WHERE usuario_id IN (SELECT seguido_id FROM seguidores WHERE seguidor_id = ?)) AS relatos_siguiendo,
    (SELECT COUNT(*) FROM publicaciones WHERE usuario_id = ?) AS mis_relatos');
$stmtStats->execute([$usuarioId, $usuarioId, $usuarioId, $usuarioId]);
$stats = $stmtStats->fetch() ?: [
    'total_seguidores' => 0,
    'total_siguiendo' => 0,
    'relatos_siguiendo' => 0,
    'mis_relatos' => 0,
];

function chronos_legados_url(array $params = []): string
{
    $base = [
        'tab' => $_GET['tab'] ?? 'seguidores',
        'q' => $_GET['q'] ?? '',
    ];
    $final = array_merge($base, $params);
    foreach ($final as $key => $value) {
        if ($value === '' || $value === null) {
            unset($final[$key]);
        }
    }
    return 'legados.php' . ($final ? '?' . http_build_query($final) : '');
}

function chronos_consultar_conexiones(PDO $pdo, int $usuarioId, string $tipo, string $busqueda): array
{
    $select = "SELECT u.id, u.nombre, u.usuario, u.avatar, u.portada, u.bio, u.tema_favorito, u.interes, u.perfil_completo, u.creado_en, s.creado_en AS relacion_creada,
        (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id) AS total_relatos,
        (SELECT COUNT(*) FROM seguidores sf WHERE sf.seguido_id = u.id) AS total_seguidores,
        (SELECT COUNT(*) FROM seguidores sg WHERE sg.seguidor_id = u.id) AS total_siguiendo,
        (SELECT COUNT(*) FROM seguidores yo WHERE yo.seguidor_id = ? AND yo.seguido_id = u.id) AS yo_sigo";

    $params = [$usuarioId];
    if ($tipo === 'seguidores') {
        $sql = $select . " FROM seguidores s INNER JOIN usuarios u ON u.id = s.seguidor_id WHERE s.seguido_id = ?";
    } else {
        $sql = $select . " FROM seguidores s INNER JOIN usuarios u ON u.id = s.seguido_id WHERE s.seguidor_id = ?";
    }
    $params[] = $usuarioId;

    if ($busqueda !== '') {
        $sql .= " AND (u.nombre LIKE ? OR u.usuario LIKE ? OR u.interes LIKE ? OR u.tema_favorito LIKE ? OR u.bio LIKE ?)";
        $like = '%' . $busqueda . '%';
        array_push($params, $like, $like, $like, $like, $like);
    }

    $sql .= " ORDER BY s.creado_en DESC LIMIT 80";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll() ?: [];
}

$seguidores = chronos_consultar_conexiones($pdo, $usuarioId, 'seguidores', $busqueda);
$siguiendo = chronos_consultar_conexiones($pdo, $usuarioId, 'siguiendo', $busqueda);
$listadoActual = $tab === 'seguidores' ? $seguidores : $siguiendo;

$stmtRecientes = $pdo->prepare('SELECT p.id, p.titulo, p.categoria, p.creado_en, u.id AS autor_id, u.nombre, u.usuario, u.avatar
    FROM publicaciones p
    INNER JOIN usuarios u ON u.id = p.usuario_id
    WHERE p.usuario_id IN (SELECT seguido_id FROM seguidores WHERE seguidor_id = ?)
    ORDER BY p.creado_en DESC
    LIMIT 5');
$stmtRecientes->execute([$usuarioId]);
$relatosRecientesSiguiendo = $stmtRecientes->fetchAll() ?: [];

$mensaje = '';
if (isset($_GET['seguir'])) {
    if ($_GET['seguir'] === 'alistado') {
        $mensaje = mensaje_auth('success', 'Ahora sigues ese legado.');
    } elseif ($_GET['seguir'] === 'desalistado') {
        $mensaje = mensaje_auth('info', 'Dejaste de seguir ese legado.');
    } elseif ($_GET['seguir'] === 'error') {
        $mensaje = mensaje_auth('error', 'No se pudo actualizar el seguimiento.');
    }
}

$tituloListado = $tab === 'seguidores' ? 'Seguidores de tu legado' : 'Legados que sigues';
$subtituloListado = $tab === 'seguidores'
    ? 'Personas que decidieron seguir tu legado público dentro de Chronos.'
    : 'Autores que decidiste seguir para encontrar sus relatos con mayor facilidad.';
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Seguidores y legados</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell legados-shell-v137">
  <section class="profile-hero-card legados-hero-v137">
    <div class="profile-hero-cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
    <div class="profile-hero-content">
      <img class="profile-hero-avatar" src="<?= e($avatarUsuario) ?>" alt="Avatar">
      <div class="profile-hero-main">
        <span class="kicker">Red de legados</span>
        <h1>Seguidores y legados</h1>
        <p>@<?= e($aliasUsuario) ?> · <?= e($temaUsuario) ?></p>
        <p class="profile-bio">Administra quién sigue tu legado y qué autores sigues dentro de Chronos.</p>
      </div>
      <div class="profile-hero-actions">
        <a class="head-btn" href="feed.php?vista=siguiendo"><i class="ri-user-follow-line"></i> Ver relatos que sigo</a>
        <a class="auth-secondary profile-logout" href="explore.php?tipo=autores"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Descubrir autores</a>
      </div>
    </div>
    <div class="profile-hero-stats legados-stats-v137">
      <a href="legados.php?tab=seguidores"><strong><?= (int)$stats['total_seguidores'] ?></strong><span>Seguidores</span></a>
      <a href="legados.php?tab=siguiendo"><strong><?= (int)$stats['total_siguiendo'] ?></strong><span>Siguiendo</span></a>
      <a href="feed.php?vista=siguiendo"><strong><?= (int)$stats['relatos_siguiendo'] ?></strong><span>Relatos de seguidos</span></a>
      <a href="perfil.php"><strong><?= (int)$stats['mis_relatos'] ?></strong><span>Mis relatos</span></a>
    </div>
    <div class="profile-quick-actions legados-quick-v137">
      <a href="<?= e(chronos_legados_url(['tab' => 'seguidores'])) ?>"><i class="ri-team-line"></i><span><strong>Quién sigue mi legado</strong><small>Ver personas que llegaron a tu legado.</small></span></a>
      <a href="<?= e(chronos_legados_url(['tab' => 'siguiendo'])) ?>"><i class="ri-user-follow-line"></i><span><strong>Legados que sigo</strong><small>Autores que aparecerán en tu vista Siguiendo.</small></span></a>
      <a href="explore.php?tipo=autores"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span><span><strong>Descubrir más autores</strong><small>Explorar perfiles públicos de Chronos.</small></span></a>
      <a href="perfil.php"><i class="ri-user-star-line"></i><span><strong>Mi legado</strong><small>Volver a tu perfil personal.</small></span></a>
    </div>
  </section>

  <?= $mensaje ?>

  <section class="legados-grid-v137">
    <aside class="profile-about sidebox legados-side-v137">
      <h3><i class="ri-compass-3-line"></i> Mapa de conexión</h3>
      <p>Este módulo sirve para que el usuario entienda su comunidad: quién lo sigue, a quién sigue y hacia dónde se mueve su línea del tiempo.</p>

      <form class="legados-search-v137" method="get" action="legados.php">
        <input type="hidden" name="tab" value="<?= e($tab) ?>">
        <label>
          <span>Buscar en esta lista</span>
          <input type="text" name="q" value="<?= e($busqueda) ?>" placeholder="Nombre, usuario o interés">
        </label>
        <button type="submit" class="head-btn"><i class="ri-search-line"></i> Buscar</button>
        <?php if ($busqueda !== ''): ?><a class="auth-secondary compact-link" href="legados.php?tab=<?= e($tab) ?>">Limpiar</a><?php endif; ?>
      </form>

      <div class="profile-info-row"><span>Seguidores</span><strong><?= (int)$stats['total_seguidores'] ?></strong></div>
      <div class="profile-info-row"><span>Siguiendo</span><strong><?= (int)$stats['total_siguiendo'] ?></strong></div>
      <div class="profile-info-row"><span>Relatos de seguidos</span><strong><?= (int)$stats['relatos_siguiendo'] ?></strong></div>

      <?php if (!empty($relatosRecientesSiguiendo)): ?>
        <div class="legados-mini-list-v137">
          <span class="mini-label">Últimos relatos de seguidos</span>
          <?php foreach ($relatosRecientesSiguiendo as $relatoReciente): ?>
            <a href="relato_ver.php?id=<?= (int)$relatoReciente['id'] ?>">
              <strong><?= e($relatoReciente['titulo']) ?></strong>
              <small>@<?= e($relatoReciente['usuario']) ?> · <?= e($relatoReciente['categoria']) ?></small>
            </a>
          <?php endforeach; ?>
        </div>
      <?php endif; ?>
    </aside>

    <section class="legados-main-v137">
      <div class="feed-head profile-mini-head legados-head-v137">
        <div>
          <span class="kicker">Comunidad personal</span>
          <h1><?= e($tituloListado) ?></h1>
          <p><?= e($subtituloListado) ?></p>
        </div>
      </div>

      <nav class="feed-tabs-v136 legados-tabs-v137" aria-label="Seguidores y siguiendo">
        <a class="<?= $tab === 'seguidores' ? 'active' : '' ?>" href="<?= e(chronos_legados_url(['tab' => 'seguidores'])) ?>"><i class="ri-team-line"></i> Seguidores <span><?= (int)$stats['total_seguidores'] ?></span></a>
        <a class="<?= $tab === 'siguiendo' ? 'active' : '' ?>" href="<?= e(chronos_legados_url(['tab' => 'siguiendo'])) ?>"><i class="ri-user-follow-line"></i> Siguiendo <span><?= (int)$stats['total_siguiendo'] ?></span></a>
      </nav>

      <?php if (!empty($listadoActual)): ?>
        <section class="legados-list-v137">
          <?php foreach ($listadoActual as $persona): ?>
            <?php
              $personaNombre = $persona['nombre'] ?: 'Explorador Chronos';
              $personaAlias = $persona['usuario'] ?: 'usuario';
              $personaTema = $persona['tema_favorito'] ?: ($persona['interes'] ?: 'Historia');
              $personaBio = $persona['bio'] ?: 'Este explorador todavía está construyendo su legado.';
              $personaAvatar = $persona['avatar'] ?: 'assets/img/avatar.svg';
              $personaPortada = $persona['portada'] ?: 'assets/img/cover.svg';
              $yoSigo = (int)($persona['yo_sigo'] ?? 0) > 0;
            ?>
            <article class="legado-card-v137 panel">
              <div class="legado-card-cover-v137" style="background-image:url('<?= e($personaPortada) ?>')"></div>
              <div class="legado-card-body-v137">
                <a class="legado-avatar-link-v137" href="autor.php?id=<?= (int)$persona['id'] ?>"><img src="<?= e($personaAvatar) ?>" alt="Avatar de <?= e($personaNombre) ?>"></a>
                <div class="legado-card-main-v137">
                  <span class="mini-label"><?= $tab === 'seguidores' ? 'Sigue tu legado' : 'Legado seguido' ?></span>
                  <h3><a href="autor.php?id=<?= (int)$persona['id'] ?>"><?= e($personaNombre) ?></a></h3>
                  <p>@<?= e($personaAlias) ?> · <?= e($personaTema) ?></p>
                  <small><?= e(chronos_resumen($personaBio, 130)) ?></small>
                </div>
                <div class="legado-card-stats-v137">
                  <div><strong><?= (int)$persona['total_relatos'] ?></strong><span>Relatos</span></div>
                  <div><strong><?= (int)$persona['total_seguidores'] ?></strong><span>Seguidores</span></div>
                  <div><strong><?= e(chronos_fecha_relativa($persona['relacion_creada'])) ?></strong><span><?= $tab === 'seguidores' ? 'Te siguió' : 'Lo sigues' ?></span></div>
                </div>
                <div class="legado-card-actions-v137">
                  <a class="auth-secondary" href="autor.php?id=<?= (int)$persona['id'] ?>"><i class="ri-eye-line"></i> Ver perfil</a>
                  <?php if ($tab === 'seguidores' && !$yoSigo): ?>
                    <form method="post" action="seguir_toggle.php">
                      <input type="hidden" name="seguido_id" value="<?= (int)$persona['id'] ?>">
                      <input type="hidden" name="accion" value="alistar">
                      <input type="hidden" name="volver" value="legados">
                      <input type="hidden" name="tab" value="seguidores">
                      <?php if ($busqueda !== ''): ?><input type="hidden" name="q" value="<?= e($busqueda) ?>"><?php endif; ?>
                      <button class="head-btn" type="submit"><i class="ri-user-add-line"></i> Seguir legado</button>
                    </form>
                  <?php else: ?>
                    <form method="post" action="seguir_toggle.php">
                      <input type="hidden" name="seguido_id" value="<?= (int)$persona['id'] ?>">
                      <input type="hidden" name="accion" value="desalistar">
                      <input type="hidden" name="volver" value="legados">
                      <input type="hidden" name="tab" value="<?= e($tab) ?>">
                      <?php if ($busqueda !== ''): ?><input type="hidden" name="q" value="<?= e($busqueda) ?>"><?php endif; ?>
                      <button class="head-btn public-follow-btn is-following" type="submit"><i class="ri-user-follow-line"></i> <?= $tab === 'seguidores' ? 'Siguiendo' : 'Dejar de seguir' ?></button>
                    </form>
                  <?php endif; ?>
                </div>
              </div>
            </article>
          <?php endforeach; ?>
        </section>
      <?php else: ?>
        <section class="profile-empty-state archive-empty-state legados-empty-v137">
          <div class="profile-empty-visual"><img src="assets/img/post-map.svg" alt="Mapa de legados"><div class="empty-glow"></div></div>
          <div class="profile-empty-copy">
            <span class="mini-label">Red en construcción</span>
            <h3><?= $tab === 'seguidores' ? 'Aún no tienes seguidores en tu legado.' : 'Aún no sigues ningún legado.' ?></h3>
            <p><?= $tab === 'seguidores' ? 'Cuando otros usuarios sigan tu perfil público, aparecerán aquí sin mostrar datos privados.' : 'Explora autores y sigue sus legados para llenar esta vista y alimentar tu sección Siguiendo.' ?></p>
            <a class="head-btn profile-empty-btn" href="explore.php?tipo=autores"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Descubrir autores</a>
          </div>
        </section>
      <?php endif; ?>
    </section>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
