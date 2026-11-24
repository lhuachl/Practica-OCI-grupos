import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {buildPlan,menus,equipment} from './server/catalog.js';

for(const goal of Object.keys(menus)){
  test('Plan con fotos y horario continuo para '+goal,()=>{
    for(const end of ['07:01','07:13','07:45','08:00','20:00']){
      const plan=buildPlan(goal,'07:00',end);
      let start='07:00';
      for(const block of plan){
        assert.equal(block.start,start);
        assert.ok(block.length>0);
        if(block.photo) assert.ok(existsSync(new URL('./public/ejercicios/'+block.photo+'.jpg',import.meta.url)));
        start=block.end;
      }
      assert.equal(start,end);
    }
  });
}
test('Evita máquinas completas y cuenta con alternativa sin equipo',()=>{
  assert.ok(buildPlan('peso','17:30','18:15',{caminadora:2}).every(b=>b.machine!=='caminadora'));
  assert.ok(buildPlan('fuerza','17:30','18:15',equipment).every(b=>!b.machine));
});
