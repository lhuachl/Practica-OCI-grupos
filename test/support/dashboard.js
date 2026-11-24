import gym from '../fixtures/gym.json';
import {newMember} from './member.js';

// Las pantallas privadas parten de un socio real y único en la base de pruebas.
export function createAccount(){
  const member=newMember(gym.member);
  return cy.request('POST','/api/register',member).then(()=>member);
}
export const press = text => cy.contains('button',text).click();
export const field = label => cy.contains('label',label).find('input,select');
export function openDashboard(){
  createAccount();
  cy.visit('/');
  cy.contains('h1','Hola, '+gym.member.name).should('be.visible');
}
export function chooseDay(day){
  cy.intercept('GET','**/api/agenda?day='+day).as('selectedDay');
  field('Día de entrenamiento').type(day);
  cy.wait('@selectedDay').its('response.statusCode').should('eq',200);
}

