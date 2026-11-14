/** 新订单提示音。浏览器要有过一次用户手势才能出声，失败时静默忽略，界面高亮仍会显示。 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!audioCtx) audioCtx = new Ctor();
  return audioCtx;
}

export function unlockNewOrderSound(): void {
  const audio = getAudioContext();
  if (audio?.state === 'suspended') void audio.resume();
}

export function playNewOrderSound(): void {
  const audio = getAudioContext();
  if (!audio) return;
  void audio
    .resume()
    .then(() => {
      const now = audio.currentTime;
      for (const [index, frequency] of [880, 1174.66].entries()) {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = now + index * 0.16;
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.3);
      }
    })
    .catch(() => {
      // Autoplay 被拦时只依赖视觉提示
    });
}
