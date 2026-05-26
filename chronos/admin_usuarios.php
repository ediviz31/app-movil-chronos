<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_admin();
$nombreUsuario = $usuario['nombre'] ?: 'Administrador Chronos';
$aliasUsuario = $usuario['usuario'] ?: 'admin';
$avatarUsuario = $usuario['avatar'] ?: 'assets/img/avatar.svg';
$totalAvisosPendientes = chronos_contar_avisos_no_leidos((int)$usuario['id']);
$pdo = chronos_pdo();
chronos_asegurar_columna_usuario_rol($pdo);
chronos_asegurar_columnas_codigo_legado($pdo);
chronos_asegurar_primer_admin($pdo);
chronos_asegurar_tabla_seguidores();
chronos_asegurar_tabla_avisos();

$q = trim((string)($_GET['q'] ?? ''));
$estado = trim((string)($_GET['estado'] ?? 'todos'));
$params = [];
$where = [];

if ($q !== '') {
    $where[] = '(u.nombre LIKE ? OR u.usuario LIKE ? OR u.correo LIKE ? OR u.interes LIKE ? OR u.tema_favorito LIKE ?)';
    $like = '%' . $q . '%';
    array_push($params, $like, $like, $like, $like, $like);
}

if ($estado === 'completo') {
    $where[] = 'u.perfil_completo = 1';
} elseif ($estado === 'pendiente') {
    $where[] = 'u.perfil_completo = 0';
} elseif ($estado === 'admin') {
    $where[] = "u.rol = 'admin'";
}

$whereSql = $where ? 'WHERE ' . implode(' AND ', $where) : '';

