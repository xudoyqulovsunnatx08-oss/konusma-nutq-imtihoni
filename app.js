/* =========================================================================
   KONUŞMA — Türkçe nutq imtihoni platformasi
   ---------------------------------------------------------------------
   BU YERDA VAQTLARNI SOZLASH MUMKIN.
   PDF namunada 1.2-qism uchun faqat "45 soniya tayyorgarlik" berilgan,
   gapirish vaqti aniq ko'rsatilmagan edi — shuning uchun quyida 2 daqiqa
   (2-bo'lim va 3-bo'lim bilan bir xil) qilib qo'yilgan. Xohlasangiz shu
   raqamni o'zgartiring, boshqa hech narsani tuzatish shart emas.
   ========================================================================= */
const CONFIG = {
  bolim1_qism1: { prepSec: 5,  speakSec: 30  },   // har bir savol ALOHIDA ko'rsatiladi
  bolim1_qism2: { prepSec: 45, speakSec: 120 },   // 3 savol BIRGA ko'rinadi
  bolim2:       { prepSec: 60, speakSec: 120 },
  bolim3:       { prepSec: 60, speakSec: 120 },
};

const RING_CIRCUMFERENCE = 2 * Math.PI * 98; // matches r=98 in the SVG
const FIELD_NAMES = ['q111','q112','q113','q121','q122','q123','q21','q22','q23','topic3','pro3','con3'];
const IMAGE_NAMES = ['img12a','img12b','img2'];

/* ---------------------------------------------------------------------
   State
   --------------------------------------------------------------------- */
const state = {
  images: {},          // { img12a, img12b, img2 } -> dataURL
  steps: [],
  studentName: '',
  mediaStream: null,
  mediaRecorder: null,
  currentChunks: [],
  recordings: [],       // { id, label, blob }
  countdownTimer: null,
  active: null,          // { stepIndex, phase, step }
  remaining: 0,
  total: 0,
  paused: false,
  examInProgress: false,
  audioCtx: null,
  analyser: null,
  meterActive: false,
  meterRAF: null,
};

/* ---------------------------------------------------------------------
   Elements
   --------------------------------------------------------------------- */
const el = {
  wallClock: document.getElementById('wallClock'),

  browserWarning: document.getElementById('browserWarning'),

  setupView: document.getElementById('setupView'),
  examView: document.getElementById('examView'),
  resultsView: document.getElementById('resultsView'),

  setupForm: document.getElementById('setupForm'),
  clearFormBtn: document.getElementById('clearFormBtn'),
  saveTemplateBtn: document.getElementById('saveTemplateBtn'),
  loadTemplateBtn: document.getElementById('loadTemplateBtn'),
  loadTemplateInput: document.getElementById('loadTemplateInput'),
  saveExamBtn: document.getElementById('saveExamBtn'),
  savedExamsSelect: document.getElementById('savedExamsSelect'),
  startSavedExamBtn: document.getElementById('startSavedExamBtn'),
  deleteSavedExamBtn: document.getElementById('deleteSavedExamBtn'),

  examSectionLabel: document.getElementById('examSectionLabel'),
  examQuestionIndex: document.getElementById('examQuestionIndex'),
  examStage: document.getElementById('examStage'),
  examImageWrap: document.getElementById('examImageWrap'),
  examQuestions: document.getElementById('examQuestions'),
  examPrecheck: document.getElementById('examPrecheck'),
  studentNameInput: document.getElementById('studentNameInput'),
  precheckError: document.getElementById('precheckError'),
  beginExamBtn: document.getElementById('beginExamBtn'),
  pauseBtn: document.getElementById('pauseBtn'),
  cancelExamBtn: document.getElementById('cancelExamBtn'),

  ringProgress: document.getElementById('ringProgress'),
  timerPhase: document.getElementById('timerPhase'),
  timerSeconds: document.getElementById('timerSeconds'),
  recDot: document.getElementById('recDot'),
  levelMeter: document.getElementById('levelMeter'),
  levelFill: document.getElementById('levelFill'),

  resultsStudentLine: document.getElementById('resultsStudentLine'),
  recordingsList: document.getElementById('recordingsList'),
  downloadAllBtn: document.getElementById('downloadAllBtn'),
  newExamBtn: document.getElementById('newExamBtn'),
};

