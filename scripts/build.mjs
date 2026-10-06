import { cpSync, mkdirSync, rmSync } from 'node:fs';
rmSync('dist',{recursive:true,force:true});
mkdirSync('dist/core',{recursive:true});
cpSync('public','dist',{recursive:true});
cpSync('src/core','dist/core',{recursive:true});
console.log('Built standalone demo and presentation into dist/');
