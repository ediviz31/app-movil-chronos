<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
chronos_asegurar_tabla_avisos();
chronos_asegurar_tabla_seguidores();
$pdo = chronos_pdo();

$usuarioId = (int)$usuario['id'];
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';
chronos_reparar_avisos_seguimientos($usuarioId);

function chronos_aviso_meta(string $tipo): array
{
    $mapa = [
        'comentario' => [
            'nombre' => 'Comentario',
            'titulo' => 'Nueva voz en tu crónica',
            'detalle' => 'Alguien participó en uno de tus relatos.',
            'icono' => 'ri-chat-3-line',
            'clase' => 'comentario',
            'accion' => 'Abrir crónica',
        ],
        'eco' => [
            'nombre' => 'Eco',
            'titulo' => 'Eco recibido',
            'detalle' => 'Tu relato hizo resonar a otro explorador.',
            'icono' => 'ri-sound-module-line',
            'clase' => 'eco',
            'accion' => 'Ver eco',
        ],
        'alistarse' => [
            'nombre' => 'Seguidor',
            'titulo' => 'Nuevo seguidor de tu legado',
            'detalle' => 'Un explorador decidió seguir tus relatos.',
            'icono' => 'ri-user-follow-line',
            'clase' => 'seguidor',
            'accion' => 'Ver perfil',
        ],
        'seguir' => [
            'nombre' => 'Seguidor',
            'titulo' => 'Nuevo seguidor de tu legado',
            'detalle' => 'Un explorador decidió seguir tus relatos.',
            'icono' => 'ri-user-follow-line',
            'clase' => 'seguidor',
            'accion' => 'Ver perfil',
        ],
        'preservar' => [
            'nombre' => 'Preservado',
            'titulo' => 'Tu relato fue preservado',
            'detalle' => 'Alguien guardó tu crónica en su Archivo Histórico.',
            'icono' => 'ri-bookmark-3-line',
            'clase' => 'preservar',
            'accion' => 'Abrir crónica',
        ],
    ];

    return $mapa[$tipo] ?? [
        'nombre' => 'Aviso',
        'titulo' => 'Movimiento del legado',
        'detalle' => 'Hay actividad nueva en Chronos.',
        'icono' => 'ri-notification-3-line',
        'clase' => 'general',
        'accion' => 'Ver',
    ];
}

function chronos_aviso_mensaje(array $aviso): string
{
    $tipo = (string)($aviso['tipo'] ?? '');
    $actor = trim((string)($aviso['actor_nombre'] ?: $aviso['actor_usuario'] ?: 'Un explorador'));
    $titulo = trim((string)($aviso['relato_titulo'] ?? ''));

    if ($tipo === 'comentario') {
        return $actor . ' comentó en tu crónica' . ($titulo !== '' ? ': “' . $titulo . '”.' : '.');
    }

    if ($tipo === 'eco') {
        return $actor . ' dejó un eco en tu crónica' . ($titulo !== '' ? ': “' . $titulo . '”.' : '.');
    }

    if ($tipo === 'alistarse' || $tipo === 'seguir') {
        return $actor . ' ahora sigue tu legado.';
    }

    if ($tipo === 'preservar') {
        return $actor . ' preservó tu crónica' . ($titulo !== '' ? ': “' . $titulo . '”.' : '.');
    }

    $mensaje = (string)($aviso['mensaje'] ?? 'Movimiento nuevo en Chronos.');
    return str_replace(['se alistó a tu legado', 'se alista a tu legado'], ['ahora sigue tu legado', 'sigue tu legado'], $mensaje);
}

if (isset($_GET['leer']) && ctype_digit((string)$_GET['leer'])) {
    $avisoId = (int)$_GET['leer'];

    $stmtDestino = $pdo->prepare('SELECT publicacion_id, actor_id, tipo FROM avisos WHERE id = ? AND usuario_id = ? LIMIT 1');
    $stmtDestino->execute([$avisoId, $usuarioId]);
    $avisoDestino = $stmtDestino->fetch();

    if ($avisoDestino) {
        $stmtLeer = $pdo->prepare('UPDATE avisos SET leido = 1 WHERE id = ? AND usuario_id = ?');
        $stmtLeer->execute([$avisoId, $usuarioId]);

        if (!empty($avisoDestino['publicacion_id'])) {
            header('Location: relato_ver.php?id=' . (int)$avisoDestino['publicacion_id']);
            exit;
        }

        if (!empty($avisoDestino['actor_id'])) {
            if ((int)$avisoDestino['actor_id'] === $usuarioId) {
                header('Location: perfil.php');
                exit;
            }
            header('Location: autor.php?id=' . (int)$avisoDestino['actor_id']);
            exit;
        }
    }

    header('Location: avisos.php');
    exit;
}

if (isset($_GET['marcar']) && $_GET['marcar'] === 'leidos') {
    $stmt = $pdo->prepare('UPDATE avisos SET leido = 1 WHERE usuario_id = ? AND leido = 0');
    $stmt->execute([$usuarioId]);
    header('Location: avisos.php?estado=leidos');
    exit;
}

