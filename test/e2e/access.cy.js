import gym from '../fixtures/gym.json';
import cases from '../fixtures/functional.json';
import {newMember} from '../support/member.js';
import {createAccount,press} from '../support/dashboard.js';

describe('Acceso y validación de formularios',()=>{
  it('Indica campos obligatorios, correo inválido y contraseña corta antes del alta',()=>{
    cy.visit('/');
    press(/^Crear cuenta$/);
    cy.get('[name=name]').should('match',':invalid').type(gym.member.name);
    cy.get('[name=email]').type('ana').should('match',':invalid');
    const member=newMember(gym.member);
    cy.get('[name=email]').clear().type(member.email);
    cy.get('[name=password]').type(cases.shortPassword).should('have.attr','minlength','8');
    press(/^Crear cuenta$/);
    cy.request('/api/me').its('body').should('deep.equal',{member:null});
    cy.get('[name=password]').clear().type(member.password,{log:false});
    press(/^Crear cuenta$/);
    cy.contains('h1','Hola, '+member.name).should('be.visible');
  });
  it('Permite corregir un correo duplicado sin perder el formulario',()=>{
    createAccount().then(member=>{
      cy.request('POST','/api/logout');
      cy.visit('/');
      cy.get('[name=name]').type(member.name);
      cy.get('[name=email]').type(member.email);
      cy.get('[name=password]').type(member.password,{log:false});
      press(/^Crear cuenta$/);
      cy.get('[role=alert]').should('contain','Ese correo ya tiene una cuenta');
      cy.get('[name=email]').clear().type(newMember(gym.member).email);
      press(/^Crear cuenta$/);
      cy.contains('h1','Hola, '+member.name).should('be.visible');
    });
  });
  it('Muestra el error de ingreso y permite volver a intentar con la clave correcta',()=>{
    createAccount().then(member=>{
      cy.request('POST','/api/logout');
      cy.visit('/');
      press('Ya tengo una cuenta');
      cy.get('[name=email]').type(member.email);
      cy.get('[name=password]').type(cases.invalidPassword,{log:false});
      press(/^Ingresar$/);
      cy.get('[role=alert]').should('contain','Correo o contraseña incorrectos');
      cy.get('[name=password]').clear().type(member.password,{log:false});
      press(/^Ingresar$/);
      cy.contains('h1','Hola, '+member.name).should('be.visible');
    });
  });
});
