<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
chronos_asegurar_tabla_seguidores();
chronos_asegurar_tabla_avisos();
$pdo = chronos_pdo();

$seguidoId = filter_input(INPUT_POST, 'seguido_id', FILTER_VALIDATE_INT);
$accion = $_POST['accion'] ?? 'toggle';
$q = trim((string)($_POST['q'] ?? ''));
$categoria = trim((string)($_POST['categoria'] ?? ''));
$ruta = trim((string)($_POST['ruta'] ?? ''));
$tipo = trim((string)($_POST['tipo'] ?? 'todo'));
$tiposPermitidos = ['todo', 'relatos', 'autores', 'epocas'];
if (!in_array($tipo, $tiposPermitidos, true)) {
    $tipo = 'todo';
}
$volver = trim((string)($_POST['volver'] ?? 'explore'));
$vista = ($_POST['vista'] ?? 'todos') === 'siguiendo' ? 'siguiendo' : 'todos';
$tab = ($_POST['tab'] ?? 'seguidores') === 'siguiendo' ? 'siguiendo' : 'seguidores';

if (!$seguidoId || $seguidoId === (int)$usuario['id']) {
    header('Location: explore.php?seguir=error');
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM usuarios WHERE id = ? LIMIT 1');
$stmt->execute([$seguidoId]);
if (!$stmt->fetch()) {
    header('Location: explore.php?seguir=error');
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM seguidores WHERE seguidor_id = ? AND seguido_id = ? LIMIT 1');
$stmt->execute([(int)$usuario['id'], $seguidoId]);
$relacion = $stmt->fetch();

if ($accion === 'desalistar') {
    if ($relacion) {
        $stmt = $pdo->prepare('DELETE FROM seguidores WHERE seguidor_id = ? AND seguido_id = ?');
        $stmt->execute([(int)$usuario['id'], $seguidoId]);
    }
    $estado = 'desalistado';
} else {
    if (!$relacion) {
        try {
            $stmt = $pdo->prepare('INSERT INTO seguidores (seguidor_id, seguido_id) VALUES (?, ?)');
            $stmt->execute([(int)$usuario['id'], $seguidoId]);
        } catch (PDOException $e) {
            // Si ya existía por recarga/doble clic, no lo tomamos como error.
        }
        $nombreActor = trim((string)($usuario['nombre'] ?: $usuario['usuario'] ?: 'Un explorador'));
        chronos_crear_aviso($seguidoId, (int)$usuario['id'], 'alistarse', $nombreActor . ' ahora sigue tu legado.');
    }
    $estado = 'alistado';
}

$params = ['seguir' => $estado];

if ($volver === 'autor') {
    $params['id'] = $seguidoId;
    header('Location: autor.php?' . http_build_query($params));
    exit;
}

if ($volver === 'feed') {
    if ($vista === 'siguiendo') { $params['vista'] = 'siguiendo'; }
    header('Location: feed.php?' . http_build_query($params));
    exit;
}

if ($volver === 'legados') {
    $params['tab'] = $tab;
    if ($q !== '') { $params['q'] = $q; }
    header('Location: legados.php?' . http_build_query($params));
    exit;
}

if ($volver === 'rutas') {
    if ($ruta !== '') { $params['ruta'] = $ruta; }
    header('Location: rutas.php?' . http_build_query($params));
    exit;
}

if ($q !== '') { $params['q'] = $q; }
if ($categoria !== '') { $params['categoria'] = $categoria; }
if ($tipo !== 'todo') { $params['tipo'] = $tipo; }
header('Location: explore.php?' . http_build_query($params));
exit;
