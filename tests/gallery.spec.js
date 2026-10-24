const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');

const files = fs.readdirSync(path.resolve(__dirname, '../static/invitation/gallery'))
    .filter((file) => /\.(jpe?g|png|webp|avif|gif)$/i.test(file));
const spacedFile = files.find((file) => file.includes(' '));

test('all copied photos use their matching Supabase captions, including encoded filenames', async ({ page }) => {
    let caption = 'Một ngày đáng nhớ.\nCùng những người bạn.';
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill({
        contentType: 'application/json', body: JSON.stringify([
            { file_path: 'DSCF8006.JPG', caption },
            { file_path: encodeURIComponent(spacedFile), caption: '<b>Chú thích ảnh có khoảng trắng</b>' },
        ]),
    }));
    await page.goto('/invitation.html');
    const openPhotos = () => page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Kỷ niệm', exact: true }).click();
    await openPhotos();
    await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
    const photo = page.locator('.photo-grid figure').filter({ has: page.locator('img[src="/invitation/gallery/DSCF8006.JPG"]') });
    await expect(photo.locator('figcaption')).toHaveText(caption);
    const spacedPhoto = page.locator('.photo-grid figure').filter({ has: page.locator(`img[src="/invitation/gallery/${encodeURIComponent(spacedFile)}"]`) });
    await expect(spacedPhoto.locator('figcaption')).toHaveText('<b>Chú thích ảnh có khoảng trắng</b>');
    await expect(spacedPhoto.locator('figcaption b')).toHaveCount(0);
    const fptPhoto = page.locator('.photo-grid figure').filter({ has: page.locator('img[src="/invitation/gallery/fpt.jpg"]') });
    await expect(fptPhoto.locator('figcaption')).toHaveCount(0);
    caption = 'Caption mới từ Supabase.';
    await page.reload();
    await openPhotos();
    await expect(photo.locator('figcaption')).toHaveText(caption);
});

test('photos remain available when the caption service fails', async ({ page }) => {
    await page.route('**/rest/v1/rpc/get_gallery_captions', (route) => route.fulfill({ status: 503, body: '{}' }));
    await page.goto('/invitation.html');
    await page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Kỷ niệm', exact: true }).click();
    await expect(page.locator('.photo-grid img')).toHaveCount(files.length);
    await expect(page.locator('.photo-grid figcaption')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Một vài khoảnh khắc.' })).toBeVisible();
});
