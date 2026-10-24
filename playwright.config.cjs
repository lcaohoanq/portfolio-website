const { defineConfig } = require('@playwright/test');
const fs = require('node:fs');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 45000,
    use: {
        baseURL: 'http://127.0.0.1:4587',
        headless: true,
        launchOptions: {
            executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined),
            args: ['--enable-unsafe-swiftshader'],
        },
    },
    webServer: { command: 'node scripts/preview.cjs', port: 4587, env: { PORT: '4587' }, reuseExistingServer: false },
});
