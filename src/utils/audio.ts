/**
 * Web Audio API synthetic notification chime for trading signals
 * No external mp3 dependencies needed, works hermetically in browser
 */
export function playSignalChime(type: 'bullish' | 'bearish' | 'info' = 'bullish'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    if (type === 'bullish') {
      // Ascending chord: E5 (659.25Hz) -> B5 (987.77Hz)
      osc1.frequency.setValueAtTime(659.25, now);
      osc1.frequency.exponentialRampToValueAtTime(987.77, now + 0.15);
      osc2.frequency.setValueAtTime(523.25, now);
      osc2.frequency.exponentialRampToValueAtTime(1318.51, now + 0.18);
    } else if (type === 'bearish') {
      // Descending warning: G5 (783.99Hz) -> D5 (587.33Hz)
      osc1.frequency.setValueAtTime(783.99, now);
      osc1.frequency.exponentialRampToValueAtTime(440.0, now + 0.2);
      osc2.frequency.setValueAtTime(659.25, now);
      osc2.frequency.exponentialRampToValueAtTime(392.0, now + 0.2);
    } else {
      // Crisp bell
      osc1.frequency.setValueAtTime(880, now);
      osc2.frequency.setValueAtTime(1760, now);
    }

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);

    setTimeout(() => {
      ctx.close();
    }, 500);
  } catch {
    // Ignore audio context errors if browser blocks autoplay
  }
}
