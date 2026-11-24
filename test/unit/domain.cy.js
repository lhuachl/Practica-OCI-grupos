import data from '../fixtures/gym.json';
import {buildPlan,equipment} from '../../server/catalog.js';
import {gymClock,validTime} from '../../server/attendance.js';
import {monthlyProgress} from '../../server/domain/monthlyProgress.js';
import {mealPlans} from '../../src/domain/mealPlans.js';

describe('Reglas de GymTurno',()=>{
  it('Respeta los límites horarios de La Paz',()=>{
    expect(gymClock(new Date(data.times.open)).open).to.be.true;
    expect(gymClock(new Date(data.times.closed)).open).to.be.false;
    expect(validTime(data.times.valid)).to.be.true;
    expect(validTime(data.times.invalid)).to.be.false;
  });
  it('Calcula el progreso mensual hasta el 100 %',()=>{
    for(const [days,percent] of data.progress)
      expect(monthlyProgress(Array(days)).percent).to.equal(percent);
  });
  it('Ofrece cuatro comidas para cada objetivo',()=>{
    for(const goal of data.goals) expect(Object.keys(mealPlans[goal])).to.deep.equal(data.meals);
  });
  for(const goal of data.goals){
    it('Distribuye el tiempo disponible para '+goal,()=>{
      for(const end of data.times.ends){
        let cursor=data.times.start;
        for(const block of buildPlan(goal,cursor,end)){
          expect(block.start).to.equal(cursor);
          expect(block.length).to.be.greaterThan(0);
          if(block.photo) cy.readFile('public/ejercicios/'+block.photo+'.jpg',null,{log:false});
          cursor=block.end;
        }
        expect(cursor).to.equal(end);
      }
    });
  }
  it('Sustituye máquinas ocupadas y admite una sala llena',()=>{
    const {slot,departure}=data.visit;
    const machine=data.equipment.single;
    expect(buildPlan('fuerza',slot,departure,{[machine]:equipment[machine]}).some(b=>b.machine===machine)).to.be.false;
    expect(buildPlan('fuerza',slot,departure,equipment).every(b=>!b.machine)).to.be.true;
  });
});
