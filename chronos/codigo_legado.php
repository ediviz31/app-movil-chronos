<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$nombreUsuario = $usuario['nombre'] ?: 'Explorador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'usuario';
$esAdmin = chronos_es_admin($usuario);
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Código del Legado</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="shell single-column-shell legacy-code-shell">
  <section class="legacy-code-hero panel">
    <div class="legacy-code-emblem"><i class="ri-shield-star-line"></i></div>
    <div>
      <span class="kicker">Guardianes de Chronos</span>
      <h1>Código del Legado</h1>
      <p>Chronos es una comunidad para compartir historia, memoria, relatos, exploraciones y legado. Aquí se puede debatir, corregir y aportar contexto, pero sin humillar ni atacar a quien comparte.</p>
    </div>
    <a class="head-btn" href="feed.php"><i class="ri-arrow-left-line"></i> Volver al feed</a>
  </section>

  <section class="legacy-code-principles">
    <article class="legacy-principle-card panel">
      <i class="ri-quill-pen-line"></i>
      <span>Principio I</span>
      <h2>Respeta el relato</h2>
      <p>Cada crónica puede venir de una investigación, una memoria familiar, un viaje, una leyenda o una exploración personal. Puedes preguntar o aportar, pero no ridiculizar.</p>
    </article>
    <article class="legacy-principle-card panel">
      <i class="ri-discuss-line"></i>
      <span>Principio II</span>
      <h2>Debate ideas, no personas</h2>
      <p>Chronos permite contrastar datos históricos y corregir información. La crítica debe ir al contenido, nunca a la dignidad del autor o de otros exploradores.</p>
    </article>
    <article class="legacy-principle-card panel">
      <i class="ri-compass-3-line"></i>
      <span>Principio III</span>
      <h2>Mantén la ruta histórica</h2>
      <p>El sitio existe para historia, memoria, cultura, rutas, personajes, documentos y lugares con significado. Evita convertirlo en spam, memes ofensivos o contenido fuera del propósito.</p>
    </article>
  </section>

  <section class="legacy-code-grid">
    <article class="legacy-code-card panel">
      <span class="kicker">Lo que sí fortalece Chronos</span>
      <h2>Buenas prácticas del explorador</h2>
      <ul class="legacy-rule-list good">
        <li><i class="ri-checkbox-circle-line"></i><span>Aportar contexto, fechas, fuentes o detalles útiles.</span></li>
        <li><i class="ri-checkbox-circle-line"></i><span>Preguntar con respeto cuando algo no queda claro.</span></li>
        <li><i class="ri-checkbox-circle-line"></i><span>Reconocer relatos valiosos con ecos, comentarios o preservados.</span></li>
        <li><i class="ri-checkbox-circle-line"></i><span>Corregir datos históricos sin burlarse del autor.</span></li>
        <li><i class="ri-checkbox-circle-line"></i><span>Reportar de forma responsable cuando algo rompe la convivencia.</span></li>
      </ul>
    </article>

    <article class="legacy-code-card panel danger">
      <span class="kicker">Lo que no debe crecer aquí</span>
      <h2>Señales que pueden ser reportadas</h2>
      <ul class="legacy-rule-list bad">
        <li><i class="ri-close-circle-line"></i><span>Insultos, burlas, humillación o ataques personales.</span></li>
        <li><i class="ri-close-circle-line"></i><span>Acoso, persecución o presión hacia otro usuario.</span></li>
        <li><i class="ri-close-circle-line"></i><span>Spam, promoción engañosa o publicaciones repetidas sin valor histórico.</span></li>
        <li><i class="ri-close-circle-line"></i><span>Exponer datos privados o contenido sensible de otra persona.</span></li>
        <li><i class="ri-close-circle-line"></i><span>Usar la comunidad para pleitos ajenos al tema histórico.</span></li>
      </ul>
    </article>
  </section>

  <section class="legacy-code-process panel">
    <div>
      <span class="kicker">Cómo funciona la moderación</span>
      <h2>Reportar no borra una crónica automáticamente</h2>
      <p>Un reporte es una señal para los guardianes. El contenido queda en revisión y un administrador decide si se atiende, se descarta o requiere seguimiento. Así Chronos evita castigos automáticos y cuida la comunidad con criterio.</p>
    </div>
    <div class="legacy-process-steps">
      <div><strong>1</strong><span>Un usuario señala una crónica o comentario.</span></div>
      <div><strong>2</strong><span>La Guardia revisa el contexto completo.</span></div>
      <div><strong>3</strong><span>Se marca como pendiente, en revisión, atendido o descartado.</span></div>
    </div>
  </section>

  <section class="legacy-code-footer panel">
    <i class="ri-lock-line"></i>
    <div>
      <span class="kicker">Privacidad y legado</span>
      <h2>El Archivo Histórico privado no forma parte de los reportes públicos</h2>
      <p>Seguir un legado, reportar contenido o participar en una conversación no da acceso al archivo privado de ningún usuario. Chronos separa el legado público de los recuerdos personales.</p>
    </div>
    <?php if ($esAdmin): ?>
      <a class="head-btn" href="admin_reportes.php"><i class="ri-shield-star-line"></i> Ir a Guardia</a>
    <?php else: ?>
      <a class="head-btn" href="explore.php"><i class="ri-compass-3-line"></i> Explorar Chronos</a>
    <?php endif; ?>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
