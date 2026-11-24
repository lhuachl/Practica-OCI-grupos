import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createVisitHistory} from '../../server/infrastructure/visitHistory.js';

test('El historial conserva entradas previas y separa días, meses y socios',t=>{
  const db=new DatabaseSync(':memory:');
  t.after(()=>db.close());
  db.exec("CREATE TABLE members(id INTEGER PRIMARY KEY); INSERT INTO members VALUES(1),(2); CREATE TABLE attendance(member INTEGER PRIMARY KEY, day TEXT); INSERT INTO attendance VALUES(1,'2026-11-23')");
  const history=createVisitHistory(db);
  const enter=db.prepare('INSERT INTO attendance(member,day) VALUES(?,?) ON CONFLICT(member) DO NOTHING');
  for(const [id,day] of [[1,'2026-11-23'],[1,'2026-11-24'],[2,'2026-11-25'],[1,'2026-12-01']]){
    db.exec('DELETE FROM attendance');
    enter.run(id,day);
  }
  assert.deepEqual(history.daysInMonth(1,'2026-11'),['2026-11-23','2026-11-24']);
  assert.equal(history.daysInMonth(1,'2026-12').length,1);
});


