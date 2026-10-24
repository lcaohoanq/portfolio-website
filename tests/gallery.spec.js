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

async function scrollThroughPhotos(page) {
    while (await page.locator('.photo-grid img').count() < files.length) {
        const previous = await page.locator('.photo-grid img').count();
        await page.locator('.gallery-sentinel').scrollIntoViewIfNeeded();
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

test('optimized photos retain matching Supabase captions, including encoded filenames', async ({ page }) => {
    let caption = 'Một ngày đáng nhớ.\nCùng những người bạn.';
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill({
        contentType: 'application/json', body: JSON.stringify([
            { file_path: 'DSCF8006.JPG', caption },
            { file_path: encodePath(spacedFile), caption: '<b>Chú thích ảnh có khoảng trắng</b>' },
        ]),
    }));
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
    await expect(photo.locator('figcaption')).toHaveText(caption);
});

test('photos remain available when the caption service fails', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.goto('/invitation.html');
    await openPhotos(page);
    await scrollThroughPhotos(page);
    await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
    await expect(page.locator('.photo-grid figcaption')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Một vài khoảnh khắc.' })).toBeVisible();
});

test('gallery remains usable when IntersectionObserver is unavailable', async ({ page }) => {
    await page.addInitScript(() => { delete window.IntersectionObserver; });
    await page.goto('/invitation.html');
    await openPhotos(page);
    await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
    await expect(page.locator('.gallery-sentinel')).toHaveCount(0);
});