/* ---------------------------------------------------------------------
   Browser compatibility check
   --------------------------------------------------------------------- */
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || typeof MediaRecorder === 'undefined') {
  el.browserWarning.classList.remove('hidden');
}

/* ---------------------------------------------------------------------
   Sahifani tasodifan yopib/yangilab qo'yishdan himoya
   --------------------------------------------------------------------- */
window.addEventListener('beforeunload', (e) => {
  if (state.examInProgress) {
    e.preventDefault();
    e.returnValue = '';
  }
});

/* ---------------------------------------------------------------------
   Wall clock — vaqtni doimiy ko'rsatib turadi
   --------------------------------------------------------------------- */
function tickWallClock() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  el.wallClock.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
tickWallClock();
setInterval(tickWallClock, 1000);

/* ---------------------------------------------------------------------
   Image upload preview handling
   --------------------------------------------------------------------- */
function setImagePreview(name, dataUrl) {
  state.images[name] = dataUrl;
  const previewHost = el.setupForm.querySelector(`[data-preview-for="${name}"]`);
  if (previewHost) previewHost.innerHTML = dataUrl ? `<img src="${dataUrl}" alt="Yuklangan rasm">` : '';
}

function wireImageInput(inputName) {
  const input = el.setupForm.querySelector(`input[name="${inputName}"]`);
  if (!input) return;
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) {
      delete state.images[inputName];
      setImagePreview(inputName, '');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImagePreview(inputName, reader.result);
    reader.readAsDataURL(file);
  });
}
IMAGE_NAMES.forEach(wireImageInput);

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function linesToList(text) {
  return (text || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function sanitizeFileName(str) {
  const cleaned = (str || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '');
  return cleaned || 'talaba';
}

/* ---------------------------------------------------------------------
   Namunani saqlash / yuklash (JSON)
   --------------------------------------------------------------------- */
function applyTemplateData(data) {
  FIELD_NAMES.forEach((n) => {
    const input = el.setupForm.querySelector(`[name="${n}"]`);
    if (input && data.fields && typeof data.fields[n] === 'string') input.value = data.fields[n];
  });
  IMAGE_NAMES.forEach((n) => {
    if (data.images && data.images[n]) setImagePreview(n, data.images[n]);
  });
}

function collectTemplateData() {
  const formData = new FormData(el.setupForm);
  const data = { fields: {}, images: {} };
  FIELD_NAMES.forEach((n) => (data.fields[n] = formData.get(n) || ''));
  IMAGE_NAMES.forEach((n) => {
    if (state.images[n]) data.images[n] = state.images[n];
  });
  return data;
}

el.saveTemplateBtn.addEventListener('click', () => {
  const data = collectTemplateData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'imtihon-shabloni.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

el.loadTemplateBtn.addEventListener('click', () => el.loadTemplateInput.click());

el.loadTemplateInput.addEventListener('change', () => {
  const file = el.loadTemplateInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyTemplateData(JSON.parse(reader.result));
    } catch (err) {
      alert("Fayl noto'g'ri formatda. Iltimos, shu platformada saqlangan JSON faylni tanlang.");
    }
  };
  reader.readAsText(file);
  el.loadTemplateInput.value = '';
});

/* ---------------------------------------------------------------------
   Saqlangan imtihonlar — brauzerning localStorage'ida, istalgan payt
   qayta ishlatish uchun (fayl tanlash shart emas)
   --------------------------------------------------------------------- */
const SAVED_EXAMS_KEY = 'konusma_saved_exams';

function loadSavedExamsMap() {
  try {
    return JSON.parse(localStorage.getItem(SAVED_EXAMS_KEY)) || {};
  } catch (err) {
    return {};
  }
}

function persistSavedExamsMap(map) {
  try {
    localStorage.setItem(SAVED_EXAMS_KEY, JSON.stringify(map));
    return true;
  } catch (err) {
    alert("Saqlab bo'lmadi — brauzer xotirasi to'lgan bo'lishi mumkin. Rasmlar hajmini kichraytiring yoki JSON fayl sifatida saqlang.");
    return false;
  }
}

function refreshSavedExamsSelect(selectName) {
  const map = loadSavedExamsMap();
  const names = Object.keys(map).sort((a, b) => a.localeCompare(b, 'uz'));
  el.savedExamsSelect.innerHTML = '<option value="">— Saqlangan imtihonlar —</option>';
  names.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    el.savedExamsSelect.appendChild(opt);
  });
  if (selectName && names.includes(selectName)) {
    el.savedExamsSelect.value = selectName;
  }
}
refreshSavedExamsSelect();

