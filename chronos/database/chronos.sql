CREATE DATABASE IF NOT EXISTS chronos CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chronos;

CREATE TABLE IF NOT EXISTS usuarios (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS publicaciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  categoria VARCHAR(120) NOT NULL,
  contenido TEXT NOT NULL,
  imagen VARCHAR(255) DEFAULT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_publicaciones_usuario (usuario_id),
  INDEX idx_publicaciones_categoria (categoria),
  INDEX idx_publicaciones_fecha (creado_en),
  CONSTRAINT fk_publicaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ecos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_eco_usuario_publicacion (publicacion_id, usuario_id),
  INDEX idx_ecos_publicacion (publicacion_id),
  INDEX idx_ecos_usuario (usuario_id),
  CONSTRAINT fk_ecos_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_ecos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comentarios (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS archivados (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  publicacion_id INT UNSIGNED NOT NULL,
  usuario_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_archivado_usuario_publicacion (publicacion_id, usuario_id),
  INDEX idx_archivados_publicacion (publicacion_id),
  INDEX idx_archivados_usuario (usuario_id),
  CONSTRAINT fk_archivados_publicacion FOREIGN KEY (publicacion_id) REFERENCES publicaciones(id) ON DELETE CASCADE,
  CONSTRAINT fk_archivados_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS seguidores (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seguidor_id INT UNSIGNED NOT NULL,
  seguido_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seguidor_seguido (seguidor_id, seguido_id),
  INDEX idx_seguidores_seguidor (seguidor_id),
  INDEX idx_seguidores_seguido (seguido_id),
  CONSTRAINT fk_seguidores_seguidor FOREIGN KEY (seguidor_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_seguidores_seguido FOREIGN KEY (seguido_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS avisos (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



-- Para instalaciones ya existentes:
-- ALTER TABLE usuarios ADD COLUMN codigo_legado_aceptado TINYINT(1) NOT NULL DEFAULT 0 AFTER rol;
-- ALTER TABLE usuarios ADD COLUMN codigo_legado_aceptado_en DATETIME DEFAULT NULL AFTER codigo_legado_aceptado;

-- El primer usuario registrado se considera administrador inicial.
-- Si ya tienes usuarios creados, puedes ejecutar esto una vez para activar el panel:
-- UPDATE usuarios SET rol = 'admin' WHERE id = 1;

CREATE TABLE IF NOT EXISTS reportes (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
