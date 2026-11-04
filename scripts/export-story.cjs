const { chromium } = require('@playwright/test');
const { spawn, spawnSync } = require('node:child_process');
const { once } = require('node:events');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { readOptions } = require('./story-guests.cjs');
const { installAudioCapture } = require('./story-audio.cjs');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'exports/story');
const fps = 30;
const roomSeconds = 10;

// Apply only inside the export browser. Reuse the real invitation content/assets.
const cardStyles = `
    body { background: #fdfcf8; }
    .event-section { position: fixed; inset: 0; padding: 76px 20px 80px;
        background: #fdfcf8; width: 360px; height: 640px; }
    .event-heading { font-size: 30px; line-height: 1.12; margin: 0 0 20px; }
    .event-photo { width: 320px; height: 390px; aspect-ratio: auto; border: 0;
        box-shadow: 0 10px 26px rgba(16, 28, 20, .16); }
    .event-photo .campus { object-position: 45% center; }
    .event-photo-invite { padding: 16px; max-width: 85%; }
    .event-photo-invite span { font-size: 20px; }
    .event-photo-invite span + span { font-size: 15px; }
    .event-photo-caption { width: 100%; padding: 18px; }
    .event-photo-caption::before { margin-bottom: 10px; }
    .event-photo-caption h2 { font-size: 21px; margin-bottom: 10px; }
    .event-photo-caption .event-photo-date { display: flex; flex-direction: column;
        gap: 2px; font-size: 14px; line-height: 1.4; margin: 0; }
    .event-photo-caption .event-photo-place { font-size: 14px; line-height: 1.4;
        margin: 10px 0 0; }
    .event-photo-place span { font-size: 11px; }
    .event-signature { bottom: 170px; right: 8px; transform: scale(.5);
        transform-origin: bottom right; }
`;

async function ready(page) {
    await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.all(Array.from(document.querySelectorAll('img')).map(image => image.decode()));
    });
}

async function personalize(frame, name) {
    await frame.locator('.event-photo-invite span').first().evaluate((element, guestName) => {
        element.textContent = `Hi ${guestName}`;
        let size = parseFloat(getComputedStyle(element).fontSize);
        while (element.getBoundingClientRect().height > 60 && size > 14) {
            element.style.fontSize = `${--size}px`;
        }
    }, name);
}

async function previewServer() {
    const server = spawn(process.execPath, ['scripts/preview.cjs'], {
        cwd: root, env: { ...process.env, PORT: '4589' }, stdio: ['ignore', 'pipe', 'pipe'],
    });
    let errors = '';
    server.stderr.on('data', chunk => { errors += chunk; });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.once('exit', () => reject(new Error(`Preview server failed: ${errors}`)));
        server.stdout.once('data', resolve);
    });
    return server;
}

