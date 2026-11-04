// Runs inside the export page. Keep decoded original buffers and virtual event times;
// real-time recording would drift while frame-by-frame screenshots render slowly.
function installAudioCapture() {
    const tracks = [];
    const active = new Map();
    window.__STORY_AUDIO_CAPTURE__ = {
        play(id, name, buffer, options) {
            const track = { time: Date.now(), name, buffer, options, volumes: [], frequencies: [] };
            tracks.push(track);
            active.set(id, track);
        },
        volume(id, value) { active.get(id)?.volumes.push([Date.now(), value]); },
        frequency(id, value) { active.get(id)?.frequencies.push([Date.now(), value]); },
        async render(start, seconds) {
            if (!tracks.length) throw new Error('Không ghi nhận được âm thanh gốc của phòng. Hãy build lại project.');
            const sampleRate = 48000;
            const origin = Math.min(start, ...tracks.map(track => track.time));
            const offset = Math.round((start - origin) * sampleRate / 1000);
            const length = Math.round(seconds * sampleRate);
            const context = new OfflineAudioContext(2, offset + length, sampleRate);
            for (const track of tracks) {
                const at = Math.max(0, (track.time - origin) / 1000);
                const source = context.createBufferSource();
                source.buffer = track.buffer;
                source.loop = track.options.loop;
                source.detune.setTargetAtTime(track.options.detune, at, .01);
                const gain = context.createGain();
                gain.gain.setTargetAtTime(track.options.volume, at, .01);
                for (const [time, value] of track.volumes) gain.gain.setTargetAtTime(value, (time - origin) / 1000, .01);
                let tail = source;
                if (track.options.filter) {
                    const filter = context.createBiquadFilter();
                    filter.type = track.options.filter.type;
                    filter.frequency.value = track.options.filter.frequency;
                    for (const [time, value] of track.frequencies) filter.frequency.setValueAtTime(value, (time - origin) / 1000);
                    tail.connect(filter);
                    tail = filter;
                }
                tail.connect(gain);
                gain.connect(context.destination);
                source.start(at);
            }
            const rendered = await context.startRendering();
            const left = rendered.getChannelData(0);
            const right = rendered.getChannelData(1);
            const wav = new ArrayBuffer(44 + length * 4);
            const view = new DataView(wav);
            function text(at, value) { for (let i = 0; i < value.length; i++) view.setUint8(at + i, value.charCodeAt(i)); }
            text(0, 'RIFF'); view.setUint32(4, wav.byteLength - 8, true); text(8, 'WAVE'); text(12, 'fmt ');
            view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 2, true);
            view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 4, true);
            view.setUint16(32, 4, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, length * 4, true);
            let energy = 0;
            let peak = 0;
            for (let i = 0; i < length; i++) {
                for (const [channel, samples] of [[0, left], [1, right]]) {
                    const sample = Math.max(-1, Math.min(1, samples[offset + i]));
                    energy += sample * sample;
                    peak = Math.max(peak, Math.abs(sample));
                    view.setInt16(44 + i * 4 + channel * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
                }
            }
            if (!peak) throw new Error('Âm thanh phòng bị im lặng; dừng xuất để kiểm tra.');
            let binary = '';
            const bytes = new Uint8Array(wav);
            for (let i = 0; i < bytes.length; i += 32768) binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
            return {
                wav: btoa(binary), peak, rms: Math.sqrt(energy / (length * 2)),
                sounds: [...new Set(tracks.map(track => track.name))],
            };
        },
    };
}

module.exports = { installAudioCapture };
