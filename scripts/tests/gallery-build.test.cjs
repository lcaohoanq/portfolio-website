const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const sharp = require('sharp');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const GalleryImagesPlugin = require('../../bundler/GalleryImagesPlugin.cjs');

test('gallery build preserves originals and caption keys, rotates previews, and invalidates cached images', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-gallery-'));
    const directory = path.join(root, 'gallery');
    const cacheDirectory = path.join(root, 'cache');
    const output = path.join(root, 'output');
    await fs.mkdir(path.join(directory, 'Kỷ niệm'), { recursive: true });
    const source = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#79a56a' } }).jpeg().toBuffer();
    await fs.writeFile(path.join(directory, 'ảnh #1%.JPG'), source);
    await fs.writeFile(path.join(directory, 'duplicate.JPG'), source);
    await sharp({ create: { width: 100, height: 60, channels: 3, background: '#bbaa88' } })
        .png().toFile(path.join(directory, 'Kỷ niệm/ảnh #1%.png'));
    await sharp({ create: { width: 160, height: 80, channels: 3, background: '#aabbcc' } })
        .withMetadata({ orientation: 6 }).jpeg().toFile(path.join(directory, 'rotated.jpg'));
    await fs.writeFile(path.join(directory, 'notes.txt'), 'Not a photo');
    const entry = path.join(root, 'entry.cjs');
    await fs.writeFile(entry, 'module.exports = __GALLERY_IMAGES__;');
    const template = path.join(root, 'template.html');
    await fs.writeFile(template, '<!doctype html><html><body>Gallery</body></html>');
    const plugin = new GalleryImagesPlugin({ directory, cacheDirectory });
    const compiler = webpack({
        mode: 'development', devtool: false, entry,
        output: { path: output, filename: 'manifest.cjs', library: { type: 'commonjs2' } },
        plugins: [plugin, new HtmlWebpackPlugin({ template, inject: false })],
    });
    const run = () => new Promise((resolve, reject) => compiler.run((error, stats) => {
        if (error) reject(error);
        else if (stats.hasErrors()) reject(new Error(stats.toString({ all: false, errors: true })));
        else resolve();
    }));
    const manifest = () => {
        const file = path.join(output, 'manifest.cjs');
        delete require.cache[require.resolve(file)];
        return require(file);
    };
    try {
        await run();
        const first = manifest();
        assert.deepEqual(first.map((image) => image.file), [
            'K%E1%BB%B7%20ni%E1%BB%87m/%E1%BA%A3nh%20%231%25.png',
            'duplicate.JPG', 'rotated.jpg', '%E1%BA%A3nh%20%231%25.JPG',
        ]);
        const large = first.find((image) => image.file === '%E1%BA%A3nh%20%231%25.JPG');
        assert.deepEqual(large.previews.map((preview) => preview.width), [480, 800]);
        const small = first.find((image) => image.file.includes('.png'));
        assert.deepEqual(small.previews.map((preview) => preview.width), [100]);
        const rotated = first.find((image) => image.file === 'rotated.jpg');
        const rotatedMetadata = await sharp(path.join(output, rotated.previews[0].src)).metadata();
        assert.equal(rotatedMetadata.width, 80);
        assert.equal(rotatedMetadata.height, 160);
        assert.equal(rotatedMetadata.format, 'webp');
        for (const image of first) for (const preview of image.previews) {
            const metadata = await sharp(path.join(output, preview.src)).metadata();
            assert.equal(metadata.width, preview.width);
            assert.equal(metadata.format, 'webp');
        }
        assert.deepEqual(await fs.readFile(path.join(directory, 'ảnh #1%.JPG')), source);
        const cacheFiles = await fs.readdir(cacheDirectory);
        const timestamps = await Promise.all(cacheFiles.map(async (file) => (await fs.stat(path.join(cacheDirectory, file))).mtimeMs));
        await run();
        assert.deepEqual(manifest(), first);
        assert.deepEqual(await Promise.all(cacheFiles.map(async (file) => (await fs.stat(path.join(cacheDirectory, file))).mtimeMs)), timestamps);
        await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#3322bb' } })
            .jpeg().toFile(path.join(directory, 'ảnh #1%.JPG'));
        await fs.unlink(path.join(directory, 'duplicate.JPG'));
        await fs.writeFile(path.join(directory, 'Kỷ niệm/new.JPG'), source);
        await run();
        const updated = manifest();
        assert.equal(updated.some((image) => image.file === 'duplicate.JPG'), false);
        assert.ok(updated.some((image) => image.file.endsWith('/new.JPG')));
        assert.notEqual(updated.find((image) => image.file === large.file).previews[0].src, large.previews[0].src);
        assert.deepEqual(updated.find((image) => image.file === small.file), small);
    } finally {
        await new Promise((resolve, reject) => compiler.close((error) => error ? reject(error) : resolve()));
        await fs.rm(root, { recursive: true, force: true });
    }
});

test('gallery watch rebuilds after adding a nested photo and removing an original', { timeout: 15000 }, async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'portfolio-gallery-watch-'));
    const directory = path.join(root, 'gallery');
    await fs.mkdir(directory);
    const source = await sharp({ create: { width: 80, height: 60, channels: 3, background: '#aabbcc' } }).jpeg().toBuffer();
    await fs.writeFile(path.join(directory, 'first.jpg'), source);
    const entry = path.join(root, 'entry.cjs');
    await fs.writeFile(entry, 'module.exports = __GALLERY_IMAGES__;');
    const plugin = new GalleryImagesPlugin({ directory, cacheDirectory: path.join(root, 'cache') });
    const compiler = webpack({
        mode: 'development', devtool: false, entry,
        output: { path: path.join(root, 'output'), filename: 'gallery.js' }, plugins: [plugin],
    });
    let watcher;
    let timeout;
    try {
        await new Promise((resolve, reject) => {
            timeout = setTimeout(() => reject(new Error('Gallery watcher did not rebuild')), 10000);
            let phase = 0;
            watcher = compiler.watch({ aggregateTimeout: 25 }, async (error, stats) => {
                try {
                    if (error) throw error;
                    if (stats.hasErrors()) throw new Error(stats.toString({ all: false, errors: true }));
                    if (phase === 0) {
                        assert.equal(plugin.images.length, 1);
                        phase = 1;
                        await fs.mkdir(path.join(directory, 'new album'));
                        await fs.writeFile(path.join(directory, 'new album/second.jpg'), source);
                    } else if (phase === 1 && plugin.images.length === 2) {
                        assert.equal(plugin.images[1].file, 'new%20album/second.jpg');
                        phase = 2;
                        await fs.unlink(path.join(directory, 'first.jpg'));
                    } else if (phase === 2 && plugin.images.length === 1) {
                        assert.equal(plugin.images[0].file, 'new%20album/second.jpg');
                        resolve();
                    }
                } catch (failure) { reject(failure); }
            });
        });
    } finally {
        clearTimeout(timeout);
        if (watcher) await new Promise((resolve, reject) => watcher.close((error) => error ? reject(error) : resolve()));
        await new Promise((resolve, reject) => compiler.close((error) => error ? reject(error) : resolve()));
        await fs.rm(root, { recursive: true, force: true });
    }
});
