import { register } from 'node:module';

register(new URL('./esm-loader.mjs', import.meta.url));
