import {newMember} from '../support/member.js';

describe('API, sesiones y SQLite',()=>{
  let data,user;
  const register=member=>cy.request('POST','/api/register',member).its('status').should('equal',201);
  beforeEach(()=>cy.fixture('gym').then(fixture=>{
    data=fixture;
    user=newMember(data.member);
    register(user);
  }));
  it('Recupera el perfil registrado mediante su cookie',()=>{
    cy.request('/api/me').its('body.member').should('include',{name:user.name,goal:user.goal});
  });
  it('Rechaza correos duplicados aunque cambien las mayúsculas',()=>{
    cy.request({method:'POST',url:'/api/register',body:{...user,email:user.email.toUpperCase()},failOnStatusCode:false})
      .its('status').should('equal',409);
  });
  it('Rechaza fechas inexistentes',()=>{
    cy.request({method:'PUT',url:'/api/agenda?day='+data.visit.invalidDay,body:data.visit,failOnStatusCode:false})
      .its('status').should('equal',400);
  });
  it('Guarda la rutina solo en la agenda del propietario',()=>{
    const path='/api/agenda?day='+data.visit.day;
    cy.request('PUT',path,data.visit).its('status').should('equal',204);
    cy.request(path).its('body.routine').then(blocks=>expect(blocks.at(-1).end).to.equal(data.visit.departure));
    register(newMember(data.member));
    cy.request(path).then(response=>expect(response.body.booked).to.be.null);
  });
  it('Invalida la sesión en el servidor al salir',()=>{
    cy.getCookie('session').then(cookie=>{
      cy.request('POST','/api/logout').its('status').should('equal',204);
      cy.setCookie('session',cookie.value);
      cy.request({url:'/api/progreso?month='+data.visit.day.slice(0,7),failOnStatusCode:false}).its('status').should('equal',401);
    });
  });
  it('Libera los equipos al cambiar de máquina y al salir',()=>{
    cy.request('PUT','/api/sala/entrada');
    cy.request('PUT','/api/sala/equipo',{machine:data.equipment.single}).its('body.machine').should('equal',data.equipment.single);
    cy.request('PUT','/api/sala/equipo',{machine:data.equipment.alternative}).its('body.machine').should('equal',data.equipment.alternative);
    cy.request('DELETE','/api/sala/entrada').its('body.inside').should('equal',false);
  });
  it('Conserva una sola asistencia diaria tras una segunda entrada',()=>{
    cy.request('PUT','/api/sala/entrada');
    cy.request('DELETE','/api/sala/entrada');
    cy.request('PUT','/api/sala/entrada');
    const month=new Date().toLocaleDateString('sv-SE',{timeZone:'America/La_Paz'}).slice(0,7);
    cy.request('/api/progreso?month='+month).its('body').then(report=>{
      expect(report.days).to.have.length(data.attendance.days);
      expect(report.percent).to.equal(data.attendance.percent);
    });
    cy.request('DELETE','/api/sala/entrada');
  });
});

describe('Regresiones de almacenamiento y capacidad',()=>{
  // Node proporciona SQLite en memoria y un reloj controlable para estas dos regresiones.
  it('Recupera el historial anterior y separa meses y socios',()=>{
    cy.task('history');
  });
  it('Impide sobreocupación y libera la sala al cerrar',()=>{
    cy.task('attendance');
  });
});
