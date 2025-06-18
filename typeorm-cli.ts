import 'reflect-metadata';
import { register } from 'ts-node';
import { resolve } from 'path';

register({
  project: resolve(__dirname, './tsconfig.json'),
  transpileOnly: true,
  files: true,
  compilerOptions: {
    module: 'commonjs',
  },
});

require('tsconfig-paths/register');

require('./node_modules/typeorm/cli.js');
