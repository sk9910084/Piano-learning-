/* ================================================
   PianoVerse – script.js
   Interactive Piano Learning Platform
   ================================================ */

'use strict';

// ── Audio Context ──────────────────────────────
let audioCtx = null;
let soundEnabled = true;
let sustainEnabled = false;
let masterVolume = 0.7;
let currentOctave = 4;
let showLabels = true;
const activeOscillators = {};

function getAudioContext() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

// Generate real piano-like tone using multiple oscillators
function playNote(noteName) {
  if (!soundEnabled) return;
  const ctx = getAudioContext();
  const freq = noteToFreq(noteName);
  if (!freq) return;

  // Stop existing if not sustain
  if (!sustainEnabled && activeOscillators[noteName]) stopNote(noteName);

  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(masterVolume * 0.5, ctx.currentTime);
  masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.5);
  masterGain.connect(ctx.destination);

  const oscillators = [];

  // Fundamental
  const osc1 = ctx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.value = freq;
  const g1 = ctx.createGain(); g1.gain.value = 0.6;
  osc1.connect(g1); g1.connect(masterGain);

  // Harmonic 2nd
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = freq * 2;
  const g2 = ctx.createGain(); g2.gain.value = 0.25;
  osc2.connect(g2); g2.connect(masterGain);

  // Harmonic 3rd
  const osc3 = ctx.createOscillator();
  osc3.type = 'sine';
  osc3.frequency.value = freq * 3;
  const g3 = ctx.createGain(); g3.gain.value = 0.1;
  osc3.connect(g3); g3.connect(masterGain);

  // Attack gain shaping
  masterGain.gain.cancelScheduledValues(ctx.currentTime);
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(masterVolume * 0.5, ctx.currentTime + 0.01);
  masterGain.gain.exponentialRampToValueAtTime(masterVolume * 0.3, ctx.currentTime + 0.1);
  masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (sustainEnabled ? 4 : 2.5));

  [osc1, osc2, osc3].forEach(o => o.start(ctx.currentTime));
  [osc1, osc2, osc3].forEach(o => o.stop(ctx.currentTime + (sustainEnabled ? 4.1 : 2.6)));

  oscillators.push({ oscs: [osc1, osc2, osc3], gain: masterGain });
  activeOscillators[noteName] = { oscs: [osc1, osc2, osc3], gain: masterGain };
}

function stopNote(noteName) {
  if (activeOscillators[noteName]) {
    try {
      const { gain } = activeOscillators[noteName];
      gain.gain.cancelScheduledValues(audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);
    } catch (e) {}
    delete activeOscillators[noteName];
  }
}

function noteToFreq(note) {
  const notes = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
  const match = note.match(/^([A-G]#?b?)(\d)$/);
  if (!match) return null;
  const [, n, oct] = match;
  const semitone = notes[n];
  if (semitone === undefined) return null;
  return 440 * Math.pow(2, (semitone + (parseInt(oct) - 4) * 12 - 9) / 12);
}

// ── Page Router ──────────────────────────────
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + pageId)?.classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === pageId);
  });
  // Close mobile menu
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  // Page-specific init
  if (pageId === 'learn') initPianoKeyboard();
  if (pageId === 'practice') initPracticeKeyboard();
  if (pageId === 'courses') renderCourses();
  if (pageId === 'videos') renderVideos();
  if (pageId === 'blog') renderBlog();
}

// ── Loader ──────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
  }, 1800);
  initHomePiano();
  initTestimonials();
  renderCourses();
  renderHighScores();
});

// ── Theme Toggle ──────────────────────────────
const themeBtn = document.getElementById('themeToggle');
themeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light-mode');
  themeBtn.textContent = document.body.classList.contains('light-mode') ? '☀️' : '🌙';
  localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});
if (localStorage.getItem('theme') === 'light') {
  document.body.classList.add('light-mode');
  themeBtn.textContent = '☀️';
}

// ── Sound Toggle ──────────────────────────────
const soundBtn = document.getElementById('soundToggle');
soundBtn.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
});

// ── Hamburger ──────────────────────────────
document.getElementById('hamburger').addEventListener('click', () => {
  document.getElementById('navLinks').classList.toggle('open');
});

// ── Sticky Navbar style ──────────────────────────────
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.style.boxShadow = window.scrollY > 20 ? '0 4px 30px rgba(0,0,0,0.3)' : '';
});

