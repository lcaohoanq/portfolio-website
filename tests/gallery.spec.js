const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

function discover(directory, prefix = '') {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const file = prefix + entry.name;
        return entry.isDirectory() ? discover(path.join(directory, entry.name), file + '/')
            : /\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name) ? [file] : [];
    }).sort();
}
const files = discover(path.resolve(__dirname, '../static/invitation/gallery'));
const spacedFile = files.find((file) => file.includes(' '));
const encodePath = (file) => file.split('/').map(encodeURIComponent).join('/');
const originalPath = (file) => `/invitation/gallery/${encodePath(file)}`;
const photoFor = (page, file) => page.locator('.photo-grid figure').filter({
    has: page.locator(`a[href="${originalPath(file)}"]`),
});
const openPhotos = (page) => page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Kỷ niệm', exact: true }).click();
const openLetter = (page) => page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Thư mời', exact: true }).click();
const captionCacheKey = 'invitation:gallery-captions:v1:https://rsvp-test.invalid';

test.beforeEach(async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill({
        contentType: 'application/json', body: '[]',
    }));
});

async function scrollThroughPhotos(page) {
    await expect(page.locator('.photo-grid img').first()).toBeAttached();
    while (await page.locator('.photo-grid img').count() < files.length) {
        const previous = await page.locator('.photo-grid img').count();
        // The observer may remove the sentinel while Playwright waits for it to settle.
        await page.locator('.gallery-sentinel').evaluateAll((nodes) => nodes[0]?.scrollIntoView());
        await expect.poll(() => page.locator('.photo-grid img').count()).toBeGreaterThan(previous);
    }
    await expect(page.locator('.gallery-sentinel')).toHaveCount(0);
}