$filtrosPermitidos = ['todos', 'pendientes', 'comentario', 'eco', 'alistarse'];
$filtroActivo = isset($_GET['tipo']) ? (string)$_GET['tipo'] : 'todos';
if (!in_array($filtroActivo, $filtrosPermitidos, true)) {
    $filtroActivo = 'todos';
}

$totalAvisosPendientes = chronos_contar_avisos_no_leidos($usuarioId);

$stmtStats = $pdo->prepare("SELECT
    COUNT(*) AS total,
    SUM(CASE WHEN leido = 0 THEN 1 ELSE 0 END) AS pendientes,
    SUM(CASE WHEN tipo = 'comentario' THEN 1 ELSE 0 END) AS comentarios,
    SUM(CASE WHEN tipo = 'eco' THEN 1 ELSE 0 END) AS ecos,
    SUM(CASE WHEN tipo IN ('alistarse','seguir') THEN 1 ELSE 0 END) AS seguidores
    FROM avisos
    WHERE usuario_id = ?");
$stmtStats->execute([$usuarioId]);
$statsAvisos = $stmtStats->fetch() ?: ['total' => 0, 'pendientes' => 0, 'comentarios' => 0, 'ecos' => 0, 'seguidores' => 0];

$stmtStatsRed = $pdo->prepare('SELECT (SELECT COUNT(*) FROM seguidores WHERE seguido_id = ?) AS total_seguidores, (SELECT COUNT(*) FROM seguidores WHERE seguidor_id = ?) AS total_siguiendo');
$stmtStatsRed->execute([$usuarioId, $usuarioId]);
$statsRed = $stmtStatsRed->fetch() ?: ['total_seguidores' => 0, 'total_siguiendo' => 0];

$where = 'a.usuario_id = ?';
$params = [$usuarioId];
if ($filtroActivo === 'pendientes') {
    $where .= ' AND a.leido = 0';
} elseif ($filtroActivo === 'alistarse') {
    $where .= " AND a.tipo IN ('alistarse','seguir')";
} elseif ($filtroActivo !== 'todos') {
    $where .= ' AND a.tipo = ?';
    $params[] = $filtroActivo;
}

$stmtAvisos = $pdo->prepare("SELECT a.id, a.tipo, a.mensaje, a.leido, a.creado_en, a.publicacion_id, a.actor_id,
        u.nombre AS actor_nombre, u.usuario AS actor_usuario, u.avatar AS actor_avatar,
        p.titulo AS relato_titulo, p.categoria AS relato_categoria
    FROM avisos a
    LEFT JOIN usuarios u ON u.id = a.actor_id
    LEFT JOIN publicaciones p ON p.id = a.publicacion_id
    WHERE $where
    ORDER BY a.leido ASC, a.creado_en DESC
    LIMIT 100");
$stmtAvisos->execute($params);
$avisos = $stmtAvisos->fetchAll() ?: [];

$mensaje = '';
if (isset($_GET['estado']) && $_GET['estado'] === 'leidos') {
    $mensaje = mensaje_auth('success', 'Tus señales pendientes quedaron marcadas como leídas. El historial se conserva.');
}

$tabs = [
    'todos' => ['label' => 'Todo', 'count' => (int)$statsAvisos['total']],
    'pendientes' => ['label' => 'Pendientes', 'count' => (int)$statsAvisos['pendientes']],
    'comentario' => ['label' => 'Comentarios', 'count' => (int)$statsAvisos['comentarios']],
    'eco' => ['label' => 'Ecos', 'count' => (int)$statsAvisos['ecos']],
    'alistarse' => ['label' => 'Seguidores', 'count' => (int)$statsAvisos['seguidores']],
];
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Avisos</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell avisos-shell avisos-pro-shell">
  <section class="profile-hero-card avisos-hero avisos-hero-pro">
    <div class="profile-hero-cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
    <div class="profile-hero-content">
      <img class="profile-hero-avatar" src="assets/icons/avisos.webp" alt="Avisos Chronos">
      <div class="profile-hero-main">
        <span class="kicker">Movimiento del legado</span>
        <h1>Señales de Chronos</h1>
        <p>Revisa ecos, comentarios y nuevos seguidores sin perder el hilo de tus crónicas.</p>
      </div>
      <div class="profile-hero-actions">
        <?php if ((int)$statsAvisos['pendientes'] > 0): ?>
          <a class="head-btn" href="avisos.php?marcar=leidos"><span class="chronos-ui-icon icon-avisos" aria-hidden="true"></span> Marcar señales leídas</a>
        <?php endif; ?>
        <a class="auth-secondary profile-logout" href="perfil.php"><i class="ri-user-3-line"></i> Mi legado</a>
      </div>
    </div>
    <div class="profile-hero-stats avisos-hero-stats">
      <div><strong><?= (int)$statsAvisos['pendientes'] ?></strong><span>Pendientes</span></div>
      <div><strong><?= (int)$statsAvisos['comentarios'] ?></strong><span>Comentarios</span></div>
      <div><strong><?= (int)$statsAvisos['ecos'] ?></strong><span>Ecos</span></div>
      <div><strong><?= (int)$statsAvisos['seguidores'] ?></strong><span>Seguidores nuevos</span></div>
      <div><strong><?= (int)$statsRed['total_seguidores'] ?></strong><span>Seguidores</span></div>
      <div><strong><?= (int)$statsRed['total_siguiendo'] ?></strong><span>Siguiendo</span></div>
    </div>
  </section>

  <?= $mensaje ?>

  <section class="avisos-board">
    <section class="avisos-list panel avisos-panel-pro">
      <div class="avisos-list-head avisos-list-head-pro">
        <div><span class="kicker">Bitácora reciente</span><h2>Actividad de tu legado</h2><p>Todo queda ordenado por tipo para que sepas qué está pasando con tus relatos.</p></div>
        <a class="text-link" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar Chronos</a>
      </div>

      <nav class="avisos-tabs" aria-label="Filtros de avisos">
        <?php foreach ($tabs as $tabKey => $tab): ?>
          <a class="avisos-tab <?= $filtroActivo === $tabKey ? 'active' : '' ?>" href="avisos.php?tipo=<?= e($tabKey) ?>">
            <span><?= e($tab['label']) ?></span>
            <strong><?= (int)$tab['count'] ?></strong>
          </a>
        <?php endforeach; ?>
      </nav>

      <?php if (!empty($avisos)): ?>
        <div class="avisos-timeline">
        <?php foreach ($avisos as $aviso): ?>
          <?php
            $meta = chronos_aviso_meta((string)$aviso['tipo']);
            $actorNombre = $aviso['actor_nombre'] ?: 'Un explorador';
            $actorUsuario = $aviso['actor_usuario'] ?: 'chronos';
            $actorAvatar = $aviso['actor_avatar'] ?: 'assets/img/avatar.svg';
            $destino = 'avisos.php?leer=' . (int)$aviso['id'];
            $perfilActor = !empty($aviso['actor_id']) ? 'autor.php?id=' . (int)$aviso['actor_id'] : 'explore.php';
          ?>
          <article class="aviso-card aviso-<?= e($meta['clase']) ?> <?= (int)$aviso['leido'] === 0 ? 'unread' : '' ?>">
            <div class="aviso-type-mark"><i class="<?= e($meta['icono']) ?>"></i></div>
            <a class="aviso-avatar" href="<?= e($perfilActor) ?>"><img src="<?= e($actorAvatar) ?>" alt="Avatar de <?= e($actorNombre) ?>"></a>
            <div class="aviso-copy">
              <div class="aviso-card-top">
                <span class="aviso-kind"><?= e($meta['nombre']) ?></span>
                <?php if ((int)$aviso['leido'] === 0): ?><span class="aviso-new">Nuevo</span><?php endif; ?>
              </div>
              <strong><?= e($meta['titulo']) ?></strong>
              <p><?= e(chronos_aviso_mensaje($aviso)) ?></p>
              <small><a class="author-name-link" href="<?= e($perfilActor) ?>">@<?= e($actorUsuario) ?></a> · <?= e(chronos_fecha_relativa($aviso['creado_en'])) ?><?php if (!empty($aviso['relato_categoria'])): ?> · Ruta: <?= e($aviso['relato_categoria']) ?><?php endif; ?></small>
            </div>
            <a class="aviso-action" href="<?= e($destino) ?>"><i class="ri-arrow-right-line"></i> <?= e($meta['accion']) ?></a>
          </article>
        <?php endforeach; ?>
        </div>
      <?php else: ?>
        <section class="profile-empty-state archive-empty-state avisos-empty-state">
          <div class="profile-empty-visual"><img src="assets/icons/avisos.webp" alt="Avisos"><div class="empty-glow"></div></div>
          <div class="profile-empty-copy">
            <span class="mini-label">Sin señales en este filtro</span>
            <h3>No hay movimientos para mostrar.</h3>
            <p>Cuando otro usuario siga tu legado, comente o deje eco en una crónica, Chronos lo registrará aquí sin borrar tu historial.</p>
            <a class="head-btn profile-empty-btn" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Buscar autores</a>
          </div>
        </section>
      <?php endif; ?>
    </section>

    <aside class="avisos-side panel">
      <span class="kicker">Guía rápida</span>
      <h3>¿Cómo leer tus señales?</h3>
      <div class="aviso-guide-item"><i class="ri-chat-3-line"></i><div><strong>Comentarios</strong><span>Alguien participó en una de tus crónicas.</span></div></div>
      <div class="aviso-guide-item"><i class="ri-sound-module-line"></i><div><strong>Ecos</strong><span>Tu relato generó resonancia en otro explorador.</span></div></div>
      <div class="aviso-guide-item"><i class="ri-user-follow-line"></i><div><strong>Seguidores</strong><span>Un usuario decidió seguir tu legado público.</span></div></div>
      <div class="avisos-side-note">
        <strong>Privacidad</strong>
        <p>Estos avisos no muestran tu Archivo Histórico. Tus preservados siguen siendo privados y solo visibles para ti.</p>
      </div>
    </aside>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
