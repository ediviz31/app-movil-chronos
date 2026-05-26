<?php
// Configuración de base de datos para Chronos.
// En XAMPP normalmente el usuario es root y la contraseña va vacía.
define('DB_HOST', '127.0.0.1');
define('DB_NAME', 'chronos');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

function chronos_pdo(): PDO
{
    static $pdo = null;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    try {
        $dsnServidor = 'mysql:host=' . DB_HOST . ';charset=' . DB_CHARSET;
        $pdoServidor = new PDO($dsnServidor, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        $pdoServidor->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        $dsnBase = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=' . DB_CHARSET;
        $pdo = new PDO($dsnBase, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);

        chronos_instalar_tablas($pdo);
        return $pdo;
    } catch (PDOException $e) {
        die('Error de conexión a la base de datos: ' . htmlspecialchars($e->getMessage(), ENT_QUOTES, 'UTF-8'));
    }
}

function chronos_instalar_tablas(PDO $pdo): void
{
    $pdo->exec("CREATE TABLE IF NOT EXISTS usuarios (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        usuario VARCHAR(60) NOT NULL UNIQUE,
        correo VARCHAR(160) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        interes VARCHAR(120) DEFAULT NULL,
        bio VARCHAR(255) DEFAULT NULL,
        tema_favorito VARCHAR(120) DEFAULT NULL,
        avatar VARCHAR(255) DEFAULT 'assets/img/avatar.svg',
        portada VARCHAR(255) DEFAULT 'assets/img/cover.svg',
        perfil_completo TINYINT(1) NOT NULL DEFAULT 0,
        rol VARCHAR(30) NOT NULL DEFAULT 'usuario',
        codigo_legado_aceptado TINYINT(1) NOT NULL DEFAULT 0,
        codigo_legado_aceptado_en DATETIME DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    chronos_asegurar_columna_usuario_rol($pdo);
    chronos_asegurar_columnas_codigo_legado($pdo);
    chronos_asegurar_primer_admin($pdo);


    $pdo->exec("CREATE TABLE IF NOT EXISTS publicaciones (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        usuario_id INT UNSIGNED NOT NULL,
        titulo VARCHAR(180) NOT NULL,
        categoria VARCHAR(120) NOT NULL,
        contenido TEXT NOT NULL,
        imagen VARCHAR(255) DEFAULT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_publicaciones_usuario (usuario_id),
        INDEX idx_publicaciones_fecha (creado_en),
        CONSTRAINT fk_publicaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS ecos (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        publicacion_id INT UNSIGNED NOT NULL,
        usuario_id INT UNSIGNED NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_eco_usuario_publicacion (publicacion_id, usuario_id),
        INDEX idx_ecos_publicacion (publicacion_id),
        INDEX idx_ecos_usuario (usuario_id),
        CONSTRAINT fk_ecos_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
        CONSTRAINT fk_ecos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");



    $pdo->exec("CREATE TABLE IF NOT EXISTS archivados (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        publicacion_id INT UNSIGNED NOT NULL,
        usuario_id INT UNSIGNED NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_archivado_usuario_publicacion (publicacion_id, usuario_id),
        INDEX idx_archivados_publicacion (publicacion_id),
        INDEX idx_archivados_usuario (usuario_id),
        CONSTRAINT fk_archivados_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
        CONSTRAINT fk_archivados_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS comentarios (
        id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        publicacion_id INT UNSIGNED NOT NULL,
        usuario_id INT UNSIGNED NOT NULL,
        parent_id INT UNSIGNED DEFAULT NULL,
        contenido TEXT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_comentarios_publicacion (publicacion_id),
        INDEX idx_comentarios_usuario (usuario_id),
        INDEX idx_comentarios_parent (parent_id),
        CONSTRAINT fk_comentarios_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
        CONSTRAINT fk_comentarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
        CONSTRAINT fk_comentarios_parent FOREIGN KEY (parent_id) REFERENCES comentarios(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    chronos_asegurar_columnas_comentarios_respuestas($pdo);


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


function chronos_asegurar_columna_usuario_rol(PDO $pdo): void
{
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'rol'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE usuarios ADD COLUMN rol VARCHAR(30) NOT NULL DEFAULT 'usuario' AFTER perfil_completo");
    }
}


function chronos_asegurar_columnas_codigo_legado(PDO $pdo): void
{
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'codigo_legado_aceptado'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE usuarios ADD COLUMN codigo_legado_aceptado TINYINT(1) NOT NULL DEFAULT 0 AFTER rol");
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'codigo_legado_aceptado_en'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE usuarios ADD COLUMN codigo_legado_aceptado_en DATETIME DEFAULT NULL AFTER codigo_legado_aceptado");
    }
}

function chronos_asegurar_columnas_comentarios_respuestas(PDO $pdo): void
{
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comentarios' AND COLUMN_NAME = 'parent_id'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE comentarios ADD COLUMN parent_id INT UNSIGNED DEFAULT NULL AFTER usuario_id");
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'comentarios' AND INDEX_NAME = 'idx_comentarios_parent'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        $pdo->exec("ALTER TABLE comentarios ADD INDEX idx_comentarios_parent (parent_id)");
    }

    $stmt = $pdo->prepare("SELECT COUNT(*) FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_comentarios_parent'");
    $stmt->execute();
    if ((int)$stmt->fetchColumn() === 0) {
        try {
            $pdo->exec("ALTER TABLE comentarios ADD CONSTRAINT fk_comentarios_parent FOREIGN KEY (parent_id) REFERENCES comentarios(id) ON DELETE CASCADE");
        } catch (Throwable $e) {
            // Si MySQL no permite agregar la llave por una instalación antigua, Chronos sigue funcionando con parent_id.
        }
    }
}

function chronos_asegurar_primer_admin(PDO $pdo): void
{
    chronos_asegurar_columna_usuario_rol($pdo);
    $totalUsuarios = (int)$pdo->query('SELECT COUNT(*) FROM usuarios')->fetchColumn();
    if ($totalUsuarios === 0) {
        return;
    }

    $totalAdmins = (int)$pdo->query("SELECT COUNT(*) FROM usuarios WHERE rol = 'admin'")->fetchColumn();
    if ($totalAdmins > 0) {
        return;
    }

    $primerId = (int)$pdo->query('SELECT MIN(id) FROM usuarios')->fetchColumn();
    if ($primerId > 0) {
        $stmt = $pdo->prepare("UPDATE usuarios SET rol = 'admin' WHERE id = ?");
        $stmt->execute([$primerId]);
    }
}
