/* FORGE Training v8.5
   - v8.2 functionality + FORGE branding
   - Specificity: cal / meters / distances, handstand walk distances
   - Beeps via WebAudio oscillator (works on mobile after user gesture)
*/

// ---------- Global error surface ----------
window.onerror = function(message, source, lineno, colno, error){
  try{
    if(typeof toast === "function"){
      toast("JS error: " + message);
    }
  }catch(e){}
  console.error("JS error:", message, source, lineno, colno, error);
  return false;
};

// ---------- Helpers: storage ----------
const store = {
  get(key, fallback=null){
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  },
  set(key, val){
    localStorage.setItem(key, String(val));
  },
  del(key){ localStorage.removeItem(key); }
};


// ---------- Toast (must be defined early) ----------
var toastTimer = null;
function toast(msg){
  const elId = "toast";
  let el = document.getElementById(elId);
  if(!el){
    el = document.createElement("div");
    el.id = elId;
    el.style.position = "fixed";
    el.style.left = "50%";
    el.style.bottom = "16px";
    el.style.transform = "translateX(-50%)";
    el.style.padding = "10px 14px";
    el.style.borderRadius = "999px";
    el.style.border = "1px solid rgba(255,255,255,.14)";
    el.style.background = "rgba(0,0,0,.65)";
    el.style.backdropFilter = "blur(10px)";
    el.style.fontWeight = "800";
    el.style.zIndex = "999";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.opacity = "1";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.style.opacity = "0"; }, 1200);
}


// ---------- View navigation ----------
const tabs = [...document.querySelectorAll(".tab")];
function setActiveTab(name){
  tabs.forEach(b => b.classList.toggle("active", b.dataset.view === name));
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  document.getElementById(`view-${name}`).classList.remove("hidden");
  store.set("last_view", name);
}
tabs.forEach(b => b.addEventListener("click", () => setActiveTab(b.dataset.view)));
const lastView = store.get("last_view","athlete");
setActiveTab((lastView==="coach") ? "athlete" : lastView);

// ---------- Theme switching ----------
const themeSelect = document.getElementById("themeSelect");
const themes = {
  ember: {a1:"#ff3c38", a2:"#ff9f1c", a3:"#5b7cfa"},
  neon:  {a1:"#00f5d4", a2:"#9b5de5", a3:"#f15bb5"},
  ice:   {a1:"#5bf0ff", a2:"#5b7cfa", a3:"#9bf6ff"},
};
function applyTheme(name){
  const t = themes[name] || themes.ember;
  document.documentElement.style.setProperty("--accent1", t.a1);
  document.documentElement.style.setProperty("--accent2", t.a2);
  document.documentElement.style.setProperty("--accent3", t.a3);
  store.set("theme", name);
}
applyTheme(store.get("theme","ember"));
themeSelect.value = store.get("theme","ember");
themeSelect.addEventListener("change", e => applyTheme(e.target.value));