// ── Hero Mini Piano ──────────────────────────────
function initHomePiano() {
  const container = document.getElementById('miniPiano');
  if (!container) return;
  const whites = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]; // C D E F G A B C D E
  const blackPositions = [1, 3, null, 6, 8, 10, null, 13, 15]; // C# D# _ F# G# A# _ C# D#
  const keyW = 26, gap = 2;
  let x = 0;
  const whiteKeys = [];

  whites.forEach((semitone, i) => {
    const k = document.createElement('div');
    k.className = 'mini-key white';
    k.style.cssText = `left:${x}px;top:0;`;
    k.style.animationDelay = `${i * 0.18}s`;
    container.appendChild(k);
    whiteKeys.push({ el: k, x: x + keyW / 2 });
    x += keyW + gap;
  });

  // Animate random keys
  setInterval(() => {
    const k = whiteKeys[Math.floor(Math.random() * whiteKeys.length)];
    k.el.style.background = 'rgba(124,92,252,0.6)';
    k.el.style.boxShadow = '0 0 15px rgba(124,92,252,0.8)';
    setTimeout(() => {
      k.el.style.background = '';
      k.el.style.boxShadow = '';
    }, 400);
  }, 350);
}

// ── Piano Keyboard ──────────────────────────────
const KEY_MAP = {
  'a': 'C', 'w': 'C#', 's': 'D', 'e': 'D#', 'd': 'E',
  'f': 'F', 't': 'F#', 'g': 'G', 'y': 'G#', 'h': 'A',
  'u': 'A#', 'j': 'B', 'k': 'C_hi'
};
const NOTE_ORDER = [
  { note: 'C', type: 'white', shortcut: 'A' },
  { note: 'C#', type: 'black', shortcut: 'W' },
  { note: 'D', type: 'white', shortcut: 'S' },
  { note: 'D#', type: 'black', shortcut: 'E' },
  { note: 'E', type: 'white', shortcut: 'D' },
  { note: 'F', type: 'white', shortcut: 'F' },
  { note: 'F#', type: 'black', shortcut: 'T' },
  { note: 'G', type: 'white', shortcut: 'G' },
  { note: 'G#', type: 'black', shortcut: 'Y' },
  { note: 'A', type: 'white', shortcut: 'H' },
  { note: 'A#', type: 'black', shortcut: 'U' },
  { note: 'B', type: 'white', shortcut: 'J' },
  { note: 'C_hi', type: 'white', shortcut: 'K' },
];
const BLACK_OFFSETS = { 'C#': 38, 'D#': 92, 'F#': 200, 'G#': 254, 'A#': 308 };

let pianoInitialized = false;
let practiceInitialized = false;

function buildKeyboard(containerId, onPress, onRelease) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  const inner = document.createElement('div');
  inner.className = 'piano-keys-inner';
  container.appendChild(inner);

  let whiteX = 0;
  const whiteW = 52, whiteGap = 2;

  NOTE_ORDER.forEach((n, i) => {
    const keyEl = document.createElement('div');
    const noteWithOct = n.note === 'C_hi' ? `C${currentOctave + 1}` : `${n.note}${currentOctave}`;
    keyEl.dataset.note = noteWithOct;
    keyEl.dataset.noteName = n.note;

    if (n.type === 'white') {
      keyEl.className = 'piano-key white';
      keyEl.style.left = `${whiteX}px`;
      if (showLabels) {
        const label = document.createElement('div');
        label.className = 'key-label';
        label.textContent = n.note === 'C_hi' ? 'C' : n.note;
        keyEl.appendChild(label);
        const sc = document.createElement('div');
        sc.className = 'key-shortcut';
        sc.textContent = n.shortcut;
        keyEl.appendChild(sc);
      }
      whiteX += whiteW + whiteGap;
    } else {
      keyEl.className = 'piano-key black';
      keyEl.style.left = `${BLACK_OFFSETS[n.note]}px`;
      if (showLabels) {
        const label = document.createElement('div');
        label.className = 'key-label';
        label.textContent = n.note;
        keyEl.appendChild(label);
        const sc = document.createElement('div');
        sc.className = 'key-shortcut';
        sc.textContent = n.shortcut;
        keyEl.appendChild(sc);
      }
    }

    keyEl.addEventListener('mousedown', e => { e.preventDefault(); onPress(noteWithOct, keyEl); });
    keyEl.addEventListener('mouseup', e => { e.preventDefault(); onRelease(noteWithOct, keyEl); });
    keyEl.addEventListener('mouseleave', e => { if (e.buttons) onRelease(noteWithOct, keyEl); });
    keyEl.addEventListener('touchstart', e => { e.preventDefault(); onPress(noteWithOct, keyEl); }, { passive: false });
    keyEl.addEventListener('touchend', e => { e.preventDefault(); onRelease(noteWithOct, keyEl); }, { passive: false });

    inner.appendChild(keyEl);
  });
}

