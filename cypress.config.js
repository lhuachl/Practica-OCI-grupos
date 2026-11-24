import {defineConfig} from 'cypress';
import {spawn,execFileSync} from 'node:child_process';
import {createInterface} from 'node:readline';

export default defineConfig({
  fixturesFolder:'test/fixtures',
  screenshotsFolder:'test/results/screenshots',
  videosFolder:'test/results/videos',
  e2e:{
    specPattern:'test/{unit,integration,e2e}/**/*.cy.js',
    supportFile:false,
    async setupNodeEvents(on,config){
      // Una base en memoria y un puerto libre mantienen la sesión de Cypress aislada.
      const server=spawn('node',['--import','./test/e2e/open-hours.js','server/index.js'],{
        env:{...process.env,PORT:'0',DB_PATH:':memory:',COOKIE_SECURE:'false'},
        stdio:['ignore','pipe','inherit']
      });
      function verifyDatabaseCase(file){
        execFileSync('node',['--test','test/integration/'+file],{stdio:'pipe'});
        return null;
      }
      on('task',{
        history:()=>verifyDatabaseCase('history.test.js'),
        attendance:()=>verifyDatabaseCase('attendance.test.js')
      });
      const stop=()=>server.kill();
      process.once('exit',stop);
      on('after:run',stop);
      for await(const line of createInterface({input:server.stdout})){
        const port=line.match(/GymTurno en http:\/\/localhost:(\d+)/)?.[1];
        if(port){
          config.baseUrl='http://127.0.0.1:'+port;
          return config;
        }
      }
      throw new Error('No se pudo iniciar GymTurno para Cypress.');
    }
  }
});
