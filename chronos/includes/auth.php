<?php
require_once __DIR__ . '/../config/database.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function e(?string $value): string
{
    return htmlspecialchars($value ?? '', ENT_QUOTES, 'UTF-8');
}

function usuario_actual(): ?array
{
    if (empty($_SESSION['usuario_id'])) {
        return null;
    }

    $pdo = chronos_pdo();
    chronos_asegurar_columna_usuario_rol($pdo);
    chronos_asegurar_primer_admin($pdo);
    $stmt = $pdo->prepare('SELECT id, nombre, usuario, correo, interes, bio, tema_favorito, avatar, portada, perfil_completo, rol FROM usuarios WHERE id = ? LIMIT 1');
    $stmt->execute([$_SESSION['usuario_id']]);
    $usuario = $stmt->fetch();

    if (!$usuario) {
        session_unset();
        session_destroy();
        return null;
    }

    return $usuario;
}

function requiere_login(): array
{
    $usuario = usuario_actual();
    if (!$usuario) {
        header('Location: login.php');
        exit;
    }
    return $usuario;
}


function chronos_es_admin(?array $usuario): bool
{
    if (!$usuario) {
        return false;
    }
    if (($usuario['rol'] ?? '') === 'admin') {
        return true;
    }
    return isset($usuario['id']) && (int)$usuario['id'] === 1;
}

function requiere_admin(): array
{
    $usuario = requiere_login();
    if (!chronos_es_admin($usuario)) {
        header('Location: feed.php');
        exit;
    }
    return $usuario;
}

function redirigir_si_logueado(): void
{
    if (usuario_actual()) {
        header('Location: feed.php');
        exit;
    }
}

function iniciar_sesion_usuario(array $usuario): void
{
    session_regenerate_id(true);
    $_SESSION['usuario_id'] = (int)$usuario['id'];
    $_SESSION['usuario_nombre'] = $usuario['nombre'];
    $_SESSION['usuario_usuario'] = $usuario['usuario'];
}

function mensaje_auth(string $tipo, string $texto): string
{
    $icono = $tipo === 'success' ? 'ri-checkbox-circle-line' : ($tipo === 'info' ? 'ri-information-line' : 'ri-error-warning-line');
    return '<div class="auth-message show ' . e($tipo) . '" data-auth-message aria-live="polite"><i class="' . e($icono) . '"></i><span>' . e($texto) . '</span></div>';
}

function mensaje_auth_vacio(): string
{
    return '<div class="auth-message" data-auth-message aria-live="polite"></div>';
}


function chronos_subir_imagen_usuario(string $campo, int $usuarioId, string $carpetaDestino): ?string
{
    if (empty($_FILES[$campo]) || !isset($_FILES[$campo]['error'])) {
        return null;
    }

    $archivo = $_FILES[$campo];

    if ($archivo['error'] === UPLOAD_ERR_NO_FILE) {
        return null;
    }

    if ($archivo['error'] !== UPLOAD_ERR_OK) {
        throw new RuntimeException('No se pudo subir la imagen. Intenta nuevamente.');
    }

    if (($archivo['size'] ?? 0) > 3 * 1024 * 1024) {
        throw new RuntimeException('La imagen debe pesar máximo 3 MB.');
    }

    $tmp = $archivo['tmp_name'] ?? '';
    $info = @getimagesize($tmp);

    if (!$info || empty($info['mime'])) {
        throw new RuntimeException('El archivo seleccionado no parece ser una imagen válida.');
    }

    $permitidos = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/webp' => 'webp',
        'image/gif' => 'gif',
    ];

    if (!isset($permitidos[$info['mime']])) {
        throw new RuntimeException('Formato no permitido. Usa JPG, PNG, WEBP o GIF.');
    }

    $directorio = __DIR__ . '/../uploads/' . $carpetaDestino;
    if (!is_dir($directorio)) {
        mkdir($directorio, 0775, true);
    }

    $extension = $permitidos[$info['mime']];
    $nombreSeguro = $campo . '_' . $usuarioId . '_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . $extension;
    $destinoFisico = $directorio . '/' . $nombreSeguro;

    if (!move_uploaded_file($tmp, $destinoFisico)) {
        throw new RuntimeException('No se pudo guardar la imagen en el servidor.');
    }

    return 'uploads/' . $carpetaDestino . '/' . $nombreSeguro;
}