function initPianoKeyboard() {
  if (pianoInitialized) return;
  pianoInitialized = true;

  buildKeyboard('pianoKeyboard',
    (note, el) => {
      playNote(note);
      el.classList.add('active');
      updateCurrentNote(note);
    },
    (note, el) => {
      if (!sustainEnabled) stopNote(note);
      el.classList.remove('active');
    }
  );

  // Keyboard events
  const pressedKeys = new Set();
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    const key = e.key.toLowerCase();
    if (pressedKeys.has(key)) return;
    pressedKeys.add(key);
    const noteName = KEY_MAP[key];
    if (!noteName) return;
    const noteWithOct = noteName === 'C_hi' ? `C${currentOctave + 1}` : `${noteName}${currentOctave}`;
    const keyEl = document.querySelector(`#pianoKeyboard [data-note="${noteWithOct}"]`);
    if (keyEl) {
      playNote(noteWithOct);
      keyEl.classList.add('active');
      updateCurrentNote(noteWithOct);
    }
  });
  document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    pressedKeys.delete(key);
    const noteName = KEY_MAP[key];
    if (!noteName) return;
    const noteWithOct = noteName === 'C_hi' ? `C${currentOctave + 1}` : `${noteName}${currentOctave}`;
    const keyEl = document.querySelector(`#pianoKeyboard [data-note="${noteWithOct}"]`);
    if (keyEl) {
      if (!sustainEnabled) stopNote(noteWithOct);
      keyEl.classList.remove('active');
    }
  });

  // Controls
  document.getElementById('octaveUp').addEventListener('click', () => {
    if (currentOctave < 7) { currentOctave++; document.getElementById('octaveDisplay').textContent = currentOctave; pianoInitialized = false; initPianoKeyboard(); }
  });
  document.getElementById('octaveDown').addEventListener('click', () => {
    if (currentOctave > 1) { currentOctave--; document.getElementById('octaveDisplay').textContent = currentOctave; pianoInitialized = false; initPianoKeyboard(); }
  });
  document.getElementById('volumeSlider').addEventListener('input', e => { masterVolume = parseFloat(e.target.value); });
  document.getElementById('sustainBtn').addEventListener('click', function () {
    sustainEnabled = !sustainEnabled;
    this.textContent = sustainEnabled ? 'ON' : 'OFF';
    this.classList.toggle('active', sustainEnabled);
  });
  document.getElementById('labelsBtn').addEventListener('click', function () {
    showLabels = !showLabels;
    this.textContent = showLabels ? 'ON' : 'OFF';
    this.classList.toggle('active', showLabels);
    pianoInitialized = false; initPianoKeyboard();
  });
}

const recentNotes = [];
function updateCurrentNote(note) {
  const display = document.getElementById('currentNote');
  const played = document.getElementById('notesPlayed');
  if (!display) return;
  display.textContent = note;
  recentNotes.unshift(note);
  if (recentNotes.length > 8) recentNotes.pop();
  played.innerHTML = recentNotes.map(n => `<span class="note-bubble">${n}</span>`).join('');
}

// Note guide click
document.querySelectorAll('.note-item').forEach(item => {
  item.addEventListener('click', () => {
    const note = item.dataset.note;
    playNote(note);
    item.style.transform = 'scale(0.95)';
    setTimeout(() => item.style.transform = '', 150);
  });
});

