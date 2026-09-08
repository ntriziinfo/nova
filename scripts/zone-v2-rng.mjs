import {createHash} from 'node:crypto';
// xoshiro128** 1.1 by David Blackman and Sebastiano Vigna (CC0).
// Reference: https://prng.di.unimi.it/xoshiro128starstar.c
export function xoshiro128FromState(state){
 let [a,b,c,d]=state.map(x=>x|0);if((a|b|c|d)===0)throw Error('RNG state must not be all zero');
 return ()=>{const z=Math.imul(b,5),r=Math.imul((z<<7)|(z>>>25),9)>>>0,t=b<<9;c^=a;d^=b;b^=c;a^=d;c^=t;d=(d<<11)|(d>>>21);return r/4294967296;};
}
export function xoshiro128(seed){
 const bytes=createHash('sha256').update('NOVA-research/xoshiro128**/v1/'+String(seed)).digest();
 return xoshiro128FromState([0,4,8,12].map(offset=>bytes.readUInt32LE(offset)));
}
