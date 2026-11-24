import test from 'node:test';
import assert from 'node:assert/strict';
import {monthlyProgress} from '../../server/domain/monthlyProgress.js';
import {mealPlans} from '../../src/domain/mealPlans.js';
import {menus} from '../../server/catalog.js';
import {gymClock,validTime} from '../../server/attendance.js';
test('La Paz abre a las 07:00 y cierra a las 20:00',()=>{
  assert.equal(gymClock(new Date('2026-11-24T11:00:00Z')).open,true);
  assert.equal(gymClock(new Date('2026-11-25T00:00:00Z')).open,false);
  assert.equal(validTime('18:37'),true);
  assert.equal(validTime('19:60'),false);
});

test('El progreso de asistencia se limita al cien por ciento',()=>{
  for(const [days,percent] of [[0,0],[6,50],[12,100],[15,100]])
    assert.equal(monthlyProgress(Array(days)).percent,percent);
});

test('Cada objetivo dispone de un menú con cuatro comidas',()=>{
  for(const goal of Object.keys(menus))
    assert.deepEqual(Object.keys(mealPlans[goal]),['Desayuno','Almuerzo','Merienda','Cena']);
});

