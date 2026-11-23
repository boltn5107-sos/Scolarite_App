const multer = require('multer');
const config = require('./config');
const storage = require('./storage');
const { setFlash } = require('./middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadSize, files: 1 },
  fileFilter: (req, file, callback) => {
    if (storage.extensionFor(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new Error('Seuls les fichiers PDF et JPG sont acceptés'));
    }
  }
});

function uploadPiece(req, res, next) {
  upload.single('fichier')(req, res, (error) => {
    if (error) {
      setFlash(req, 'error', error.code === 'LIMIT_FILE_SIZE' ? 'Le fichier ne doit pas dépasser 5 Mo' : error.message);
      return res.redirect('back');
    }
    return next();
  });
}

module.exports = { uploadPiece };
