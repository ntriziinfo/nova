// Isolated candidate fixture: redirect only the two runtime source reads in this Node process.
// Simulation workers and the deployed app are never affected by this import.
import fs from 'node:fs';
import path from 'node:path';
import {buildArt,buildNormal} from './model.mjs';
const c=JSON.parse(fs.readFileSync('research/balance120/verify12.json'))[0];
const files=new Map([[path.resolve('nova-art.js'),buildArt(c)],[path.resolve('nova-normal.js'),buildNormal(c)]]),read=fs.readFileSync;
fs.readFileSync=function(file,options){const name=typeof file==='string'?path.resolve(file):null;if(!files.has(name))return read.call(this,file,options);const value=files.get(name);return typeof options==='string'||options?.encoding?value:Buffer.from(value);};
