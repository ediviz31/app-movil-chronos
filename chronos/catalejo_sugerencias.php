<?php
require_once __DIR__ . '/includes/auth.php';

header('Content-Type: application/json; charset=utf-8');

$usuario = usuario_actual();
if (!$usuario) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'autores' => [], 'rutas' => [], 'relatos' => []], JSON_UNESCAPED_UNICODE);
    exit;
}

$pdo = chronos_pdo();
chronos_asegurar_tabla_seguidores();

$qOriginal = trim((string)($_GET['q'] ?? ''));
$qAutor = trim(ltrim($qOriginal, '@'));
if ($qAutor === '' || (function_exists('mb_strlen') ? mb_strlen($qAutor, 'UTF-8') : strlen($qAutor)) < 2) {
    echo json_encode([
        'ok' => true,
        'q' => $qOriginal,
        'autores' => [],
        'rutas' => [],
        'relatos' => [],
        'mensaje' => 'Escribe al menos dos señales para activar el Catalejo.'
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$like = '%' . $qAutor . '%';
$usuarioId = (int)$usuario['id'];

$sqlAutores = "SELECT u.id, u.nombre, u.usuario, u.avatar, u.portada, u.bio, u.tema_favorito, u.interes, u.perfil_completo, u.creado_en,
        (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id) AS total_relatos,
        (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS total_seguidores,
        (SELECT COUNT(*) FROM seguidores su WHERE su.seguidor_id = ? AND su.seguido_id = u.id) AS usuario_alistado,
        (SELECT COUNT(*) FROM ecos ea INNER JOIN publicaciones pa ON pa.id = ea.publicacion_id WHERE pa.usuario_id = u.id) AS total_ecos_autor,
        (SELECT MAX(p2.creado_en) FROM publicaciones p2 WHERE p2.usuario_id = u.id) AS ultimo_relato,
        (SELECT GROUP_CONCAT(DISTINCT p3.categoria ORDER BY p3.categoria SEPARATOR '||') FROM publicaciones p3 WHERE p3.usuario_id = u.id AND p3.categoria <> '') AS rutas_autor
    FROM usuarios u
    WHERE u.nombre LIKE ?
       OR u.usuario LIKE ?
       OR u.tema_favorito LIKE ?
       OR u.interes LIKE ?
       OR u.bio LIKE ?
       OR EXISTS (SELECT 1 FROM publicaciones px WHERE px.usuario_id = u.id AND (px.categoria LIKE ? OR px.titulo LIKE ? OR px.contenido LIKE ?))
    ORDER BY u.creado_en DESC
    LIMIT 90";
$stmtAutores = $pdo->prepare($sqlAutores);
$stmtAutores->execute([$usuarioId, $like, $like, $like, $like, $like, $like, $like, $like]);
$autoresBase = $stmtAutores->fetchAll() ?: [];

$rutasInteresActual = chronos_rutas_interes_usuario($pdo, $usuarioId, $usuario['tema_favorito'] ?: $usuario['interes']);
$temaActual = $usuario['tema_favorito'] ?: $usuario['interes'];

$autores = [];
foreach ($autoresBase as $autor) {
    $senal = chronos_catalejo_calcular_coincidencia($autor, $qAutor);
    if ((int)$senal['score'] < 18) {
        continue;
    }
    $autor = chronos_enriquecer_autores_sugeridos([$autor], $rutasInteresActual, $temaActual, false)[0];
    $autor['catalejo_puntaje'] = (int)$senal['score'];
    $autor['catalejo_motivo'] = $senal['motivo'];
    $autores[] = $autor;
}

usort($autores, static function ($a, $b) {
    $cmp = ((int)($b['catalejo_puntaje'] ?? 0)) <=> ((int)($a['catalejo_puntaje'] ?? 0));
    if ($cmp !== 0) { return $cmp; }
    $cmp = ((int)($b['total_relatos'] ?? 0)) <=> ((int)($a['total_relatos'] ?? 0));
    if ($cmp !== 0) { return $cmp; }
    return strcmp((string)($a['nombre'] ?? ''), (string)($b['nombre'] ?? ''));
});
$autores = array_slice($autores, 0, 6);

$autoresJson = [];
foreach ($autores as $autor) {
    $esMiUsuario = (int)$autor['id'] === $usuarioId;
    $tema = trim((string)($autor['tema_favorito'] ?: ($autor['interes'] ?: 'Historia')));
    $autoresJson[] = [
        'id' => (int)$autor['id'],
        'nombre' => (string)$autor['nombre'],
        'usuario' => (string)$autor['usuario'],
        'avatar' => (string)($autor['avatar'] ?: 'assets/img/avatar.svg'),
        'url' => $esMiUsuario ? 'perfil.php' : ('autor.php?id=' . (int)$autor['id']),
        'tema' => $tema,
        'especialidad' => chronos_especialidad_autor($autor),
        'motivo' => (string)($autor['catalejo_motivo'] ?? 'Señal relacionada'),
        'total_relatos' => (int)($autor['total_relatos'] ?? 0),
        'total_seguidores' => (int)($autor['total_seguidores'] ?? 0),
        'es_mi_usuario' => $esMiUsuario,
    ];
}

$stmtRutas = $pdo->prepare('SELECT categoria, COUNT(*) AS total FROM publicaciones WHERE categoria <> "" AND categoria LIKE ? GROUP BY categoria ORDER BY total DESC, categoria ASC LIMIT 4');
$stmtRutas->execute([$like]);
$rutasJson = [];
foreach (($stmtRutas->fetchAll() ?: []) as $ruta) {
    $info = chronos_ruta_info($ruta['categoria']);
    $rutasJson[] = [
        'nombre' => (string)$ruta['categoria'],
        'total' => (int)$ruta['total'],
        'url' => 'rutas.php?ruta=' . urlencode((string)$ruta['categoria']),
        'icono' => (string)$info['icono'],
    ];
}

$stmtRelatos = $pdo->prepare('SELECT p.id, p.titulo, p.categoria, p.imagen, u.nombre, u.usuario FROM publicaciones p INNER JOIN usuarios u ON u.id = p.usuario_id WHERE p.titulo LIKE ? OR p.contenido LIKE ? OR p.categoria LIKE ? OR u.nombre LIKE ? OR u.usuario LIKE ? ORDER BY p.creado_en DESC LIMIT 4');
$stmtRelatos->execute([$like, $like, $like, $like, $like]);
$relatosJson = [];
foreach (($stmtRelatos->fetchAll() ?: []) as $relato) {
    $relatosJson[] = [
        'id' => (int)$relato['id'],
        'titulo' => (string)$relato['titulo'],
        'categoria' => (string)($relato['categoria'] ?: 'Historia'),
        'autor' => (string)$relato['nombre'],
        'usuario' => (string)$relato['usuario'],
        'url' => 'relato_ver.php?id=' . (int)$relato['id'],
        'imagen' => (string)($relato['imagen'] ?: 'assets/img/post-scroll.svg'),
    ];
}

echo json_encode([
    'ok' => true,
    'q' => $qOriginal,
    'autores' => $autoresJson,
    'rutas' => $rutasJson,
    'relatos' => $relatosJson,
    'explore_url' => 'explore.php?q=' . urlencode($qOriginal),
], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