el.saveExamBtn.addEventListener('click', () => {
  const name = window.prompt("Imtihonni qanday nom bilan saqlaymiz? (masalan: 8-sinf, 1-variant)", '');
  if (name === null) return;
  const trimmed = name.trim();
  if (!trimmed) {
    alert("Nom kiritilmadi — imtihon saqlanmadi.");
    return;
  }
  const map = loadSavedExamsMap();
  map[trimmed] = collectTemplateData();
  if (persistSavedExamsMap(map)) {
    refreshSavedExamsSelect(trimmed);
    const original = el.saveExamBtn.textContent;
    el.saveExamBtn.textContent = '✓ Saqlandi';
    setTimeout(() => {
      el.saveExamBtn.textContent = original;
    }, 1500);
  }
});

el.savedExamsSelect.addEventListener('change', () => {
  const name = el.savedExamsSelect.value;
  if (!name) return;
  const map = loadSavedExamsMap();
  if (map[name]) applyTemplateData(map[name]);
});

el.startSavedExamBtn.addEventListener('click', () => {
  const name = el.savedExamsSelect.value;
  if (!name) {
    alert("Avval ro'yxatdan bir imtihonni tanlang.");
    return;
  }
  const map = loadSavedExamsMap();
  if (!map[name]) return;
  applyTemplateData(map[name]);
  enterExamView();
});

el.deleteSavedExamBtn.addEventListener('click', () => {
  const name = el.savedExamsSelect.value;
  if (!name) return;
  const sure = confirm(`"${name}" nomli saqlangan imtihonni o'chirasizmi?`);
  if (!sure) return;
  const map = loadSavedExamsMap();
  delete map[name];
  persistSavedExamsMap(map);
  refreshSavedExamsSelect();
});

/* ---------------------------------------------------------------------
   Building the step sequence from the form
   --------------------------------------------------------------------- */
function buildSteps(formData) {
  const steps = [];

  // 1-bo'lim / 1-qism — bitta-bitta ko'rsatiladigan 3 savol
  ['q111', 'q112', 'q113'].forEach((name, i) => {
    steps.push({
      id: `1-bolim_1-qism_savol${i + 1}`,
      sectionLabel: "1-bo'lim · 1-qism",
      questionIndexLabel: `${i + 1}-savol / 3`,
      questions: [formData.get(name)],
      images: [],
      prepSec: CONFIG.bolim1_qism1.prepSec,
      speakSec: CONFIG.bolim1_qism1.speakSec,
    });
  });

  // 1-bo'lim / 2-qism — ikkita rasm + 3 savol birga
  steps.push({
    id: '1-bolim_2-qism',
    sectionLabel: "1-bo'lim · 2-qism",
    questionIndexLabel: '3 savol birga',
    questions: [formData.get('q121'), formData.get('q122'), formData.get('q123')],
    images: [state.images.img12a, state.images.img12b].filter(Boolean),
    prepSec: CONFIG.bolim1_qism2.prepSec,
    speakSec: CONFIG.bolim1_qism2.speakSec,
  });

  // 2-bo'lim — rasm + 3 savol birga
  steps.push({
    id: '2-bolim',
    sectionLabel: "2-bo'lim",
    questionIndexLabel: '3 savol birga',
    questions: [formData.get('q21'), formData.get('q22'), formData.get('q23')],
    images: [state.images.img2].filter(Boolean),
    prepSec: CONFIG.bolim2.prepSec,
    speakSec: CONFIG.bolim2.speakSec,
  });

  // 3-bo'lim — mavzu (+ ixtiyoriy lehiga/aleyhiga)
  steps.push({
    id: '3-bolim',
    sectionLabel: "3-bo'lim",
    questionIndexLabel: 'Mavzu bo\u2019yicha bahs',
    questions: [formData.get('topic3')],
    images: [],
    extra: {
      pro: linesToList(formData.get('pro3')),
      con: linesToList(formData.get('con3')),
    },
    prepSec: CONFIG.bolim3.prepSec,
    speakSec: CONFIG.bolim3.speakSec,
  });

  return steps;
}

