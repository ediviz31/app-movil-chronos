<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();

$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$bioUsuario = $usuario['bio'] ?: 'Explorador de historias';
$temaUsuario = $usuario['tema_favorito'] ?: ($usuario['interes'] ?: 'Civilizaciones');
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';

$busqueda = trim((string)($_GET['q'] ?? ''));
$busquedaAutor = trim(ltrim($busqueda, '@'));
$categoria = trim((string)($_GET['categoria'] ?? ''));
$tipo = trim((string)($_GET['tipo'] ?? 'todo'));
$tiposPermitidos = ['todo', 'relatos', 'autores', 'epocas'];
if (!in_array($tipo, $tiposPermitidos, true)) {
    $tipo = 'todo';
}

function chronos_explore_url(array $params = []): string
{
    $base = [
        'q' => $_GET['q'] ?? '',
        'categoria' => $_GET['categoria'] ?? '',
        'tipo' => $_GET['tipo'] ?? 'todo',
    ];
    $query = array_merge($base, $params);
    $query = array_filter($query, static function ($value) {
        return $value !== '' && $value !== null && $value !== 'todo';
    });
    return 'explore.php' . ($query ? '?' . http_build_query($query) : '');
}

$stmtCategorias = $pdo->query("SELECT categoria, COUNT(*) AS total FROM publicaciones WHERE categoria <> '' GROUP BY categoria ORDER BY total DESC, categoria ASC LIMIT 18");
$categorias = $stmtCategorias->fetchAll() ?: [];

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
$whereRelatos = [];
if ($busqueda !== '') {
    $whereRelatos[] = "(p.titulo LIKE ? OR p.contenido LIKE ? OR p.categoria LIKE ? OR u.nombre LIKE ? OR u.usuario LIKE ? OR u.usuario LIKE ? OR u.tema_favorito LIKE ? OR u.interes LIKE ?)";
    $like = '%' . $busqueda . '%';
    $likeAutor = '%' . ($busquedaAutor !== '' ? $busquedaAutor : $busqueda) . '%';
    $paramsRelatos = array_merge($paramsRelatos, [$like, $like, $like, $like, $like, $likeAutor, $like, $like]);
}
if ($categoria !== '') {
    $whereRelatos[] = "p.categoria = ?";
    $paramsRelatos[] = $categoria;
}
if ($whereRelatos) {
    $sqlRelatos .= " WHERE " . implode(' AND ', $whereRelatos);
}
$sqlRelatos .= " ORDER BY p.creado_en DESC LIMIT 36";
$stmtRelatos = $pdo->prepare($sqlRelatos);
$stmtRelatos->execute($paramsRelatos);
$relatos = $stmtRelatos->fetchAll() ?: [];

