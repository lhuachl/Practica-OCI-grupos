import {before,after,test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';

let processHandle;
let base;
// El servidor real usa un puerto libre y una base exclusiva de esta suite.
before(async()=>{
  processHandle=spawn(process.execPath,['server/index.js'],{
    env:{...process.env,DB_PATH:':memory:',PORT:'0',COOKIE_SECURE:'false'},
    stdio:['ignore','pipe','inherit']
  });
  for await(const line of createInterface({input:processHandle.stdout})){
    const port=line.match(/GymTurno en http:\/\/localhost:(\d+)/)?.[1];
    if(port){base='http://127.0.0.1:'+port+'/api';return;}
  }
  throw Error('El servidor de integración terminó antes de estar disponible.');
},{timeout:10000});
after(async()=>{
  if(processHandle && processHandle.exitCode===null && !processHandle.signalCode){
    const closed=once(processHandle,'exit');
    processHandle.kill();
    await closed;
  }
});
function request(path,method='GET',data,cookie=''){
  return fetch(base+path,{method,headers:{'Content-Type':'application/json',cookie},
    body:data===undefined?undefined:JSON.stringify(data)});
}
async function member(){
  const profile={name:'Ana',email:randomUUID()+'@example.test',goal:'peso',password:'Gym-pruebas-123'};
  const response=await request('/register','POST',profile);
  assert.equal(response.status,201);
  return {profile,cookie:response.headers.get('set-cookie').split(';')[0]};
}
test('Un alta crea una sesión y normaliza el nombre',async()=>{
  const {cookie,profile}=await member();
  const me=await (await request('/me','GET',undefined,cookie)).json();
  assert.equal(me.member.name,profile.name);
  assert.equal(me.member.goal,'peso');
});
test('Un correo ya registrado se rechaza aunque cambien las mayúsculas',async()=>{
  const {profile}=await member();
  const repeated=await request('/register','POST',{...profile,email:profile.email.toUpperCase()});
  assert.equal(repeated.status,409);
});
test('Una fecha inexistente se rechaza antes de guardar la reserva',async()=>{
  const {cookie}=await member();
  assert.equal((await request('/agenda?day=2099-02-30','PUT',{slot:'16:00',departure:'17:00'},cookie)).status,400);
});
test('La rutina guardada solo aparece en la agenda del socio que la creó',async()=>{
  const first=await member();
  const second=await member();
  const day='/agenda?day=2099-03-15';
  assert.equal((await request(day,'PUT',{slot:'16:00',departure:'16:45'},first.cookie)).status,204);
  const own=await (await request(day,'GET',undefined,first.cookie)).json();
  const other=await (await request(day,'GET',undefined,second.cookie)).json();
  assert.equal(own.routine.at(-1).end,'16:45');
  assert.equal(other.booked,null);
});
test('Salir invalida la cookie emitida y protege el historial',async()=>{
  const {cookie}=await member();
  assert.equal((await request('/logout','POST',undefined,cookie)).status,204);
  assert.equal((await request('/progreso?month=2026-11','GET',undefined,cookie)).status,401);
});