/* ---------------------------------------------------------------------
   Setup form submit / clear
   --------------------------------------------------------------------- */
function enterExamView() {
  const formData = new FormData(el.setupForm);
  state.steps = buildSteps(formData);
  state.recordings = [];
  state.studentName = '';
  state.paused = false;

  el.setupView.classList.add('hidden');
  el.resultsView.classList.add('hidden');
  el.examView.classList.remove('hidden');
  el.examPrecheck.classList.remove('hidden');
  el.examStage.classList.add('hidden');
  el.studentNameInput.value = '';
  el.precheckError.classList.add('hidden');
  el.pauseBtn.textContent = '⏸ Pauza';
  el.pauseBtn.classList.remove('is-paused');
}

el.setupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  enterExamView();
});

el.clearFormBtn.addEventListener('click', () => {
  el.setupForm.reset();
  state.images = {};
  el.setupForm.querySelectorAll('.image-preview').forEach((n) => (n.innerHTML = ''));
});

/* ---------------------------------------------------------------------
   Audio level meter
   --------------------------------------------------------------------- */
function setupMeter(stream) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioCtx();
    const source = state.audioCtx.createMediaStreamSource(stream);
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 256;
    source.connect(state.analyser);
  } catch (err) {
    state.analyser = null;
  }
}

function meterTick() {
  if (!state.analyser || !state.meterActive) return;
  const data = new Uint8Array(state.analyser.frequencyBinCount);
  state.analyser.getByteFrequencyData(data);
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const pct = Math.min(100, Math.round((avg / 120) * 100));
  el.levelFill.style.width = `${pct}%`;
  state.meterRAF = requestAnimationFrame(meterTick);
}

function startMeter() {
  if (!state.analyser) return;
  el.levelMeter.classList.remove('hidden');
  state.meterActive = true;
  meterTick();
}

function stopMeter() {
  state.meterActive = false;
  if (state.meterRAF) cancelAnimationFrame(state.meterRAF);
  el.levelFill.style.width = '0%';
  el.levelMeter.classList.add('hidden');
}

/* ---------------------------------------------------------------------
   Exam runner
   --------------------------------------------------------------------- */
el.beginExamBtn.addEventListener('click', async () => {
  const name = el.studentNameInput.value.trim();
  if (!name) {
    el.precheckError.textContent = "Iltimos, avval ism va familyangizni kiriting.";
    el.precheckError.classList.remove('hidden');
    el.studentNameInput.focus();
    return;
  }
  el.precheckError.classList.add('hidden');
  state.studentName = name;

  try {
    state.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    el.precheckError.textContent =
      "Mikrofonga ruxsat berilmadi. Brauzer sozlamalaridan mikrofonga ruxsat bering va qaytadan urinib ko'ring. " +
      "Agar sahifani to'g'ridan-to'g'ri fayl sifatida ochgan bo'lsangiz (file://), uni lokal server orqali oching.";
    el.precheckError.classList.remove('hidden');
    return;
  }

  setupMeter(state.mediaStream);
  state.examInProgress = true;
  el.examPrecheck.classList.add('hidden');
  el.examStage.classList.remove('hidden');
  beginPhase(0, 'prep');
});

