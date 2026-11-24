import {defineConfig} from '@playwright/test';

const baseURL = 'http://127.0.0.1:34876';
export default defineConfig({
  testDir: './test/e2e',
  use: {baseURL, browserName:'chromium', trace:'retain-on-failure'},
  webServer: {
    command: 'node --import ./test/e2e/open-hours.js server/index.js',
    env: {PORT:'34876', DB_PATH:':memory:', COOKIE_SECURE:'false'},
    url: baseURL+'/api/health',
    reuseExistingServer:false
  }
});
