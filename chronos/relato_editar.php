<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id) {
    header('Location: perfil.php');
    exit;
}

$pdo = chronos_pdo();
$stmt = $pdo->prepare('SELECT id, usuario_id, titulo, categoria, contenido, imagen, creado_en FROM publicaciones WHERE id = ? AND usuario_id = ? LIMIT 1');
$stmt->execute([$id, (int)$usuario['id']]);
$relato = $stmt->fetch();

if (!$relato) {
    header('Location: perfil.php');
    exit;
}

$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$portadaUsuario = $usuario['portada'] ?: 'assets/img/cover.svg';

$mensaje = mensaje_auth_vacio();
$titulo = trim($_POST['titulo'] ?? $relato['titulo']);
$categoria = trim($_POST['categoria'] ?? $relato['categoria']);
$contenido = trim($_POST['contenido'] ?? $relato['contenido']);
$imagenActual = $relato['imagen'];

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
            $nuevaImagen = chronos_subir_imagen_usuario('imagen', (int)$usuario['id'], 'relatos');
            $imagenFinal = $nuevaImagen ?: $imagenActual;
            if ($nuevaImagen && $imagenActual) {
                chronos_eliminar_archivo_relato($imagenActual);
            }
            $stmt = $pdo->prepare('UPDATE publicaciones SET titulo = ?, categoria = ?, contenido = ?, imagen = ? WHERE id = ? AND usuario_id = ?');
            $stmt->execute([$titulo, $categoria, $contenido, $imagenFinal, $id, (int)$usuario['id']]);
            header('Location: relato_ver.php?id=' . $id . '&relato=editado');
            exit;
        } catch (RuntimeException $e) {
            $mensaje = mensaje_auth('error', $e->getMessage());
        } catch (PDOException $e) {
            $mensaje = mensaje_auth('error', 'No se pudo actualizar el relato. Revisa la base de datos e intenta nuevamente.');
        }
    }
}
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Editar relato</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="creator-shell">
  <aside class="creator-preview-card">
    <div class="creator-preview-cover" style="background-image:url('<?= e($imagenActual ?: $portadaUsuario) ?>')"></div>
    <div class="creator-preview-inner">
      <div class="creator-preview-label"><i class="ri-eye-line"></i> Vista previa de edición</div>
      <article class="preview-story-card">
        <div class="preview-author-row">
          <img src="<?= e($avatarUsuario) ?>" alt="Avatar">
          <div>
            <strong><?= e($nombreUsuario) ?></strong>
            <small>@<?= e($aliasUsuario) ?> · Editando</small>
          </div>
        </div>
        <div class="preview-image-frame has-current-image <?= $imagenActual ? 'has-image' : 'is-empty' ?> is-clickable-upload" data-preview-image-frame role="button" tabindex="0" aria-label="Cambiar imagen del relato">
          <div class="preview-image-placeholder" data-preview-placeholder <?= $imagenActual ? 'hidden' : '' ?>>
            <i class="ri-image-add-line"></i>
            <span>Haz clic aquí para subir una imagen</span>
          </div>
          <img src="<?= e($imagenActual ?: '') ?>" alt="Vista previa de imagen" data-preview-image <?= $imagenActual ? '' : 'hidden' ?>>
        </div>
        <span class="preview-route-pill" data-preview-route><i class="<?= e($rutaActual['icono']) ?>"></i> <?= e($categoria ?: 'Ruta histórica') ?></span>
        <h1 data-preview-title><?= e($titulo ?: 'Título de tu relato') ?></h1>
        <p data-preview-content><?= e($contenido ? chronos_resumen($contenido, 220) : 'Aquí verás una vista previa del fragmento histórico, memoria, hallazgo o crónica que estás actualizando.') ?></p>
      </article>
      <div class="creator-privacy-note">
        <i class="ri-edit-2-line"></i>
        <div><strong>Editando tu legado</strong><span>Los cambios se reflejarán en el feed, tu perfil público, el relato completo y su ruta histórica.</span></div>
      </div>
    </div>
  </aside>

  <section class="creator-workshop-card">
    <div class="creator-workshop-head">
      <span class="auth-icon"><i class="ri-edit-2-line"></i></span>
      <div>
        <span class="kicker">Taller de Chronos</span>
        <h2>Editar relato</h2>
        <p>Afina esta pieza de tu legado sin perder su conexión con rutas, perfil y feed.</p>
      </div>
    </div>

    <?= $mensaje ?>

    <form class="auth-form story-form story-creator-form" action="relato_editar.php?id=<?= (int)$id ?>" method="post" enctype="multipart/form-data" data-auth-form data-real-form="true" novalidate>
      <section class="creator-step">
        <div class="creator-step-head"><span>1</span><div><h3>Revisa la ruta histórica</h3><p>La ruta ayuda a que este relato viva dentro del mapa temático de Chronos.</p></div></div>
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
        <div class="creator-step-head"><span>2</span><div><h3>Ajusta el título</h3><p>Haz que el encabezado invite a entrar al relato completo.</p></div></div>
        <label class="creator-field">
          <span>Título del relato</span>
          <div class="auth-input"><i class="ri-heading"></i><input type="text" name="titulo" maxlength="180" value="<?= e($titulo) ?>" data-required="título del relato" data-live-title></div>
          <small class="field-helper"><b data-count-for="titulo">0</b>/180 caracteres</small>
        </label>
      </section>

      <section class="creator-step">
        <div class="creator-step-head"><span>3</span><div><h3>Afina la crónica</h3><p>Puedes corregir detalles, ampliar contexto o hacer que el texto sea más claro.</p></div></div>
        <label class="creator-field">
          <span>Contenido</span>
          <div class="auth-input auth-textarea story-textarea"><i class="ri-scroll-to-bottom-line"></i><textarea name="contenido" maxlength="2500" data-required="contenido del relato" data-live-content><?= e($contenido) ?></textarea></div>
          <small class="field-helper"><b data-count-for="contenido">0</b>/2500 caracteres</small>
        </label>
      </section>

      <section class="creator-step">
        <div class="creator-step-head"><span>4</span><div><h3>Conserva o cambia la imagen</h3><p>Si no eliges una nueva, Chronos conservará la imagen actual.</p></div></div>
        <?php if ($imagenActual): ?>
          <div class="current-story-image"><img src="<?= e($imagenActual) ?>" alt="Imagen actual"><span>Imagen actual</span></div>
        <?php endif; ?>
        <label class="setup-upload file-upload-card story-upload creator-upload">
          <input type="file" name="imagen" accept="image/png,image/jpeg,image/webp,image/gif" data-live-image>
          <i class="ri-image-add-line"></i><strong>Cambiar imagen</strong><small data-file-label>Opcional · si no eliges una nueva, se conserva la actual.</small>
        </label>
      </section>

      <section class="creator-final-note">
        <i class="ri-save-3-line"></i>
        <div>
          <strong>Guardar edición</strong>
          <span>Revisa la vista previa antes de actualizar este relato dentro de Chronos.</span>
        </div>
      </section>

      <div class="creator-actions">
        <button class="auth-submit" type="submit" data-loading-text="Guardando cambios…"><i class="ri-save-3-line"></i> <span>Guardar cambios</span></button>
        <a class="auth-link-muted" href="relato_ver.php?id=<?= (int)$id ?>">Cancelar edición</a>
      </div>
    </form>
  </section>
</main>
<script src="assets/js/auth.js?v=21"></script>
<script src="assets/js/relato_editor.js?v=490"></script>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
