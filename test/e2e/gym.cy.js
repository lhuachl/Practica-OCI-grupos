import {newMember} from '../support/member.js';

describe('Recorridos del socio en el navegador',()=>{
  let data,user;
  const click=text=>cy.contains('button',text).click();
  beforeEach(()=>{
    cy.fixture('gym').then(fixture=>{
      data=fixture;
      user=newMember(data.member);
      cy.visit('/');
      cy.get('[name=name]').type(user.name);
      cy.get('[name=email]').type(user.email);
      cy.get('[name=password]').type(user.password,{log:false});
      cy.get('[name=goal]').select(user.goal);
      click(/^Crear cuenta$/);
      cy.contains('h1','Hola, '+user.name).should('be.visible');
    });
  });
  function planVisit(){
    cy.get('input[type=date]').type(data.visit.day);
    cy.contains('label','Llegada').find('input').type(data.visit.slot);
    cy.contains('label','Salida').find('input').type(data.visit.departure);
    click('Generar mi rutina');
    cy.contains(data.visit.minutes+' minutos disponibles').should('be.visible');
  }
  it('Conserva la sesión al recargar',()=>{
    cy.reload();
    cy.contains('button','Cerrar sesión').should('be.visible');
  });
  it('Permite salir y regresar con las mismas credenciales',()=>{
    click('Cerrar sesión');
    click('Ya tengo una cuenta');
    cy.get('[name=email]').type(user.email);
    cy.get('[name=password]').type(user.password,{log:false});
    click(/^Ingresar$/);
    cy.contains('h1','Hola, '+user.name).should('be.visible');
  });
  it('Actualiza el desayuno y carga su fotografía',()=>{
    cy.contains('label','Objetivo').find('select').select(data.breakfast.goal);
    cy.contains(data.breakfast.dish).should('be.visible');
    cy.get('.breakfast img').scrollIntoView().should('have.attr','src',data.breakfast.image);
    cy.get('.breakfast img').its('0.naturalWidth').should('be.greaterThan',0);
  });
  it('Genera la rutina dentro del horario elegido',()=>{
    planVisit();
    cy.get('.routine figure').first().should('contain',data.visit.slot);
    cy.get('.routine figure').last().should('contain',data.visit.departure).and('contain','Vuelta a la calma');
  });
  it('Quita el horario y su rutina',()=>{
    planVisit();
    click('Quitar horario');
    cy.contains('Tu rutina aparecerá aquí cuando elijas el horario.').should('be.visible');
    cy.contains('button','Quitar horario').should('not.exist');
  });
  it('Actualiza el calendario y conserva el progreso después de salir',()=>{
    click('Registrar mi entrada');
    cy.get('.calendar .attended').should('have.length',data.attendance.days);
    cy.get('progress').should('have.attr','value',String(data.attendance.percent));
    click('Registrar mi salida');
    cy.contains('button','Registrar mi entrada').should('be.visible');
    cy.reload();
    cy.get('.calendar .attended').should('have.length',data.attendance.days);
  });
});