$stmtUsuarios = $pdo->prepare("SELECT u.id, u.nombre, u.usuario, u.correo, u.interes, u.bio, u.tema_favorito, u.avatar, u.portada, u.perfil_completo, u.rol, u.codigo_legado_aceptado, u.codigo_legado_aceptado_en, u.creado_en,
        (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id) AS total_relatos,
        (SELECT COUNT(*) FROM comentarios c WHERE c.usuario_id = u.id) AS total_comentarios,
        (SELECT COUNT(*) FROM ecos e WHERE e.usuario_id = u.id) AS total_ecos,
        (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS total_seguidores,
        (SELECT COUNT(*) FROM seguidores s2 WHERE s2.seguidor_id = u.id) AS total_siguiendo
    FROM usuarios u
    $whereSql
    ORDER BY u.creado_en DESC, u.id DESC
    LIMIT 150");
$stmtUsuarios->execute($params);
$usuarios = $stmtUsuarios->fetchAll() ?: [];

$stats = [
    'usuarios' => (int)$pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn(),
    'hoy' => (int)$pdo->query('SELECT COUNT(*) FROM usuarios WHERE DATE(creado_en) = CURDATE()')->fetchColumn(),
    'completos' => (int)$pdo->query('SELECT COUNT(*) FROM usuarios WHERE perfil_completo = 1')->fetchColumn(),
    'admins' => (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'")->fetchColumn(),
    'codigo' => (int)$pdo->query('SELECT COUNT(*) FROM usuarios WHERE codigo_legado_aceptado = 1')->fetchColumn(),
];

$stmtActividad = $pdo->query("SELECT
    (SELECT COUNT(*) FROM publicaciones) AS relatos,
    (SELECT COUNT(*) FROM comentarios) AS comentarios,
    (SELECT COUNT(*) FROM ecos) AS ecos,
    (SELECT COUNT(*) FROM seguidores) AS seguimientos");
$actividad = $stmtActividad->fetch() ?: ['relatos' => 0, 'comentarios' => 0, 'ecos' => 0, 'seguimientos' => 0];
?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no, viewport-fit=cover">
  <title>Chronos · Usuarios registrados</title>
  <link rel="stylesheet" href="assets/css/styles.css?v=511">
  <link href="https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css" rel="stylesheet">
</head>
<body>
<?php include __DIR__ . '/includes/topbar.php'; ?>

<main class="profile-shell admin-shell">
  <section class="profile-hero-card admin-hero-card">
    <div class="profile-hero-cover admin-hero-cover"></div>
    <div class="profile-hero-content">
      <div class="admin-hero-icon"><i class="ri-shield-user-line"></i></div>
      <div class="profile-hero-main">
        <span class="kicker">Administración Chronos</span>
        <h1>Usuarios registrados</h1>
        <p>Consulta quién se registró, cuándo entró, si completó su perfil y qué actividad tiene dentro de la red.</p>
      </div>
      <div class="profile-hero-actions">
        <a class="head-btn" href="feed.php"><i class="ri-arrow-left-line"></i> Volver al feed</a>
        <a class="auth-secondary profile-logout" href="logout.php"><i class="ri-logout-circle-line"></i> Cerrar sesión</a>
      </div>
    </div>
    <div class="profile-hero-stats admin-stats-grid">
      <div><strong><?= (int)$stats['usuarios'] ?></strong><span>Usuarios</span></div>
      <div><strong><?= (int)$stats['hoy'] ?></strong><span>Nuevos hoy</span></div>
      <div><strong><?= (int)$stats['completos'] ?></strong><span>Perfil completo</span></div>
      <div><strong><?= (int)$stats['admins'] ?></strong><span>Administradores</span></div>
    </div>
  </section>

  <section class="admin-content-grid">
    <aside class="sidebox admin-side-panel">
      <h3><i class="ri-dashboard-3-line"></i> Resumen de actividad</h3>
      <div class="profile-info-row"><span>Relatos publicados</span><strong><?= (int)$actividad['relatos'] ?></strong></div>
      <div class="profile-info-row"><span>Comentarios</span><strong><?= (int)$actividad['comentarios'] ?></strong></div>
      <div class="profile-info-row"><span>Ecos dados</span><strong><?= (int)$actividad['ecos'] ?></strong></div>
      <div class="profile-info-row"><span>Seguimientos</span><strong><?= (int)$actividad['seguimientos'] ?></strong></div>
      <div class="admin-help-box">
        <i class="ri-information-line"></i>
        <p>Por seguridad, este módulo solo aparece para cuentas administradoras. El primer usuario registrado queda como administrador inicial.</p>
      </div>
    </aside>

    <section class="admin-list-panel panel">
      <div class="admin-list-head">
        <div>
          <span class="kicker">Directorio</span>
          <h2>Listado de autores</h2>
          <p><?= count($usuarios) ?> resultado(s) encontrados.</p>
        </div>
        <form class="admin-filter-form" action="admin_usuarios.php" method="get">
          <input name="q" value="<?= e($q) ?>" placeholder="Buscar...">
          <select name="estado">
            <option value="todos" <?= $estado === 'todos' ? 'selected' : '' ?>>Todos</option>
            <option value="completo" <?= $estado === 'completo' ? 'selected' : '' ?>>Perfil completo</option>
            <option value="pendiente" <?= $estado === 'pendiente' ? 'selected' : '' ?>>Perfil pendiente</option>
            <option value="admin" <?= $estado === 'admin' ? 'selected' : '' ?>>Admins</option>
          </select>
          <button class="head-btn" type="submit"><i class="ri-search-line"></i> Filtrar</button>
        </form>
      </div>

      <?php if (!empty($usuarios)): ?>
        <div class="admin-users-table-wrap">
          <table class="admin-users-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Interés</th>
                <th>Actividad</th>
                <th>Perfil</th>
                <th>Registro</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <?php foreach ($usuarios as $fila): ?>
                <tr>
                  <td>
                    <div class="admin-user-cell">
                      <img src="<?= e($fila['avatar'] ?: 'assets/img/avatar.svg') ?>" alt="Avatar">
                      <div>
                        <strong><?= e($fila['nombre']) ?></strong>
                        <span>@<?= e($fila['usuario']) ?><?= ($fila['rol'] ?? '') === 'admin' ? ' · Admin' : '' ?></span>
                      </div>
                    </div>
                  </td>
                  <td><span class="admin-email"><?= e($fila['correo']) ?></span></td>
                  <td><?= e($fila['tema_favorito'] ?: ($fila['interes'] ?: 'Sin definir')) ?></td>
                  <td>
                    <div class="admin-mini-stats">
                      <span><b><?= (int)$fila['total_relatos'] ?></b> relatos</span>
                      <span><b><?= (int)$fila['total_comentarios'] ?></b> comentarios</span>
                      <span><b><?= (int)$fila['total_seguidores'] ?></b> seguidores</span>
                    </div>
                  </td>
                  <td><span class="admin-status <?= ((int)$fila['perfil_completo'] === 1) ? 'ok' : 'pending' ?>"><?= ((int)$fila['perfil_completo'] === 1) ? 'Completo' : 'Pendiente' ?></span></td>
                  <td><?= e(chronos_fecha_relativa($fila['creado_en'])) ?><small><?= e(date('d/m/Y H:i', strtotime($fila['creado_en']))) ?></small></td>
                  <td><a class="aviso-action" href="admin_usuario_ver.php?id=<?= (int)$fila['id'] ?>"><i class="ri-eye-line"></i> Ver</a></td>
                </tr>
              <?php endforeach; ?>
            </tbody>
          </table>
        </div>
      <?php else: ?>
        <section class="profile-empty-state admin-empty-state">
          <div class="profile-empty-visual"><img src="assets/icons/explorar.webp" alt="Sin resultados"><div class="empty-glow"></div></div>
          <div class="profile-empty-copy">
            <span class="mini-label">Sin resultados</span>
            <h3>No encontré usuarios con ese filtro.</h3>
            <p>Prueba limpiar la búsqueda o revisar el filtro de perfil.</p>
            <a class="head-btn profile-empty-btn" href="admin_usuarios.php"><i class="ri-refresh-line"></i> Ver todos</a>
          </div>
        </section>
      <?php endif; ?>
    </section>
  </section>
</main>
<script src="assets/js/no_zoom.js?v=502"></script>
</body>
</html>