// ── Practice Mode ──────────────────────────────
const SONGS = {
  twinkle: {
    name: 'Twinkle Twinkle',
    notes: ['C4','C4','G4','G4','A4','A4','G4','F4','F4','E4','E4','D4','D4','C4']
  },
  ode: {
    name: 'Ode to Joy',
    notes: ['E4','E4','F4','G4','G4','F4','E4','D4','C4','C4','D4','E4','E4','D4','D4']
  },
  mary: {
    name: 'Mary Had a Little Lamb',
    notes: ['E4','D4','C4','D4','E4','E4','E4','D4','D4','D4','E4','G4','G4']
  },
  scale: {
    name: 'C Major Scale',
    notes: ['C4','D4','E4','F4','G4','A4','B4','C5','B4','A4','G4','F4','E4','D4','C4']
  }
};

let practiceState = {
  active: false,
  currentIndex: 0,
  score: 0,
  hits: 0,
  misses: 0,
  streak: 0,
  bestStreak: 0,
  startTime: null,
  timerInterval: null,
  song: null
};

function initPracticeKeyboard() {
  if (practiceInitialized) return;
  practiceInitialized = true;

  buildKeyboard('practiceKeyboard',
    (note, el) => {
      playNote(note);
      el.classList.add('active');
      if (practiceState.active) checkPracticeNote(note);
    },
    (note, el) => {
      stopNote(note);
      el.classList.remove('active');
    }
  );

  document.getElementById('startPractice').addEventListener('click', startPractice);
  document.getElementById('stopPractice').addEventListener('click', stopPractice);

  const kbPressedKeys = new Set();
  document.addEventListener('keydown', e => {
    if (!document.getElementById('page-practice').classList.contains('active')) return;
    if (e.target.tagName === 'INPUT') return;
    const key = e.key.toLowerCase();
    if (kbPressedKeys.has(key)) return;
    kbPressedKeys.add(key);
    const noteName = KEY_MAP[key];
    if (!noteName) return;
    const noteWithOct = noteName === 'C_hi' ? `C${currentOctave + 1}` : `${noteName}${currentOctave}`;
    const keyEl = document.querySelector(`#practiceKeyboard [data-note="${noteWithOct}"]`);
    if (keyEl) { playNote(noteWithOct); keyEl.classList.add('active'); }
    if (practiceState.active) checkPracticeNote(noteWithOct);
  });
  document.addEventListener('keyup', e => {
    const key = e.key.toLowerCase();
    kbPressedKeys.delete(key);
    const noteName = KEY_MAP[key];
    if (!noteName) return;
    const noteWithOct = noteName === 'C_hi' ? `C${currentOctave + 1}` : `${noteName}${currentOctave}`;
    const keyEl = document.querySelector(`#practiceKeyboard [data-note="${noteWithOct}"]`);
    if (keyEl) { stopNote(noteWithOct); keyEl.classList.remove('active'); }
  });
}

function startPractice() {
  const songKey = document.getElementById('songSelect').value;
  practiceState = {
    active: true, currentIndex: 0, score: 0, hits: 0, misses: 0,
    streak: 0, bestStreak: 0, startTime: Date.now(), timerInterval: null,
    song: SONGS[songKey]
  };
  clearInterval(practiceState.timerInterval);
  practiceState.timerInterval = setInterval(updatePracticeTimer, 1000);
  renderPracticeNotes();
  highlightPracticeNote();
  updatePracticeStats();
  document.getElementById('practiceFeedback').textContent = '🎵 Play the highlighted note!';
}

function stopPractice() {
  practiceState.active = false;
  clearInterval(practiceState.timerInterval);
  const total = practiceState.hits + practiceState.misses;
  if (total > 0) {
    const acc = Math.round((practiceState.hits / total) * 100);
    document.getElementById('practiceFeedback').innerHTML = `
      <span style="color:var(--accent)">Session complete! Score: ${practiceState.score} | Accuracy: ${acc}% | Best Streak: ${practiceState.bestStreak}</span>
    `;
    saveHighScore(practiceState.song.name, practiceState.score, acc);
  }
  document.querySelectorAll('#practiceKeyboard .piano-key').forEach(k => {
    k.style.background = '';
    k.style.boxShadow = '';
  });
}

function renderPracticeNotes() {
  const scroll = document.getElementById('notesScroll');
  scroll.innerHTML = '';
  if (!practiceState.song) return;
  practiceState.song.notes.forEach((note, i) => {
    const block = document.createElement('div');
    block.className = 'note-block pending';
    block.id = `pn-${i}`;
    block.textContent = note.replace(/\d/, '');
    scroll.appendChild(block);
  });
}

