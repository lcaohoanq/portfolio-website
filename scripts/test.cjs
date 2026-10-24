const { spawnSync } = require('node:child_process');
const env = {
    ...process.env,
    VITE_SUPABASE_URL: 'https://rsvp-test.invalid',
    VITE_SUPABASE_ANON_KEY: 'test-publishable-key',
};
const galleryBuild = spawnSync(process.execPath, ['--test', 'scripts/tests/gallery-build.test.cjs'], { stdio: 'inherit' });
if (galleryBuild.status !== 0) process.exit(galleryBuild.status || 1);
const build = spawnSync(process.execPath, [require.resolve('webpack-cli/bin/cli.js'), '--config', './bundler/webpack.prod.js'], { stdio: 'inherit', env });
if (build.status !== 0) process.exit(build.status || 1);
const tests = spawnSync(process.execPath, [require.resolve('@playwright/test/cli'), 'test', ...process.argv.slice(2)], { stdio: 'inherit' });
process.exit(tests.status || (tests.error ? 1 : 0));
