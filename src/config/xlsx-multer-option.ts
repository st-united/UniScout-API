import { diskStorage } from 'multer';
import * as fs from 'fs';

type FileImportedOption = {
  module: string;
  acceptedFile: string[];
};

export const fileImportedOption = ({ module, acceptedFile }: FileImportedOption) => {
  return process.env.STORAGE_LOCATED === 'LOCAL'
    ? {
        storage: diskStorage({
          destination: async function (req, file, cb) {
            const destination = `uploads/imported/${module}/`;
            !fs.existsSync(`${destination}`) && fs.mkdirSync(`${destination}`, { recursive: true });
            cb(null, `${destination}`);
          },
          filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 100);
            cb(null, file.originalname.split('.')[0] + '-' + uniqueSuffix + `.xlsx`);
          },
        }),
        fileFilter: (req, file, cb) => {
          const fileType = file.mimetype;
          if (acceptedFile.includes(fileType)) {
            return cb(null, true);
          }
          return cb(null, false);
        },
      }
    : {};
};
