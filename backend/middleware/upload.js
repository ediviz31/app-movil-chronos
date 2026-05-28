const multer = require('multer');
const path = require('path');

// Crear una factoría para devolver un upload configurado por carpeta
function makeUpload(folder) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, `uploads/${folder}`),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Solo se permiten imágenes (jpg, png, gif, webp)'));
  };

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter
  });
}

// Factoría para videos: 50MB, formatos mp4/webm/mov
function makeVideoUpload(folder) {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, `uploads/${folder}`),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });
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
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
    fileFilter
  });
}

// Por defecto exporta el de relatos (compat. existente)
const upload = makeUpload('relatos');
upload.makeUpload = makeUpload;
upload.makeVideoUpload = makeVideoUpload;
upload.avatares = makeUpload('avatares');
upload.portadas = makeUpload('portadas');
upload.familiares = makeUpload('familiares');
upload.videos = makeVideoUpload('videos');

module.exports = upload;