import gym from '../fixtures/gym.json';
import cases from '../fixtures/functional.json';
import {createAccount,openDashboard,press,field} from '../support/dashboard.js';

const machine=gym.equipment.single;
const alternative=gym.equipment.alternative;
const equipment=name=>cy.contains('.equipment b',name).parent();

describe('Sala y asistencia mensual',()=>{
  it('Permite usar, cambiar y liberar equipos antes de salir',()=>{
    openDashboard();
    cy.contains('button','Usar '+machine).should('not.exist');
    press('Registrar mi entrada');
    press('Usar '+machine);
    equipment(machine).should('contain','1 de 1 en uso');
    press('Usar '+alternative);
    equipment(machine).should('contain','0 de 1 en uso');
    equipment(alternative).contains('button','Liberar equipo').click();
    equipment(alternative).should('contain','0 de');
    press('Registrar mi salida');
    cy.contains('button','Usar '+machine).should('not.exist');
  });
  it('Refleja la llegada, la ocupación y la salida de otro socio en el siguiente refresco',()=>{
    cy.clock(null,['setInterval','clearInterval']);
    openDashboard();
    press('Registrar mi entrada');
    cy.contains('button','Registrar mi salida').should('be.visible');
    cy.get('.room-head .total').invoke('text').then(initial=>{
      cy.getCookie('session').then(viewer=>{
        createAccount();
        cy.request('PUT','/api/sala/entrada');
        cy.request('PUT','/api/sala/equipo',{machine});
        cy.getCookie('session').then(visitor=>{
          cy.setCookie('session',viewer.value);
          cy.tick(10000);
          cy.get('.room-head .total').should('have.text',String(Number(initial)+1));
          equipment(machine).find('button').should('be.disabled');
          cy.setCookie('session',visitor.value);
          cy.request('DELETE','/api/sala/entrada');
          cy.setCookie('session',viewer.value);
          cy.tick(10000);
          cy.get('.room-head .total').should('have.text',initial);
          equipment(machine).find('button').should('be.enabled');
          press('Registrar mi salida');
        });
      });
    });
  });
  it('Muestra el cierre y desactiva la entrada fuera de horario',()=>{
    // Solo se simula el estado de cierre; la API tiene además una prueba con reloj controlado.
    cy.intercept('GET','**/api/sala',req=>req.continue(res=>{
      res.body.open=false;
    }));
    openDashboard();
    cy.get('.room-head').should('contain','Cerrado');
    cy.contains('button','Registrar mi entrada').should('be.disabled');
  });
  it('Navega a febrero bisiesto y vuelve al mes con asistencia sin duplicar el día',()=>{
    openDashboard();
    field('Mes').invoke('val').then(month=>{
      press('Registrar mi entrada');
      cy.get('.calendar .attended').should('have.length',1);
      press('Registrar mi salida');
      press('Registrar mi entrada');
      cy.get('progress').should('have.attr','value',String(gym.attendance.percent));
      field('Mes').type(cases.pastMonth);
      cy.get('.calendar span').should('have.length',29);
      cy.get('.calendar .attended').should('not.exist');
      cy.get('progress').should('have.attr','value','0');
      field('Mes').type(month);
      cy.get('.calendar .attended').should('have.length',1);
      cy.get('progress').should('have.attr','value',String(gym.attendance.percent));
      press('Registrar mi salida');
    });
  });
  it('Permite consultar el tablero, la sala, el menú y salir desde una pantalla móvil',()=>{
    cy.viewport(390,844);
    openDashboard();
    cy.get('.brand img').should('be.visible').its('0.naturalWidth').should('be.greaterThan',0);
    for(const heading of ['Mi asistencia','Ahora en el gimnasio','Planificar mi entrenamiento','Mi rutina','Menú del día']){
      cy.contains('h2',heading).scrollIntoView().should('be.visible');
    }
    cy.document().then(doc=>expect(doc.documentElement.scrollWidth).to.be.at.most(doc.documentElement.clientWidth+1));
    press('Cerrar sesión');
    cy.contains('h2','Crear mi cuenta').should('be.visible');
  });
});
