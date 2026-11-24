import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validate} from '../src/worker.js';
const now=new Date('2026-11-24T10:00:00Z');
const valid={name:' Ana ',day:'2026-11-25',desk:1,start:540,end:600};
test('normaliza nombre y acepta turno laborable',()=>assert.equal(validate(valid,now).name,'Ana'));
test('rechaza fechas, mesas y horas inválidas',()=>{
 for(const patch of [{day:'2026-11-28'},{day:'2026-11-23'},{day:'2026-12-09'},{day:'2026-02-30'},{desk:5},{start:541},{end:540},{end:1110},{name:'a'},{day:'2026-11-24',start:600}])assert.throws(()=>validate({...valid,...patch},now));
});
test('respeta hora local de Madrid en verano',()=>assert.throws(()=>validate({...valid,day:'2026-07-01',start:720,end:750},new Date('2026-07-01T10:00:00Z'))));