function highlightPracticeNote() {
  document.querySelectorAll('.note-block').forEach(b => b.classList.remove('active-note'));
  const idx = practiceState.currentIndex;
  const block = document.getElementById(`pn-${idx}`);
  if (block) {
    block.classList.add('active-note');
    block.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }
  // Highlight key
  document.querySelectorAll('#practiceKeyboard .piano-key').forEach(k => {
    k.style.background = '';
    k.style.boxShadow = '';
  });
  if (!practiceState.song) return;
  const targetNote = practiceState.song.notes[idx];
  const keyEl = document.querySelector(`#practiceKeyboard [data-note="${targetNote}"]`);
  if (keyEl) {
    keyEl.style.background = 'linear-gradient(180deg, rgba(124,92,252,0.7), rgba(91,140,254,0.7))';
    keyEl.style.boxShadow = '0 0 20px rgba(124,92,252,0.8)';
  }
}

function checkPracticeNote(playedNote) {
  if (!practiceState.active || !practiceState.song) return;
  const targetNote = practiceState.song.notes[practiceState.currentIndex];
  const block = document.getElementById(`pn-${practiceState.currentIndex}`);

  if (playedNote === targetNote) {
    // Hit!
    practiceState.hits++;
    practiceState.streak++;
    if (practiceState.streak > practiceState.bestStreak) practiceState.bestStreak = practiceState.streak;
    practiceState.score += 10 + (practiceState.streak > 3 ? practiceState.streak * 2 : 0);
    if (block) { block.classList.remove('active-note', 'pending'); block.classList.add('hit'); }
    showFeedback('✅ Perfect!', 'var(--green)');
    practiceState.currentIndex++;
    if (practiceState.currentIndex >= practiceState.song.notes.length) {
      // Song complete
      setTimeout(() => {
        showFeedback('🎉 Song Complete! Amazing!', 'var(--accent)');
        practiceState.active = false;
        clearInterval(practiceState.timerInterval);
        const acc = Math.round((practiceState.hits / (practiceState.hits + practiceState.misses)) * 100);
        saveHighScore(practiceState.song.name, practiceState.score, acc);
      }, 300);
    } else {
      setTimeout(highlightPracticeNote, 100);
    }
  } else {
    // Miss
    practiceState.misses++;
    practiceState.streak = 0;
    practiceState.score = Math.max(0, practiceState.score - 3);
    if (block) { block.classList.add('miss'); setTimeout(() => block.classList.remove('miss'), 500); }
    showFeedback('❌ Wrong note — try again', 'var(--red)');
  }
  updatePracticeStats();
}

function showFeedback(msg, color) {
  const fb = document.getElementById('practiceFeedback');
  fb.style.color = color;
  fb.textContent = msg;
  fb.style.transform = 'scale(1.1)';
  setTimeout(() => fb.style.transform = '', 200);
}

function updatePracticeStats() {
  document.getElementById('practiceScore').textContent = practiceState.score;
  document.getElementById('practiceStreak').textContent = practiceState.streak;
  const total = practiceState.hits + practiceState.misses;
  document.getElementById('practiceAccuracy').textContent = total > 0 ? Math.round(practiceState.hits / total * 100) + '%' : '–%';
}

