const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const sharp = require('sharp');

const PLUGIN = 'GalleryImagesPlugin';
const WIDTHS = [480, 800];

async function discover(directory, prefix = '', directories = []) {
    directories.push(directory);
    const files = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        const relative = prefix + entry.name;
        if (entry.isDirectory()) {
            files.push(...await discover(path.join(directory, entry.name), relative + '/', directories));
        } else if (entry.isFile() && /\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name)) {
            files.push(relative);
        }
    }
    return files.sort();
}

module.exports = class GalleryImagesPlugin {
    constructor({ directory, cacheDirectory = path.resolve(__dirname, '../node_modules/.cache/gallery') }) {
        this.directory = directory;
        this.cacheDirectory = cacheDirectory;
        this.images = [];
        this.assets = new Map();
        this.directories = [];
        this.files = [];
    }

    async prepare() {
        this.directories = [];
        this.files = await discover(this.directory, '', this.directories);
        this.images = new Array(this.files.length);
        this.assets = new Map();
        await fs.mkdir(this.cacheDirectory, { recursive: true });
        let next = 0;
        // Bound decoding work so a large gallery does not exhaust build memory.
        const worker = async () => {
            while (next < this.files.length) {
                const index = next++;
                const file = this.files[index];
                const source = await fs.readFile(path.join(this.directory, file));
                const hash = createHash('sha256')
                    .update(`gallery-v1:webp-80:rotate:${sharp.versions.sharp}:`)
                    .update(source).digest('hex').slice(0, 24);
                const previews = [];
                for (const width of WIDTHS) {
                    const name = `invitation/gallery-previews/${hash}-${width}.webp`;
                    const cached = path.join(this.cacheDirectory, `${hash}-${width}.webp`);
                    let data;
                    try {
                        data = await fs.readFile(cached);
                    } catch (error) {
                        if (error.code !== 'ENOENT') throw error;
                        data = await sharp(source).rotate()
                            .resize({ width, withoutEnlargement: true })
                            .webp({ quality: 80 }).toBuffer();
                        const temporary = `${cached}.${randomUUID()}.tmp`;
                        await fs.writeFile(temporary, data);
                        await fs.rename(temporary, cached);
                    }
                    const metadata = await sharp(data).metadata();
                    this.assets.set(name, data);
                    // Small source images can produce identical candidate widths.
                    if (!previews.some((preview) => preview.width === metadata.width)) {
                        previews.push({ src: '/' + name, width: metadata.width });
                    }
                }
                this.images[index] = {
                    file: file.split('/').map(encodeURIComponent).join('/'),
                    previews,
                };
            }
        };
        await Promise.all(Array.from({ length: Math.min(4, this.files.length) }, worker));
    }

    apply(compiler) {
        const { DefinePlugin, Compilation, sources } = compiler.webpack;
        new DefinePlugin({
            __GALLERY_IMAGES__: DefinePlugin.runtimeValue(() => JSON.stringify(this.images), true),
        }).apply(compiler);

        // HTML template child compilers inherit beforeCompile hooks. Prepare only
        // on a top-level run so they cannot reset the manifest during compilation.
        compiler.hooks.beforeRun.tapPromise(PLUGIN, () => this.prepare());
        compiler.hooks.watchRun.tapPromise(PLUGIN, () => this.prepare());
        compiler.hooks.thisCompilation.tap(PLUGIN, (compilation) => {
            for (const directory of this.directories) compilation.contextDependencies.add(directory);
            for (const file of this.files) compilation.fileDependencies.add(path.join(this.directory, file));
            compilation.hooks.processAssets.tap({ name: PLUGIN, stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL }, () => {
                for (const [name, data] of this.assets) {
                    compilation.emitAsset(name, new sources.RawSource(data));
                }
            });
        });
    }
};
