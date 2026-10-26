import React, { useEffect, useRef, useState } from 'react';

// RMS levels sampled from the published recording, one value per waveform bar.
const WAVEFORM = [
    41, 35, 40, 38, 27, 34, 16, 44, 15, 26, 50, 19, 38, 25, 49, 39,
    24, 10, 37, 25, 27, 12, 32, 38, 13, 30, 35, 33, 25, 42, 12, 36,
    34, 23, 27, 39, 26, 14, 30, 34, 34, 24, 32, 30, 31, 19, 29, 31,
    34, 21, 60, 63, 56, 22, 51, 10, 34, 38, 36, 21, 24, 37, 34, 10,
    34, 31, 29, 24, 31, 18, 32, 28, 17, 36, 20, 31, 16, 21, 33, 33,
    8, 28, 36, 26, 16, 30, 11, 34, 18, 29, 39, 19, 29, 20, 22, 18,
];

const FALLBACK_DURATION = 63.33;

function clock(seconds: number) {
    const whole = Math.floor(seconds);
    return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function bars() {
    return WAVEFORM.map((height, index) =>
        <rect key={index} x={index * 5 + 1} y={(64 - height) / 2} width="2" height={height} rx="1" />);
}

export default function MemoryAudioPlayer() {
    const player = useRef<HTMLDivElement>(null);
    const audio = useRef<HTMLAudioElement>(null);
    const attemptedPlayback = useRef(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(FALLBACK_DURATION);
    const [playing, setPlaying] = useState(false);
    const [loop, setLoop] = useState(false);
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [status, setStatus] = useState('');
    const progress = Math.min(1, currentTime / duration);

    useEffect(() => {
        const target = player.current;
        const recording = audio.current;
        if (!target || !recording || typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting) || attemptedPlayback.current) return;
            attemptedPlayback.current = true;
            observer.disconnect();
            void recording.play().catch(() => setStatus('Nhấn phát để nghe lời nhắn.'));
        }, { root: target.closest('.site-page-content'), threshold: 0.6 });
        observer.observe(target);
        return () => observer.disconnect();
    }, []);

    function togglePlayback() {
        const recording = audio.current;
        if (!recording) return;
        if (!recording.paused) {
            recording.pause();
            return;
        }
        if (recording.ended) recording.currentTime = 0;
        void recording.play().catch(() => setStatus('Không phát được lời nhắn. Bạn thử lại nhé.'));
    }

    function seek(seconds: number) {
        const recording = audio.current;
        if (recording) recording.currentTime = Math.max(0, Math.min(duration, seconds));
    }

    function changeVolume(next: number) {
        const recording = audio.current;
        if (!recording) return;
        recording.volume = next;
        recording.muted = next === 0;
        setVolume(next);
        setMuted(next === 0);
    }

    function toggleMute() {
        const recording = audio.current;
        if (!recording) return;
        recording.muted = !recording.muted;
        setMuted(recording.muted);
    }

    return <div ref={player} className="memory-player" aria-label="Lời nhắn của Hoàng">
        <audio ref={audio} src="/invitation/talk.mp3?v=2" preload="metadata" loop={loop}
            onLoadedMetadata={(event) => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration); }}
            onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
            onPlay={() => { setPlaying(true); setStatus(''); }}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setCurrentTime(duration); }}
            onError={() => setStatus('Chưa tải được lời nhắn. Bạn thử tải lại trang nhé.')} />
        <div className="memory-player-timeline">
            <span className="memory-player-time">{clock(currentTime)}</span>
            <div className="memory-player-waveform">
                <svg viewBox="0 0 480 64" preserveAspectRatio="none" aria-hidden="true">
                    <line x1="0" x2="480" y1="32" y2="32" className="waveform-baseline" />
                    <g className="waveform-unplayed">{bars()}</g>
                    <defs><clipPath id="memory-waveform-progress"><rect x="0" y="0" width={progress * 480} height="64" /></clipPath></defs>
                    <g className="waveform-played" clipPath="url(#memory-waveform-progress)">{bars()}</g>
                    <circle className="waveform-thumb" cx={Math.max(5, Math.min(475, progress * 480))} cy="32" r="7" />
                </svg>
                <input type="range" min="0" max={duration} step="0.1" value={currentTime}
                    aria-label="Tua lời nhắn" aria-valuetext={`${clock(currentTime)} trên ${clock(duration)}`}
                    onChange={(event) => seek(Number(event.currentTarget.value))} />
            </div>
            <span className="memory-player-time">{clock(duration)}</span>
        </div>
        <div className="memory-player-controls">
            <button type="button" className={`memory-player-icon memory-player-repeat${loop ? ' active' : ''}`}
                aria-label={loop ? 'Tắt lặp lời nhắn' : 'Lặp lời nhắn'} aria-pressed={loop}
                onClick={() => setLoop(!loop)}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 3l3 3-3 3M20 6H7a4 4 0 0 0-4 4v1M7 21l-3-3 3-3m-3 3h13a4 4 0 0 0 4-4v-1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><text x="10" y="15" fontSize="9" fontFamily="Arial" fontWeight="bold">1</text></svg>
            </button>
            <div className="memory-player-transport">
                <button type="button" className="memory-player-icon" aria-label="Lùi 10 giây" onClick={() => seek(currentTime - 10)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4v16h2V4zm17 0L7 12l14 8z" fill="currentColor" /></svg>
                </button>
                <button type="button" className="memory-player-icon memory-player-play" aria-label={playing ? 'Tạm dừng' : 'Phát lời nhắn'} onClick={togglePlayback}>
                    {playing ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h5v18H5zm9 0h5v18h-5z" fill="currentColor" /></svg>
                        : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 2.5a1.5 1.5 0 0 1 2.2-1.3l14 9a1 1 0 0 1 0 1.6l-14 9A1.5 1.5 0 0 1 5 19.5z" fill="currentColor" /></svg>}
                </button>
                <button type="button" className="memory-player-icon" aria-label="Tới 10 giây" onClick={() => seek(currentTime + 10)}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 4v16h2V4zM3 4l14 8-14 8z" fill="currentColor" /></svg>
                </button>
            </div>
            <div className="memory-player-volume">
                <button type="button" className="memory-player-icon" aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'} onClick={toggleMute}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 4V5L7 9z" fill="currentColor" /><path d={muted ? 'M16 9l5 6m0-6l-5 6' : 'M15 8a5 5 0 0 1 0 8m3-11a9 9 0 0 1 0 14'} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
                </button>
                <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
                    aria-label="Âm lượng" aria-valuetext={`${Math.round((muted ? 0 : volume) * 100)}%`}
                    onChange={(event) => changeVolume(Number(event.currentTarget.value))} />
            </div>
        </div>
        {status && <p className="memory-player-status" role="status">{status}</p>}
    </div>;
}