function updatePracticeTimer() {
  const elapsed = Math.floor((Date.now() - practiceState.startTime) / 1000);
  const m = Math.floor(elapsed / 60);
  const s = elapsed % 60;
  document.getElementById('practiceTimer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
}

// ── High Scores ──────────────────────────────
function saveHighScore(song, score, accuracy) {
  const scores = JSON.parse(localStorage.getItem('pianoScores') || '[]');
  scores.push({ song, score, accuracy, date: new Date().toLocaleDateString() });
  scores.sort((a, b) => b.score - a.score);
  scores.splice(5); // top 5
  localStorage.setItem('pianoScores', JSON.stringify(scores));
  renderHighScores();
}

function renderHighScores() {
  const container = document.getElementById('highScores');
  if (!container) return;
  const scores = JSON.parse(localStorage.getItem('pianoScores') || '[]');
  if (scores.length === 0) {
    container.innerHTML = '<p style="color:var(--text3);font-size:0.82rem">No scores yet. Start practicing!</p>';
    return;
  }
  container.innerHTML = scores.map((s, i) => `
    <div class="score-row">
      <span>${['🥇','🥈','🥉','4️⃣','5️⃣'][i]} ${s.song.substring(0,15)}</span>
      <span class="score-val">${s.score}pts <small style="color:var(--text3)">${s.accuracy}%</small></span>
    </div>
  `).join('');
}

// ── Courses ──────────────────────────────
const COURSES = {
  beginner: [
    { id: 'b1', title: 'Introduction to the Piano', desc: 'Keys, layout, and basic hand position', icon: '🎹', duration: '8 min', locked: false },
    { id: 'b2', title: 'Your First Notes: C D E', desc: 'Playing single notes with the right hand', icon: '🎵', duration: '10 min', locked: false },
    { id: 'b3', title: 'C Major Chord', desc: 'Learn your first three-note chord', icon: '🎶', duration: '12 min', locked: false },
    { id: 'b4', title: 'Basic Rhythms', desc: 'Quarter notes, half notes, and whole notes', icon: '🥁', duration: '10 min', locked: true },
    { id: 'b5', title: 'Simple Melodies', desc: 'Play Twinkle Twinkle and Mary Had a Lamb', icon: '🌟', duration: '15 min', locked: true },
    { id: 'b6', title: 'Left Hand Basics', desc: 'Introduction to left hand accompaniment', icon: '✋', duration: '14 min', locked: true },
  ],
  intermediate: [
    { id: 'i1', title: 'Reading Sheet Music', desc: 'Treble clef, notes, and time signatures', icon: '📜', duration: '18 min', locked: true },
    { id: 'i2', title: 'Both Hands Together', desc: 'Coordinate left and right hand', icon: '🤝', duration: '20 min', locked: true },
    { id: 'i3', title: 'Major Scales', desc: 'All 12 major scales with fingering', icon: '📈', duration: '22 min', locked: true },
    { id: 'i4', title: 'Minor Chords', desc: 'Add depth with minor harmony', icon: '🎼', duration: '16 min', locked: true },
    { id: 'i5', title: 'Dynamics & Expression', desc: 'Piano, forte, crescendo, decrescendo', icon: '📊', duration: '14 min', locked: true },
    { id: 'i6', title: 'Sight Reading Basics', desc: 'Read and play music at first sight', icon: '👁️', duration: '25 min', locked: true },
  ],
  advanced: [
    { id: 'a1', title: 'Advanced Chord Voicings', desc: 'Extensions, inversions, and alterations', icon: '🎸', duration: '30 min', locked: true },
    { id: 'a2', title: 'Arpeggios & Runs', desc: 'Build speed and fluidity', icon: '⚡', duration: '28 min', locked: true },
    { id: 'a3', title: 'Jazz Harmony', desc: 'ii-V-I progressions and jazz chords', icon: '🎺', duration: '32 min', locked: true },
    { id: 'a4', title: 'Classical Technique', desc: 'Scales, hanon exercises, etudes', icon: '🏛️', duration: '40 min', locked: true },
    { id: 'a5', title: 'Improvisation', desc: 'Create music in real time', icon: '🎭', duration: '35 min', locked: true },
    { id: 'a6', title: 'Performance Masterclass', desc: 'Stage technique and interpretation', icon: '🏆', duration: '45 min', locked: true },
  ]
};

function getProgress() {
  return JSON.parse(localStorage.getItem('pianoProgress') || '{}');
}

function toggleLesson(lessonId) {
  const progress = getProgress();
  if (progress[lessonId]) {
    delete progress[lessonId];
  } else {
    progress[lessonId] = true;
  }
  localStorage.setItem('pianoProgress', JSON.stringify(progress));
  renderCourses();
}

function resetProgress() {
  localStorage.removeItem('pianoProgress');
  renderCourses();
}

function renderCourses() {
  const progress = getProgress();
  const allLessons = [...COURSES.beginner, ...COURSES.intermediate, ...COURSES.advanced];
  const completedCount = allLessons.filter(l => progress[l.id]).length;
  const pct = Math.round((completedCount / allLessons.length) * 100);

  const fill = document.getElementById('overallProgress');
  const text = document.getElementById('progressText');
  if (fill) fill.style.width = pct + '%';
  if (text) text.textContent = `${completedCount} / ${allLessons.length} lessons completed`;

  ['beginner', 'intermediate', 'advanced'].forEach(track => {
    const lessons = COURSES[track];
    const container = document.getElementById(`${track}Lessons`);
    const mini = document.getElementById(`${track}Progress`);
    if (!container) return;
    const done = lessons.filter(l => progress[l.id]).length;
    if (mini) mini.textContent = `${done}/${lessons.length}`;

    container.innerHTML = lessons.map((lesson, i) => {
      const isDone = !!progress[lesson.id];
      const isLocked = lesson.locked && i > 0 && !progress[lessons[i - 1]?.id];
      const pctDone = isDone ? 100 : 0;
      return `
        <div class="lesson-row ${isDone ? 'completed' : ''} ${isLocked ? 'locked' : ''}"
             onclick="${isLocked ? 'showLockedMsg()' : `toggleLesson('${lesson.id}')`}">
          <div class="lesson-row-icon">${lesson.icon}</div>
          <div class="lesson-row-info">
            <h4>${lesson.title}</h4>
            <p>${lesson.desc}</p>
          </div>
          <div class="lesson-row-meta">
            <span class="lesson-duration">⏱ ${lesson.duration}</span>
            <div class="lesson-status ${isDone ? 'status-done' : isLocked ? 'status-lock' : 'status-free'}">
              ${isDone ? '✓' : isLocked ? '🔒' : '▶'}
            </div>
          </div>
          <div class="lesson-progress-bar" style="width:${pctDone}%"></div>
        </div>
      `;
    }).join('');
  });
}

function showLockedMsg() {
  alert('🔒 Complete the previous lesson to unlock this one!');
}

// ── Videos ──────────────────────────────
const VIDEO_PLAYLIST = [
  { id: 'jTzMl79IMNU', title: 'Piano for Beginners – Lesson 1', level: 'Beginner', duration: '15:32', icon: '🎹' },
  { id: 'LzNbqCGR_nY', title: 'Learn C Major Scale', level: 'Beginner', duration: '8:12', icon: '🎵' },
  { id: 'VoqNVmw5pME', title: 'Reading Sheet Music Basics', level: 'Beginner', duration: '12:45', icon: '📜' },
  { id: 'f9JKfHHv5P4', title: 'How to Play Chords', level: 'Beginner', duration: '10:20', icon: '🎶' },
  { id: 'PBHhn-QEWKU', title: 'Both Hands Practice Technique', level: 'Intermediate', duration: '18:30', icon: '🤝' },
  { id: 'l4zkc7KEvYM', title: 'Music Theory for Pianists', level: 'Intermediate', duration: '22:15', icon: '📚' },
];

const MORE_VIDEOS = [
  { icon: '🎹', title: '10 Easy Songs for Beginners', level: 'Beginner', views: '2.1M views' },
  { icon: '🎸', title: 'Jazz Piano Foundations', level: 'Intermediate', views: '890K views' },
  { icon: '🎼', title: 'Classical Piano Masterclass', level: 'Advanced', views: '1.4M views' },
  { icon: '🎵', title: 'Piano Chord Progressions', level: 'Intermediate', views: '1.8M views' },
  { icon: '🎶', title: 'Speed & Technique Training', level: 'Advanced', views: '654K views' },
  { icon: '🌟', title: 'Sight Reading Workshop', level: 'Intermediate', views: '445K views' },
];

let videosRendered = false;
function renderVideos() {
  if (videosRendered) return;
  videosRendered = true;

  const playlist = document.getElementById('playlist');
  if (playlist) {
    playlist.innerHTML = VIDEO_PLAYLIST.map((v, i) => `
      <div class="playlist-item ${i === 0 ? 'active' : ''}" onclick="selectVideo('${v.id}', '${v.title}', '${v.level}', this)">
        <div class="playlist-thumb">${v.icon}</div>
        <div class="playlist-info">
          <h4>${v.title}</h4>
          <span>⏱ ${v.duration} · ${v.level}</span>
        </div>
      </div>
    `).join('');
  }

  const grid = document.getElementById('videosGrid');
  if (grid) {
    grid.innerHTML = MORE_VIDEOS.map(v => `
      <div class="video-card">
        <div class="video-card-thumb">${v.icon}</div>
        <div class="video-card-info">
          <h4>${v.title}</h4>
          <span>${v.level} · ${v.views}</span>
        </div>
      </div>
    `).join('');
  }
}

function selectVideo(videoId, title, level, el) {
  document.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('mainVideo').src = `https://www.youtube.com/embed/${videoId}?rel=0&autoplay=1`;
  document.getElementById('videoInfo').querySelector('h2').textContent = title;
}

// ── Blog ──────────────────────────────
const BLOG_POSTS = [
  { icon: '🎹', category: 'Technique', title: '10 Essential Piano Techniques Every Beginner Should Know', excerpt: 'From proper hand position to finger independence exercises, these fundamentals will accelerate your learning journey significantly.', author: 'Sarah Mitchell', date: 'Dec 15, 2024', readTime: '7 min read' },
  { icon: '🎵', category: 'Music Theory', title: 'Understanding Chord Progressions: The Complete Guide', excerpt: 'Discover how simple chord progressions power thousands of popular songs and how you can use them to write your own music.', author: 'James Chen', date: 'Dec 12, 2024', readTime: '10 min read' },
  { icon: '🧠', category: 'Practice Tips', title: 'The Science of Effective Piano Practice: What Research Says', excerpt: 'Studies show that deliberate, focused practice beats long mindless sessions. Here\'s how to structure your daily piano routine.', author: 'Dr. Priya Nair', date: 'Dec 10, 2024', readTime: '8 min read' },
  { icon: '🎼', category: 'Sheet Music', title: '20 Free Sheet Music Websites for Pianists in 2024', excerpt: 'A curated list of the best free sheet music resources online, from classical masterworks to modern pop arrangements.', author: 'Marcus Lee', date: 'Dec 8, 2024', readTime: '5 min read' },
  { icon: '🎶', category: 'Songs', title: 'Top 15 Beautiful Piano Songs Perfect for Beginners', excerpt: 'These popular songs are arranged for beginner pianists — impressive enough to impress friends but achievable for new learners.', author: 'Emma Wilson', date: 'Dec 5, 2024', readTime: '6 min read' },
  { icon: '📖', category: 'History', title: 'The History of the Piano: From Harpsichord to Concert Grand', excerpt: 'Trace the fascinating 300-year evolution of the piano, from Cristofori\'s invention to the modern concert grand.', author: 'Prof. David Park', date: 'Dec 3, 2024', readTime: '12 min read' },
];

let blogRendered = false;
function renderBlog() {
  if (blogRendered) return;
  blogRendered = true;

  const grid = document.getElementById('blogGrid');
  if (!grid) return;
  grid.innerHTML = BLOG_POSTS.map(post => `
    <article class="blog-card">
      <div class="blog-thumb">${post.icon}</div>
      <div class="blog-body">
        <div class="blog-category">${post.category}</div>
        <h3>${post.title}</h3>
        <p>${post.excerpt}</p>
        <div class="blog-meta">
          <span>✍️ ${post.author}</span>
          <span>📅 ${post.readTime}</span>
        </div>
      </div>
    </article>
  `).join('');
}

// ── Testimonials Slider ──────────────────────────────
function initTestimonials() {
  const track = document.getElementById('testimonialsTrack');
  const dotsContainer = document.getElementById('testimonialDots');
  if (!track || !dotsContainer) return;

  // Wrap card content
  track.querySelectorAll('.testimonial-card').forEach(card => {
    const inner = document.createElement('div');
    inner.className = 'card-inner';
    while (card.firstChild) inner.appendChild(card.firstChild);
    card.appendChild(inner);
  });

  const cards = track.querySelectorAll('.testimonial-card');
  let current = 0;

  cards.forEach((_, i) => {
    const dot = document.createElement('div');
    dot.className = `dot ${i === 0 ? 'active' : ''}`;
    dot.addEventListener('click', () => goTo(i));
    dotsContainer.appendChild(dot);
  });

  function goTo(idx) {
    current = idx;
    track.style.transform = `translateX(-${idx * 100}%)`;
    dotsContainer.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === idx));
  }

  // Auto-advance
  setInterval(() => goTo((current + 1) % cards.length), 5000);
}

// ── Ripple Effect ──────────────────────────────
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn-primary, .btn-ghost');
  if (!btn) return;
  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX-rect.left-size/2}px;top:${e.clientY-rect.top-size/2}px`;
  btn.style.position = 'relative';
  btn.style.overflow = 'hidden';
  btn.appendChild(ripple);
  setTimeout(() => ripple.remove(), 600);
});

// ── Init on DOM Ready ──────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderHighScores();
});

console.log('%c🎹 PianoVerse Loaded!', 'color:#7c5cfc;font-size:1.2rem;font-weight:bold');