function renderStepContent(step) {
  el.examSectionLabel.textContent = step.sectionLabel;
  el.examQuestionIndex.textContent = step.questionIndexLabel || '';

  el.examImageWrap.innerHTML = '';
  if (step.images && step.images.length) {
    el.examImageWrap.classList.remove('hidden');
    el.examImageWrap.classList.toggle('two-up', step.images.length > 1);
    step.images.forEach((src, i) => {
      const img = document.createElement('img');
      img.src = src;
      img.alt = `Savol uchun rasm ${i + 1}`;
      el.examImageWrap.appendChild(img);
    });
  } else {
    el.examImageWrap.classList.add('hidden');
  }

  el.examQuestions.innerHTML = '';
  if (step.questions.length === 1) {
    const p = document.createElement('p');
    p.className = 'q-line';
    p.textContent = step.questions[0];
    el.examQuestions.appendChild(p);
  } else {
    step.questions.forEach((q, i) => {
      const p = document.createElement('p');
      p.className = 'q-line';
      const num = document.createElement('span');
      num.className = 'q-num';
      num.textContent = `${i + 1}.`;
      p.appendChild(num);
      p.appendChild(document.createTextNode(q));
      el.examQuestions.appendChild(p);
    });
  }

  if (step.extra && (step.extra.pro.length || step.extra.con.length)) {
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.gap = '32px';
    wrap.style.marginTop = '18px';
    wrap.style.textAlign = 'left';
    wrap.style.fontSize = '15px';
    if (step.extra.pro.length) {
      const col = document.createElement('div');
      col.innerHTML =
        '<strong style="color:#1D5C63">Lehiga</strong><ul style="margin:8px 0 0;padding-left:18px;">' +
        step.extra.pro.map((x) => `<li>${escapeHtml(x)}</li>`).join('') +
        '</ul>';
      wrap.appendChild(col);
    }
    if (step.extra.con.length) {
      const col = document.createElement('div');
      col.innerHTML =
        '<strong style="color:#B23A2E">Aleyhiga</strong><ul style="margin:8px 0 0;padding-left:18px;">' +
        step.extra.con.map((x) => `<li>${escapeHtml(x)}</li>`).join('') +
        '</ul>';
      wrap.appendChild(col);
    }
    el.examQuestions.appendChild(wrap);
  }
}

function updateRing(remaining, total) {
  const offset = RING_CIRCUMFERENCE * (1 - remaining / total);
  el.ringProgress.style.strokeDashoffset = String(offset);
  el.timerSeconds.textContent = String(remaining);
}

function startRecording() {
  state.currentChunks = [];
  state.mediaRecorder = new MediaRecorder(state.mediaStream);
  state.mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) state.currentChunks.push(e.data);
  };
  state.mediaRecorder.start();
}

function stopRecordingAndContinue(step, next) {
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.onstop = () => {
      const blob = new Blob(state.currentChunks, { type: 'audio/webm' });
      const safeName = sanitizeFileName(state.studentName);
      state.recordings.push({
        id: `${safeName}_${step.id}`,
        label: `${step.sectionLabel}${step.questionIndexLabel ? ' — ' + step.questionIndexLabel : ''}`,
        blob,
      });
      next();
    };
    state.mediaRecorder.stop();
  } else {
    next();
  }
}

function beginPhase(stepIndex, phase) {
  const step = state.steps[stepIndex];
  renderStepContent(step);
  state.active = { stepIndex, phase, step };

  if (phase === 'prep') {
    el.timerPhase.textContent = 'Tayyorgarlik';
    el.ringProgress.classList.remove('speaking');
    el.recDot.classList.add('hidden');
    stopMeter();
    state.remaining = step.prepSec;
    state.total = step.prepSec;
  } else {
    el.timerPhase.textContent = 'Gapirish';
    el.ringProgress.classList.add('speaking');
    el.recDot.classList.remove('hidden');
    startRecording();
    startMeter();
    state.remaining = step.speakSec;
    state.total = step.speakSec;
  }

  updateRing(state.remaining, state.total);
  restartTicking();
}

function restartTicking() {
  clearInterval(state.countdownTimer);
  state.countdownTimer = setInterval(() => {
    state.remaining -= 1;
    if (state.remaining <= 0) {
      clearInterval(state.countdownTimer);
      updateRing(0, state.total);
      onPhaseDone();
    } else {
      updateRing(state.remaining, state.total);
    }
  }, 1000);
}

