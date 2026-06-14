import multer from "multer";
import fs from "fs";
import path from "path";
import config from "../../config";

// Katalog na pliki na dysku (env UPLOAD_DIR, domyślnie ./upload); w produkcji volume Dockera.
export const UPLOAD_DIR = path.resolve(config.UPLOAD_DIR);

// Prefiks URL, pod którym serwowane są pliki - niezależny od ścieżki na dysku.
export const UPLOAD_ROUTE_PREFIX = "/uploads";

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Niedozwolony typ pliku. Dozwolone: JPEG, PNG, WEBP."));
  },
});

export default upload;