// ---------- Audio beeps (WebAudio) ----------
let audioCtx = null;
function ensureAudio(){
  try{
    if(!audioCtx){
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(audioCtx && audioCtx.state === "suspended"){
      audioCtx.resume();
    }
  }catch(e){
    // Audio is optional; never block timer on audio failures.
    audioCtx = null;
  }
}
function speak(text){
  try{
    if(!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1.0; u.volume = 1.0;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }catch(e){}
}

function beep(freq=880, ms=120, vol=0.12){
  try{
    ensureAudio();
    if(!audioCtx) return;
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = vol;
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    setTimeout(() => { o.stop(); }, ms);
  }catch(e){
    // silent fail
  }
}
document.getElementById("btnTestBeep").addEventListener("click", () => beep(880,140,0.14));

// ---------- Athlete profile + benchmarks ----------
const rmFields = ["clean","snatch","deadlift","squat","pressjerk"];
const maxFields = ["hspu","pullups"];
rmFields.forEach(k => {
  const el = document.getElementById(`rm_${k}`);
  if(el) el.value = store.get(`rm_${k}`, "");
});
maxFields.forEach(k => {
  const el = document.getElementById(`max_${k}`);
  if(el) el.value = store.get(`max_${k}`, "");
});
document.getElementById("btnSaveProfile").addEventListener("click", () => {
  rmFields.forEach(k => store.set(`rm_${k}`, document.getElementById(`rm_${k}`).value || ""));
  maxFields.forEach(k => store.set(`max_${k}`, document.getElementById(`max_${k}`).value || ""));
  toast("Profile saved");
});
document.getElementById("btnClearProfile").addEventListener("click", () => {
  rmFields.forEach(k => { store.del(`rm_${k}`); document.getElementById(`rm_${k}`).value=""; });
  maxFields.forEach(k => { store.del(`max_${k}`); document.getElementById(`max_${k}`).value=""; });
  toast("Cleared");
});
["fran","grace","murph"].forEach(k => {
  const el = document.getElementById(`bm_${k}`);
  el.value = store.get(`bm_${k}`, "");
});
document.getElementById("btnSaveBench").addEventListener("click", () => {
  ["fran","grace","murph"].forEach(k => store.set(`bm_${k}`, document.getElementById(`bm_${k}`).value || ""));
  toast("Benchmarks saved");
});

// ---------- Movement database (specific) ----------
const DB = {
  engine: [
    "Run 200m","Run 400m","Run 800m",
    "Row 250m","Row 500m","Row 1000m",
    "Bike 12/9 cal","Bike 15/12 cal","Bike 20/15 cal",
    "SkiErg 300m","SkiErg 500m"
  ],
  barbell: [
    "Deadlift 10 reps (moderate)",
    "Power Clean 6 reps (moderate)",
    "Clean & Jerk 3 reps (heavy)",
    "Power Snatch 6 reps (moderate)",
    "Snatch 3 reps (heavy)",
    "Thrusters 10 reps (light/mod)",
    "Front Squat 8 reps (moderate)"
  ],
  gymnastics: [
    "Pull-Ups 10 reps",
    "Chest-to-Bar 8 reps",
    "Toes-to-Bar 10 reps",
    "Handstand Push-Ups 6 reps",
    "Ring Dips 10 reps",
    "Bar Muscle-Ups 4 reps",
    "Ring Muscle-Ups 3 reps",
    "Handstand Walk 5m",
    "Handstand Walk 10m",
    "Handstand Walk 20m"
  ],
  calisthenics: [
    "Air Squats 30 reps",
    "Push-Ups 20 reps",
    "Walking Lunges 20 steps",
    "V-Ups 20 reps",
    "Sit-Ups 30 reps",
    "Burpees 15 reps",
    "Pistols 10 reps (alt)"
  ],
  skill: [
    "Double-Unders 60 reps",
    "Single-Unders 120 reps",
    "Wall Walks 8 reps",
    "GHD Sit-Ups 15 reps",
    "Kipping Practice 2 min"
  ]
};

function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }

function getRM(key){
  const v = parseFloat(store.get(`rm_${key}`,""));
  return isNaN(v) ? null : v;
}
function pctLoad(rm, pct){
  if(!rm) return null;
  const raw = rm * pct;
  return Math.round(raw / 2.5) * 2.5;
}
function strengthLoadHint(move){
  const m = move.toLowerCase();
  let key = null;
  if(m.includes("snatch")) key = "snatch";
  else if(m.includes("clean")) key = "clean";
  else if(m.includes("deadlift")) key = "deadlift";
  else if(m.includes("squat")) key = "squat";
  else if(m.includes("jerk") || m.includes("press")) key = "pressjerk";
  const rm = key ? getRM(key) : null;
  const pct = m.includes("heavy") ? 0.85 : 0.75;
  const load = pctLoad(rm, pct);
  return load ? ` @ ~${Math.round(pct*100)}% (~${load}kg)` : "";
}


function pickFocus(focus){
  switch(focus){
    case "Barbell": return [DB.barbell, DB.engine, DB.calisthenics];
    case "Gymnastics": return [DB.gymnastics, DB.engine, DB.calisthenics];
    case "Calisthenics": return [DB.calisthenics, DB.engine, DB.gymnastics];
    case "Engine": return [DB.engine, DB.calisthenics, DB.gymnastics];
    case "Skill": return [DB.skill, DB.engine, DB.gymnastics];
    default: return [DB.barbell, DB.gymnastics, DB.engine];
  }
}

// ---------- AI WOD Engine (rules-based) ----------
const wodOut = document.getElementById("wodOut");
// (WOD UI now lives in Class tab, so buttons may not exist until DOM is ready — guard is below.)
const btnGenWod = document.getElementById("btnGenWod");
const btnRandQuick = document.getElementById("btnRandQuick");
const btnCopyWod = document.getElementById("btnCopyWod");
const btnUseForTimer = document.getElementById("btnUseForTimer");

function genEMOM(level, focus){
  const [a,b,c] = pickFocus(focus);
  const m1 = pick(a), m2 = pick(b), m3 = pick(c);
  const rx = [
    `Min 1: ${m1}`,
    `Min 2: ${m2}`,
    `Min 3: ${m3}`,
    `Repeat x4`
  ].join("\n");
  const scaled = [
    `Min 1: ${m1.replace("heavy","moderate")}`,
    `Min 2: ${m2}`,
    `Min 3: ${m3}`,
    `Repeat x4`
  ].join("\n");
  return `EMOM 12\n${level==="Scaled"?scaled:rx}`;
}

function genAMRAP(level, focus){
  const [a,b,c] = pickFocus(focus);
  const A = pick(a), B = pick(b), C = pick(c);
  const mins = [10,12,15][Math.floor(Math.random()*3)];
  return `AMRAP ${mins}\n${A}\n${B}\n${C}`;
}

function genForTime(level, focus){
  const [a,b,c] = pickFocus(focus);
  const schemes = [
    "21-15-9",
    "15-12-9",
    "30-20-10"
  ];
  const scheme = pick(schemes);
  const A = pick(a), B = pick(b);
  const buyin = Math.random() < 0.45 ? `\nBuy-in: ${pick(DB.engine)}` : "";
  return `For Time${buyin}\n${scheme}\n${A}\n${B}`;
}

function genIntervals(level, focus){
  const [a,b,c] = pickFocus(focus);
  const work = [40,45,60][Math.floor(Math.random()*3)];
  const rest = [20,30,30][Math.floor(Math.random()*3)];
  const rounds = [6,8,10][Math.floor(Math.random()*3)];
  const A = pick(a), B = pick(b);
  return `Intervals\n${rounds} rounds\n${work}s work / ${rest}s rest\nRotate:\n1) ${A}\n2) ${B}`;
}

function genChipper(level, focus){
  const parts = [];
  parts.push(pick(DB.engine));
  parts.push(pick(DB.calisthenics));
  parts.push(pick(DB.gymnastics));
  parts.push(pick(DB.barbell));
  parts.sort(() => Math.random()-0.5);
  return `Chipper (For Time)\n${parts.join("\n")}`;
}

function genLadder(level, focus){
  const [a,b,c] = pickFocus(focus);
  const A = pick(a), B = pick(b);
  const start = [2,3,4][Math.floor(Math.random()*3)];
  const step = [2,3][Math.floor(Math.random()*2)];
  return `Ladder\n${start}-${start+step}-${start+2*step}-${start+3*step}...\n${A}\n${B}`;
}

function generateWOD(){
  const type = document.getElementById("wodType").value;
  const focus = document.getElementById("wodFocus").value;
  const level = document.getElementById("wodLevel").value;
  const phase = (document.getElementById("wodPhase")||{value:"metcon"}).value;

  let wod = "";
  if(phase === "strength"){
    const lifts = ["Back Squat","Front Squat","Deadlift","Clean & Jerk","Snatch","Shoulder Press / Jerk"];
    const pickLift = lifts[Math.floor(Math.random()*lifts.length)];
    let move = pickLift;
    if(pickLift==="Clean & Jerk") move = "Clean & Jerk 3 reps (heavy)";
    else if(pickLift==="Snatch") move = "Snatch 3 reps (heavy)";
    else if(pickLift==="Deadlift") move = "Deadlift 5 reps (heavy)";
    else if(pickLift==="Back Squat") move = "Back Squat 5 reps (heavy)";
    else if(pickLift==="Front Squat") move = "Front Squat 5 reps (heavy)";
    else move = "Shoulder Press / Jerk 5 reps (moderate)";
    const schemes = [
      `5 x 3${strengthLoadHint(move)}`,
      `6 x 2${strengthLoadHint(move)}`,
      `5 x 5${strengthLoadHint(move.replace("heavy","moderate"))}`
    ];
    wod = `Strength Phase\n${pickLift}\n${pick(schemes)}\nRest 2–3 min between sets`;
    wodOut.textContent = wod;
    store.set("last_wod", wod);
    toast("Strength session generated");
    return;
  }

  if(phase === "skill"){
    const skillSet = [pick(DB.skill), pick(DB.gymnastics)];
    wod = `Skill Phase\n10–12 min practice\n${skillSet.join("\n")}\nKeep quality high`;
  } else if(type === "EMOM") wod = genEMOM(level, focus);
  else if(type === "For Time") wod = genForTime(level, focus);
  else if(type === "Intervals") wod = genIntervals(level, focus);
  else if(type === "Chipper") wod = genChipper(level, focus);
  else if(type === "Ladder") wod = genLadder(level, focus);
  else wod = genAMRAP(level, focus);

  wodOut.textContent = wod;
  store.set("last_wod", wod);
  toast("WOD generated");
}

btnGenWod.addEventListener("click", () => { ensureAudio(); generateWOD(); });
btnRandQuick.addEventListener("click", () => {
  ensureAudio();
  const types = ["AMRAP","For Time","EMOM","Intervals","Chipper","Ladder"];
  document.getElementById("wodType").value = pick(types);
  document.getElementById("wodFocus").value = "Balanced";
  generateWOD();
});
btnCopyWod.addEventListener("click", async () => {
  const t = wodOut.textContent.trim();
  if(!t){ toast("Nothing to copy"); return; }
  try{
    await navigator.clipboard.writeText(t);
    toast("Copied");
  }catch(e){
    toast("Copy blocked by browser");
  }
});
btnUseForTimer.addEventListener("click", () => {
  const t = wodOut.textContent.trim();
  if(!t){ toast("Generate a WOD first"); return; }
  setTimerWorkout(t);
  setActiveTab("timer");
});

const last = store.get("last_wod","");
if(last) wodOut.textContent = last;

// ---------- Class programming board + coach mode ----------
const classBoard = document.getElementById("classBoard");
let classPrograms = [];

function block(title, body){
  const div = document.createElement("div");
  div.className = "block";
  div.innerHTML = `<h3>${escapeHtml(title)}</h3><p>${escapeHtml(body).replace(/\n/g,"<br>")}</p>`;
  return div;
}

function buildClass(){
  const warmups = [
    `2 min easy ${pick(["Row","Bike","SkiErg"])}\nMobility: hips/ankles/shoulders`,
    `400m easy run\nThen banded shoulder series`,
    `3 rounds:\n10 air squats\n10 push-ups\n200m jog`
  ];
  const strength = [
    `Clean & Jerk\n5 x 3 @ moderate, build each set`,
    `Snatch\n6 x 2 (technique focus)`,
    `Back Squat\n5 x 5 (add small load)`,
    `Deadlift\n5 x 3 (heavy, perfect reps)`,
    `Front Squat\n4 x 6`
  ];
  const metconType = pick(["AMRAP","For Time","EMOM","Intervals","Chipper"]);
  let metcon = "";
  const focus = pick(["Balanced","Engine","Gymnastics","Barbell","Calisthenics"]);
  const level = "RX";
  if(metconType==="AMRAP") metcon = genAMRAP(level, focus);
  else if(metconType==="For Time") metcon = genForTime(level, focus);
  else if(metconType==="EMOM") metcon = genEMOM(level, focus);
  else if(metconType==="Intervals") metcon = genIntervals(level, focus);
  else metcon = genChipper(level, focus);

  const accessory = pick([
    `Core:\n3 x 45s hollow hold\n3 x 45s side plank/side`,
    `Upper:\n3 x 12 ring rows\n3 x 12 strict press (light)`,
    `Mobility:\n10 min hips + thoracic + calves`,
    `Posterior:\n3 x 12 GHD/hip extensions\n3 x 15 band ham curls`
  ]);

  return { warmup: pick(warmups), strength: pick(strength), metcon, accessory };
}

function renderClassProgram(p){
  classBoard.innerHTML = "";
  classBoard.appendChild(block("Warm-up", p.warmup));
  classBoard.appendChild(block("Strength", p.strength));
  classBoard.appendChild(block("Metcon", p.metcon));
  classBoard.appendChild(block("Accessory / Cooldown", p.accessory));
  store.set("class_current_metcon", p.metcon);
}

function ensureClassPrograms(){
  if(classPrograms.length) return;
  classPrograms = [buildClass(), buildClass(), buildClass()];
}
ensureClassPrograms();
renderClassProgram(classPrograms[0]);

function rotateClass(){
  classPrograms.push(classPrograms.shift());
  renderClassProgram(classPrograms[0]);
  toast("Class rotated");
}

function addNewClass(){
  classPrograms.unshift(buildClass());
  renderClassProgram(classPrograms[0]);
  toast("New class added");
}

document.getElementById("btnRotateClass").addEventListener("click", () => rotateClass());
document.getElementById("btnAddClass").addEventListener("click", () => addNewClass());
document.getElementById("btnCoachRotate").addEventListener("click", () => rotateClass());
document.getElementById("btnCoachAdd").addEventListener("click", () => addNewClass());

document.getElementById("btnPushToTimer").addEventListener("click", () => {
  const metcon = store.get("class_current_metcon","").trim();
  if(!metcon){ toast("No metcon to send"); return; }
  setTimerWorkout(metcon);
  setActiveTab("timer");
});
document.getElementById("btnPushToTimer").addEventListener("click", ensureAudio);

let coachInterval = null;
const coachAuto = document.getElementById("coachAuto");
coachAuto.value = store.get("coach_auto","off");
function setCoachAuto(val){
  store.set("coach_auto", val);
  if(coachInterval){ clearInterval(coachInterval); coachInterval = null; }
  const seconds = val === "off" ? 0 : parseInt(val,10);
  if(seconds > 0){
    coachInterval = setInterval(() => rotateClass(), seconds*1000);
  }
}
coachAuto.addEventListener("change", e => setCoachAuto(e.target.value));
setCoachAuto(coachAuto.value);

// ---------- Timer ----------
const timerModePill = document.getElementById("timerModePill");
const timerTitle = document.getElementById("timerTitle");
const timerSub = document.getElementById("timerSub");
const clock = document.getElementById("clock");
const phaseEl = document.getElementById("phase");
const modeSel = document.getElementById("timerMode");
const workMinIn = document.getElementById("timerWorkMin");
const workSecIn = document.getElementById("timerWorkSec");
const restMinIn = document.getElementById("timerRestMin");
const restSecIn = document.getElementById("timerRestSec");
const roundsIn = document.getElementById("timerRounds");
const emomNow = document.getElementById("emomNow");
const emomNext = document.getElementById("emomNext");
const btnBig = document.getElementById("btnBig");
const timerModeLabel = document.getElementById("timerModeLabel");
const boxSmallInfo = document.getElementById("boxSmallInfo");
function setBoxInfo(text){
  if(boxSmallInfo) boxSmallInfo.textContent = text;
}

const modal = document.getElementById("modal");
const modalClock = document.getElementById("modalClock");
const modalPhase = document.getElementById("modalPhase");
const modalWorkout = document.getElementById("modalWorkout");
const modalEmom = document.getElementById("modalEmom");
document.getElementById("btnCloseBig").addEventListener("click", () => modal.classList.add("hidden"));
btnBig.addEventListener("click", () => {
  modal.classList.remove("hidden");
  modalWorkout.textContent = currentWorkout || "—";
  modalClock.textContent = clock.textContent;
  modalPhase.textContent = phaseEl.textContent;
  modalEmom.textContent = (emomNow.textContent === "—" ? "—" : `${emomNow.textContent}\n${emomNext.textContent}`);
});

let tickHandle = null;
let startT = 0;
let running = false;
let curMode = "countdown";
let workSec = 60;
let restSec = 0;
let rounds = 12;
let round = 1;
let currentWorkout = store.get("timer_workout","");

function formatTime(t, tenths=true){
  const s = Math.max(0, t);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const tt = Math.floor((s - Math.floor(s))*10);
  return tenths ? `${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}.${tt}`
                : `${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
}

function setTimerWorkout(text){
  currentWorkout = text;
  store.set("timer_workout", text);
  timerTitle.textContent = text.split("\n")[0] || "Workout";
  timerSub.textContent = "Loaded from WOD/Class.";
  const first = (text.split("\n")[0] || "").toUpperCase();
  if(first.startsWith("EMOM")){
    modeSel.value = "emom";
    workMinIn.value = 1; workSecIn.value = 0;
    roundsIn.value = 12;
    restMinIn.value = 0; restSecIn.value = 0;
    timerModePill.textContent = "EMOM";
  }else if(first.startsWith("INTERVALS")){
    modeSel.value = "intervals";
    const m = text.match(/(\d+)\s*s\s*work\s*\/\s*(\d+)\s*s\s*rest/i);
    const r = text.match(/(\d+)\s*rounds/i);
    if(m){ const w = parseInt(m[1],10); const r = parseInt(m[2],10);
    workMinIn.value = Math.floor(w/60); workSecIn.value = w%60;
    restMinIn.value = Math.floor(r/60); restSecIn.value = r%60; }
    if(r){ roundsIn.value = parseInt(r[1],10); }
    timerModePill.textContent = "Intervals";
  }else if(first.startsWith("AMRAP")){
    modeSel.value = "countdown";
    const m = first.match(/AMRAP\s+(\d+)/);
    if(m){ const total = parseInt(m[1],10)*60;
    workMinIn.value = Math.floor(total/60); workSecIn.value = total%60; }
    restMinIn.value = 0; restSecIn.value = 0;
    roundsIn.value = 1;
    timerModePill.textContent = "Countdown";
  }else{
    modeSel.value = "countdown";
    timerModePill.textContent = "Countdown";
  }
  updateFromInputs();

}
if(currentWorkout){
  setTimerWorkout(currentWorkout);
}else{
  timerTitle.textContent = "No workout selected";
  timerSub.textContent = "Generate a WOD and tap “Use in Timer”.";
}

function updateFromInputs(){
  curMode = modeSel.value;
  const wm = parseInt(workMinIn.value||"0",10) || 0;
  const ws = parseInt(workSecIn.value||"0",10) || 0;
  const rm = parseInt(restMinIn.value||"0",10) || 0;
  const rs = parseInt(restSecIn.value||"0",10) || 0;
  workSec = Math.max(0, wm*60 + Math.min(59, Math.max(0, ws)));
  restSec = Math.max(0, rm*60 + Math.min(59, Math.max(0, rs)));
  rounds = parseInt(roundsIn.value || "0",10) || (curMode==="emom" ? 12 : 1);
  if(curMode==="emom"){
    workSec = 60;
    workMinIn.value = 1; workSecIn.value = 0;
    restMinIn.value = 0; restSecIn.value = 0;
  }
  store.set("timer_mode", curMode);
  store.set("timer_work", workSec);
  store.set("timer_rest", restSec);
  store.set("timer_rounds", rounds);
}
modeSel.value = store.get("timer_mode", modeSel.value);
const storedWork = parseInt(store.get("timer_work","60"),10) || 60;
workMinIn.value = Math.floor(storedWork/60);
workSecIn.value = storedWork%60;
const storedRest = parseInt(store.get("timer_rest","0"),10) || 0;
restMinIn.value = Math.floor(storedRest/60);
restSecIn.value = storedRest%60;
roundsIn.value = store.get("timer_rounds", roundsIn.value || "");
modeSel.addEventListener("change", () => { updateFromInputs(); updateEmomLines(); });
[workMinIn, workSecIn, restMinIn, restSecIn, roundsIn].forEach(el => el.addEventListener("input", () => { updateFromInputs(); }));

function parseEmomStations(text){
  const lines = text.split("\n").map(s => s.trim());
  const mins = lines.filter(l => /^Min\\s*\\d+\\s*:/i.test(l));
  if(mins.length){
    return mins.map(l => l.replace(/^Min\\s*\\d+\\s*:\\s*/i,""));
  }
  const body = lines.slice(1).filter(Boolean);
  const picks = body.filter(l => !/^repeat/i.test(l));
  return picks.slice(0,3);
}

var emomStations = [];
function updateEmomLines(){
  if(!currentWorkout){ emomStations=[]; emomNow.textContent="—"; emomNext.textContent="—"; return; }
  const header = (currentWorkout.split("\n")[0]||"").toUpperCase();
  if(curMode !== "emom" && !header.startsWith("EMOM")){
    emomStations=[];
    emomNow.textContent="—";
    emomNext.textContent="—";
    return;
  }
  emomStations = parseEmomStations(currentWorkout);
  if(emomStations.length === 0){
    emomStations = [pick(DB.barbell), pick(DB.gymnastics), pick(DB.engine)];
  }
  const i = ((round-1) % emomStations.length);
  const now = emomStations[i];
  const next = emomStations[(i+1)%emomStations.length];
  emomNow.textContent = `Now: ${now}`;
  emomNext.textContent = `Next: ${next}`;
  if(!modal.classList.contains("hidden")){
    modalEmom.textContent = `${emomNow.textContent}\n${emomNext.textContent}`;
  }
}

function stopTimer(){
  running = false;
  if(tickHandle){ clearInterval(tickHandle); tickHandle = null; }
}
function resetTimer(){
  stopTimer();
  round = 1;
  phaseEl.textContent = "—";
  timerModePill.textContent = "Ready";
  setBoxInfo("READY");
  updateFromInputs();
  clock.textContent = (curMode==="stopwatch") ? formatTime(0) : formatTime(workSec);
  updateEmomLines();
  syncModal();
}
function syncModal(){
  if(modal.classList.contains("hidden")) return;
  modalClock.textContent = clock.textContent;
  modalPhase.textContent = phaseEl.textContent;
  modalWorkout.textContent = currentWorkout || "—";
  modalEmom.textContent = (emomNow.textContent === "—" ? "—" : `${emomNow.textContent}\n${emomNext.textContent}`);
}
function startTimer(){
  try{

  ensureAudio();
  updateFromInputs();
  stopTimer();
  running = true;
  toast("Timer started");
  startT = performance.now();
  round = 1;
  timerModePill.textContent = curMode.toUpperCase();

  const header = (currentWorkout.split("\n")[0]||"").toUpperCase();
  if(curMode === "emom" || header.startsWith("EMOM")){
    curMode = "emom";
    workSec = 60;
    restSec = 0;
    const m = header.match(/EMOM\s+(\d+)/);
    if(m && (!roundsIn.value || parseInt(roundsIn.value,10)===0)){
      rounds = parseInt(m[1],10);
      roundsIn.value = rounds;
    }
  }

    // immediate UI update
  clock.textContent = (curMode==="stopwatch") ? formatTime(0) : formatTime(workSec);
  phaseEl.textContent = (curMode==="stopwatch") ? "RUNNING" : phaseEl.textContent;
  syncModal();

  tickHandle = setInterval(() => {
    const now = performance.now();
    const dt = (now - startT) / 1000.0;

    if(curMode === "stopwatch"){
      clock.textContent = formatTime(dt);
      phaseEl.textContent = "RUNNING";
      syncModal();
      return;
    }

    if(curMode === "countdown"){
      const remaining = workSec - dt;
      clock.textContent = formatTime(remaining);
      phaseEl.textContent = "COUNTDOWN";
      if(remaining <= 10 && remaining > 9.9){ beep(880,120,0.16); speak("10 seconds"); }
      if(remaining <= 0){
        beep(660,220,0.18);
        stopTimer();
        phaseEl.textContent = "TIME!";
        timerModePill.textContent = "Done";
      }
      syncModal();
      return;
    }

    if(curMode === "emom"){
      const remaining = workSec - (dt % workSec);
      const minuteIndex = Math.floor(dt / workSec) + 1;
      if(remaining <= 10 && remaining > 9.9){ beep(880,120,0.16); speak("10 seconds"); }
      if(remaining <= 0.05){ beep(520,120,0.20); setTimeout(()=>beep(660,120,0.16),130); }

      clock.textContent = formatTime(remaining);
      phaseEl.textContent = `MIN ${minuteIndex} / ${rounds}`;

      const newRound = Math.min(minuteIndex, rounds);
      if(newRound !== round){
        round = newRound;

      }

      if(minuteIndex > rounds){
        beep(660,240,0.20);
        stopTimer();
        phaseEl.textContent = "DONE";
        timerModePill.textContent = "Done";
      }
      syncModal();
      return;
    }

    if(curMode === "intervals"){
      const cycle = workSec + restSec;
      const pos = dt % cycle;
      const idx = Math.floor(dt / cycle) + 1;
      const inWork = pos < workSec;
      const remaining = (inWork ? (workSec - pos) : (cycle - pos));
      const label = inWork ? "WORK" : "REST";
      clock.textContent = formatTime(remaining);
      phaseEl.textContent = `${label} • ROUND ${Math.min(idx, rounds)} / ${rounds}`;

      if(remaining <= 10 && remaining > 9.9){ beep(inWork ? 880 : 740,120,0.15); speak("10 seconds"); }
      if(remaining <= 0.05){ if(inWork){ beep(520,120,0.20); setTimeout(()=>beep(660,120,0.16),130); } else { beep(420,140,0.20); setTimeout(()=>beep(520,120,0.16),150); } }

      if(idx > rounds){
        beep(660,240,0.20);
        stopTimer();
        phaseEl.textContent = "DONE";
        timerModePill.textContent = "Done";
      }
      syncModal();
      return;
    }

  }, 100);
  }catch(e){
    console.error(e);
    try{ toast("Timer error: " + (e && e.message ? e.message : e)); }catch(_){ }
  }
}

window.FORGE_startTimer = startTimer;

document.getElementById("btnStart").addEventListener("click", startTimer);
document.getElementById("btnStop").addEventListener("click", () => { stopTimer(); timerModePill.textContent = "Stopped";
  setBoxInfo("STOPPED"); phaseEl.textContent = "STOPPED"; syncModal(); });
document.getElementById("btnReset").addEventListener("click", resetTimer);

// ---------- Utilities ----------
function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;");
}



// Ensure audio on any meaningful click (mobile requirement)
["btnGenWod","btnRandQuick","btnUseForTimer","btnStart","btnTestBeep","btnRotateClass","btnAddClass","btnCoachRotate","btnCoachAdd","btnPushToTimer"]
  .forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener("click", ensureAudio);
  });


// ---------- Presets ----------
function applyPreset(p){
  try{ ensureAudio(); }catch(e){}
  modeSel.value = p.mode;
  workMinIn.value = Math.floor(p.work/60);
  workSecIn.value = p.work%60;
  restMinIn.value = Math.floor(p.rest/60);
  restSecIn.value = p.rest%60;
  roundsIn.value = p.rounds;
  updateFromInputs();
  updateEmomLines();
  timerTitle.textContent = p.title || "Preset";
  timerSub.textContent = "Preset loaded.";
  setBoxInfo((p.mode||"").toUpperCase());
  toast("Preset loaded");
}
function bindPreset(id, preset){
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener("click", () => applyPreset(preset));
}
bindPreset("preset_emom10", {mode:"emom", work:60, rest:0, rounds:10, title:"EMOM 10"});
bindPreset("preset_emom12", {mode:"emom", work:60, rest:0, rounds:12, title:"EMOM 12"});
bindPreset("preset_emom20", {mode:"emom", work:60, rest:0, rounds:20, title:"EMOM 20"});
bindPreset("preset_tabata", {mode:"intervals", work:20, rest:10, rounds:8, title:"Tabata"});
bindPreset("preset_fgb", {mode:"emom", work:60, rest:0, rounds:15, title:"Fight Gone Bad (15:00)"});
bindPreset("preset_cd10", {mode:"countdown", work:600, rest:0, rounds:1, title:"Countdown 10:00"});
bindPreset("preset_sw", {mode:"stopwatch", work:0, rest:0, rounds:1, title:"Stopwatch"});

// Final boot
try{ updateEmomLines(); }catch(e){ console.error(e); }
