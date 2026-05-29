const multer = require('multer');
const path = require('path');

/**
 * Middleware de uploads usando memoryStorage.
 * Los archivos viven en memoria (req.file.buffer) y se suben al
 * Emergent Object Store desde el endpoint correspondiente.
 */

function makeUpload() {
  const storage = multer.memoryStorage();
  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  };
  return multer({
    storage,
    limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
    fileFilter
  });
}

function makeVideoUpload() {
  const storage = multer.memoryStorage();
  const fileFilter = (req, file, cb) => {
    const allowedExt = /mp4|webm|mov|m4v|quicktime/;
    const allowedMime = /^video\//;
    const extname = allowedExt.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedMime.test(file.mimetype);
    if (mimetype || extname) return cb(null, true);
    cb(new Error('Sólo se permiten videos (mp4, webm, mov)'));
  };
  return multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
    fileFilter
  });
}

const upload = makeUpload();
upload.makeUpload = makeUpload;
upload.makeVideoUpload = makeVideoUpload;
upload.avatares = makeUpload();
upload.portadas = makeUpload();
upload.familiares = makeUpload();
upload.videos = makeVideoUpload();

module.exports = upload;
