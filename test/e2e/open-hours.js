import {mock} from 'node:test';

// Fija solo la fecha del servidor de pruebas durante el horario de atención en Bolivia.
const day = new Date().toLocaleDateString('sv-SE',{timeZone:'America/La_Paz'});
mock.timers.enable({apis:['Date'],now:new Date(day+'T12:00:00-04:00')});