function chronos_fecha_relativa(?string $fecha): string
{
    if (!$fecha) {
        return 'Ahora';
    }

    try {
        $creado = new DateTime($fecha);
        $ahora = new DateTime('now');
        $diff = $ahora->getTimestamp() - $creado->getTimestamp();
    } catch (Exception $e) {
        return $fecha;
    }

    if ($diff < 60) {
        return 'Hace unos segundos';
    }
    if ($diff < 3600) {
        $min = max(1, floor($diff / 60));
        return 'Hace ' . $min . ' min';
    }
    if ($diff < 86400) {
        $hrs = max(1, floor($diff / 3600));
        return 'Hace ' . $hrs . ' h';
    }
    if ($diff < 604800) {
        $dias = max(1, floor($diff / 86400));
        return 'Hace ' . $dias . ' día' . ($dias === 1 ? '' : 's');
    }

    return $creado->format('d/m/Y');
}


function chronos_resumen(?string $texto, int $limite = 420): string
{
    $texto = trim(strip_tags($texto ?? ''));
    if (function_exists('mb_strlen') && mb_strlen($texto, 'UTF-8') > $limite) {
        return rtrim(mb_substr($texto, 0, $limite, 'UTF-8')) . '...';
    }
    if (!function_exists('mb_strlen') && strlen($texto) > $limite) {
        return rtrim(substr($texto, 0, $limite)) . '...';
    }
    return $texto;
}

function chronos_puede_modificar_relato(array $relato, array $usuario): bool
{
    return isset($relato['usuario_id'], $usuario['id']) && (int)$relato['usuario_id'] === (int)$usuario['id'];
}

function chronos_eliminar_archivo_relato(?string $ruta): void
{
    if (!$ruta || strpos($ruta, 'uploads/relatos/') !== 0) {
        return;
    }
    $fisico = __DIR__ . '/../' . $ruta;
    if (is_file($fisico)) {
        @unlink($fisico);
    }
}


