<?php
require_once __DIR__ . '/includes/auth.php';
$usuario = requiere_login();
$pdo = chronos_pdo();

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$volver = $_POST['volver'] ?? '';
$autorId = filter_input(INPUT_POST, 'autor_id', FILTER_VALIDATE_INT);
$ruta = trim((string)($_POST['ruta'] ?? ''));

if (!$id) {
    header('Location: feed.php');
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM publicaciones WHERE id = ? LIMIT 1');
$stmt->execute([$id]);
if (!$stmt->fetch()) {
    header('Location: feed.php');
    exit;
}

$stmt = $pdo->prepare('SELECT id FROM archivados WHERE publicacion_id = ? AND usuario_id = ? LIMIT 1');
$stmt->execute([$id, (int)$usuario['id']]);
$archivado = $stmt->fetch();

if ($archivado) {
    // Privacidad: solo el dueño del guardado puede quitarlo de su archivo.
    $stmt = $pdo->prepare('DELETE FROM archivados WHERE publicacion_id = ? AND usuario_id = ? LIMIT 1');
    $stmt->execute([$id, (int)$usuario['id']]);
    $estado = 'quitado';
} else {
    $stmt = $pdo->prepare('INSERT INTO archivados (publicacion_id, usuario_id) VALUES (?, ?)');
    $stmt->execute([$id, (int)$usuario['id']]);
    $estado = 'guardado';
}

$permitidos = ['feed', 'relato', 'archivo', 'perfil', 'explore', 'autor', 'rutas'];
if (!in_array($volver, $permitidos, true)) {
    $volver = 'feed';
}

if ($volver === 'relato') {
    header('Location: relato_ver.php?id=' . $id . '&archivo=' . $estado);
    exit;
}
if ($volver === 'archivo') {
    header('Location: archivo.php?archivo=' . $estado);
    exit;
}
if ($volver === 'explore') {
    header('Location: explore.php?archivo=' . $estado);
    exit;
}
if ($volver === 'perfil') {
    header('Location: perfil.php?archivo=' . $estado);
    exit;
}
if ($volver === 'autor' && $autorId) {
    header('Location: autor.php?id=' . (int)$autorId . '&archivo=' . $estado . '#relatos-autor');
    exit;
}
if ($volver === 'rutas') {
    $params = ['archivo' => $estado];
    if ($ruta !== '') { $params['ruta'] = $ruta; }
    header('Location: rutas.php?' . http_build_query($params));
    exit;
}

header('Location: feed.php?archivo=' . $estado);
exit;