function onPhaseDone() {
  const { stepIndex, phase, step } = state.active;
  if (phase === 'prep') {
    beginPhase(stepIndex, 'speak');
  } else {
    stopMeter();
    stopRecordingAndContinue(step, () => {
      const nextIndex = stepIndex + 1;
      if (nextIndex >= state.steps.length) {
        finalizeExam();
      } else {
        beginPhase(nextIndex, 'prep');
      }
    });
  }
}

/* ---------------------------------------------------------------------
   Pauza / davom ettirish
   --------------------------------------------------------------------- */
el.pauseBtn.addEventListener('click', () => {
  if (!state.active) return;

  if (!state.paused) {
    // PAUZA
    state.paused = true;
    clearInterval(state.countdownTimer);
    if (state.active.phase === 'speak') {
      if (state.mediaRecorder && state.mediaRecorder.state === 'recording') {
        state.mediaRecorder.pause();
      }
      stopMeter();
    }
    el.pauseBtn.textContent = '▶ Davom ettirish';
    el.pauseBtn.classList.add('is-paused');
  } else {
    // DAVOM ETTIRISH
    state.paused = false;
    if (state.active.phase === 'speak') {
      if (state.mediaRecorder && state.mediaRecorder.state === 'paused') {
        state.mediaRecorder.resume();
      }
      startMeter();
    }
    restartTicking();
    el.pauseBtn.textContent = '⏸ Pauza';
    el.pauseBtn.classList.remove('is-paused');
  }
});

function stopEverythingImmediately() {
  clearInterval(state.countdownTimer);
  stopMeter();
  if (state.mediaRecorder && state.mediaRecorder.state !== 'inactive') {
    state.mediaRecorder.onstop = null;
    state.mediaRecorder.stop();
  }
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((t) => t.stop());
    state.mediaStream = null;
  }
  if (state.audioCtx) {
    state.audioCtx.close().catch(() => {});
    state.audioCtx = null;
  }
  state.analyser = null;
  state.examInProgress = false;
}

el.cancelExamBtn.addEventListener('click', () => {
  const sure = confirm(
    "Imtihonni bekor qilib, 0-dan qaytadan boshlaysizmi? Hozirgacha yozilgan javoblar saqlanmaydi."
  );
  if (!sure) return;

  stopEverythingImmediately();
  state.recordings = [];
  state.active = null;
  state.paused = false;

  el.pauseBtn.textContent = '⏸ Pauza';
  el.pauseBtn.classList.remove('is-paused');
  el.examStage.classList.add('hidden');
  el.studentNameInput.value = '';
  el.precheckError.classList.add('hidden');
  el.examPrecheck.classList.remove('hidden');
});

function finalizeExam() {
  state.examInProgress = false;
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach((t) => t.stop());
    state.mediaStream = null;
  }
  if (state.audioCtx) {
    state.audioCtx.close().catch(() => {});
    state.audioCtx = null;
  }
  state.analyser = null;
  el.examView.classList.add('hidden');
  el.resultsView.classList.remove('hidden');
  renderResults();
}

/* ---------------------------------------------------------------------
   Results
   --------------------------------------------------------------------- */
function renderResults() {
  const dateStr = new Date().toLocaleDateString('uz-UZ');
  el.resultsStudentLine.textContent = `Talaba: ${state.studentName} · Sana: ${dateStr}`;

  el.recordingsList.innerHTML = '';
  state.recordings.forEach((rec) => {
    const url = URL.createObjectURL(rec.blob);
    const row = document.createElement('div');
    row.className = 'recording-row';
    row.innerHTML = `
      <span class="r-label">${escapeHtml(rec.label)}</span>
      <audio controls src="${url}"></audio>
      <a class="dl" href="${url}" download="${rec.id}.webm">Yuklab olish</a>
    `;
    el.recordingsList.appendChild(row);
  });
}

el.downloadAllBtn.addEventListener('click', async () => {
  if (!state.recordings.length) return;
  const zip = new JSZip();
  state.recordings.forEach((rec) => zip.file(`${rec.id}.webm`, rec.blob));
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${sanitizeFileName(state.studentName)}_nutq-imtihoni.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

el.newExamBtn.addEventListener('click', () => {
  state.recordings = [];
  el.resultsView.classList.add('hidden');
  el.setupView.classList.remove('hidden');
});
