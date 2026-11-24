import gym from '../fixtures/gym.json';
import cases from '../fixtures/functional.json';
import {chooseDay,field,openDashboard,press} from '../support/dashboard.js';

const visit=cases.visit;
describe('Agenda, rutinas y alimentación',()=>{
  beforeEach(openDashboard);
  it('Actualiza un plan guardado, mantiene la fecha y reserva tiempo libre en visitas largas',()=>{
    chooseDay(visit.day);
    field('Llegada').type(visit.arrival);
    field('Salida').type(visit.departure);
    press('Generar mi rutina');
    cy.contains('30 minutos disponibles').should('be.visible');
    field('Objetivo').select('movilidad');
    field('Salida').type(visit.updatedDeparture);
    press('Actualizar rutina');
    cy.contains('75 minutos disponibles').should('be.visible');
    cy.get('.routine figure').last().should('contain','Tiempo libre').and('contain','15 min');
    chooseDay(visit.otherDay);
    cy.contains('Tu rutina aparecerá').should('be.visible');
    chooseDay(visit.day);
    field('Objetivo').should('have.value','movilidad');
    field('Salida').should('have.value',visit.updatedDeparture);
    cy.get('.routine img').first().scrollIntoView().its('0.naturalWidth').should('be.greaterThan',0);
  });
  it('Conserva el plan cuando se intenta guardar una estancia de cero minutos',()=>{
    chooseDay(visit.day);
    field('Llegada').type(visit.arrival);
    field('Salida').type(visit.departure);
    press('Generar mi rutina');
    field('Salida').type(visit.arrival);
    press('Actualizar rutina');
    cy.get('[role=alert]').should('contain','La salida debe ser posterior');
    cy.contains('30 minutos disponibles').should('be.visible');
    field('Salida').type(visit.updatedDeparture);
    press('Actualizar rutina');
    cy.contains('75 minutos disponibles').should('be.visible');
    cy.get('[role=alert]').should('not.exist');
  });
  for(const goal of gym.goals){
    it('Presenta desayuno, foto y cuatro comidas para '+goal,()=>{
      field('Objetivo').select(goal);
      cy.get('.meals dt').then(labels=>expect([...labels].map(el=>el.textContent)).to.deep.equal(gym.meals));
      cy.get('.meals dd').each(dish=>expect(dish.text().trim()).not.to.equal(''));
      cy.get('.breakfast').should('contain',cases.breakfast[goal]);
      cy.get('.breakfast img').scrollIntoView().should('have.attr','src','/identidad/'+goal+'.jpg');
      cy.get('.breakfast img').its('0.naturalWidth').should('be.greaterThan',0);
      cy.contains('a','Guía de alimentación').should('have.attr','href').and('include','who.int');
    });
  }
});
