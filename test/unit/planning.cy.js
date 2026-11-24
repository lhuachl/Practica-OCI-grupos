import {buildPlan,minutes} from '../../server/catalog.js';
import {validTime} from '../../server/attendance.js';
import cases from '../fixtures/functional.json';

describe('Límites del plan y del horario',()=>{
  it('Una visita de un minuto cabe justo antes del cierre',()=>{
    const blocks=buildPlan('movilidad','19:59','20:00');
    expect(blocks).to.have.length(1);
    expect(blocks[0]).to.include({length:1,start:'19:59',end:'20:00'});
  });
  it('Reserva como máximo sesenta minutos y destina el resto al tiempo libre',()=>{
    const {arrival,updatedDeparture}=cases.visit;
    const blocks=buildPlan('peso',arrival,updatedDeparture);
    const work=blocks.slice(0,-1);
    expect(work.reduce((sum,b)=>sum+b.length,0)).to.equal(60);
    expect(blocks.at(-1)).to.include({name:'Tiempo libre',length:15,end:updatedDeparture});
    for(const block of blocks)
      expect(minutes(block.end)-minutes(block.start)).to.equal(block.length);
  });
  it('Acepta la última llegada y excluye el cierre y formatos incompletos',()=>{
    expect(validTime('19:59')).to.be.true;
    for(const time of ['20:00','06:59','7:00','07:60',null])
      expect(validTime(time)).to.be.false;
  });
});
