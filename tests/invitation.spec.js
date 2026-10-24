const { test, expect } = require('@playwright/test');

const profile = { guest_slug: 'an', display_name: 'An', greeting: 'An ơi,', invitation_message: 'Hẹn gặp An trong ngày tốt nghiệp của mình nhé.' };
const initialRsvp = { status: null, party_size: 1, message: '', updated_at: null };

async function mockApi(page, handler = () => undefined) {
    await page.route('**/rest/v1/rpc/**', async (route) => {
        const name = new URL(route.request().url()).pathname.split('/').pop();
        const custom = await handler(name, route.request().postDataJSON());
        const result = custom || { status: 200, body: name === 'get_invitation' ? [profile] : name === 'get_guest_rsvp' ? [initialRsvp] : [] };
        await route.fulfill({ status: result.status, contentType: 'application/json', body: JSON.stringify(result.body) });
    });
}

test('sample invitation retains the desktop and correct event/calendar details', async ({ page }) => {
    await mockApi(page);
    await page.goto('/invitation.html');
    await expect(page.getByRole('heading', { name: 'Gửi bạn,' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Buổi lễ', exact: true }).click();
    await expect(page.getByText('Thứ Bảy, 07/11/2026')).toBeVisible();
    await expect(page.getByText('09:00–12:00')).toBeVisible();
    const calendar = new URL(await page.getByRole('link', { name: 'Thêm vào lịch' }).getAttribute('href'));
    expect(calendar.searchParams.get('dates')).toBe('20261107T020000Z/20261107T050000Z');
    await expect(page.getByRole('link', { name: 'Xem đường đi' })).toHaveAttribute('href', 'https://maps.app.goo.gl/UUaQjGfEuRA5vrtf9');
    await page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Hồi âm', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gửi lời hồi âm' })).toBeDisabled();
});

