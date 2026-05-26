<?php
if (!isset($usuario) || !is_array($usuario)) {
    $usuario = usuario_actual();
}

$topbarNombre = $usuario['nombre'] ?? 'Explorador Chronos';
$topbarAlias = $usuario['usuario'] ?? 'usuario';
$topbarAvatar = !empty($usuario['avatar']) ? $usuario['avatar'] : 'assets/img/avatar.svg';
$topbarAvisos = ($usuario && function_exists('chronos_contar_avisos_no_leidos')) ? chronos_contar_avisos_no_leidos((int)$usuario['id']) : 0;
$topbarActual = basename($_SERVER['PHP_SELF'] ?? 'feed.php');
$topbarEsAdmin = chronos_es_admin($usuario ?? null);

if (!function_exists('chronos_nav_activo')) {
    function chronos_nav_activo(array $paginas, string $actual): string
    {
        return in_array($actual, $paginas, true) ? 'active' : '';
    }
}

$topbarAdminActivo = chronos_nav_activo(['admin_usuarios.php', 'admin_usuario_ver.php', 'admin_reportes.php'], $topbarActual);
$topbarUsuarioActivo = chronos_nav_activo(['perfil.php', 'perfil_inicial.php', 'legados.php', 'autor.php', 'codigo_legado.php'], $topbarActual);
?>
<header class="topbar topbar-v482">
  <div class="topbar-inner">
    <a class="brand" href="feed.php" aria-label="Ir al inicio de Chronos">
      <span class="brand-mark">C</span>
      <span><strong>Chronos</strong><small>Sala histórica digital</small></span>
    </a>

    <form class="global-search" action="explore.php" method="get">
      <i class="ri-search-line" aria-hidden="true"></i>
      <input name="q" placeholder="Buscar épocas, relatos o @cronistas">
    </form>

    <nav class="topnav topnav-clean" aria-label="Navegación principal">
      <a class="<?= chronos_nav_activo(['feed.php', 'index.php'], $topbarActual) ?>" href="feed.php"><i class="ri-home-5-line"></i> Inicio</a>
      <a class="<?= chronos_nav_activo(['explore.php'], $topbarActual) ?>" href="explore.php"><span class="chronos-ui-icon icon-explorar" aria-hidden="true"></span> Explorar</a>
      <a class="<?= chronos_nav_activo(['rutas.php'], $topbarActual) ?>" href="rutas.php"><i class="ri-compass-3-line"></i> Rutas</a>
      <a class="<?= chronos_nav_activo(['archivo.php'], $topbarActual) ?>" href="archivo.php"><span class="chronos-ui-icon icon-archivar" aria-hidden="true"></span> Archivo</a>
      <?php if ($topbarEsAdmin): ?>
        <details class="nav-dropdown guardia-dropdown">
          <summary class="nav-drop-trigger <?= $topbarAdminActivo ?>"><i class="ri-shield-star-line"></i> Guardia</summary>
          <div class="nav-drop-panel">
            <a href="admin_usuarios.php" class="<?= chronos_nav_activo(['admin_usuarios.php', 'admin_usuario_ver.php'], $topbarActual) ?>"><i class="ri-shield-user-line"></i> Usuarios</a>
            <a href="admin_reportes.php" class="<?= chronos_nav_activo(['admin_reportes.php'], $topbarActual) ?>"><i class="ri-flag-line"></i> Moderación</a>
            <a href="codigo_legado.php" class="<?= chronos_nav_activo(['codigo_legado.php'], $topbarActual) ?>"><i class="ri-shield-check-line"></i> Código del Legado</a>
          </div>
        </details>
      <?php endif; ?>
      <a class="avisos-link <?= chronos_nav_activo(['avisos.php'], $topbarActual) ?>" href="avisos.php"><span class="chronos-ui-icon icon-avisos" aria-hidden="true"></span> Avisos<?php if ($topbarAvisos > 0): ?><b><?= $topbarAvisos > 9 ? '9+' : (int)$topbarAvisos ?></b><?php endif; ?></a>
    </nav>

    <details class="top-user-menu">
      <summary class="top-user <?= $topbarUsuarioActivo ?>" title="Mi legado">
        <img src="<?= e($topbarAvatar) ?>" alt="Avatar">
        <div><strong><?= e($topbarNombre) ?></strong><small>@<?= e($topbarAlias) ?></small></div>
        <span class="chev"><i class="ri-arrow-down-s-line"></i></span>
      </summary>
      <div class="user-dropdown">
        <a href="perfil.php"><i class="ri-user-star-line"></i><span>Mi legado</span></a>
        <a href="autor.php?id=<?= (int)($usuario['id'] ?? 0) ?>"><i class="ri-eye-line"></i><span>Vista pública</span></a>
        <a href="legados.php"><i class="ri-user-follow-line"></i><span>Legados</span></a>
        <a href="codigo_legado.php"><i class="ri-shield-check-line"></i><span>Código del Legado</span></a>
        <a href="perfil_inicial.php"><i class="ri-settings-3-line"></i><span>Editar legado</span></a>
        <a href="logout.php" class="danger"><i class="ri-logout-circle-line"></i><span>Cerrar sesión</span></a>
      </div>
    </details>
  </div>
</header>
<script src="assets/js/catalejo_autocomplete.js?v=511" defer></script>
