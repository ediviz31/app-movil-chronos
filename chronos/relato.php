<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';

$mensaje = mensaje_auth_vacio();
$titulo = trim($_POST['titulo'] ?? '');
$categoria = trim($_POST['categoria'] ?? ($usuario['tema_favorito'] ?: 'México antiguo'));
$contenido = trim($_POST['contenido'] ?? '');

$rutasCatalogo = chronos_rutas_catalogo();
if ($categoria !== '' && !isset($rutasCatalogo[$categoria])) {
    $rutasCatalogo = [$categoria => chronos_ruta_info($categoria)] + $rutasCatalogo;
}
$rutaActual = chronos_ruta_info($categoria);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if ($titulo === '' || $contenido === '' || $categoria === '') {
        $mensaje = mensaje_auth('error', 'Escribe un título, una ruta histórica y el contenido de tu relato.');
    } elseif (mb_strlen($titulo) > 180) {
        $mensaje = mensaje_auth('error', 'El título debe tener máximo 180 caracteres.');
    } elseif (mb_strlen($contenido) > 2500) {
        $mensaje = mensaje_auth('error', 'El relato debe tener máximo 2500 caracteres por ahora.');
    } else {
        try {
            $imagen = chronos_subir_imagen_usuario('imagen', (int)$usuario['id'], 'relatos');
            $pdo = chronos_pdo();
            $stmt = $pdo->prepare('INSERT INTO publicaciones (usuario_id, titulo, categoria, contenido, imagen) VALUES (?, ?, ?, ?, ?)');
            $stmt->execute([(int)$usuario['id'], $titulo, $categoria, $contenido, $imagen]);
            $nuevoId = (int)$pdo->lastInsertId();
            header('Location: relato_ver.php?id=' . $nuevoId . '&relato=creado');
            exit;
        } catch (RuntimeException $e) {
            $mensaje = mensaje_auth('error', $e->getMessage());
        } catch (PDOException $e) {
            $mensaje = mensaje_auth('error', 'No se pudo guardar el relato. Revisa la base de datos e intenta nuevamente.');
        }
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Crear relato</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="creator-shell">
  <aside class="creator-preview-card">
    <div class="creator-preview-cover" style="background-image:url('<?= e($portadaUsuario) ?>')"></div>
    <div class="creator-preview-inner">
      <div class="creator-preview-label"><i class="ri-eye-line"></i> Vista previa del legado</div>
      <article class="preview-story-card">
        <div class="preview-author-row">
          <img src="<?= e($avatarUsuario) ?>" alt="Avatar">
          <div>
            <strong><?= e($nombreUsuario) ?></strong>
            <small>@<?= e($aliasUsuario) ?> · Borrador</small>
          </div>
        </div>
        <div class="preview-image-frame is-empty is-clickable-upload" data-preview-image-frame role="button" tabindex="0" aria-label="Elegir imagen del relato">
          <div class="preview-image-placeholder" data-preview-placeholder>
            <i class="ri-image-add-line"></i>
            <span>Haz clic aquí para subir una imagen</span>
          </div>
          <img src="" alt="Vista previa de imagen" data-preview-image hidden>
        </div>
        <span class="preview-route-pill" data-preview-route><i class="<?= e($rutaActual['icono']) ?>"></i> <?= e($categoria ?: 'Ruta histórica') ?></span>
        <h1 data-preview-title><?= e($titulo ?: 'Título de tu relato') ?></h1>
        <p data-preview-content><?= e($contenido ? chronos_resumen($contenido, 220) : 'Aquí verás una vista previa del fragmento histórico, memoria, hallazgo o crónica que estás construyendo antes de publicarlo.') ?></p>
      </article>
      <div class="creator-privacy-note">
        <i class="ri-megaphone-line"></i>
        <div><strong>Relato público</strong><span>Al publicarlo, aparecerá en el feed, tu perfil público y la ruta histórica seleccionada.</span></div>
      </div>
    </div>
  </aside>

  <section class="creator-workshop-card">
    <div class="creator-workshop-head">
      <span class="auth-icon"><i class="ri-quill-pen-line"></i></span>
      <div>
        <span class="kicker">Taller de Chronos</span>
        <h2>Construir nuevo relato</h2>
        <p>No es solo publicar: estás agregando una pieza al mapa histórico de Chronos.</p>
      </div>
    </div>

    <?= $mensaje ?>

    <form class="auth-form story-form story-creator-form" action="relato.php" method="post" enctype="multipart/form-data" data-auth-form data-real-form="true" novalidate>
      <section class="creator-step">
        <div class="creator-step-head"><span>1</span><div><h3>Elige la ruta del relato</h3><p>Esto ayuda a que otros exploradores encuentren tu publicación por época, civilización o memoria.</p></div></div>
        <div class="route-picker-grid">
          <?php foreach ($rutasCatalogo as $nombreRuta => $rutaMeta): ?>
            <?php $seleccionada = $categoria === $nombreRuta; ?>
            <label class="route-option">
              <input class="route-radio-input" type="radio" name="categoria" value="<?= e($nombreRuta) ?>" <?= $seleccionada ? 'checked' : '' ?> data-route-icon="<?= e($rutaMeta['icono'] ?? 'ri-route-line') ?>" data-route-epoch="<?= e($rutaMeta['epoca'] ?? 'Ruta histórica') ?>" data-route-description="<?= e($rutaMeta['descripcion'] ?? '') ?>">
              <span class="route-card-inner">
                <i class="<?= e($rutaMeta['icono'] ?? 'ri-route-line') ?>"></i>
                <strong><?= e($nombreRuta) ?></strong>
                <small><?= e($rutaMeta['epoca'] ?? 'Ruta histórica') ?></small>
              </span>
            </label>
          <?php endforeach; ?>
        </div>
      </section>

      <section class="creator-step">
        <div class="creator-step-head"><span>2</span><div><h3>Dale un título con intención</h3><p>Piensa en una frase que invite a leer el hallazgo, la leyenda o la memoria.</p></div></div>
        <label class="creator-field">
          <span>Título del relato</span>
          <div class="auth-input"><i class="ri-heading"></i><input type="text" name="titulo" maxlength="180" placeholder="Ej. La noche en que el templo volvió a respirar" value="<?= e($titulo) ?>" data-required="título del relato" data-live-title></div>
          <small class="field-helper"><b data-count-for="titulo">0</b>/180 caracteres</small>
        </label>
      </section>

      <section class="creator-step">
        <div class="creator-step-head"><span>3</span><div><h3>Cuenta la crónica</h3><p>Un buen relato puede responder: ¿qué pasó?, ¿dónde ocurrió?, ¿qué detalle lo hace valioso?</p></div></div>
        <label class="creator-field">
          <span>Contenido</span>
          <div class="auth-input auth-textarea story-textarea"><i class="ri-scroll-to-bottom-line"></i><textarea name="contenido" maxlength="2500" placeholder="Cuenta el hallazgo, la leyenda, el personaje, la visita, el documento o el fragmento histórico que quieres preservar..." data-required="contenido del relato" data-live-content><?= e($contenido) ?></textarea></div>
          <small class="field-helper"><b data-count-for="contenido">0</b>/2500 caracteres</small>
        </label>
      </section>

      <section class="creator-step">
        <div class="creator-step-head"><span>4</span><div><h3>Acompaña con una imagen</h3><p>Puede ser una foto, mapa, ruina, documento, objeto antiguo o imagen relacionada con el relato.</p></div></div>
        <label class="setup-upload file-upload-card story-upload creator-upload">
          <input type="file" name="imagen" accept="image/png,image/jpeg,image/webp,image/gif" data-live-image>
          <i class="ri-image-add-line"></i><strong>Elegir imagen del relato</strong><small data-file-label>Opcional · JPG, PNG, WEBP o GIF · máx. 3 MB</small>
        </label>
      </section>

      <section class="creator-final-note">
        <i class="ri-shield-check-line"></i>
        <div>
          <strong>Revisión final</strong>
          <span>Antes de publicar, revisa la vista previa. Este relato será parte de tu legado público y deberá respetar el <a href="codigo_legado.php">Código del Legado</a>.</span>
        </div>
      </section>

      <div class="creator-actions">
        <button class="auth-submit" type="submit" data-loading-text="Preservando relato…"><i class="ri-sparkling-2-line"></i> <span>Preservar relato</span></button>
        <a class="auth-link-muted" href="feed.php">Cancelar y volver al feed</a>
      </div>
    </form>
  </section>
</main>
<script src="assets/js/auth.js?v=21"></script>
<script src="assets/js/relato_editor.js?v=490"></script>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
