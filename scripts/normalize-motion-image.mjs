#!/usr/bin/env node
import {normalizeMotionImage} from './lib/normalize-motion-image.mjs';
const args=process.argv.slice(2),get=k=>args[args.indexOf(k)+1];
if(!args.includes('--input')||!args.includes('--out'))throw Error('Usage: node scripts/normalize-motion-image.mjs --input original.svg --out normalized.svg [--padding 0.02]');
console.log(JSON.stringify(await normalizeMotionImage(get('--input'),get('--out'),{padding:args.includes('--padding')?Number(get('--padding')):0.02}),null,2));
