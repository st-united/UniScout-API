import { diskStorage } from 'multer';
import * as fs from 'fs';

const ACCEPTED_FILE: string[] = ['jpeg', 'jp2', 'jpeg'];
const MAX_SIZE_FILE = 524288;

export const fileOption = (module) => {
  return process.env.STORAGE_LOCATED === 'LOCAL'
    ? {
        storage: diskStorage({
          destination: async function (req, file, cb) {
            const destination = `uploads/${module}/`;
            !fs.existsSync(`${destination}`) && fs.mkdirSync(`${destination}`, { recursive: true });
            cb(null, `${destination}`);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 100);
            cb(null, file.originalname.split('.')[0] + '-' + uniqueSuffix + `.${file.mimetype.split('/').at(-1)}`);
          },
        }),
        fileFilter: (req, file, cb) => {
          const fileType = file.mimetype.split('/').at(-1);
          if (ACCEPTED_FILE.includes(fileType)) {
            return cb(null, true);
          }
          return cb(null, false);
        },
        limits: {
          fileSize: MAX_SIZE_FILE,
        },
      }
    : {};
};
