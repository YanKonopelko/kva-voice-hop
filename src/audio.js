export class VoiceInput {
  constructor() { this.active = false; this.level = 0; this.noise = 0.003; this.sensitivity = 50; this.generation = 0; }

  async start() {
    if (!window.isSecureContext) throw new Error('Для микрофона открой игру по HTTPS или на localhost. Пока можно играть кнопками.');
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Этот браузер не поддерживает микрофон. Попробуй Chrome, Safari или управление кнопками.');
    if (this.active) this.stop();
    const generation = ++this.generation;
    let stream, context, source;
    const release = () => { stream?.getTracks().forEach(t => t.stop()); source?.disconnect(); context?.close().catch(() => {}); };
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false }, video: false });
      if (generation !== this.generation) { release(); return false; }
      context = new (window.AudioContext || window.webkitAudioContext)();
      if (context.state === 'suspended') await context.resume();
      if (generation !== this.generation) { release(); return false; }
      source = context.createMediaStreamSource(stream);
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      this.stream = stream; this.context = context; this.source = source; this.analyser = analyser;
      // Intentionally never connected to speakers; no recording or upload exists.
      this.samples = new Float32Array(this.analyser.fftSize);
      this.active = true; this.level = 0;
      this.calibration = { remaining: 0.85, sum: 0, count: 0 };
      return true;
    } catch (e) {
      release();
      // An old denied/cancelled permission request must not stop a newer stream.
      if (generation !== this.generation) return false;
      const errors = { NotAllowedError: 'Доступ к микрофону не разрешён. Разреши его в браузере или играй кнопками.', NotFoundError: 'Микрофон не найден. Подключи его или играй кнопками.', NotReadableError: 'Микрофон занят другим приложением. Освободи его или играй кнопками.', SecurityError: 'Микрофон заблокирован площадкой. Доступны кнопки управления.' };
      this.active = false; this.level = 0;
      throw new Error(errors[e.name] || e.message || 'Не удалось включить микрофон. Доступно управление кнопками.');
    }
  }

  update(dt) {
    if (!this.active) return 0;
    if (this.stream.getAudioTracks().every(t => t.readyState === 'ended')) { this.stop(); return 0; }
    this.analyser.getFloatTimeDomainData(this.samples);
    let sum = 0;
    for (let i = 0; i < this.samples.length; i++) sum += this.samples[i] * this.samples[i];
    const rms = Math.sqrt(sum / this.samples.length);
    if (this.calibration.remaining > 0) {
      this.calibration.remaining -= dt;
      this.calibration.sum += rms; this.calibration.count++;
      this.noise = Math.min(0.018, Math.max(0.001, this.calibration.sum / this.calibration.count));
      return 0;
    }
    const gain = 8 * Math.pow(10, (this.sensitivity - 50) / 65);
    const target = Math.min(1, Math.max(0, (rms - this.noise * 1.15) * gain));
    const rate = target > this.level ? 24 : 12;
    this.level += (target - this.level) * (1 - Math.exp(-dt * rate));
    return this.level;
  }

  async resume() { if (this.context?.state === 'suspended') await this.context.resume(); }
  suspend() { this.context?.suspend().catch(() => {}); }
  stop() {
    this.generation++;
    this.stream?.getTracks().forEach(t => t.stop());
    this.source?.disconnect();
    this.context?.close().catch(() => {});
    this.active = false; this.level = 0;
    this.stream = null; this.source = null; this.context = null;
  }
}

export class SoundEffects {
  constructor() { this.enabled = false; this.context = null; }
  unlock() {
    if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)();
    if (this.context.state === 'suspended') this.context.resume().catch(() => {});
  }
  play(type) {
    if (!this.enabled || !this.context || this.context.state !== 'running') return;
    const recipes = { jump:[220,390,.12,'sine'], coin:[740,1100,.1,'sine'], land:[140,85,.055,'sine'], death:[180,65,.22,'triangle'], checkpoint:[440,880,.25,'sine'], finish:[523,1046,.45,'sine'] };
    const r = recipes[type];
    if (!r) return;
    const [a,b,d,wave] = r, ctx = this.context, t = ctx.currentTime;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = wave; osc.frequency.setValueAtTime(a,t); osc.frequency.exponentialRampToValueAtTime(b,t+d);
    gain.gain.setValueAtTime(.0001,t); gain.gain.exponentialRampToValueAtTime(.035,t+.008); gain.gain.exponentialRampToValueAtTime(.0001,t+d);
    osc.connect(gain); gain.connect(ctx.destination); osc.start(t); osc.stop(t+d+.02);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
}