function chronos_asegurar_tabla_seguidores(): void
{
    $pdo = chronos_pdo();
    $pdo->exec("CREATE TABLE IF NOT EXISTS seguidores (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        seguidor_id INT UNSIGNED NOT NULL,
        seguido_id INT UNSIGNED NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_seguidor_seguido (seguidor_id, seguido_id),
        INDEX idx_seguidores_seguidor (seguidor_id),
        INDEX idx_seguidores_seguido (seguido_id),
        CONSTRAINT fk_seguidores_seguidor FOREIGN KEY (seguidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_seguidores_seguido FOREIGN KEY (seguido_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}


function chronos_asegurar_tabla_avisos(): void
{
    $pdo = chronos_pdo();
    $pdo->exec("CREATE TABLE IF NOT EXISTS avisos (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        actor_id INT UNSIGNED DEFAULT NULL,
        tipo VARCHAR(40) NOT NULL,
        publicacion_id INT UNSIGNED DEFAULT NULL,
        mensaje VARCHAR(255) NOT NULL,
        leido TINYINT(1) NOT NULL DEFAULT 0,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_avisos_usuario_leido (usuario_id, leido),
        INDEX idx_avisos_actor (actor_id),
        INDEX idx_avisos_publicacion (publicacion_id),
        CONSTRAINT fk_avisos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_avisos_actor FOREIGN KEY (actor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_avisos_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function chronos_crear_aviso(int $usuarioId, ?int $actorId, string $tipo, string $mensaje, ?int $publicacionId = null): void
{
    if ($usuarioId <= 0 || ($actorId !== null && $usuarioId === $actorId)) {
        return;
    }
    chronos_asegurar_tabla_avisos();
    $pdo = chronos_pdo();
    $stmt = $pdo->prepare('INSERT INTO avisos (usuario_id, actor_id, tipo, publicacion_id, mensaje) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$usuarioId, $actorId, $tipo, $publicacionId, $mensaje]);
}


function chronos_crear_aviso_unico(int $usuarioId, ?int $actorId, string $tipo, string $mensaje, ?int $publicacionId = null): void
{
    if ($usuarioId <= 0 || ($actorId !== null && $usuarioId === $actorId)) {
        return;
    }

    chronos_asegurar_tabla_avisos();
    $pdo = chronos_pdo();

    if ($actorId !== null && $publicacionId !== null) {
        $stmt = $pdo->prepare('SELECT id FROM avisos WHERE usuario_id = ? AND actor_id = ? AND tipo = ? AND publicacion_id = ? LIMIT 1');
        $stmt->execute([$usuarioId, $actorId, $tipo, $publicacionId]);
        if ($stmt->fetchColumn()) {
            return;
        }
    }

    chronos_crear_aviso($usuarioId, $actorId, $tipo, $mensaje, $publicacionId);
}



function chronos_reparar_avisos_seguimientos(int $usuarioId): void
{
    if ($usuarioId <= 0) {
        return;
    }
    chronos_asegurar_tabla_seguidores();
    chronos_asegurar_tabla_avisos();
    $pdo = chronos_pdo();

    $stmt = $pdo->prepare("SELECT s.seguidor_id, u.nombre, u.usuario
        FROM seguidores s
        INNER JOIN usuarios u ON u.id = s.seguidor_id
        WHERE s.seguido_id = ?
          AND NOT EXISTS (
              SELECT 1 FROM avisos a
              WHERE a.usuario_id = s.seguido_id
                AND a.actor_id = s.seguidor_id
                AND a.tipo = 'alistarse'
          )");
    $stmt->execute([$usuarioId]);
    $pendientes = $stmt->fetchAll();

    if (!$pendientes) {
        return;
    }

    $insert = $pdo->prepare('INSERT INTO avisos (usuario_id, actor_id, tipo, mensaje) VALUES (?, ?, ?, ?)');
    foreach ($pendientes as $fila) {
        $nombre = trim((string)($fila['nombre'] ?: $fila['usuario'] ?: 'Un explorador'));
        $insert->execute([$usuarioId, (int)$fila['seguidor_id'], 'alistarse', $nombre . ' ahora sigue tu legado.']);
    }
}

function chronos_contar_avisos_no_leidos(int $usuarioId): int
{
    if ($usuarioId <= 0) {
        return 0;
    }
    chronos_reparar_avisos_seguimientos($usuarioId);
    chronos_asegurar_tabla_avisos();
    $pdo = chronos_pdo();
    $stmt = $pdo->prepare('SELECT COUNT(*) FROM avisos WHERE usuario_id = ? AND leido = 0');
    $stmt->execute([$usuarioId]);
    return (int)$stmt->fetchColumn();
}

function chronos_esta_alistado(int $seguidorId, int $seguidoId): bool
{
    if ($seguidorId <= 0 || $seguidoId <= 0 || $seguidorId === $seguidoId) {
        return false;
    }
    chronos_asegurar_tabla_seguidores();
    $pdo = chronos_pdo();
    $stmt = $pdo->prepare('SELECT 1 FROM seguidores WHERE seguidor_id = ? AND seguido_id = ? LIMIT 1');
    $stmt->execute([$seguidorId, $seguidoId]);
    return (bool)$stmt->fetchColumn();
}


function chronos_asegurar_tabla_reportes(?PDO $pdo = null): void
{
    $pdo = $pdo ?: chronos_pdo();
    $pdo->exec("CREATE TABLE IF NOT EXISTS reportes (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        reportante_id INT UNSIGNED NOT NULL,
        autor_reportado_id INT UNSIGNED DEFAULT NULL,
        tipo VARCHAR(30) NOT NULL,
        publicacion_id INT UNSIGNED DEFAULT NULL,
        comentario_id INT UNSIGNED DEFAULT NULL,
        motivo VARCHAR(80) NOT NULL,
        detalle TEXT DEFAULT NULL,
        estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
        admin_id INT UNSIGNED DEFAULT NULL,
        nota_admin TEXT DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_reportes_estado (estado),
        INDEX idx_reportes_tipo (tipo),
        INDEX idx_reportes_reportante (reportante_id),
        INDEX idx_reportes_autor (autor_reportado_id),
        INDEX idx_reportes_publicacion (publicacion_id),
        INDEX idx_reportes_comentario (comentario_id),
        CONSTRAINT fk_reportes_reportante FOREIGN KEY (reportante_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_reportes_autor FOREIGN KEY (autor_reportado_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_reportes_admin FOREIGN KEY (admin_id) REFERENCES usuarios(id) ON DELETE SET NULL,
        CONSTRAINT fk_reportes_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
        CONSTRAINT fk_reportes_comentario FOREIGN KEY (comentario_id) REFERENCES comentarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
}

function chronos_motivos_reporte(): array
{
    return [
        'ofensivo' => 'Lenguaje ofensivo o ataques personales',
        'acoso' => 'Acoso, burla o intención de humillar',
        'fuera_tema' => 'Contenido fuera de la temática histórica',
        'spam' => 'Spam, promoción engañosa o contenido repetido',
        'privacidad' => 'Expone datos personales o contenido sensible',
        'otro' => 'Otro motivo',
    ];
}

function chronos_estados_reporte(): array
{
    return [
        'pendiente' => 'Pendiente',
        'revision' => 'En revisión',
        'resuelto' => 'Atendido',
        'descartado' => 'Descartado',
    ];
}

function chronos_contar_reportes_pendientes(): int
{
    chronos_asegurar_tabla_reportes();
    $pdo = chronos_pdo();
    $stmt = $pdo->query("SELECT COUNT(*) FROM reportes WHERE estado IN ('pendiente', 'revision')");
    return (int)$stmt->fetchColumn();
}

function chronos_estado_reporte_label(?string $estado): string
{
    $estados = chronos_estados_reporte();
    return $estados[$estado ?? ''] ?? 'Pendiente';
}

function chronos_rutas_catalogo(): array
{
    return [
        'México antiguo' => [
            'icono' => 'ri-ancient-gate-line',
            'epoca' => 'Civilizaciones mesoamericanas',
            'descripcion' => 'Relatos sobre pueblos originarios, ciudades sagradas, códices, tradiciones y memoria de México.',
            'color' => 'dorado',
        ],
        'Egipto antiguo' => [
            'icono' => 'ri-pyramid-line',
            'epoca' => 'Valle del Nilo',
            'descripcion' => 'Faraones, templos, tumbas, mitología, escritura y misterios conservados entre arena y piedra.',
            'color' => 'arena',
        ],
        'Roma imperial' => [
            'icono' => 'ri-building-2-line',
            'epoca' => 'Imperios clásicos',
            'descripcion' => 'Crónicas sobre emperadores, legiones, ciudades, leyes, conquistas y vida cotidiana del mundo romano.',
            'color' => 'rojo',
        ],
        'Grecia clásica' => [
            'icono' => 'ri-bank-line',
            'epoca' => 'Mundo helénico',
            'descripcion' => 'Filosofía, polis, mitología, arte, batallas y pensamientos que siguen haciendo eco.',
            'color' => 'mar',
        ],
        'Edad Media' => [
            'icono' => 'ri-shield-cross-line',
            'epoca' => 'Castillos y reinos',
            'descripcion' => 'Reinos, manuscritos, caminos, batallas, oficios, leyendas y memoria medieval.',
            'color' => 'hierro',
        ],
        'Leyendas y tradición oral' => [
            'icono' => 'ri-moon-foggy-line',
            'epoca' => 'Relatos transmitidos',
            'descripcion' => 'Historias contadas de generación en generación: mitos, leyendas, rumores antiguos y voces populares.',
            'color' => 'noche',
        ],
        'Personajes históricos' => [
            'icono' => 'ri-user-star-line',
            'epoca' => 'Vidas que dejaron huella',
            'descripcion' => 'Biografías, decisiones, batallas personales y figuras que cambiaron su tiempo.',
            'color' => 'pergamino',
        ],
        'Sitios arqueológicos' => [
            'icono' => 'ri-map-pin-line',
            'epoca' => 'Lugares con memoria',
            'descripcion' => 'Ruinas, templos, zonas arqueológicas, viajes históricos y espacios donde el pasado sigue presente.',
            'color' => 'tierra',
        ],
        'Historia familiar' => [
            'icono' => 'ri-home-heart-line',
            'epoca' => 'Memoria personal',
            'descripcion' => 'Recuerdos familiares, fotos antiguas, objetos heredados, historias de abuelos y raíces personales.',
            'color' => 'hogar',
        ],
        'Archivos y documentos' => [
            'icono' => 'ri-scroll-to-bottom-line',
            'epoca' => 'Fuentes y testimonios',
            'descripcion' => 'Cartas, fotos, periódicos, manuscritos, mapas, objetos y documentos que merecen preservarse.',
            'color' => 'archivo',
        ],
    ];
}

function chronos_ruta_nombres(): array
{
    return array_keys(chronos_rutas_catalogo());
}

function chronos_ruta_info(?string $nombre): array
{
    $nombre = trim((string)$nombre);
    $catalogo = chronos_rutas_catalogo();
    if ($nombre !== '' && isset($catalogo[$nombre])) {
        return $catalogo[$nombre] + ['nombre' => $nombre];
    }
    if ($nombre !== '') {
        return [
            'nombre' => $nombre,
            'icono' => 'ri-route-line',
            'epoca' => 'Ruta creada por la comunidad',
            'descripcion' => 'Una ruta viva construida por los relatos que los exploradores de Chronos van publicando.',
            'color' => 'libre',
        ];
    }
    return [
        'nombre' => 'Rutas históricas',
        'icono' => 'ri-compass-3-line',
        'epoca' => 'Mapa de Chronos',
        'descripcion' => 'Explora relatos por civilización, época, memoria familiar, documentos o lugares con historia.',
        'color' => 'general',
    ];
}


function chronos_texto_clave(?string $texto): string
{
    $texto = trim((string)$texto);
    if ($texto === '') {
        return '';
    }
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($texto, 'UTF-8');
    }
    return strtolower($texto);
}

function chronos_rutas_interes_usuario(PDO $pdo, int $usuarioId, ?string $temaUsuario = ''): array
{
    $rutas = [];
    $temaUsuario = trim((string)$temaUsuario);
    if ($temaUsuario !== '') {
        $rutas[$temaUsuario] = true;
    }

    $consultas = [
        'SELECT DISTINCT categoria FROM publicaciones WHERE usuario_id = ? AND categoria <> ""',
        'SELECT DISTINCT p.categoria FROM archivados a INNER JOIN publicaciones p ON p.id = a.publicacion_id WHERE a.usuario_id = ? AND p.categoria <> ""',
        'SELECT DISTINCT p.categoria FROM seguidores s INNER JOIN publicaciones p ON p.usuario_id = s.seguido_id WHERE s.seguidor_id = ? AND p.categoria <> ""',
    ];

    foreach ($consultas as $sql) {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$usuarioId]);
        foreach ($stmt->fetchAll(PDO::FETCH_COLUMN) as $ruta) {
            $ruta = trim((string)$ruta);
            if ($ruta !== '') {
                $rutas[$ruta] = true;
            }
        }
    }

    return array_keys($rutas);
}

function chronos_enriquecer_autores_sugeridos(array $autores, array $rutasInteres = [], ?string $temaUsuario = '', bool $ordenar = true): array
{
    $temaClave = chronos_texto_clave($temaUsuario);
    $rutasClave = [];
    foreach ($rutasInteres as $ruta) {
        $ruta = trim((string)$ruta);
        if ($ruta !== '') {
            $rutasClave[chronos_texto_clave($ruta)] = $ruta;
        }
    }

    foreach ($autores as &$autor) {
        $autorTema = trim((string)($autor['tema_favorito'] ?: ($autor['interes'] ?? '')));
        $autorTemaClave = chronos_texto_clave($autorTema);
        $rutasAutor = [];
        if (!empty($autor['rutas_autor'])) {
            $rutasAutor = array_filter(array_map('trim', explode('||', (string)$autor['rutas_autor'])));
        }

        $rutaCoincide = '';
        foreach ($rutasAutor as $rutaAutor) {
            $clave = chronos_texto_clave($rutaAutor);
            if (isset($rutasClave[$clave])) {
                $rutaCoincide = $rutaAutor;
                break;
            }
        }

        $score = 0;
        $score += min(40, ((int)($autor['total_relatos'] ?? 0)) * 8);
        $score += min(24, ((int)($autor['total_seguidores'] ?? 0)) * 4);
        if ((int)($autor['perfil_completo'] ?? 0) === 1) {
            $score += 8;
        }
        if ($rutaCoincide !== '') {
            $score += 70;
        }
        if ($temaClave !== '' && $autorTemaClave !== '' && $temaClave === $autorTemaClave) {
            $score += 50;
        }
        if (!empty($autor['ultimo_relato'])) {
            $ultimo = strtotime((string)$autor['ultimo_relato']);
            if ($ultimo && $ultimo >= strtotime('-14 days')) {
                $score += 18;
            }
        } else {
            $score += 4; // Nuevo explorador: todavía puede valer la pena descubrirlo.
        }

        if ($rutaCoincide !== '') {
            $motivo = 'Conecta con ' . $rutaCoincide;
            $motivoTipo = 'ruta';
        } elseif ($temaClave !== '' && $autorTemaClave !== '' && $temaClave === $autorTemaClave) {
            $motivo = 'Comparte tu interés';
            $motivoTipo = 'interes';
        } elseif (!empty($autor['ultimo_relato'])) {
            $motivo = 'Autor activo';
            $motivoTipo = 'activo';
        } elseif ((int)($autor['total_relatos'] ?? 0) > 0) {
            $motivo = 'Tiene crónicas';
            $motivoTipo = 'cronicas';
        } else {
            $motivo = 'Nuevo explorador';
            $motivoTipo = 'nuevo';
        }

        $autor['sugerencia_puntaje'] = $score;
        $autor['sugerencia_motivo'] = $motivo;
        $autor['sugerencia_tipo'] = $motivoTipo;
        $autor['rutas_autor_array'] = $rutasAutor;
    }
    unset($autor);

    if ($ordenar) {
        usort($autores, static function ($a, $b) {
            $cmp = ((int)($b['sugerencia_puntaje'] ?? 0)) <=> ((int)($a['sugerencia_puntaje'] ?? 0));
            if ($cmp !== 0) {
                return $cmp;
            }
            return strtotime((string)($b['ultimo_relato'] ?? $b['creado_en'] ?? '1970-01-01')) <=> strtotime((string)($a['ultimo_relato'] ?? $a['creado_en'] ?? '1970-01-01'));
        });
    }

    return $autores;
}



function chronos_especialidad_autor(array $autor): string
{
    $rutas = [];
    if (!empty($autor['rutas_autor_array']) && is_array($autor['rutas_autor_array'])) {
        $rutas = $autor['rutas_autor_array'];
    } elseif (!empty($autor['rutas_autor'])) {
        $rutas = array_filter(array_map('trim', explode('||', (string)$autor['rutas_autor'])));
    }

    $principal = '';
    if (!empty($rutas)) {
        $principal = (string)array_values($rutas)[0];
    }
    if ($principal === '') {
        $principal = trim((string)($autor['tema_favorito'] ?: ($autor['interes'] ?? '')));
    }
    if ($principal === '') {
        return 'Cronista en formación';
    }

    $especialidades = [
        'México antiguo' => 'Guardián de rutas mesoamericanas',
        'Egipto antiguo' => 'Especialista en el Valle del Nilo',
        'Roma imperial' => 'Cronista del mundo romano',
        'Grecia clásica' => 'Especialista en el mundo helénico',
        'Edad Media' => 'Explorador de reinos medievales',
        'Leyendas y tradición oral' => 'Narrador de tradición oral',
        'Personajes históricos' => 'Biógrafo de vidas memorables',
        'Sitios arqueológicos' => 'Explorador de lugares con memoria',
        'Historia familiar' => 'Guardián de memoria familiar',
        'Archivos y documentos' => 'Custodio de documentos antiguos',
    ];

    return $especialidades[$principal] ?? ('Cronista de ' . $principal);
}


function chronos_catalejo_normalizar(?string $texto): string
{
    $texto = trim((string)$texto);
    if ($texto === '') {
        return '';
    }
    $texto = mb_strtolower($texto, 'UTF-8');
    $convertido = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $texto);
    if ($convertido !== false) {
        $texto = $convertido;
    }
    $texto = str_replace('@', '', $texto);
    $texto = preg_replace('/[^a-z0-9]+/i', ' ', $texto) ?? $texto;
    $texto = preg_replace('/\s+/', ' ', $texto) ?? $texto;
    return trim($texto);
}

function chronos_catalejo_calcular_coincidencia(array $autor, string $busqueda): array
{
    $original = trim($busqueda);
    $q = chronos_catalejo_normalizar($busqueda);
    if ($q === '') {
        return ['score' => 0, 'motivo' => 'Autor por descubrir', 'tipo' => 'general'];
    }

    $nombre = chronos_catalejo_normalizar($autor['nombre'] ?? '');
    $usuario = chronos_catalejo_normalizar($autor['usuario'] ?? '');
    $tema = chronos_catalejo_normalizar($autor['tema_favorito'] ?? ($autor['interes'] ?? ''));
    $interes = chronos_catalejo_normalizar($autor['interes'] ?? '');
    $bio = chronos_catalejo_normalizar($autor['bio'] ?? '');
    $rutasTexto = chronos_catalejo_normalizar(str_replace('||', ' ', (string)($autor['rutas_autor'] ?? '')));
    $todo = trim($nombre . ' ' . $usuario . ' ' . $tema . ' ' . $interes . ' ' . $bio . ' ' . $rutasTexto);

    $score = 0;
    $motivo = 'Señal relacionada';
    $tipo = 'relacionada';

    if ($usuario !== '' && $usuario === $q) {
        $score += 140;
        $motivo = 'Coincidencia exacta por @cronista';
        $tipo = 'exacta';
    } elseif ($nombre !== '' && $nombre === $q) {
        $score += 132;
        $motivo = 'Nombre localizado en el registro';
        $tipo = 'exacta';
    }

    if ($usuario !== '' && str_starts_with($usuario, $q)) {
        $score += 95;
        $motivo = $tipo === 'exacta' ? $motivo : 'El @cronista inicia igual';
        $tipo = $tipo === 'exacta' ? $tipo : 'inicio';
    }
    if ($nombre !== '' && str_starts_with($nombre, $q)) {
        $score += 88;
        $motivo = in_array($tipo, ['exacta','inicio'], true) ? $motivo : 'El nombre inicia igual';
        $tipo = in_array($tipo, ['exacta','inicio'], true) ? $tipo : 'inicio';
    }
    if ($usuario !== '' && str_contains($usuario, $q)) {
        $score += 68;
        $motivo = in_array($tipo, ['exacta','inicio'], true) ? $motivo : 'Coincide con su @cronista';
        $tipo = in_array($tipo, ['exacta','inicio'], true) ? $tipo : 'usuario';
    }
    if ($nombre !== '' && str_contains($nombre, $q)) {
        $score += 62;
        $motivo = in_array($tipo, ['exacta','inicio','usuario'], true) ? $motivo : 'Coincide con su nombre';
        $tipo = in_array($tipo, ['exacta','inicio','usuario'], true) ? $tipo : 'nombre';
    }

    $camposCortos = array_filter([$nombre, $usuario]);
    foreach ($camposCortos as $campo) {
        $tokens = array_filter(explode(' ', $campo));
        $tokens[] = $campo;
        foreach ($tokens as $token) {
            if ($token === '') { continue; }
            $distancia = levenshtein($q, $token);
            $maxLen = max(strlen($q), strlen($token));
            $porcentaje = 0.0;
            similar_text($q, $token, $porcentaje);
            if ($maxLen <= 4 && $distancia <= 1) {
                $score += 74;
                $motivo = in_array($tipo, ['exacta','inicio'], true) ? $motivo : 'Nombre muy cercano';
                $tipo = in_array($tipo, ['exacta','inicio'], true) ? $tipo : 'cercana';
            } elseif ($maxLen <= 8 && $distancia <= 2) {
                $score += 56;
                $motivo = in_array($tipo, ['exacta','inicio','cercana'], true) ? $motivo : 'Coincidencia cercana';
                $tipo = in_array($tipo, ['exacta','inicio','cercana'], true) ? $tipo : 'cercana';
            } elseif ($porcentaje >= 78) {
                $score += 42;
                $motivo = in_array($tipo, ['exacta','inicio','cercana'], true) ? $motivo : 'Se parece a tu búsqueda';
                $tipo = in_array($tipo, ['exacta','inicio','cercana'], true) ? $tipo : 'similar';
            }
        }
    }

    $palabras = array_filter(explode(' ', $q));
    if (count($palabras) > 1) {
        $todas = true;
        foreach ($palabras as $palabra) {
            if (!str_contains($todo, $palabra)) {
                $todas = false;
                break;
            }
        }
        if ($todas) {
            $score += 50;
            $motivo = in_array($tipo, ['exacta','inicio','cercana'], true) ? $motivo : 'Varias señales coinciden';
            $tipo = in_array($tipo, ['exacta','inicio','cercana'], true) ? $tipo : 'multiple';
        }
    }

    if ($tema !== '' && str_contains($tema, $q)) {
        $score += 36;
        $motivo = in_array($tipo, ['exacta','inicio','cercana','usuario','nombre'], true) ? $motivo : 'Coincide por especialidad';
        $tipo = in_array($tipo, ['exacta','inicio','cercana','usuario','nombre'], true) ? $tipo : 'especialidad';
    }
    if ($rutasTexto !== '' && str_contains($rutasTexto, $q)) {
        $score += 42;
        $motivo = in_array($tipo, ['exacta','inicio','cercana','usuario','nombre'], true) ? $motivo : 'Coincide por ruta histórica';
        $tipo = in_array($tipo, ['exacta','inicio','cercana','usuario','nombre'], true) ? $tipo : 'ruta';
    }
    if ($bio !== '' && str_contains($bio, $q)) {
        $score += 14;
        $motivo = in_array($tipo, ['exacta','inicio','cercana','usuario','nombre','ruta','especialidad'], true) ? $motivo : 'Aparece en su biografía';
        $tipo = in_array($tipo, ['exacta','inicio','cercana','usuario','nombre','ruta','especialidad'], true) ? $tipo : 'bio';
    }

    $score += min(12, (int)($autor['total_relatos'] ?? 0) * 2);
    $score += min(10, (int)($autor['total_seguidores'] ?? 0) * 2);
    if ((int)($autor['perfil_completo'] ?? 0) === 1) {
        $score += 4;
    }

    if ($score <= 0) {
        return ['score' => 0, 'motivo' => 'Sin señal clara', 'tipo' => 'sin_senal'];
    }

    return ['score' => $score, 'motivo' => $motivo, 'tipo' => $tipo];
}

function chronos_autores_sugeridos_inteligentes(PDO $pdo, array $usuario, int $limite = 5, bool $incluirSeguidos = false, ?string $busqueda = '', ?string $categoria = ''): array
{
    $usuarioId = (int)($usuario['id'] ?? 0);
    $temaUsuario = (string)($usuario['tema_favorito'] ?: ($usuario['interes'] ?? ''));
    $rutasInteres = chronos_rutas_interes_usuario($pdo, $usuarioId, $temaUsuario);

    $sql = "SELECT u.id, u.nombre, u.usuario, u.avatar, u.portada, u.bio, u.tema_favorito, u.interes, u.perfil_completo, u.creado_en,
            (SELECT COUNT(*) FROM publicaciones p WHERE p.usuario_id = u.id) AS total_relatos,
            (SELECT COUNT(*) FROM seguidores s WHERE s.seguido_id = u.id) AS total_seguidores,
            (SELECT COUNT(*) FROM seguidores su WHERE su.seguidor_id = ? AND su.seguido_id = u.id) AS usuario_alistado,
            (SELECT MAX(p2.creado_en) FROM publicaciones p2 WHERE p2.usuario_id = u.id) AS ultimo_relato,
            (SELECT GROUP_CONCAT(DISTINCT p3.categoria ORDER BY p3.categoria SEPARATOR '||') FROM publicaciones p3 WHERE p3.usuario_id = u.id AND p3.categoria <> '') AS rutas_autor
        FROM usuarios u
        WHERE u.id <> ?";
    $params = [$usuarioId, $usuarioId];

    if (!$incluirSeguidos) {
        $sql .= " AND NOT EXISTS (SELECT 1 FROM seguidores sx WHERE sx.seguidor_id = ? AND sx.seguido_id = u.id)";
        $params[] = $usuarioId;
    }

    $busqueda = trim((string)$busqueda);
    if ($busqueda !== '') {
        $sql .= " AND (u.nombre LIKE ? OR u.usuario LIKE ? OR u.tema_favorito LIKE ? OR u.interes LIKE ? OR u.bio LIKE ?)";
        $like = '%' . $busqueda . '%';
        array_push($params, $like, $like, $like, $like, $like);
    }

    $categoria = trim((string)$categoria);
    if ($categoria !== '') {
        $sql .= " AND EXISTS (SELECT 1 FROM publicaciones pc WHERE pc.usuario_id = u.id AND pc.categoria = ?)";
        $params[] = $categoria;
    }

    $sql .= " ORDER BY u.creado_en DESC LIMIT 60";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $autores = $stmt->fetchAll() ?: [];
    $autores = chronos_enriquecer_autores_sugeridos($autores, $rutasInteres, $temaUsuario, true);
    return array_slice($autores, 0, max(1, $limite));
}

function chronos_insignia_legado(int $relatos, int $rutas, int $interacciones): array
{
    if ($relatos >= 10 && $rutas >= 3) {
        return ['titulo' => 'Cronista de Chronos', 'descripcion' => 'Ha construido un legado con varias rutas históricas.', 'icono' => 'ri-quill-pen-fill'];
    }
    if ($rutas >= 3) {
        return ['titulo' => 'Explorador de rutas', 'descripcion' => 'Su legado recorre varias civilizaciones o memorias.', 'icono' => 'ri-compass-3-fill'];
    }
    if ($interacciones >= 10) {
        return ['titulo' => 'Voz con eco', 'descripcion' => 'Sus relatos ya generan conversación en la comunidad.', 'icono' => 'ri-megaphone-line'];
    }
    if ($relatos >= 1) {
        return ['titulo' => 'Cronista inicial', 'descripcion' => 'Ya dejó sus primeras huellas dentro de Chronos.', 'icono' => 'ri-scroll-line'];
    }
    return ['titulo' => 'Legado en construcción', 'descripcion' => 'Aún está preparando sus primeras crónicas.', 'icono' => 'ri-seedling-line'];
}

function chronos_insignias_basicas(int $relatos, int $rutas, int $ecos, int $comentarios, int $seguidores, int $preservados = 0): array
{
    $interacciones = $ecos + $comentarios;
    return [
        [
            'titulo' => 'Identidad abierta',
            'descripcion' => 'El cronista ya comenzó a construir su presencia en Chronos.',
            'icono' => 'ri-user-star-line',
            'activa' => true,
        ],
        [
            'titulo' => 'Primer testimonio',
            'descripcion' => 'Publicó al menos una crónica dentro de su legado.',
            'icono' => 'ri-scroll-line',
            'activa' => $relatos > 0,
        ],
        [
            'titulo' => 'Mapa en expansión',
            'descripcion' => 'Su legado recorre más de una ruta histórica.',
            'icono' => 'ri-compass-3-line',
            'activa' => $rutas >= 2,
        ],
        [
            'titulo' => 'Voz con eco',
            'descripcion' => 'Sus relatos ya provocaron ecos o comentarios.',
            'icono' => 'ri-megaphone-line',
            'activa' => $interacciones > 0,
        ],
        [
            'titulo' => 'Legado respaldado',
            'descripcion' => 'Otros exploradores siguen este legado.',
            'icono' => 'ri-user-follow-line',
            'activa' => $seguidores > 0,
        ],
        [
            'titulo' => 'Archivo consciente',
            'descripcion' => 'Preserva relatos para consulta personal en su Archivo Histórico.',
            'icono' => 'ri-archive-line',
            'activa' => $preservados > 0,
            'privada' => true,
        ],
    ];
}

function chronos_estado_legado_texto(int $relatos, int $rutas, int $interacciones): string
{
    if ($relatos >= 10 && $rutas >= 3) {
        return 'Legado consolidado';
    }
    if ($relatos >= 5 || $rutas >= 3) {
        return 'Legado en expansión';
    }
    if ($relatos >= 1) {
        return 'Legado naciente';
    }
    return 'Legado en preparación';
}

