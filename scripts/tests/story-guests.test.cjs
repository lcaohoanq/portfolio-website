const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateGuests, readOptions } = require('../story-guests.cjs');

test('guest manifests retain Unicode names and strip unrelated private data', () => {
    assert.deepEqual(validateGuests({ version: 1, accessToken: 'admin-secret', guests: [
        { slug: 'nguyen-an', name: ' Nguyễn An ', access_token: 'guest-secret', message: 'private' },
    ] }), [{ slug: 'nguyen-an', name: 'Nguyễn An' }]);
});

test('reject unsafe paths, duplicate filenames and invalid/empty names before rendering', () => {
    for (const guest of [
        { slug: '../escape', name: 'An' }, { slug: '/tmp/file', name: 'An' },
        { slug: 'an', name: ' ' }, { slug: 'an', name: 'a'.repeat(101) },
        { slug: 'an', name: 'An\nBình' },
    ]) assert.throws(() => validateGuests({ version: 1, guests: [guest] }));
    assert.throws(() => validateGuests({ version: 1, guests: [{ slug: 'an', name: 'An' }, { slug: 'an', name: 'Bình' }] }));
    for (const value of [null, [], { version: 2, guests: [] }, { version: 1, guests: [] }]) assert.throws(() => validateGuests(value));
});

test('single-name CLI accepts Vietnamese and rejects ambiguous input', async () => {
    assert.deepEqual(await readOptions(['--name', 'Đặng Nguyễn An']), { guests: [{ slug: 'dang-nguyen-an', name: 'Đặng Nguyễn An' }] });
    await assert.rejects(readOptions(['--guests', 'guests.json', '--name', 'An']));
    await assert.rejects(readOptions(['--name', '  ']));
    await assert.rejects(readOptions(['--unknown']));
});
