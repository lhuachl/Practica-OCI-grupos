import data from '../fixtures/gym.json' with { type: 'json' };
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import {DatabaseSync} from 'node:sqlite';
import {once} from 'node:events';
import {installAttendance} from '../../server/attendance.js';

test('Entradas, cambios de equipo, salida y cierre mantienen los contadores',async t=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE members(id INTEGER PRIMARY KEY); INSERT INTO members VALUES(1),(2)');
  const app=express();
  app.use(express.json());
  // Identidades y reloj controlados exclusivamente dentro de la prueba.
  app.use((req,res,next)=>{req.member={id:Number(req.headers.member)};next();});
  let open=true;
  installAttendance(app,db,()=>({day:data.history.second,open}));
  const server=app.listen(0,'127.0.0.1');
  await once(server,'listening');
  t.after(async()=>{await new Promise(done=>server.close(done));db.close();});
  async function request(id,path,method='GET',machine){
    return fetch('http://127.0.0.1:'+server.address().port+'/api/sala'+path,{method,
      headers:{member:String(id),'Content-Type':'application/json'},
      body:machine===undefined?undefined:JSON.stringify({machine})});
  }
  assert.equal((await request(1,'/equipo','PUT',data.equipment.single)).status,409);
  for(const id of [1,1,2]) await request(id,'/entrada','PUT');
  assert.equal((await (await request(1,'')).json()).total,2);
  assert.equal((await request(1,'/equipo','PUT',data.equipment.single)).status,200);
  assert.equal((await request(2,'/equipo','PUT',data.equipment.single)).status,409);
  await request(1,'/equipo','PUT',data.equipment.alternative);
  assert.equal((await request(2,'/equipo','PUT',data.equipment.single)).status,200);
  const after=await (await request(2,'/entrada','DELETE')).json();
  assert.equal(after.total,1);
  assert.equal(after.equipment.find(e=>e.name===data.equipment.single).used,0);
  open=false;
  assert.equal((await (await request(1,'')).json()).total,0);
  assert.equal((await request(1,'/entrada','PUT')).status,409);
});


