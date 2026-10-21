import { LEVELS } from './levels.js?v=da68aa2bb8f2';
import { GameSim } from './sim.js?v=da68aa2bb8f2';
import { Renderer } from './render.js?v=da68aa2bb8f2';
import { VoiceInput, SoundEffects } from './audio.js?v=da68aa2bb8f2';
import { readSave, writeSave } from './storage.js?v=da68aa2bb8f2';
import { platform } from './platform.js?v=da68aa2bb8f2';

const $ = id => document.getElementById(id);
if (new URLSearchParams(location.search).get('embed') === '1') document.body.classList.add('embedded');
const save = readSave();
const sim = new GameSim(Math.min(save.level, save.unlocked));
const renderer = new Renderer($('game'));
const voice = new VoiceInput();
const sound = new SoundEffects();
voice.sensitivity = save.sensitivity;
sound.enabled = save.sound;
let state = 'menu', mode = 'manual', previous = 0, nextFrame = 0, accumulator = 0, visualTime = 0;
let keys = new Set(), touchWalk = false, jumpEdge = false, helpReturn = 'menu';
let toastTimer, requestingMic = false, lastCoins = -1, lastHudState = '', fps = 0, frameCount = 0, fpsTime = 0;

function persist() { writeSave(save); }
function toast(message, duration = 2600) {
  $('toast').textContent = message; $('toast').classList.add('visible');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.remove('visible'), duration);
}
function updateSoundButton() {
  $('sound-button').setAttribute('aria-label', sound.enabled ? 'Выключить звук' : 'Включить звук');
  $('sound-button').title = sound.enabled ? 'Звук включён' : 'Звук выключен';
  $('sound-waves').setAttribute('d', sound.enabled ? 'M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14' : 'm16 9 6 6m0-6-6 6');
}
function refreshLevel() {
  $('level-number').textContent = String(sim.index + 1).padStart(2, '0');
  $('level-name').textContent = sim.level.name;
  $('coin-total').textContent = `/ ${sim.level.coins.length}`;
  $('level-dots').setAttribute('aria-label', `Уровень ${sim.index + 1} из 3`);
  $('level-dots').querySelectorAll('span').forEach((dot, i) => { dot.className = i === sim.index ? 'active' : i < sim.index ? 'done' : ''; });
  lastCoins = -1;
}
function showDialog(html) {
  $('overlay').hidden = false; $('welcome').hidden = true; $('dialog').hidden = false;
  $('dialog').innerHTML = html;
  $('touch-controls').hidden = true;
  requestAnimationFrame(() => $('dialog').querySelector('button')?.focus({ preventScroll: true }));
}
function hideOverlay() { $('overlay').hidden = true; $('dialog').hidden = true; $('welcome').hidden = true; }
function showMenu() {
  state = 'menu'; platform.stop(); voice.stop(); requestingMic = false;
  keys.clear(); touchWalk = false; jumpEdge = false;
  $('overlay').hidden = false; $('welcome').hidden = false; $('dialog').hidden = true; $('touch-controls').hidden = true;
  $('pause-button').disabled = true; $('stage-caption').hidden = false;
  $('voice-start').disabled = false; $('voice-start').querySelector('span').textContent = 'Играть голосом';
  $('input-label').textContent = 'Сила твоего голоса'; $('input-hint').textContent = 'Подключи микрофон и скажи «ква»';
}
function begin(selectedMode) {
  mode = selectedMode;
  state = selectedMode === 'voice' ? 'calibrating' : 'playing';
  hideOverlay(); keys.clear(); touchWalk = false; jumpEdge = false;
  $('pause-button').disabled = false; $('stage-caption').hidden = true;
  $('touch-controls').hidden = selectedMode !== 'manual';
  $('input-label').textContent = selectedMode === 'voice' ? 'Сила твоего голоса' : 'Управление кнопками';
  $('input-hint').textContent = selectedMode === 'voice' ? 'Секунду тишины — настраиваем микрофон' : '→ идти · Пробел прыгать';
  $('sensitivity').disabled = selectedMode !== 'voice';
  if (selectedMode === 'voice') toast('Секунду тишины — слушаем фон', 1400);
  else { platform.start(); toast('Удерживай →, а перед пропастью нажми Пробел', 3800); }
  if (sound.enabled) sound.unlock();
}
async function startVoice() {
  if (requestingMic) return;
  requestingMic = true;
  $('voice-start').disabled = true;
  $('voice-start').querySelector('span').textContent = 'Разреши микрофон в браузере…';
  try {
    const ok = await voice.start();
    if (ok && requestingMic) begin('voice');
  } catch (error) {
    if (state === 'playing') return;
    state = 'mic-error';
    showDialog(`<div class="result-icon">◌</div><h2>Немного тише?</h2><p class="error-copy"></p><div class="dialog-actions"><button class="primary-button" id="fallback-button">Играть кнопками <span>→</span></button><button class="secondary-button" id="retry-mic">Попробовать микрофон снова</button><button class="text-button" id="back-menu">Вернуться</button></div>`);
    $('dialog').querySelector('p').textContent = error.message;
    $('fallback-button').onclick = () => begin('manual');
    $('retry-mic').onclick = () => { showMenu(); startVoice(); };
    $('back-menu').onclick = showMenu;
  } finally { requestingMic = false; $('voice-start').disabled = false; }
}
async function resume() {
  if (mode === 'voice') await voice.resume().catch(() => {});
  state = mode === 'voice' && voice.calibration?.remaining > 0 ? 'calibrating' : 'playing';
  hideOverlay(); $('touch-controls').hidden = mode !== 'manual';
  platform.start();
}
function pause() {
  if (!['playing', 'calibrating'].includes(state)) return;
  state = 'paused'; keys.clear(); touchWalk = false; jumpEdge = false;
  voice.suspend(); platform.stop();
  showDialog(`<div class="modal-kicker">СДЕЛАЙ ВДОХ</div><h2>Маленькая пауза</h2><p>Квак никуда не торопится.</p><div class="dialog-actions"><button class="primary-button" id="resume-button">Продолжить <span>→</span></button><button class="secondary-button" id="restart-button">Уровень сначала</button><button class="text-button" id="menu-button">Главное меню</button></div>`);
  $('resume-button').onclick = resume;
  $('restart-button').onclick = () => { sim.load(sim.index); refreshLevel(); resume(); };
  $('menu-button').onclick = () => { sim.load(sim.index); refreshLevel(); showMenu(); };
}
function showHelp() {
  if (requestingMic) return;
  helpReturn = state;
  if (['playing', 'calibrating'].includes(state)) { keys.clear(); touchWalk = false; jumpEdge = false; voice.suspend(); platform.stop(); }
  state = 'help';
  showDialog(`<div class="modal-kicker">ПАРА ПРОСТЫХ ПРАВИЛ</div><h2>Знакомься: Квак.</h2><div class="help-copy"><p>Он идёт на твой голос. Молчи, чтобы остановиться; говори, чтобы идти; произнеси громкое «ква», чтобы прыгнуть. Долгий громкий звук помогает прыгать снова.</p><p>Начни говорить перед краем острова. Не нужно кричать: увеличь чувствительность внизу. Флажок сохраняет место после падения.</p><p>Без микрофона: <b>→ или D</b> — идти, <b>Пробел или ↑</b> — прыгать. На телефоне есть две кнопки.</p><p>Микрофон работает по HTTPS и на localhost. Если площадка блокирует его внутри iframe, выбери кнопки.</p></div><button class="primary-button" id="close-help">Всё понятно <span>→</span></button>`);
  $('close-help').onclick = () => {
    if (['playing', 'calibrating'].includes(helpReturn)) resume();
    else if (helpReturn === 'paused') { state = 'playing'; pause(); }
    else if (helpReturn === 'finished') finishDialog();
    else showMenu();
  };
}
function finishDialog() {
  state = 'finished'; voice.suspend(); platform.stop();
  const last = sim.index === LEVELS.length - 1;
  showDialog(`<div class="result-icon">${last ? '✿' : '⚑'}</div><div class="modal-kicker">${last ? 'ДОМ, МИЛЫЙ ДОМ' : 'ЕЩЁ ОДИН БОЛЬШОЙ ШАГ'}</div><h2>${last ? 'Ты дома, Квак!' : 'Вот это голос!'}</h2><p>${last ? 'Все три острова позади. Можно выдохнуть.' : sim.level.name + ' пройден. Вперёд, к новым берегам.'}</p><div class="result-stats"><div><b>${sim.collected.size}<small>/${sim.level.coins.length}</small></b>монет</div><div><b>${Math.round(sim.elapsed)}<small>с</small></b>в пути</div><div><b>${sim.deaths}</b>падений</div></div><div class="dialog-actions"><button class="primary-button" id="next-button">${last ? 'Новое приключение' : 'Следующий остров'} <span>→</span></button><button class="secondary-button" id="replay-button">Пройти ещё раз</button><button class="text-button" id="finish-menu">Главное меню</button></div>`);
  $('next-button').onclick = () => {
    sim.load(last ? 0 : sim.index + 1); save.level = sim.index; persist(); refreshLevel(); resume();
  };
  $('replay-button').onclick = () => { sim.load(sim.index); refreshLevel(); resume(); };
  $('finish-menu').onclick = () => {
    sim.load(last ? 0 : sim.index + 1); save.level = sim.index; persist(); refreshLevel(); showMenu();
  };
}
function handleEvents() {
  for (const event of sim.events) {
    sound.play(event.type);
    if (event.type === 'checkpoint') toast('✓ Чекпоинт! Здесь можно перевести дух.');
    if (event.type === 'death') toast(sim.checkpoint ? 'Ничего! Флажок тебя запомнил.' : 'Бывает! Ещё одно «ква»?', 1600);
    if (event.type === 'finish') {
      save.unlocked = Math.max(save.unlocked, Math.min(2, sim.index + 1));
      save.level = Math.min(2, sim.index + 1);
      const old = save.best[sim.level.id];
      save.best[sim.level.id] = { coins: Math.max(old?.coins || 0, sim.collected.size), time: Math.min(old?.time || Infinity, sim.elapsed) };
      persist(); platform.complete(sim.snapshot()); finishDialog();
    }
  }
}
function hud(level) {
  if (lastCoins !== sim.collected.size) { $('coin-count').textContent = sim.collected.size; lastCoins = sim.collected.size; }
  $('level-progress').style.width = `${Math.min(100, Math.max(0, (sim.player.x - sim.level.start) / (sim.level.finish - sim.level.start) * 100))}%`;
  $('meter-fill').style.width = `${Math.round(level * 100)}%`;
  $('voice-meter').setAttribute('aria-valuenow', String(Math.round(level * 100)));
  if (state === 'playing' && mode === 'voice') {
    const text = level > .67 ? 'КВА! Прыгаем!' : level > .22 ? 'Слышу тебя — идём' : 'Тишина — можно передохнуть';
    if (text !== lastHudState) { $('input-hint').textContent = text; lastHudState = text; }
  }
}
function frame(timestamp) {
  requestAnimationFrame(frame);
  // Keep high refresh rate screens from spending extra battery on 144 drawings/s.
  if (timestamp < nextFrame) return;
  if (timestamp > nextFrame + 100) nextFrame = timestamp;
  nextFrame += 1000 / 60;
  const dt = Math.min(.08, previous ? (timestamp - previous) / 1000 : 1 / 60); previous = timestamp;
  if (document.hidden) return;
  visualTime += dt;
  const micLevel = voice.active && ['playing','calibrating'].includes(state) ? voice.update(dt) : 0;
  if (['playing','calibrating'].includes(state) && mode === 'voice' && !voice.active) {
    pause(); toast('Микрофон отключился. Можно перейти на кнопки.', 4000);
    const fallback = document.createElement('button'); fallback.className = 'secondary-button'; fallback.textContent = 'Перейти на кнопки';
    fallback.onclick = () => { voice.stop(); begin('manual'); };
    $('dialog').querySelector('.dialog-actions').prepend(fallback);
    $('resume-button').disabled = true;
  }
  if (state === 'calibrating' && voice.calibration.remaining <= 0) { state = 'playing'; platform.start(); toast('Говори, чтобы идти. Квакай, чтобы прыгать!', 3200); }
  const moving = keys.has('ArrowRight') || keys.has('KeyD') || touchWalk;
  const input = mode === 'voice' ? { move: micLevel > .22 ? 1 : 0, voiceJump: micLevel > .67, jump: jumpEdge } : { move: moving ? 1 : 0, jump: jumpEdge };
  if (state === 'playing') {
    accumulator = Math.min(accumulator + dt, .1);
    let first = true;
    while (accumulator >= 1 / 120 && state === 'playing') {
      sim.update(1 / 120, { ...input, jump: first && input.jump });
      if (first) { jumpEdge = false; first = false; }
      handleEvents(); accumulator -= 1 / 120;
    }
  } else { accumulator = 0; jumpEdge = false; if (state === 'finished') sim.update(dt); }
  const displayLevel = mode === 'voice' ? micLevel : state === 'playing' ? sim.player.vy < -100 ? .95 : moving ? .42 : 0 : 0;
  renderer.render(sim, { time: visualTime, voice: displayLevel, menu: state === 'menu' });
  hud(displayLevel);
  frameCount++; fpsTime += dt;
  if (fpsTime >= 1) {
    fps = Math.round(frameCount / fpsTime); frameCount = 0; fpsTime = 0;
    $('game').dataset.fps = String(fps);
    $('game').dataset.gameState = state;
    $('game').dataset.playerX = String(Math.round(sim.player.x));
  }
}