$sqlUsuarios = "SELECT u.id, u.nombre, u.usuario, u.avatar, u.portada, u.bio, u.tema_favorito, u.interes, u.perfil_completo, u.creado_en,
    (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id) AS total_relatos,
    (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS total_seguidores,
    (SELECT COUNT(*) FROM seguidores su WHERE su.seguidor_id = ? AND su.seguido_id = u.id) AS usuario_alistado,
    (SELECT COUNT(*) FROM ecos ea INNER JOIN publicaciones pa ON pa.id = ea.publicacion_id WHERE pa.usuario_id = u.id) AS total_ecos_autor,
    (SELECT MAX(p2.creado_en) FROM publicaciones p2 WHERE p2.usuario_id = u.id) AS ultimo_relato,
    (SELECT GROUP_CONCAT(DISTINCT p3.categoria ORDER BY p3.categoria SEPARATOR '||') FROM publicaciones p3 WHERE p3.usuario_id = u.id AND p3.categoria <> '') AS rutas_autor
    FROM usuarios u";
$paramsUsuarios = [(int)$usuario['id']];
$whereUsuarios = [];
if ($categoria !== '') {
    $whereUsuarios[] = "(EXISTS (SELECT 1 FROM publicaciones pc WHERE pc.usuario_id = u.id AND pc.categoria = ?) OR u.tema_favorito = ? OR u.interes = ?)";
    array_push($paramsUsuarios, $categoria, $categoria, $categoria);
}
if ($whereUsuarios) {
    $sqlUsuarios .= " WHERE " . implode(' AND ', $whereUsuarios);
}
$sqlUsuarios .= " ORDER BY u.creado_en DESC LIMIT 300";
$stmtUsuarios = $pdo->prepare($sqlUsuarios);
$stmtUsuarios->execute($paramsUsuarios);
$usuariosBase = $stmtUsuarios->fetchAll() ?: [];
$rutasInteresExplorar = chronos_rutas_interes_usuario($pdo, (int)$usuario['id'], $temaUsuario);
$usuariosBase = chronos_enriquecer_autores_sugeridos($usuariosBase, $rutasInteresExplorar, $temaUsuario, false);

if ($busquedaAutor !== '') {
    $usuariosFiltrados = [];
    foreach ($usuariosBase as $autor) {
        $senal = chronos_catalejo_calcular_coincidencia($autor, $busquedaAutor);
        if ((int)$senal['score'] >= 35) {
            $autor['catalejo_puntaje'] = (int)$senal['score'];
            $autor['catalejo_motivo'] = $senal['motivo'];
            $autor['catalejo_tipo'] = $senal['tipo'];
            $autor['sugerencia_motivo'] = $senal['motivo'];
            $usuariosFiltrados[] = $autor;
        }
    }
    usort($usuariosFiltrados, static function ($a, $b) {
        $cmp = ((int)($b['catalejo_puntaje'] ?? 0)) <=> ((int)($a['catalejo_puntaje'] ?? 0));
        if ($cmp !== 0) { return $cmp; }
        $cmp = ((int)($b['total_relatos'] ?? 0)) <=> ((int)($a['total_relatos'] ?? 0));
        if ($cmp !== 0) { return $cmp; }
        $cmp = ((int)($b['total_seguidores'] ?? 0)) <=> ((int)($a['total_seguidores'] ?? 0));
        if ($cmp !== 0) { return $cmp; }
        return strcmp((string)($a['nombre'] ?? ''), (string)($b['nombre'] ?? ''));
    });
    $usuariosSugeridos = array_slice($usuariosFiltrados, 0, 18);
} else {
    $usuariosSugeridos = chronos_enriquecer_autores_sugeridos($usuariosBase, $rutasInteresExplorar, $temaUsuario, true);
    $usuariosSugeridos = array_slice($usuariosSugeridos, 0, 12);
}

$autoresSugeridosSmart = chronos_autores_sugeridos_inteligentes($pdo, $usuario, 5, true, $busquedaAutor, $categoria);

$cronistaDestacado = null;
$cronistaDestacadoId = 0;
$cronistasCercanos = [];
if ($busquedaAutor !== '' && !empty($usuariosSugeridos)) {
    $cronistaDestacado = $usuariosSugeridos[0];
    $cronistaDestacadoId = (int)$cronistaDestacado['id'];
    $cronistasCercanos = array_slice(array_values(array_filter($usuariosSugeridos, static function ($autor) use ($cronistaDestacadoId) {
        return (int)$autor['id'] !== $cronistaDestacadoId;
    })), 0, 5);
}


$stmtTotales = $pdo->query('SELECT (SELECT COUNT(*) FROM publicaciones) AS total_relatos, (SELECT COUNT(*) FROM usuarios) AS total_usuarios, (SELECT COUNT(DISTINCT categoria) FROM publicaciones WHERE categoria <> "") AS total_categorias, (SELECT COUNT(*) FROM comentarios) AS total_comentarios');
$totales = $stmtTotales->fetch() ?: ['total_relatos' => 0, 'total_usuarios' => 0, 'total_categorias' => 0, 'total_comentarios' => 0];

$mensaje = '';
if (isset($_GET['archivo'])) {
    if ($_GET['archivo'] === 'guardado') {
        $mensaje = mensaje_auth('success', 'Relato preservado en tu Archivo Histórico privado. Solo tú puedes verlo aquí.');
    } elseif ($_GET['archivo'] === 'quitado') {
        $mensaje = mensaje_auth('info', 'Relato quitado de tu Archivo Histórico privado.');
    }
}
if (isset($_GET['perfil']) && $_GET['perfil'] === 'no_encontrado') {
    $mensaje = mensaje_auth('error', 'No encontramos ese perfil público.');
}
if (isset($_GET['seguir'])) {
    if ($_GET['seguir'] === 'alistado') {
        $mensaje = mensaje_auth('success', 'Ahora sigues el legado de este autor.');
    } elseif ($_GET['seguir'] === 'desalistado') {
        $mensaje = mensaje_auth('info', 'Dejaste de seguir a este autor.');
    } elseif ($_GET['seguir'] === 'error') {
        $mensaje = mensaje_auth('error', 'No se pudo actualizar el seguimiento.');
    }
}

$tituloExplorar = 'Explorar Chronos';
$subtituloExplorar = 'Encuentra relatos, autores y rutas históricas conectadas con la comunidad.';
if ($busqueda !== '' || $categoria !== '') {
    $partes = [];
    if ($busqueda !== '') { $partes[] = '“' . $busqueda . '”'; }
    if ($categoria !== '') { $partes[] = $categoria; }
    $tituloExplorar = 'Hallazgos para ' . implode(' · ', $partes);
    $subtituloExplorar = 'Se encontraron ' . count($relatos) . ' relato(s), ' . count($usuariosSugeridos) . ' autor(es) y rutas relacionadas.';
}

$totalFiltros = count($relatos) + count($usuariosSugeridos) + count($categorias);
$hayFiltros = $busqueda !== '' || $categoria !== '';
$mostrarRelatos = $tipo === 'todo' || $tipo === 'relatos';
$mostrarAutores = $tipo === 'todo' || $tipo === 'autores';
$mostrarEpocas = $tipo === 'todo' || $tipo === 'epocas';
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Explorar</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="shell explore-shell-v135">
  <aside class="sidebar">
    <section class="profile-card explore-filter-card explore-compass-card">
      <div class="cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
      <div class="profile-main">
        <img class="avatar" src="<?= e($avatarUsuario) ?>" alt="Avatar de usuario">
        <h2>Catalejo</h2>
        <p><?= e($temaUsuario) ?> · búsqueda activa</p>
        <span class="badge">Mapa vivo de Chronos</span>
      </div>
      <div class="stats">
        <div><strong><?= (int)$totales['total_relatos'] ?></strong><span>Relatos</span></div>
        <div><strong><?= (int)$totales['total_usuarios'] ?></strong><span>Cronistas</span></div>
        <div><strong><?= (int)$totales['total_categorias'] ?></strong><span>Rutas</span></div>
      </div>

      <div class="nav-title">Filtrar hallazgos</div>
      <form class="explore-filter-form" method="get" action="explore.php">
        <label>
          <span>Palabra, @autor o hallazgo</span>
          <input type="text" name="q" value="<?= e($busqueda) ?>" placeholder="@cronista, nombre, ruta o hallazgo...">
        </label>
        <label>
          <span>Afiliación histórica</span>
          <select name="categoria">
            <option value="">Todas las rutas</option>
            <?php foreach ($categorias as $item): ?>
              <option value="<?= e($item['categoria']) ?>" <?= $categoria === $item['categoria'] ? 'selected' : '' ?>><?= e($item['categoria']) ?> (<?= (int)$item['total'] ?>)</option>
            <?php endforeach; ?>
          </select>
        </label>
        <input type="hidden" name="tipo" value="<?= e($tipo) ?>">
        <div class="explore-filter-actions">
          <button type="submit" class="head-btn"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Buscar</button>
          <?php if ($hayFiltros || $tipo !== 'todo'): ?>
            <a class="auth-secondary compact-link" href="explore.php">Limpiar</a>
          <?php endif; ?>
        </div>
      </form>

      <div class="nav-title">Rutas rápidas</div>
      <nav class="side-nav">
        <a href="feed.php"><i class="ri-home-5-line"></i> Línea del tiempo</a>
        <a class="active" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar</a>
        <a href="archivo.php"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span> Mi Archivo Histórico</a>
        <a href="relato.php"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span> Crear relato</a>
      </nav>
    </section>
  </aside>

  <section class="feed explore-feed explore-feed-v135">
    <section class="explore-hero-v135 panel">
      <div class="explore-hero-copy">
        <span class="kicker">Catalejo inteligente</span>
        <h1><?= e($tituloExplorar) ?></h1>
        <p><?= e($subtituloExplorar) ?></p>
      </div>
      <form class="explore-main-search" method="get" action="explore.php">
        <i class="ri-search-line"></i>
        <input type="text" name="q" value="<?= e($busqueda) ?>" placeholder="Busca @cronistas, rutas, relatos o hallazgos">
        <?php if ($categoria !== ''): ?><input type="hidden" name="categoria" value="<?= e($categoria) ?>"><?php endif; ?>
        <button type="submit">Explorar</button>
      </form>
      <div class="explore-hero-stats">
        <a href="<?= e(chronos_explore_url(['tipo' => 'relatos'])) ?>"><strong><?= (int)$totales['total_relatos'] ?></strong><span>Relatos</span></a>
        <a href="<?= e(chronos_explore_url(['tipo' => 'autores'])) ?>"><strong><?= (int)$totales['total_usuarios'] ?></strong><span>Cronistas</span></a>
        <a href="<?= e(chronos_explore_url(['tipo' => 'epocas'])) ?>"><strong><?= (int)$totales['total_categorias'] ?></strong><span>Rutas</span></a>
        <a href="relato.php"><strong>+</strong><span>Nuevo legado</span></a>
      </div>
    </section>

    <nav class="explore-tabs-v135" aria-label="Filtros de exploración">
      <a class="<?= $tipo === 'todo' ? 'active' : '' ?>" href="<?= e(chronos_explore_url(['tipo' => 'todo'])) ?>"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Todo</a>
      <a class="<?= $tipo === 'relatos' ? 'active' : '' ?>" href="<?= e(chronos_explore_url(['tipo' => 'relatos'])) ?>"><i class="ri-scroll-line"></i> Relatos</a>
      <a class="<?= $tipo === 'autores' ? 'active' : '' ?>" href="<?= e(chronos_explore_url(['tipo' => 'autores'])) ?>"><i class="ri-user-star-line"></i> Cronistas</a>
      <a class="<?= $tipo === 'epocas' ? 'active' : '' ?>" href="<?= e(chronos_explore_url(['tipo' => 'epocas'])) ?>"><i class="ri-compass-3-line"></i> Rutas</a>
    </nav>

    <?= $mensaje ?>

    <?php if ($mostrarAutores): ?>
      <section class="explore-section-v135">
        <div class="explore-section-head">
          <div>
            <span class="kicker">Registro de cronistas</span>
            <h2><?= $hayFiltros ? 'Cronistas avistados' : 'Códice de autores' ?></h2>
            <p><?= $hayFiltros ? 'El Catalejo ordena coincidencias exactas, nombres cercanos y afiliaciones históricas para que no parezca que el cronista no existe.' : 'Encuentra exploradores por nombre, @usuario o afiliación histórica, y entra directo a su legado público.' ?></p>
          </div>
          <a class="text-link" href="<?= e(chronos_explore_url(['tipo' => 'autores'])) ?>">Abrir códice</a>
        </div>
        <?php if ($cronistaDestacado): ?>
          <?php
            $autor = $cronistaDestacado;
            $esMiUsuario = (int)$autor['id'] === (int)$usuario['id'];
            $autorSiguiendo = !$esMiUsuario && ((int)($autor['usuario_alistado'] ?? 0) > 0 || chronos_esta_alistado((int)$usuario['id'], (int)$autor['id']));
            $autorUrl = $esMiUsuario ? 'perfil.php' : ('autor.php?id=' . (int)$autor['id']);
            $autorTema = $autor['tema_favorito'] ?: ($autor['interes'] ?: 'Historia');
            $autorEspecialidad = chronos_especialidad_autor($autor);
            $senalMotivo = $autor['catalejo_motivo'] ?? 'Coincide con tu búsqueda';
          ?>
          <article class="cronista-destacado-v502 cronista-avistado-v503">
            <div class="catalejo-senal-v503">
              <span><i class="ri-telescope-line"></i> Señal localizada</span>
              <strong><?= e($senalMotivo) ?></strong>
            </div>
            <a class="cronista-destacado-avatar" href="<?= e($autorUrl) ?>"><img src="<?= e($autor['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar de cronista"></a>
            <div class="cronista-destacado-copy">
              <span class="kicker">Cronista avistado</span>
              <h3><a href="<?= e($autorUrl) ?>"><?= e($autor['nombre']) ?></a></h3>
              <p>@<?= e($autor['usuario']) ?> · <?= e($autorTema) ?></p>
              <strong><i class="ri-medal-line"></i><?= e($autorEspecialidad) ?></strong>
              <small><?= (int)$autor['total_relatos'] ?> crónica(s) · <?= (int)$autor['total_seguidores'] ?> respaldo(s) · <?= (int)($autor['total_ecos_autor'] ?? 0) ?> eco(s)</small>
              <?php if (!empty($cronistasCercanos)): ?>
                <div class="coincidencias-cercanas-v503">
                  <span>También coinciden:</span>
                  <?php foreach ($cronistasCercanos as $cercano): ?>
                    <a href="<?= ((int)$cercano['id'] === (int)$usuario['id']) ? 'perfil.php' : ('autor.php?id=' . (int)$cercano['id']) ?>"><?= e($cercano['nombre']) ?></a>
                  <?php endforeach; ?>
                </div>
              <?php endif; ?>
            </div>
            <div class="cronista-destacado-actions">
              <a class="head-btn" href="<?= e($autorUrl) ?>">Ver legado</a>
              <?php if (!$esMiUsuario): ?>
                <form method="post" action="seguir_toggle.php" class="follow-form">
                  <input type="hidden" name="seguido_id" value="<?= (int)$autor['id'] ?>">
                  <input type="hidden" name="q" value="<?= e($busqueda) ?>">
                  <input type="hidden" name="categoria" value="<?= e($categoria) ?>">
                  <input type="hidden" name="tipo" value="<?= e($tipo) ?>">
                  <input type="hidden" name="volver" value="explore">
                  <input type="hidden" name="accion" value="<?= $autorSiguiendo ? 'desalistar' : 'alistar' ?>">
                  <button type="submit" class="follow author-follow <?= $autorSiguiendo ? 'active' : '' ?>"><?= $autorSiguiendo ? 'Siguiendo' : 'Seguir legado' ?></button>
                </form>
              <?php else: ?>
                <a class="follow author-follow self" href="perfil.php">Tu legado</a>
              <?php endif; ?>
            </div>
          </article>
        <?php endif; ?>

        <?php if (!empty($usuariosSugeridos)): ?>
          <div class="explore-authors-grid">
            <?php foreach ($usuariosSugeridos as $autor): ?>
              <?php
                $esMiUsuario = (int)$autor['id'] === (int)$usuario['id'];
                $autorSiguiendo = !$esMiUsuario && ((int)($autor['usuario_alistado'] ?? 0) > 0 || chronos_esta_alistado((int)$usuario['id'], (int)$autor['id']));
                $autorUrl = $esMiUsuario ? 'perfil.php' : ('autor.php?id=' . (int)$autor['id']);
                $autorTema = $autor['tema_favorito'] ?: ($autor['interes'] ?: 'Historia');
                if ($cronistaDestacadoId > 0 && (int)$autor['id'] === $cronistaDestacadoId) {
                    continue;
                }
                $autorEspecialidad = chronos_especialidad_autor($autor);
              ?>
              <article class="explore-author-card chronos-codex-author">
                <a class="explore-author-cover" href="<?= e($autorUrl) ?>" style="background-image:url('<?= e($autor['portada'] ?: 'assets/img/cover.svg') ?>')"></a>
                <div class="explore-author-body">
                  <a class="author-mini-link" href="<?= e($autorUrl) ?>"><img src="<?= e($autor['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar de autor"></a>
                  <div class="explore-author-main">
                    <span><?= e($autorTema) ?></span>
                    <h3><a class="author-name-link" href="<?= e($autorUrl) ?>"><?= e($autor['nombre']) ?></a></h3>
                    <p>@<?= e($autor['usuario']) ?> · <?= (int)$autor['total_relatos'] ?> crónica(s) · <?= (int)$autor['total_seguidores'] ?> respaldo(s)</p>
                    <strong class="author-specialty-v502"><i class="ri-medal-line"></i><?= e($autorEspecialidad) ?></strong>
                    <em class="author-reason-v150 author-reason-v503"><?= e($autor['catalejo_motivo'] ?? ($autor['sugerencia_motivo'] ?? 'Autor por descubrir')) ?></em>
                  </div>
                  <p class="explore-author-bio"><?= e(chronos_resumen($autor['bio'] ?: 'Este explorador aún está preparando su biografía pública.', 120)) ?></p>
                  <div class="explore-author-actions">
                    <a class="auth-secondary compact-link" href="<?= e($autorUrl) ?>">Ver legado</a>
                    <?php if ($esMiUsuario): ?>
                      <a class="follow author-follow self" href="perfil.php">Tu perfil</a>
                    <?php else: ?>
                      <form method="post" action="seguir_toggle.php" class="follow-form">
                        <input type="hidden" name="seguido_id" value="<?= (int)$autor['id'] ?>">
                        <input type="hidden" name="q" value="<?= e($busqueda) ?>">
                        <input type="hidden" name="categoria" value="<?= e($categoria) ?>">
                        <input type="hidden" name="tipo" value="<?= e($tipo) ?>">
                        <input type="hidden" name="volver" value="explore">
                        <input type="hidden" name="accion" value="<?= $autorSiguiendo ? 'desalistar' : 'alistar' ?>">
                        <button type="submit" class="follow author-follow <?= $autorSiguiendo ? 'active' : '' ?>"><?= $autorSiguiendo ? 'Siguiendo' : 'Seguir legado' ?></button>
                      </form>
                    <?php endif; ?>
                  </div>
                </div>
              </article>
            <?php endforeach; ?>
          </div>
        <?php else: ?>
          <div class="explore-empty-mini panel">
            <h3>No encontramos cronistas para esta búsqueda</h3>
            <p>Prueba con su nombre, @usuario, una ruta histórica o una palabra relacionada con su especialidad.</p>
          </div>
        <?php endif; ?>
      </section>
    <?php endif; ?>

    <?php if ($mostrarEpocas): ?>
      <section class="explore-section-v135">
        <div class="explore-section-head">
          <div>
            <span class="kicker">Rutas de exploración</span>
            <h2>Épocas y temas activos</h2>
            <p>Abre una ruta para ver los relatos y autores conectados a esa categoría.</p>
          </div>
          <?php if ($categoria !== ''): ?><a class="text-link" href="<?= e(chronos_explore_url(['categoria' => ''])) ?>">Ver todas</a><?php endif; ?>
        </div>
        <?php if (!empty($categorias)): ?>
          <div class="explore-routes-grid">
            <?php foreach ($categorias as $item): ?>
              <?php $rutaInfoItem = chronos_ruta_info($item['categoria']); ?>
              <a class="explore-route-card <?= $categoria === $item['categoria'] ? 'active' : '' ?>" href="rutas.php?ruta=<?= urlencode($item['categoria']) ?>">
                <span class="ruta-mini-icon-v141"><i class="<?= e($rutaInfoItem['icono']) ?>"></i></span>
                <div>
                  <strong><?= e($item['categoria']) ?></strong>
                  <small><?= (int)$item['total'] ?> relato(s) conectados</small>
                </div>
                <i class="ri-arrow-right-up-line"></i>
              </a>
            <?php endforeach; ?>
          </div>
        <?php else: ?>
          <div class="explore-empty-mini panel">
            <h3>Aún no hay rutas creadas</h3>
            <p>Cuando los usuarios publiquen relatos con categoría, Chronos empezará a formar su mapa de épocas.</p>
          </div>
        <?php endif; ?>
      </section>
    <?php endif; ?>

    <?php if ($mostrarRelatos): ?>
      <section class="explore-section-v135">
        <div class="explore-section-head">
          <div>
            <span class="kicker">Relatos conectados</span>
            <h2><?= $hayFiltros ? 'Resultados encontrados' : 'Relatos recientes' ?></h2>
            <p>Abre el relato completo, comenta, archiva o visita el perfil de su autor.</p>
          </div>
          <a class="head-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a>
        </div>
        <?php if (!empty($relatos)): ?>
          <?php foreach ($relatos as $relato): ?>
            <?php
              $relatoAvatar = $relato['avatar'] ?: 'assets/img/avatar.svg';
              $autorPerfilUrl = ((int)$relato['usuario_id'] === (int)$usuario['id']) ? 'perfil.php' : ('autor.php?id=' . (int)$relato['usuario_id']);
              $relatoCategoria = $relato['categoria'] ?: ($relato['tema_favorito'] ?: ($relato['interes'] ?: 'Historia'));
              $rutaInfoRelato = chronos_ruta_info($relatoCategoria);
            ?>
            <article class="post real-post explore-story-card-v135">
              <div class="post-head">
                <a class="author-mini-link" href="<?= e($autorPerfilUrl) ?>"><img class="post-user-img" src="<?= e($relatoAvatar) ?>" alt="Avatar"></a>
                <div><strong><a class="author-name-link" href="<?= e($autorPerfilUrl) ?>"><?= e($relato['nombre']) ?></a> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relatoCategoria) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relatoCategoria) ?></a></strong><small>@<?= e($relato['usuario']) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?></small></div>
                <div class="post-menu">···</div>
              </div>
              <h2><a class="story-title-link" href="relato_ver.php?id=<?= (int)$relato['id'] ?>"><?= e($relato['titulo']) ?></a></h2>
              <p><?= nl2br(e(chronos_resumen($relato['contenido'], 440))) ?></p>
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
                  <input type="hidden" name="volver" value="explore">
                  <button type="submit" class="story-inline-action <?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'active-action' : '' ?>">
                    <span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span><?= ((int)($relato['usuario_archivado'] ?? 0) > 0) ? 'Preservado' : 'Preservar' ?>
                  </button>
                </form>
                <?php if ((int)$relato['usuario_id'] === (int)$usuario['id']): ?>
                  <a href="relato_editar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span>Editar</a>
                <?php endif; ?>
              </div>
            </article>
          <?php endforeach; ?>
        <?php else: ?>
          <section class="profile-empty-state archive-empty-state">
            <div class="profile-empty-visual">
              <img src="assets/icons/explorar.webp" alt="Explorar">
              <div class="empty-glow"></div>
            </div>
            <div class="profile-empty-copy">
              <span class="mini-label">Sin hallazgos</span>
              <h3>No encontramos relatos con esos filtros.</h3>
              <p>Prueba otra palabra, otra ruta o crea el primer relato conectado con este tema.</p>
              <a class="head-btn profile-empty-btn" href="relato.php"><i class="ri-quill-pen-line"></i> Crear relato</a>
            </div>
          </section>
        <?php endif; ?>
      </section>
    <?php endif; ?>
  </section>

  <aside class="rightbar explore-rightbar-v135">
    <section class="sidebox">
      <h3><span class="chronos-ui-icon mini-heading-icon icon-explorar" aria-hidden="true"></span> Mapa rápido</h3>
      <p class="explore-side-copy">Explorar ahora conecta búsquedas con relatos, perfiles públicos, categorías y acciones de seguimiento.</p>
      <div class="topic-row"><span>Vista activa</span><strong><?= e(ucfirst($tipo)) ?></strong></div>
      <div class="topic-row"><span>Búsqueda</span><strong><?= $busqueda !== '' ? e($busqueda) : 'Sin palabra' ?></strong></div>
      <div class="topic-row"><span>Ruta</span><strong><?= $categoria !== '' ? e($categoria) : 'Todas' ?></strong></div>
    </section>

    <section class="sidebox">
      <h3><i class="ri-user-star-line"></i> Autores sugeridos</h3>
      <p class="smart-suggestion-intro">Sugerencias según tus rutas, búsqueda y actividad reciente.</p>
      <?php if (!empty($autoresSugeridosSmart)): ?>
        <?php foreach ($autoresSugeridosSmart as $autor): ?>
          <?php
            $esMiUsuario = (int)$autor['id'] === (int)$usuario['id'];
            $autorSiguiendo = !$esMiUsuario && ((int)($autor['usuario_alistado'] ?? 0) > 0);
            $autorUrl = $esMiUsuario ? 'perfil.php' : ('autor.php?id=' . (int)$autor['id']);
          ?>
          <div class="trend author-discovery-row">
            <a class="author-mini-link" href="<?= e($autorUrl) ?>"><img src="<?= e($autor['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar de autor"></a>
            <div class="author-discovery-info">
              <span><a class="author-name-link" href="<?= e($autorUrl) ?>"><?= e($autor['nombre']) ?></a></span>
              <strong>@<?= e($autor['usuario']) ?> · <?= (int)$autor['total_relatos'] ?> relato(s)</strong>
              <small><?= (int)($autor['total_seguidores'] ?? 0) ?> seguidor(es)</small>
              <em><?= e($autor['sugerencia_motivo'] ?? 'Autor por descubrir') ?></em>
            </div>
            <?php if ($esMiUsuario): ?>
              <a class="follow author-follow self" href="perfil.php">Tu legado</a>
            <?php else: ?>
              <form method="post" action="seguir_toggle.php" class="follow-form">
                <input type="hidden" name="seguido_id" value="<?= (int)$autor['id'] ?>">
                <input type="hidden" name="q" value="<?= e($busqueda) ?>">
                <input type="hidden" name="categoria" value="<?= e($categoria) ?>">
                <input type="hidden" name="tipo" value="<?= e($tipo) ?>">
                <input type="hidden" name="volver" value="explore">
                <input type="hidden" name="accion" value="<?= $autorSiguiendo ? 'desalistar' : 'alistar' ?>">
                <button type="submit" class="follow author-follow <?= $autorSiguiendo ? 'active' : '' ?>"><?= $autorSiguiendo ? 'Siguiendo' : 'Seguir legado' ?></button>
              </form>
            <?php endif; ?>
          </div>
        <?php endforeach; ?>
      <?php else: ?>
        <p class="explore-side-copy">Aún no hay autores sugeridos con ese filtro. Cuando haya más rutas y perfiles, el Catalejo mejorará las señales.</p>
      <?php endif; ?>
    </section>

    <section class="sidebox">
      <h3><span class="chronos-ui-icon mini-heading-icon icon-archivar" aria-hidden="true"></span> Accesos</h3>
      <div class="route-card">
        <img src="assets/icons/archivar.webp" alt="Archivo personal">
        <div><span>Biblioteca</span><strong>Mi Archivo Histórico</strong><a class="text-link" href="archivo.php">Abrir archivo privado</a></div>
      </div>
      <div class="route-card">
        <img src="assets/icons/editar.webp" alt="Crear relato">
        <div><span>Nuevo legado</span><strong>Publica una historia</strong><a class="text-link" href="relato.php">Escribir ahora</a></div>
      </div>
    </section>
  </aside>
</main>
<script src="assets/js/no_zoom.js?v=503"></script>
<script src="assets/js/social_actions.js?v=503"></script>
</body>
</html>