test('personal invitation loads, persists RSVP and restores it on reload', async ({ page }) => {
    let saved = { ...initialRsvp };
    let submission;
    await mockApi(page, (name, body) => {
        if (name === 'get_guest_rsvp') return { status: 200, body: [saved] };
        if (name === 'submit_guest_rsvp') {
            submission = body;
            saved = { status: body.p_status, party_size: body.p_party_size, message: body.p_message, updated_at: '2026-10-24T03:00:00Z' };
            return { status: 200, body: [saved] };
        }
    });
    await page.goto('/invitation.html?guest=an&key=guest-token');
    await expect(page.getByRole('heading', { name: 'An ơi,' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Hồi âm', exact: true }).click();
    await page.getByLabel('Mình sẽ đến', { exact: true }).check();
    await page.getByLabel('Tổng số người, tính cả bạn').fill('3');
    await page.getByLabel('Gửi Hoàng một lời nhắn').fill('Hẹn gặp Hoàng nhé!');
    await page.getByRole('button', { name: 'Gửi lời hồi âm' }).click();
    await expect(page.getByRole('status').last()).toContainText('Hoàng đã nhận được');
    expect(submission).toMatchObject({ p_slug: 'an', p_access_token: 'guest-token', p_party_size: 3, p_status: 'attending', p_message: 'Hẹn gặp Hoàng nhé!' });
    await page.reload();
    await page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Hồi âm', exact: true }).click();
    await expect(page.getByLabel('Tổng số người, tính cả bạn')).toHaveValue('3');
    await expect(page.getByLabel('Gửi Hoàng một lời nhắn')).toHaveValue('Hẹn gặp Hoàng nhé!');
});

test('invalid private links do not reveal a guest or enable submission', async ({ page }) => {
    await mockApi(page, () => ({ status: 200, body: [] }));
    await page.goto('/invitation.html?guest=an&key=wrong-token');
    await expect(page.getByRole('heading', { name: 'Lá thư chưa mở được.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Gửi lời hồi âm' })).toHaveCount(0);
});

test('RSVP load failures require retry; failed saves preserve the draft', async ({ page }) => {
    let failLoad = true;
    let failSave = true;
    await mockApi(page, (name, body) => {
        if (name === 'get_guest_rsvp' && failLoad) return { status: 500, body: {} };
        if (name === 'submit_guest_rsvp') return failSave ? { status: 500, body: {} } : { status: 200, body: [{ status: body.p_status, party_size: 1, message: body.p_message }] };
    });
    await page.goto('/invitation.html?guest=an&key=guest-token');
    await page.getByRole('navigation', { name: 'Nội dung thư mời' }).getByRole('button', { name: 'Hồi âm', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gửi lời hồi âm' })).toBeDisabled();
    failLoad = false;
    await page.getByRole('button', { name: 'Thử tải lại' }).click();
    await page.getByLabel('Mình chưa chắc', { exact: true }).check();
    await page.getByLabel('Gửi Hoàng một lời nhắn').fill('Mình sẽ báo lại nhé.');
    await page.getByRole('button', { name: 'Gửi lời hồi âm' }).click();
    await expect(page.getByRole('status').last()).toContainText('Chưa lưu được');
    await expect(page.getByLabel('Gửi Hoàng một lời nhắn')).toHaveValue('Mình sẽ báo lại nhé.');
    failSave = false;
    await page.getByRole('button', { name: 'Gửi lời hồi âm' }).click();
    await expect(page.getByRole('status').last()).toContainText('Hoàng đã nhận được');
});

test('window controls, taskbar, Start menu and keyboard navigation work', async ({ page }) => {
    await page.goto('/invitation.html');
    await page.getByRole('button', { name: 'Thu nhỏ cửa sổ' }).click();
    await expect(page.getByRole('heading', { name: 'Gửi bạn,' })).toBeHidden();
    await page.getByRole('button', { name: 'Thư mời tốt nghiệp', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gửi bạn,' })).toBeVisible();
    await page.getByRole('button', { name: 'Phóng to hoặc khôi phục cửa sổ' }).click();
    await expect(page.locator('.os-window')).toHaveCSS('left', '0px');
    await page.getByRole('button', { name: 'Đóng cửa sổ' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    const item = page.getByRole('navigation', { name: 'Start menu' }).getByRole('button', { name: 'Thư mời', exact: true });
    await item.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('heading', { name: 'Gửi bạn,' })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
    test(`invitation fits viewport at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/invitation.html');
        await expect(page.getByRole('heading', { name: 'Gửi bạn,' })).toBeVisible();
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const rect = await page.locator('.site-page-content').boundingBox();
        expect(rect.x).toBeGreaterThanOrEqual(0);
        expect(rect.x + rect.width).toBeLessThanOrEqual(width + 1);
        await page.screenshot({ path: `test-results/invitation-${width}.png` });
    });
}

test('admin access is private and creation returns a guest link on this site', async ({ page }) => {
    let creation;
    await mockApi(page, (name, body) => {
        if (name === 'create_invitation') {
            creation = body;
            return { status: 200, body: [{ guest_slug: body.p_slug, access_token: body.p_guest_token }] };
        }
    });
    await page.goto('/admin/rsvp');
    await expect(page.getByText('Hãy mở đúng đường dẫn quản trị riêng có mã truy cập.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tạo link', exact: true })).toHaveCount(0);
    await page.goto('/admin/rsvp?key=admin-token');
    await page.getByLabel('Tên khách mời').fill('Nguyễn An');
    await expect(page.getByLabel('Mã đường dẫn')).toHaveValue('nguyen-an');
    await page.getByRole('button', { name: 'Tạo link', exact: true }).click();
    await expect(page.getByLabel('Link /nguyen-an')).toHaveValue(/http:\/\/127.0.0.1:4587\/invite\/nguyen-an\?key=/);
    expect(creation.p_access_token).toBe('admin-token');
    expect(creation.p_guest_token.length).toBe(43);
});

test('3D room embeds the local desktop and preserves the private guest link', async ({ page }) => {
    test.setTimeout(90000);
    await mockApi(page);
    const failures = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.route('**/models/Computer/computer_setup.glb', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
    });
    await page.goto('/invite/an?key=guest-token');
    const directLink = page.locator('.direct-invitation');
    await expect(directLink).toHaveCount(0);
    await expect(page.locator('#room-focus')).toHaveCount(0);
    await expect(page.getByText('Checking RAM : 14000 OK')).toBeVisible();
    await page.screenshot({ path: 'test-results/original-bios-loading.png' });
    await expect(page.getByRole('button', { name: 'START', exact: true })).toBeEnabled({ timeout: 60000 });
    await page.screenshot({ path: 'test-results/original-bios-start.png' });
    await page.getByRole('button', { name: 'START', exact: true }).click();
    await expect(page.locator('#computer-screen')).toHaveAttribute('src', '/invitation.html?guest=an&key=guest-token');
    await expect(page.frameLocator('#computer-screen').getByRole('heading', { name: 'An ơi,' })).toBeAttached();
    await page.mouse.click(40, 680);
    await expect(page.getByRole('group', { name: 'Điều khiển căn phòng' }).getByRole('link', { name: 'Đọc thư trực tiếp' })).toBeVisible({ timeout: 15000 });
    await expect(directLink).toHaveAttribute('href', '/invitation.html?guest=an&key=guest-token');
    await expect(page.getByRole('group', { name: 'Điều khiển căn phòng' }).locator('.icon-control-container').last()).toHaveAttribute('aria-label', 'Đọc thư trực tiếp');
    await page.screenshot({ path: 'test-results/room-mail-control.png' });
    const monitor = await page.locator('#computer-screen').boundingBox();
    await page.mouse.move(monitor.x + monitor.width / 2, monitor.y + monitor.height / 2);
    await page.waitForTimeout(2500);
    await page.screenshot({ path: 'test-results/room-monitor.png' });
    await page.mouse.move(40, 40);
    await directLink.click();
    await expect(page).toHaveURL(/\/invitation.html\?guest=an&key=guest-token/);
    await expect(page.getByRole('heading', { name: 'An ơi,' })).toBeVisible();
    expect(failures).toEqual([]);
});

test('devices without WebGL retain the private identity in the direct invitation', async ({ page }) => {
    await mockApi(page);
    await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
            if (String(type).includes('webgl')) return null;
            return getContext.call(this, type, ...args);
        };
    });
    await page.goto('/invite/an?key=guest-token');
    await expect(page).toHaveURL(/\/invitation.html\?guest=an&key=guest-token/);
    await expect(page.getByRole('heading', { name: 'An ơi,' })).toBeVisible();
});
