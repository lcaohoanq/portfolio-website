import { test, expect } from '@playwright/test'
import { installAudioCapture } from '../scripts/story-audio.cjs'

test('audio follows virtual time and trims pre-roll even when rendering takes longer', async ({ page }) => {
    await page.clock.install()
    await page.route('**/rest/v1/rpc/**', route => route.fulfill({ json: [] }))
    await page.goto('/invitation.html')
    await page.evaluate(installAudioCapture)
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 100))
    const start = await page.evaluate(() => {
        const rate = 48000
        const context = new OfflineAudioContext(2, rate, rate)
        const buffer = context.createBuffer(2, rate, rate)
        for (let channel = 0; channel < 2; channel++) {
            const samples = buffer.getChannelData(channel)
            for (let i = 0; i < rate; i++) samples[i] = .2 * Math.sin(2 * Math.PI * 1000 * i / rate)
        }
        window.__STORY_AUDIO_CAPTURE__!.play('tone', 'test', buffer, { volume: 1, loop: false, detune: 0 })
        return Date.now()
    })
    await page.clock.runFor(250)
    await page.evaluate(() => window.__STORY_AUDIO_CAPTURE__!.volume('tone', 0))
    const result = await page.evaluate(async start => {
        // @ts-expect-error The renderer is installed only in the export browser.
        return window.__STORY_AUDIO_CAPTURE__!.render(start + 125, .5)
    }, start)
    const wav = Buffer.from(result.wav, 'base64')
    expect(wav.subarray(0, 4).toString()).toBe('RIFF')
    expect(wav.readUInt16LE(22)).toBe(2)
    expect(wav.readUInt32LE(24)).toBe(48000)
    expect(wav.length).toBe(44 + 48000 * .5 * 4)
    let initialPeak = 0
    let mutedPeak = 0
    for (let i = 0; i < 48000 * .5; i++) {
        const sample = Math.abs(wav.readInt16LE(44 + i * 4))
        if (i < 48000 * .1) initialPeak = Math.max(initialPeak, sample)
        if (i > 48000 * .25) mutedPeak = Math.max(mutedPeak, sample)
    }
    expect(initialPeak).toBeGreaterThan(6000)
    expect(mutedPeak).toBe(0)
})