async function renderGuest(browser, baseURL, guest) {
    const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'graduation-story-'));
    const context = await browser.newContext({
        viewport: { width: 360, height: 640 }, deviceScaleFactor: 3,
    });
    try {
        // Render the public template and set text locally; never request private guest links.
        const card = await context.newPage();
        await card.goto(new URL('/invitation.html', baseURL).href);
        await card.locator('.event-section').waitFor();
        await ready(card);
        await card.evaluate(() => {
            const section = document.querySelector('.event-section');
            document.getElementById('root').replaceChildren(section);
        });
        await card.addStyleTag({ content: cardStyles });
        await personalize(card, guest.name);
        const image = path.join(output, `${guest.slug}.png`);
        await card.screenshot({ path: image });
        console.log(`Image: ${image}`);

        const page = await context.newPage();
        await page.addInitScript(installAudioCapture);
        // Control animation time so slow rendering still produces every video frame.
        await page.clock.install();
        await page.goto(new URL('/', baseURL).href);
        await page.getByRole('button', { name: 'START', exact: true }).click({ timeout: 120000 });
        const screen = page.frameLocator('#computer-screen');
        await screen.locator('.event-section').waitFor();
        await screen.locator('.campus').evaluate(image => image.decode());
        await screen.locator('.event-section').evaluate(() => document.fonts.ready);
        await personalize(screen, guest.name);
        await page.waitForTimeout(3000);
        await page.addStyleTag({ content: `
            #ui, #ui-interactive { visibility: hidden !important; }
            .story-title { position: fixed; top: 76px; left: 24px; right: 24px;
                z-index: 10; text-align: center; color: #242420; pointer-events: none; }
            .story-title h1, .story-title p { color: #fff; }
            .story-title h1 { font: 32px Georgia, serif; font-weight: normal; margin: 0 0 12px; }
            .story-title p { font: 12px monospace; letter-spacing: .12em; }
        ` });
        await page.evaluate(() => {
            const title = document.createElement('header');
            title.className = 'story-title';
            const name = document.createElement('h1');
            // Read the host/date from the existing UI and invitation instead of duplicating facts.
            const identity = document.querySelector('#computer-screen').contentDocument.querySelector('.nav-identity h2');
            name.textContent = identity.innerText.replace(/\n/g, ' ');
            const detail = document.createElement('p');
            const date = document.querySelector('#computer-screen').contentDocument.querySelector('.event-photo-date span');
            detail.textContent = `GRADUATION · ${date.textContent.replace('Thứ Bảy, ', '')}`;
            title.append(name, detail);
            document.body.append(title);
        });
        await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100));
        const audioStart = await page.evaluate(() => Date.now());
        for (let frame = 0; frame < roomSeconds * fps; frame++) {
            if (frame === 3 * fps) {
                // Use the room's real camera interactions, without entering its iframe.
                await page.mouse.move(10, 600);
                await page.mouse.down();
                await page.mouse.up();
            }
            if (frame === 6 * fps) {
                await page.locator('#computer-screen').dispatchEvent('mousemove', {
                    clientX: 180, clientY: 260, inComputer: true,
                });
            }
            if (frame >= 3 * fps && frame <= 4 * fps) {
                await page.locator('.story-title').evaluate((title, opacity) => {
                    title.style.opacity = String(opacity);
                }, 1 - (frame - 3 * fps) / fps);
            }
            await page.clock.runFor(Math.round((frame + 1) * 1000 / fps) - Math.round(frame * 1000 / fps));
            await page.screenshot({
                path: path.join(temporary, `frame-${String(frame).padStart(4, '0')}.jpg`),
                type: 'jpeg', quality: 95,
            });
            if (frame % fps === 0) console.log(`Rendering room: ${frame / fps + 1}/${roomSeconds} seconds`);
        }
        const audio = await page.evaluate(({ start, seconds }) => window.__STORY_AUDIO_CAPTURE__.render(start, seconds), {
            start: audioStart, seconds: roomSeconds,
        });
        const soundtrack = path.join(temporary, 'room.wav');
        await fs.writeFile(soundtrack, Buffer.from(audio.wav, 'base64'));
        console.log(`Original room audio: ${audio.sounds.join(', ')} (RMS ${audio.rms.toFixed(4)})`);
        await context.close();
        console.log(`Encoding ${roomSeconds}-second MP4…`);
        const video = path.join(temporary, 'story.mp4');
        const encoder = spawn('ffmpeg', [
            '-hide_banner', '-loglevel', 'error', '-y',
            '-framerate', String(fps), '-i', path.join(temporary, 'frame-%04d.jpg'),
            '-i', soundtrack,
            '-vf', 'scale=out_range=tv,setsar=1,format=yuv420p',
            '-t', String(roomSeconds), '-c:v', 'libx264', '-preset', 'medium',
            '-crf', '18', '-pix_fmt', 'yuv420p', '-color_range', 'tv', '-movflags', '+faststart',
            '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', video,
        ], { stdio: ['ignore', 'ignore', 'pipe'] });
        let errors = '';
        encoder.stderr.on('data', chunk => { errors += chunk; });
        const [code] = await once(encoder, 'exit');
        if (code !== 0) throw new Error(`Video encoding failed: ${errors}`);
        const destination = path.join(output, `${guest.slug}.mp4`);
        await fs.copyFile(video, destination);
        console.log(`Video: ${destination}`);
    } finally {
        await context.close();
        await fs.rm(temporary, { recursive: true, force: true });
    }
}

async function main() {
    const options = await readOptions(process.argv.slice(2));
    if (options.help) {
        console.log('Xuất Story 9:16:\n  npm run export:story -- --guests /đường/dẫn/story-guests.json\n  npm run export:story -- --name "Nguyễn An"\nKhông có tham số: xuất thư mời mẫu. File lưu tại exports/story/.');
        return;
    }
    if (spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status !== 0) throw new Error('Install ffmpeg to export the MP4.');
    await fs.access(path.join(root, 'public/index.html')).catch(() => { throw new Error('Build the site first: npm run build'); });
    await fs.mkdir(output, { recursive: true });
    let server;
    let browser;
    const failures = [];
    try {
        const baseURL = process.env.STORY_BASE_URL || 'http://127.0.0.1:4589';
        if (!process.env.STORY_BASE_URL) server = await previewServer();
        const executablePath = process.env.CHROMIUM_PATH ||
            (require('node:fs').existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
        browser = await chromium.launch({ executablePath, args: ['--enable-unsafe-swiftshader'] });
        for (const [index, guest] of options.guests.entries()) {
            console.log(`[${index + 1}/${options.guests.length}] ${guest.name} → ${guest.slug}.mp4`);
            try { await renderGuest(browser, baseURL, guest); }
            catch (error) { failures.push(guest.slug); console.error(`Không xuất được ${guest.slug}: ${error.message}`); }
        }
        if (failures.length) throw new Error(`Xuất lỗi ${failures.length} khách: ${failures.join(', ')}. Các file xuất thành công vẫn được giữ.`);
        console.log(`Đã xuất xong ${options.guests.length} khách.`);
    } finally {
        if (browser) await browser.close();
        if (server) server.kill();
    }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
