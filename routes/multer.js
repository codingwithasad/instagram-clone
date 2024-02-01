const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

module.exports = multer({
    storage: multer.diskStorage({}),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/jpg||jpeg||png||gif$i/)) {
  
        cb(new Error("File is not supported!"), false)
        return;
      }
      cb(null, true)
    }
  });