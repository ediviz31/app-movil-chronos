<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    header('Location: feed.php');
    exit;
}

$pdo = chronos_pdo();
$stmt = $pdo->prepare("SELECT p.id, p.usuario_id, p.titulo, p.categoria, p.contenido, p.imagen, p.creado_en,
        u.nombre, u.usuario, u.avatar, u.portada, u.tema_favorito, u.interes
    FROM publicaciones p
    INNER JOIN usuarios u ON u.id = p.usuario_id
    WHERE p.id = ?
    LIMIT 1");
$stmt->execute([$id]);
$relato = $stmt->fetch();

if (!$relato) {
    header('Location: feed.php');
    exit;
}

$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$autorAvatar = $relato['avatar'] ?: 'assets/img/avatar.svg';
$autorPortada = $relato['portada'] ?: 'assets/img/cover.svg';
$esPropio = chronos_puede_modificar_relato($relato, $usuario);
$autorPerfilUrl = $esPropio ? 'perfil.php' : ('autor.php?id=' . (int)$relato['usuario_id']);
$rutaInfoRelato = chronos_ruta_info($relato['categoria'] ?? '');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $accion = $_POST['accion'] ?? '';

    if ($accion === 'eco') {
        $stmtEco = $pdo->prepare('SELECT id FROM ecos WHERE publicacion_id = ? AND usuario_id = ? LIMIT 1');
        $stmtEco->execute([(int)$relato['id'], (int)$usuario['id']]);
        $ecoExistente = $stmtEco->fetch();

        if ($ecoExistente) {
            $stmt = $pdo->prepare('DELETE FROM ecos WHERE id = ? LIMIT 1');
            $stmt->execute([(int)$ecoExistente['id']]);
            header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&eco=quitado');
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO ecos (publicacion_id, usuario_id) VALUES (?, ?)');
        $stmt->execute([(int)$relato['id'], (int)$usuario['id']]);

        $nombreActor = trim((string)($usuario['nombre'] ?: $usuario['usuario'] ?: 'Un explorador'));
        chronos_crear_aviso_unico((int)$relato['usuario_id'], (int)$usuario['id'], 'eco', $nombreActor . ' dejó un eco en tu relato.', (int)$relato['id']);

        header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&eco=dado');
        exit;
    }

    if ($accion === 'archivar') {
        $stmtArchivo = $pdo->prepare('SELECT id FROM archivados WHERE publicacion_id = ? AND usuario_id = ? LIMIT 1');
        $stmtArchivo->execute([(int)$relato['id'], (int)$usuario['id']]);
        $archivoExistente = $stmtArchivo->fetch();

        if ($archivoExistente) {
            $stmt = $pdo->prepare('DELETE FROM archivados WHERE id = ? LIMIT 1');
            $stmt->execute([(int)$archivoExistente['id']]);
            header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&archivo=quitado');
            exit;
        }

        $stmt = $pdo->prepare('INSERT INTO archivados (publicacion_id, usuario_id) VALUES (?, ?)');
        $stmt->execute([(int)$relato['id'], (int)$usuario['id']]);
        header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&archivo=guardado');
        exit;
    }

    if ($accion === 'comentar') {
        $comentario = trim($_POST['comentario'] ?? '');
        if ($comentario === '' || (function_exists('mb_strlen') ? mb_strlen($comentario, 'UTF-8') : strlen($comentario)) < 2) {
            header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&comentario=vacio#comentarios');
            exit;
        }
        if ((function_exists('mb_strlen') ? mb_strlen($comentario, 'UTF-8') : strlen($comentario)) > 800) {
            header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&comentario=largo#comentarios');
            exit;
        }

        $parentId = filter_input(INPUT_POST, 'parent_id', FILTER_VALIDATE_INT) ?: null;
        $comentarioPadre = null;

        if ($parentId) {
            $stmtPadre = $pdo->prepare('SELECT c.id, c.usuario_id, u.nombre, u.usuario FROM comentarios c INNER JOIN usuarios u ON u.id = c.usuario_id WHERE c.id = ? AND c.publicacion_id = ? LIMIT 1');
            $stmtPadre->execute([$parentId, (int)$relato['id']]);
            $comentarioPadre = $stmtPadre->fetch() ?: null;
            if (!$comentarioPadre) {
                $parentId = null;
            }
        }

        $stmt = $pdo->prepare('INSERT INTO comentarios (publicacion_id, usuario_id, parent_id, contenido) VALUES (?, ?, ?, ?)');
        $stmt->execute([(int)$relato['id'], (int)$usuario['id'], $parentId, $comentario]);

        $nombreActor = trim((string)($usuario['nombre'] ?: $usuario['usuario'] ?: 'Un explorador'));
        if ($comentarioPadre && (int)$comentarioPadre['usuario_id'] !== (int)$usuario['id']) {
            chronos_crear_aviso((int)$comentarioPadre['usuario_id'], (int)$usuario['id'], 'respuesta', $nombreActor . ' respondió a tu aporte.', (int)$relato['id']);
        }
        if ((int)$relato['usuario_id'] !== (int)$usuario['id'] && (!$comentarioPadre || (int)$relato['usuario_id'] !== (int)$comentarioPadre['usuario_id'])) {
            chronos_crear_aviso((int)$relato['usuario_id'], (int)$usuario['id'], 'comentario', $nombreActor . ' comentó en tu relato.', (int)$relato['id']);
        }

        header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&comentario=creado#comentarios');
        exit;
    }

    if ($accion === 'eliminar_comentario') {
        $comentarioId = filter_input(INPUT_POST, 'comentario_id', FILTER_VALIDATE_INT);
        if (!$comentarioId) {
            header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&comentario=error#comentarios');
            exit;
        }

        $stmtComentario = $pdo->prepare('SELECT id, usuario_id FROM comentarios WHERE id = ? AND publicacion_id = ? LIMIT 1');
        $stmtComentario->execute([$comentarioId, (int)$relato['id']]);
        $comentarioActual = $stmtComentario->fetch();

        $puedeEliminarComentario = $comentarioActual && ((int)$comentarioActual['usuario_id'] === (int)$usuario['id']);
        if (!$puedeEliminarComentario) {
            header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&comentario=sin_permiso#comentarios');
            exit;
        }

        $stmt = $pdo->prepare('DELETE FROM comentarios WHERE id = ? AND publicacion_id = ? LIMIT 1');
        $stmt->execute([$comentarioId, (int)$relato['id']]);
        header('Location: relato_ver.php?id=' . (int)$relato['id'] . '&comentario=eliminado#comentarios');
        exit;
    }
}

$stmtStats = $pdo->prepare('SELECT
    (SELECT COUNT(*) FROM ecos WHERE publicacion_id = ?) AS total_ecos,
    (SELECT COUNT(*) FROM comentarios WHERE publicacion_id = ?) AS total_comentarios,
    (SELECT COUNT(*) FROM archivados WHERE publicacion_id = ?) AS total_archivos,
    (SELECT COUNT(*) FROM ecos WHERE publicacion_id = ? AND usuario_id = ?) AS usuario_dio_eco,
    (SELECT COUNT(*) FROM archivados WHERE publicacion_id = ? AND usuario_id = ?) AS usuario_archivado');
$stmtStats->execute([(int)$relato['id'], (int)$relato['id'], (int)$relato['id'], (int)$relato['id'], (int)$usuario['id'], (int)$relato['id'], (int)$usuario['id']]);
$statsRelato = $stmtStats->fetch() ?: ['total_ecos' => 0, 'total_comentarios' => 0, 'total_archivos' => 0, 'usuario_dio_eco' => 0, 'usuario_archivado' => 0];

$formatearContadorRelato = static function (int $numero): string {
    if ($numero >= 1000) {
        $valor = $numero / 1000;
        $texto = $numero >= 10000 ? number_format(round($valor), 0, ',', '.') : number_format($valor, 1, ',', '.');
        $texto = preg_replace('/,0$/', '', $texto);
        return $texto . ' mil';
    }

    return (string)$numero;
};

$contadorEtiqueta = static function (int $numero, string $singular, string $plural) use ($formatearContadorRelato): string {
    return $formatearContadorRelato($numero) . ' ' . ($numero === 1 ? $singular : $plural);
};

$contadorSoloNumero = static function (int $numero) use ($formatearContadorRelato): string {
    return $formatearContadorRelato($numero);
};

$stmtComentarios = $pdo->prepare('SELECT c.id, c.usuario_id, c.parent_id, c.contenido, c.creado_en, u.nombre, u.usuario, u.avatar
    FROM comentarios c
    INNER JOIN usuarios u ON u.id = c.usuario_id
    WHERE c.publicacion_id = ?
    ORDER BY c.creado_en ASC
    LIMIT 80');
$stmtComentarios->execute([(int)$relato['id']]);
$comentarios = $stmtComentarios->fetchAll();

$comentariosPorId = [];
$comentariosHijos = [];
$comentariosRaiz = [];
foreach ($comentarios as $filaComentario) {
    $comentariosPorId[(int)$filaComentario['id']] = $filaComentario;
}
foreach ($comentarios as $filaComentario) {
    $parentIdComentario = (int)($filaComentario['parent_id'] ?? 0);
    if ($parentIdComentario > 0 && isset($comentariosPorId[$parentIdComentario])) {
        $comentariosHijos[$parentIdComentario][] = $filaComentario;
    } else {
        $comentariosRaiz[] = $filaComentario;
    }
}


if (!function_exists('chronos_collect_respuestas_relato')) {
    function chronos_collect_respuestas_relato(int $comentarioId, array $comentariosHijos): array
    {
        $resultado = [];
        foreach ($comentariosHijos[$comentarioId] ?? [] as $hijoComentario) {
            $resultado[] = $hijoComentario;
            $resultado = array_merge($resultado, chronos_collect_respuestas_relato((int)$hijoComentario['id'], $comentariosHijos));
        }
        return $resultado;
    }
}

if (!function_exists('chronos_render_comentario_relato')) {
    function chronos_render_comentario_relato(array $comentario, array $comentariosHijos, array $usuarioActual, array $relatoActual, int $nivel = 0): void
    {
        $comentarioId = (int)$comentario['id'];
        $comentarioPerfilUrl = ((int)$comentario['usuario_id'] === (int)$usuarioActual['id']) ? 'perfil.php' : ('autor.php?id=' . (int)$comentario['usuario_id']);
        $avatarComentario = $comentario['avatar'] ?: 'assets/img/avatar.svg';
        $aliasComentario = trim((string)($comentario['usuario'] ?: 'explorador'));
        $nombreComentario = trim((string)($comentario['nombre'] ?: $aliasComentario));
        $esAutorComentario = (int)$comentario['usuario_id'] === (int)$relatoActual['usuario_id'];
        $esPropioComentario = (int)$comentario['usuario_id'] === (int)$usuarioActual['id'];
        $nivelSeguro = min(max($nivel, 0), 1);
        $hijosComentario = $nivelSeguro === 0 ? chronos_collect_respuestas_relato($comentarioId, $comentariosHijos) : [];
        ?>
        <article class="comment-item social-comment chronos-thread-comment <?= $nivelSeguro > 0 ? 'is-reply' : 'is-root' ?>" data-comment-id="<?= $comentarioId ?>" style="--reply-level:<?= $nivelSeguro ?>">
          <a class="author-mini-link" href="<?= e($comentarioPerfilUrl) ?>"><img src="<?= e($avatarComentario) ?>" alt="Avatar de <?= e($nombreComentario) ?>"></a>
          <div class="comment-bubble">
            <details class="comment-corner-menu">
              <summary aria-label="Opciones del aporte"><i class="ri-more-2-fill"></i></summary>
              <div class="comment-corner-dropdown">
                <?php if ($esPropioComentario): ?>
                  <form method="post" class="comment-delete-form comment-delete-inline" onsubmit="return confirm('¿Eliminar este aporte? Si tiene respuestas, también se quitarán de este hilo.');">
                    <input type="hidden" name="accion" value="eliminar_comentario">
                    <input type="hidden" name="comentario_id" value="<?= $comentarioId ?>">
                    <button type="submit"><i class="ri-delete-bin-line"></i> Eliminar aporte</button>
                  </form>
                <?php else: ?>
                  <a class="comment-report-link" href="reportar.php?tipo=comentario&id=<?= $comentarioId ?>"><i class="ri-flag-line"></i> Señalar aporte</a>
                <?php endif; ?>
              </div>
            </details>
            <div class="comment-meta">
              <strong><a class="author-name-link" href="<?= e($comentarioPerfilUrl) ?>"><?= e($nombreComentario) ?></a></strong>
              <span>@<?= e($aliasComentario) ?> · <?= e(chronos_fecha_relativa($comentario['creado_en'])) ?></span>
              <?php if ($esAutorComentario): ?><em>Autor</em><?php endif; ?>
            </div>
            <p><?= nl2br(e($comentario['contenido'])) ?></p>
            <div class="comment-action-row">
              <button type="button" class="comment-action-link js-reply-comment" data-parent-id="<?= $comentarioId ?>" data-reply-user="<?= e($aliasComentario) ?>" data-reply-name="<?= e($nombreComentario) ?>"><i class="ri-reply-line"></i> Responder</button>
              <span><i class="ri-heart-3-line"></i> Apreciar</span>
            </div>
            <?php if (!empty($hijosComentario)): ?>
              <details class="comment-replies-wrap" open>
                <summary><span></span> Ver respuestas (<?= count($hijosComentario) ?>)</summary>
                <div class="comment-replies-list">
                  <?php foreach ($hijosComentario as $comentarioHijo): ?>
                    <?php chronos_render_comentario_relato($comentarioHijo, $comentariosHijos, $usuarioActual, $relatoActual, 1); ?>
                  <?php endforeach; ?>
                </div>
              </details>
            <?php endif; ?>
          </div>
        </article>
        <?php
    }
}

$mensaje = '';
if (isset($_GET['relato'])) {
    if ($_GET['relato'] === 'editado') {
        $mensaje = mensaje_auth('success', 'Tu relato se actualizó correctamente.');
    } elseif ($_GET['relato'] === 'creado') {
        $mensaje = mensaje_auth('success', 'Tu relato se publicó correctamente.');
    }
}
if (isset($_GET['archivo'])) {
    if ($_GET['archivo'] === 'guardado') {
        $mensaje = mensaje_auth('success', 'Relato preservado en tu Archivo Histórico privado. Solo tú puedes verlo aquí.');
    } elseif ($_GET['archivo'] === 'quitado') {
        $mensaje = mensaje_auth('info', 'Relato quitado de tu Archivo Histórico privado.');
    }
}
if (isset($_GET['comentario'])) {
    if ($_GET['comentario'] === 'creado') {
        $mensaje = mensaje_auth('success', 'Tu aporte se agregó al relato.');
    } elseif ($_GET['comentario'] === 'vacio') {
        $mensaje = mensaje_auth('error', 'Escribe un aporte antes de publicarlo.');
    } elseif ($_GET['comentario'] === 'largo') {
        $mensaje = mensaje_auth('error', 'El aporte es muy largo. Usa máximo 800 caracteres.');
    } elseif ($_GET['comentario'] === 'eliminado') {
        $mensaje = mensaje_auth('info', 'El aporte se eliminó correctamente.');
    } elseif ($_GET['comentario'] === 'sin_permiso') {
        $mensaje = mensaje_auth('error', 'No puedes eliminar ese aporte.');
    } elseif ($_GET['comentario'] === 'error') {
        $mensaje = mensaje_auth('error', 'No se pudo procesar ese aporte.');
    }
}
if (isset($_GET['reporte'])) {
    if ($_GET['reporte'] === 'creado') {
        $mensaje = mensaje_auth('success', 'Gracias. Tu reporte quedó en revisión para los guardianes de Chronos.');
    } elseif ($_GET['reporte'] === 'duplicado') {
        $mensaje = mensaje_auth('info', 'Ya habías enviado una señal sobre este contenido. Sigue en revisión.');
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · <?= e($relato['titulo']) ?></title>
  <link rel="stylesheet" href="assets/css/styles.css?v=1623">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body class="relato-modal-page">
<?php include __DIR__ . '/includes/topbar.php'; ?>
<a class="story-modal-close" href="feed.php" title="Cerrar relato"><i class="ri-close-line"></i></a>

<main class="story-view-shell story-modal-shell">
  <article class="story-view-card story-premium-view">
    <?php if (!empty($relato['imagen'])): ?>
      <div class="story-view-image"><span class="chronos-media-badge">Crónica visual</span><img src="<?= e($relato['imagen']) ?>" alt="Imagen del relato"></div>
    <?php else: ?>
      <div class="story-view-image"><span class="chronos-media-badge">Crónica visual</span><img src="<?= e($autorPortada) ?>" alt="Portada del autor"></div>
    <?php endif; ?>

    <div class="story-view-body">
      <?php if ($mensaje): ?><?= $mensaje ?><?php endif; ?>
      <div class="post-head story-view-author">
        <a class="author-mini-link" href="<?= e($autorPerfilUrl) ?>"><img class="post-user-img" src="<?= e($autorAvatar) ?>" alt="Avatar del autor"></a>
        <div><strong><a class="author-name-link" href="<?= e($autorPerfilUrl) ?>"><?= e($relato['nombre']) ?></a> <a class="route-chip-link" href="rutas.php?ruta=<?= urlencode($relato['categoria']) ?>"><i class="<?= e($rutaInfoRelato['icono']) ?>"></i><?= e($relato['categoria']) ?></a></strong><small>@<?= e($relato['usuario']) ?> · <?= e(chronos_fecha_relativa($relato['creado_en'])) ?></small></div>
        <details class="story-corner-menu">
          <summary aria-label="Opciones de la crónica"><i class="ri-more-2-fill"></i></summary>
          <div class="story-corner-dropdown">
            <?php if (!$esPropio): ?>
              <a href="reportar.php?tipo=relato&id=<?= (int)$relato['id'] ?>"><i class="ri-flag-line"></i> Señalar crónica</a>
            <?php else: ?>
              <a href="relato_editar.php?id=<?= (int)$relato['id'] ?>"><i class="ri-edit-line"></i> Editar crónica</a>
              <a href="relato_eliminar.php?id=<?= (int)$relato['id'] ?>"><i class="ri-delete-bin-line"></i> Eliminar crónica</a>
            <?php endif; ?>
          </div>
        </details>
      </div>

      <span class="kicker">Crónica completa</span>
      <h1><?= e($relato['titulo']) ?></h1>
      <div class="story-content-full"><?= nl2br(e($relato['contenido'])) ?></div>

      <section class="social-thread" id="comentarios">
        <div class="social-action-bar chronos-icon-stats-bar">
          <form method="post" class="eco-form social-action-form">
            <input type="hidden" name="accion" value="eco">
            <button class="social-action social-action-count chronos-icon-stat <?= ((int)($statsRelato['usuario_dio_eco'] ?? 0) > 0) ? 'active eco-active' : '' ?>" type="submit" title="Eco">
              <span class="chronos-ui-icon icon-eco" aria-hidden="true"></span>
              <span class="action-inline-count"><?= e($contadorSoloNumero((int)($statsRelato['total_ecos'] ?? 0))) ?></span>
            </button>
          </form>
          <a class="social-action social-action-count chronos-icon-stat" href="#comentar" title="Aportes">
            <span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span>
            <span class="action-inline-count"><?= e($contadorSoloNumero((int)($statsRelato['total_comentarios'] ?? 0))) ?></span>
          </a>
          <button class="social-action chronos-diffuse-action chronos-diffuse-btn chronos-icon-stat chronos-icon-only-action" type="button" title="Copiar enlace de esta crónica" data-copy-path="relato_ver.php?id=<?= (int)$relato['id'] ?>" aria-label="Difundir">
            <span class="chronos-ui-icon icon-compartir" aria-hidden="true"></span>
          </button>
          <form method="post" class="eco-form social-action-form">
            <input type="hidden" name="accion" value="archivar">
            <button class="social-action social-action-count chronos-icon-stat <?= ((int)($statsRelato['usuario_archivado'] ?? 0) > 0) ? 'active' : '' ?>" type="submit" title="Preservar">
              <span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span>
              <span class="action-inline-count"><?= e($contadorSoloNumero((int)($statsRelato['total_archivos'] ?? 0))) ?></span>
            </button>
          </form>
        </div>

        <div class="comment-thread-head">
          <div class="thread-title-line">
            <span>Conversación</span>
            <b>·</b>
            <strong><?= (int)($statsRelato['total_comentarios'] ?? 0) ?></strong>
          </div>
          <span class="thread-counter">Más recientes</span>
        </div>

        <div class="comments-list social-comments-list">
          <?php if (!empty($comentariosRaiz)): ?>
            <?php foreach ($comentariosRaiz as $comentario): ?>
              <?php chronos_render_comentario_relato($comentario, $comentariosHijos, $usuario, $relato); ?>
            <?php endforeach; ?>
          <?php else: ?>
            <div class="empty-comments social-empty-comments">
              <span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span>
              <strong>Aún no hay aportes en esta crónica.</strong>
              <span>Sé el primero en aportar con respeto sobre esta crónica.</span>
            </div>
          <?php endif; ?>
        </div>

        <form method="post" class="comment-form-social" id="comentar">
          <input type="hidden" name="accion" value="comentar">
          <input type="hidden" name="parent_id" id="commentParentId" value="">
          <img src="<?= e($avatarUsuario) ?>" alt="Tu avatar">
          <div class="comment-compose-stack">
            <div class="comment-reply-target" id="commentReplyTarget" hidden>
              <span>Respondiendo a <strong id="commentReplyUser"></strong></span>
              <button type="button" id="cancelReplyTarget" aria-label="Cancelar respuesta"><i class="ri-close-line"></i></button>
            </div>
            <div class="comment-compose-field">
              <textarea name="comentario" rows="1" maxlength="800" placeholder="Aporta a esta crónica..."></textarea>
              <div class="comment-compose-tools" aria-hidden="true">
                <i class="ri-image-line"></i>
                <i class="ri-emotion-line"></i>
                <span>GIF</span>
              </div>
            </div>
            <small class="legacy-comment-reminder"><i class="ri-shield-check-line"></i> Comenta con respeto. <a href="codigo_legado.php">Ver Código del Legado</a></small>
          </div>
          <button class="social-send" type="submit">
            <span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span>
            Aportar
          </button>
        </form>
      </section>

      <div class="story-detail-actions">
        <a class="head-btn" href="feed.php"><i class="ri-arrow-left-line"></i> Volver al feed</a>
        <a class="auth-secondary" href="perfil.php"><i class="ri-user-star-line"></i> Mi legado</a>
        <?php if ($esPropio): ?>
          <a class="auth-secondary action-edit" href="relato_editar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-editar" aria-hidden="true"></span> Editar</a>
          <a class="auth-secondary danger-outline action-delete" href="relato_eliminar.php?id=<?= (int)$relato['id'] ?>"><span class="chronos-ui-icon icon-eliminar" aria-hidden="true"></span> Eliminar</a>
        <?php endif; ?>
      </div>
    </div>
  </article>

  <aside class="story-side-panel sidebox">
    <h3><span class="chronos-ui-icon icon-comentar mini-heading-icon" aria-hidden="true"></span> Conversación</h3>
    <p class="story-side-copy">Esta crónica reúne ecos, aportes y preservados sin perder el tono respetuoso de Chronos.</p>
    <div class="story-mini-stats">
      <div><strong><?= (int)($statsRelato['total_ecos'] ?? 0) ?></strong><span>Ecos</span></div>
      <div><strong><?= (int)($statsRelato['total_comentarios'] ?? 0) ?></strong><span>Aportes</span></div>
      <div><strong><?= (int)($statsRelato['total_archivos'] ?? 0) ?></strong><span>Preservados</span></div>
      <div><strong><?= ((int)($statsRelato['usuario_dio_eco'] ?? 0) > 0) ? 'Sí' : 'No' ?></strong><span>Tu eco</span></div>
    </div>
    <a class="head-btn story-comment-jump" href="#comentarios"><span class="chronos-ui-icon icon-comentar" aria-hidden="true"></span> Ir a la conversación</a>
    <a class="auth-secondary story-code-link" href="codigo_legado.php"><i class="ri-shield-check-line"></i> Código del Legado</a>
  </aside>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
<script src="assets/js/autogrow_comment.js?v=40"></script>
<script src="assets/js/social_actions.js?v=502"></script>
<script>
(function(){
  const form = document.getElementById('comentar');
  if (!form) return;
  const parentInput = document.getElementById('commentParentId');
  const targetBox = document.getElementById('commentReplyTarget');
  const targetUser = document.getElementById('commentReplyUser');
  const cancelBtn = document.getElementById('cancelReplyTarget');
  const textarea = form.querySelector('textarea[name="comentario"]');
  const sendBtn = form.querySelector('.social-send');

  const resetReply = function(){
    parentInput.value = '';
    targetUser.textContent = '';
    targetBox.hidden = true;
    textarea.placeholder = 'Aporta a esta crónica...';
    sendBtn.lastChild.textContent = ' Aportar';
  };

  document.querySelectorAll('.js-reply-comment').forEach(function(button){
    button.addEventListener('click', function(){
      const parentId = button.getAttribute('data-parent-id');
      const alias = button.getAttribute('data-reply-user') || 'usuario';
      parentInput.value = parentId;
      targetUser.textContent = '@' + alias;
      targetBox.hidden = false;
      textarea.placeholder = 'Escribe tu respuesta...';
      sendBtn.lastChild.textContent = ' Responder';
      textarea.focus();
    });
  });

  if (cancelBtn) {
    cancelBtn.addEventListener('click', function(){
      resetReply();
      textarea.focus();
    });
  }
})();
</script>
</body>
</html>
