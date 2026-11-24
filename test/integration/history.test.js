import data from '../fixtures/gym.json' with { type: 'json' };
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createVisitHistory} from '../../server/infrastructure/visitHistory.js';

test('El historial conserva entradas previas y separa días, meses y socios',t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec("CREATE TABLE members(id INTEGER PRIMARY KEY); INSERT INTO members VALUES(1),(2); CREATE TABLE attendance(member INTEGER PRIMARY KEY, day TEXT)");
  db.prepare('INSERT INTO attendance VALUES(1,?)').run(data.history.first);
  const history=createVisitHistory(db);
  const enter=db.prepare('INSERT INTO attendance(member,day) VALUES(?,?) ON CONFLICT(member) DO NOTHING');
  for(const [id,day] of [[1,data.history.first],[1,data.history.second],[2,data.history.otherMember],[1,data.history.nextMonth]]){
    db.exec('DELETE FROM attendance');
    enter.run(id,day);
  }
  assert.deepEqual(history.daysInMonth(1,data.history.first.slice(0,7)),[data.history.first,data.history.second]);
  assert.equal(history.daysInMonth(1,data.history.nextMonth.slice(0,7)).length,1);
});



