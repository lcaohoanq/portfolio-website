import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'

test('select, search and download current guest names without tokens or RSVP data', async ({ page }) => {
    let renamed = false
    const calls: string[] = []
    await page.route('**/rest/v1/rpc/**', async route => {
        const method = new URL(route.request().url()).pathname.split('/').pop()!
        calls.push(method)
        await route.fulfill({ json: method === 'get_rsvp_dashboard' ? [
            { guest_slug: 'nguyen-an', display_name: renamed ? 'Nguyễn An mới' : 'Nguyễn An', status: null, message: 'Lời nhắn riêng' },
            { guest_slug: 'dang-binh', display_name: 'Đặng Bình', status: 'attending', party_size: 1 },
            { guest_slug: 'chi', display_name: 'Chi', status: null },
        ] : [] })
    })
    await page.goto('/admin/rsvp?key=admin-test-secret')
    const panel = page.getByRole('region', { name: 'Xuất Story theo tên khách' })
    const downloadButton = panel.getByRole('button', { name: /Tải danh sách xuất Story/ })
    await expect(panel.getByRole('checkbox')).toHaveCount(3)
    await expect(downloadButton).toBeDisabled()
    await panel.getByRole('checkbox').first().check()
    await panel.getByRole('searchbox').fill('binh')
    await expect(panel.getByRole('checkbox')).toHaveCount(1)
    await panel.getByRole('button', { name: /Chọn tất cả kết quả/ }).click()
    await expect(downloadButton).toHaveText('Tải danh sách xuất Story (2)')
    renamed = true
    await page.getByRole('button', { name: /Làm mới/ }).click()
    await expect(page.locator('.dashboard-table')).toContainText('Nguyễn An mới')
    const downloaded = page.waitForEvent('download')
    await downloadButton.click()
    const file = await downloaded
    expect(file.suggestedFilename()).toBe('story-guests.json')
    const data = JSON.parse(await fs.readFile((await file.path())!, 'utf8'))
    expect(data).toEqual({ version: 1, guests: [
        { slug: 'nguyen-an', name: 'Nguyễn An mới' }, { slug: 'dang-binh', name: 'Đặng Bình' },
    ] })
    await panel.getByRole('searchbox').fill('Không có tên này')
    await expect(panel.getByText('Không tìm thấy khách phù hợp.')).toBeVisible()
    await panel.getByRole('button', { name: 'Bỏ chọn tất cả' }).click()
    await expect(downloadButton).toBeDisabled()
    expect(calls.every(name => ['get_rsvp_dashboard', 'get_invitation_links'].includes(name))).toBe(true)
    await page.setViewportSize({ width: 390, height: 844 })
    const bounds = (await panel.boundingBox())!
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(391)
})

test('unauthorized dashboard does not offer Story exports', async ({ page }) => {
    await page.route('**/rest/v1/rpc/**', route => route.fulfill({ status: 403, json: {} }))
    await page.goto('/admin/rsvp?key=invalid')
    await expect(page.getByRole('alert')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Xuất Story theo tên khách' })).toHaveCount(0)
})
