import gym from '../fixtures/gym.json';
import cases from '../fixtures/functional.json';
import {createAccount} from '../support/dashboard.js';

const {visit}=cases;
const agenda='/api/agenda?day='+visit.day;
function rejected(method,url,body,status){
  cy.request({method,url,body,failOnStatusCode:false}).then(response=>{
    expect(response.status).to.equal(status);
    expect(response.body.error).to.be.a('string').and.not.empty;
  });
}
describe('Reglas entre la API y SQLite',()=>{
  it('Publica salud y sesión anónima y protege los datos del socio',()=>{
    cy.request('/api/health').its('body.status').should('equal','ok');
    cy.request('/api/me').its('body').should('deep.equal',{member:null});
    for(const path of [agenda,'/api/sala','/api/progreso?month='+cases.pastMonth])
      rejected('GET',path,undefined,401);
  });
  it('Valida los datos de alta antes de crear la sesión',()=>{
    for(const invalid of [{name:' '},{email:'sin-arroba'},{password:cases.shortPassword},{goal:'desconocido'}])
      rejected('POST','/api/register',{...gym.member,...invalid},400);
    cy.request('/api/me').its('body').should('deep.equal',{member:null});
  });
  it('Rechaza horarios inválidos, fechas pasadas y objetivos desconocidos sin modificar la agenda',()=>{
    createAccount();
    for(const [slot,departure] of cases.invalidVisits)
      rejected('PUT',agenda,{slot,departure},400);
    const body={slot:visit.arrival,departure:visit.departure};
    rejected('PUT',agenda,{...body,goal:'otro'},400);
    rejected('PUT','/api/agenda?day=2000-01-01',body,400);
    cy.request(agenda).its('body.routine').should('be.empty');
  });
  it('Separa previsión de presencia y corrige el total cuando un socio cambia o cancela',()=>{
    createAccount();
    cy.request(agenda).then(({body})=>{
      const previous=body.schedule.find(s=>s.slot===visit.arrival)?.planned || 0;
      const booking={slot:visit.arrival,departure:visit.departure};
      cy.request('PUT',agenda,booking);
      createAccount();
      cy.request('PUT',agenda,booking);
      const planned=expected=>cy.request(agenda).then(({body})=>
        expect(body.schedule.find(s=>s.slot===visit.arrival)?.planned || 0).to.equal(expected));
      planned(previous+2);
      cy.request('/api/sala').its('body.inside').should('be.false');
      cy.request('PUT',agenda,{slot:visit.departure,departure:visit.updatedDeparture});
      planned(previous+1);
      cy.request('DELETE',agenda);
      cy.request(agenda).its('body').should('have.property','booked',null);
      planned(previous+1);
    });
  });
  it('Alterna una máquina llena en la rutina actual y la permite para una visita futura',()=>{
    createAccount();
    cy.request('PUT','/api/sala/entrada');
    cy.request('PUT','/api/sala/equipo',{machine:gym.equipment.single});
    cy.getCookie('session').then(occupant=>{
      createAccount();
      const day=new Date().toLocaleDateString('sv-SE',{timeZone:'America/La_Paz'});
      const now='/api/agenda?day='+day;
      const booking={slot:visit.activeSlot,departure:visit.activeEnd,goal:'fuerza'};
      cy.request('PUT',now,booking);
      cy.request(now).then(({body})=>expect(body.routine.map(b=>b.machine)).not.to.include(gym.equipment.single));
      cy.request('PUT',agenda,booking);
      cy.request(agenda).then(({body})=>expect(body.routine.map(b=>b.machine)).to.include(gym.equipment.single));
      cy.setCookie('session',occupant.value);
      cy.request('DELETE','/api/sala/entrada');
    });
  });
  it('Valida mes y equipo y mantiene la máquina anterior si el cambio es inválido',()=>{
    createAccount();
    rejected('GET','/api/progreso?month=2026-13',undefined,400);
    rejected('PUT','/api/sala/equipo',{machine:gym.equipment.alternative},409);
    cy.request('PUT','/api/sala/entrada');
    cy.request('PUT','/api/sala/equipo',{machine:gym.equipment.alternative});
    rejected('PUT','/api/sala/equipo',{machine:'equipo inexistente'},400);
    cy.request('/api/sala').its('body.machine').should('equal',gym.equipment.alternative);
    cy.request('DELETE','/api/sala/entrada');
  });
});