$('voice-start').onclick = startVoice;
$('manual-start').onclick = () => { voice.stop(); requestingMic = false; begin('manual'); };
$('pause-button').onclick = () => state === 'paused' ? resume() : pause();
$('help-button').onclick = showHelp;
$('sound-button').onclick = () => { sound.enabled = !sound.enabled; save.sound = sound.enabled; if (sound.enabled) { sound.unlock(); sound.play('coin'); } updateSoundButton(); persist(); };
$('sensitivity').value = String(save.sensitivity);
$('sensitivity-value').textContent = `${save.sensitivity}%`;
$('sensitivity').oninput = e => { voice.sensitivity = Number(e.target.value); save.sensitivity = voice.sensitivity; $('sensitivity-value').textContent = `${voice.sensitivity}%`; persist(); };
$('change-mode').onclick = () => { sim.load(sim.index); refreshLevel(); showMenu(); };
$('fullscreen-button').onclick = async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else if ($('game-shell').requestFullscreen) await $('game-shell').requestFullscreen(); else toast('Полный экран недоступен в этом браузере.'); } catch { toast('Полный экран недоступен внутри этой площадки.'); }
};
function controlTarget(target) { return target instanceof Element && ['INPUT','TEXTAREA','SELECT'].includes(target.tagName); }
window.addEventListener('keydown', e => {
  if (e.code === 'Escape') { if (['playing','calibrating'].includes(state)) pause(); else if (state === 'paused') resume(); return; }
  if (!['ArrowRight','KeyD','Space','ArrowUp','KeyW'].includes(e.code) || state !== 'playing' || controlTarget(e.target)) return;
  if (e.code === 'Space' && e.target instanceof Element && ['BUTTON','A'].includes(e.target.tagName)) return;
  e.preventDefault();
  if (!e.repeat && ['Space','ArrowUp','KeyW'].includes(e.code)) jumpEdge = true;
  keys.add(e.code);
});
window.addEventListener('keyup', e => keys.delete(e.code));
function releaseControls() { keys.clear(); touchWalk = false; jumpEdge = false; }
window.addEventListener('blur', () => { releaseControls(); pause(); });
document.addEventListener('visibilitychange', () => { previous = 0; if (document.hidden) { releaseControls(); pause(); } });
for (const [id, isJump] of [['walk-button',false], ['jump-button',true]]) {
  const button = $(id);
  button.addEventListener('pointerdown', e => {
    e.preventDefault(); if (state !== 'playing') return; button.setPointerCapture(e.pointerId);
    if (isJump) jumpEdge = true; else touchWalk = true;
  });
  for (const event of ['pointerup','pointercancel','lostpointercapture']) button.addEventListener(event, () => { if (!isJump) touchWalk = false; });
  button.addEventListener('click', e => { if (e.detail === 0 && isJump && state === 'playing') jumpEdge = true; });
  button.addEventListener('keydown', e => { if (!isJump && ['Space','Enter'].includes(e.code) && state === 'playing') { e.preventDefault(); touchWalk = true; } });
  button.addEventListener('keyup', e => { if (!isJump && ['Space','Enter'].includes(e.code)) { e.preventDefault(); touchWalk = false; } });
  button.addEventListener('blur', () => { if (!isJump) touchWalk = false; });
}
window.addEventListener('pagehide', () => voice.stop());
// A read-only snapshot for browser QA and future AI playtesting.
window.kva = Object.freeze({ getState: () => ({ state, mode, fps, view: { width: renderer.width, height: renderer.height }, ...sim.snapshot() }), getJoints: () => structuredClone(renderer.joints || {}) });
refreshLevel(); updateSoundButton(); showMenu(); platform.ready(); requestAnimationFrame(frame);
