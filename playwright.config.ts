import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests', fullyParallel: false,
  use: { baseURL: 'http://127.0.0.1:3100', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node tests/provider-server.mjs', url: 'http://127.0.0.1:3101', reuseExistingServer: false },
    { command: 'npm run dev -- --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false,
      env: { OPENAI_API_KEY: 'controlled-test-key', OPENAI_MODEL: 'controlled-test-model', OPENAI_BASE_URL: 'http://127.0.0.1:3101/v1', COMPARISON_PROVIDER: 'openai' } },
  ],
});