for (const width of [390, 1440]) {
    test(`gallery loads WebP previews and adds batches on scroll at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 800 });
        const originals = [];
        page.on('request', (request) => {
            if (new URL(request.url()).pathname.startsWith('/invitation/gallery/')) originals.push(request.url());
        });
        await page.goto('/invitation.html');
        await openPhotos(page);
        await expect(page.locator('.photo-grid img')).toHaveCount(Math.min(12, files.length));
        await expect(page.getByRole('button', { name: 'Xem thêm' })).toHaveCount(0);
        const first = page.locator('.photo-grid img').first();
        await first.evaluate((image) => image.decode());
        const bounds = await first.boundingBox();
        expect(Math.abs(bounds.height - bounds.width * 3 / 4)).toBeLessThan(1);
        await page.screenshot({ path: `test-results/gallery-${width}.png` });
        expect(await first.evaluate((image) => image.currentSrc)).toMatch(/\/invitation\/gallery-previews\/.*\.webp$/);
        const response = await page.request.get(await first.evaluate((image) => image.currentSrc));
        expect(response.headers()['content-type']).toBe('image/webp');
        expect((await response.body()).length).toBeLessThan(250000);
        await scrollThroughPhotos(page);
        await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
        const hrefs = await page.locator('.photo-grid a').evaluateAll((links) => links.map((link) => link.getAttribute('href')));
        expect(hrefs).toEqual(files.map(originalPath));
        expect(new Set(hrefs).size).toBe(files.length);
        expect(originals).toEqual([]);
        const link = photoFor(page, files[0]).locator('a');
        const popupPromise = page.waitForEvent('popup');
        await link.click();
        const popup = await popupPromise;
        await popup.waitForLoadState('domcontentloaded');
        expect(new URL(popup.url()).pathname).toBe(originalPath(files[0]));
        await popup.close();
    });
}

test('optimized photos retain matching captions across reloads, including encoded filenames', async ({ page }) => {
    let caption = 'Một ngày đáng nhớ.\nCùng những người bạn.';
    const originalCaption = caption;
    let requests = 0;
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => {
        requests++;
        return route.fulfill({
            contentType: 'application/json', body: JSON.stringify([
                { file_path: 'DSCF8006.JPG', caption },
                { file_path: encodePath(spacedFile), caption: '<b>Chú thích ảnh có khoảng trắng</b>' },
            ]),
        });
    });
    await page.goto('/invitation.html');
    await openPhotos(page);
    await scrollThroughPhotos(page);
    const photo = photoFor(page, 'DSCF8006.JPG');
    await expect(photo.locator('figcaption')).toHaveText(caption);
    const spacedPhoto = photoFor(page, spacedFile);
    await expect(spacedPhoto.locator('figcaption')).toHaveText('<b>Chú thích ảnh có khoảng trắng</b>');
    await expect(spacedPhoto.locator('figcaption b')).toHaveCount(0);
    const fptPhoto = photoFor(page, 'fpt.jpg');
    await expect(fptPhoto.locator('figcaption')).toHaveCount(0);
    caption = 'Caption mới từ Supabase.';
    await page.reload();
    await openPhotos(page);
    await scrollThroughPhotos(page);
    await expect(photo.locator('figcaption')).toHaveText(originalCaption);
    expect(requests).toBe(1);
});

test('captions prefetch before navigation, share pending requests and render with photos', async ({ page }) => {
    let requests = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route('**/rest/v1/rpc/get_gallery_captions', async (route) => {
        requests++;
        await gate;
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
            { file_path: encodePath(files[0]), caption: 'Đã tải trước.' },
        ]) });
    });
    await page.goto('/invitation.html');
    await expect.poll(() => requests).toBe(1);
    await expect(page.locator('.photo-grid')).toHaveCount(0);
    await openPhotos(page);
    await expect(page.getByRole('status')).toHaveText('Đang mở những khoảnh khắc…');
    await expect(page.locator('.photo-grid img')).toHaveCount(0);
    await openLetter(page);
    await openPhotos(page);
    expect(requests).toBe(1);
    release();
    await expect(photoFor(page, files[0]).locator('figcaption')).toHaveText('Đã tải trước.');
    await openLetter(page);
    // Read immediately after a synchronous click: cached captions must be in the first render.
    const caption = await page.evaluate(() => {
        [...document.querySelectorAll('.invitation-nav button')].find((button) => button.textContent === 'Kỷ niệm').click();
        return document.querySelector('.photo-grid figcaption')?.textContent;
    });
    expect(caption).toBe('Đã tải trước.');
    expect(requests).toBe(1);
});

test('expired captions refresh in the background without changing the open gallery', async ({ page }) => {
    await page.addInitScript(({ key, file }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({
            savedAt: Date.now() - 25 * 60 * 60 * 1000,
            rows: [{ file_path: file, caption: 'Caption cũ.' }],
        }));
    }, { key: captionCacheKey, file: encodePath(files[0]) });
    let requests = 0;
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route('**/rest/v1/rpc/get_gallery_captions', async (route) => {
        requests++;
        await gate;
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
            { file_path: encodePath(files[0]), caption: 'Caption mới.' },
        ]) });
    });
    await page.goto('/invitation.html');
    await expect.poll(() => requests).toBe(1);
    await openPhotos(page);
    const caption = photoFor(page, files[0]).locator('figcaption');
    await expect(caption).toHaveText('Caption cũ.');
    release();
    await expect.poll(() => page.evaluate((key) => JSON.parse(localStorage.getItem(key)).rows[0].caption, captionCacheKey)).toBe('Caption mới.');
    await expect(caption).toHaveText('Caption cũ.');
    await openLetter(page);
    await openPhotos(page);
    await expect(caption).toHaveText('Caption mới.');
    await page.reload();
    await openPhotos(page);
    await expect(caption).toHaveText('Caption mới.');
    expect(requests).toBe(1);
});

test('failed refresh preserves stale captions and their expiry', async ({ page }) => {
    const savedAt = Date.now() - 25 * 60 * 60 * 1000;
    await page.addInitScript(({ key, file, savedAt }) => localStorage.setItem(key, JSON.stringify({
        savedAt, rows: [{ file_path: file, caption: 'Vẫn xem được khi mất mạng.' }],
    })), { key: captionCacheKey, file: encodePath(files[0]), savedAt });
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.goto('/invitation.html');
    await openPhotos(page);
    await expect(photoFor(page, files[0]).locator('figcaption')).toHaveText('Vẫn xem được khi mất mạng.');
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).savedAt, captionCacheKey)).toBe(savedAt);
});

for (const storage of ['blocked', 'invalid-json', 'invalid-rows']) {
    test(`caption cache tolerates ${storage} storage`, async ({ page }) => {
        await page.addInitScript(({ key, storage }) => {
            if (storage === 'blocked') {
                Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } });
            } else {
                localStorage.setItem(key, storage === 'invalid-json' ? '{' : JSON.stringify({ savedAt: Date.now(), rows: [null] }));
            }
        }, { key: captionCacheKey, storage });
        let requests = 0;
        await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => {
            requests++;
            return route.fulfill({ contentType: 'application/json', body: JSON.stringify([
                { file_path: encodePath(files[0]), caption: 'Caption từ API.' },
            ]) });
        });
        await page.goto('/invitation.html');
        await openPhotos(page);
        await expect(photoFor(page, files[0]).locator('figcaption')).toHaveText('Caption từ API.');
        await openLetter(page);
        await openPhotos(page);
        await expect(photoFor(page, files[0]).locator('figcaption')).toHaveText('Caption từ API.');
        expect(requests).toBe(1);
    });
}

test('an empty caption list is cached as a successful response', async ({ page }) => {
    let requests = 0;
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => {
        requests++;
        return route.fulfill({ contentType: 'application/json', body: '[]' });
    });
    await page.goto('/invitation.html');
    await openPhotos(page);
    await expect(page.locator('.photo-grid img')).toHaveCount(Math.min(12, files.length));
    await page.reload();
    await openPhotos(page);
    await expect(page.locator('.photo-grid img')).toHaveCount(Math.min(12, files.length));
    expect(requests).toBe(1);
});

test('a stalled caption request times out so photos remain available', async ({ page }) => {
    await page.clock.install();
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    await page.route('**/rest/v1/rpc/get_gallery_captions', async (route) => {
        await gate;
        await route.fulfill({ contentType: 'application/json', body: '[]' }).catch(() => {});
    });
    await page.goto('/invitation.html');
    await openPhotos(page);
    await expect(page.getByRole('status')).toHaveText('Đang mở những khoảnh khắc…');
    await page.clock.fastForward(5100);
    await expect(page.locator('.photo-grid img')).toHaveCount(Math.min(12, files.length));
    expect(await page.evaluate((key) => localStorage.getItem(key), captionCacheKey)).toBeNull();
    release();
});

test('photos remain available on caption failures and retry on the next visit', async ({ page }) => {
    let fail = true;
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill(fail ? { status: 503, body: '{}' } : {
        contentType: 'application/json', body: JSON.stringify([{ file_path: encodePath(files[0]), caption: 'Đã kết nối lại.' }]),
    }));
    await page.goto('/invitation.html');
    await openPhotos(page);
    await scrollThroughPhotos(page);
    await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
    await expect(page.locator('.photo-grid figcaption')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Một vài khoảnh khắc.' })).toBeVisible();
    fail = false;
    await openLetter(page);
    await openPhotos(page);
    await expect(photoFor(page, files[0]).locator('figcaption')).toHaveText('Đã kết nối lại.');
});

test('gallery remains usable when IntersectionObserver is unavailable', async ({ page }) => {
    await page.addInitScript(() => { delete window.IntersectionObserver; });
    await page.goto('/invitation.html');
    await openPhotos(page);
    await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
    await expect(page.locator('.gallery-sentinel')).toHaveCount(0);
});
