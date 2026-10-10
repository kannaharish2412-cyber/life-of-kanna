const $ = id => document.getElementById(id), DAY = 864e5, KEY = "luna-pro";
let data = JSON.parse(localStorage.getItem(KEY) || "{}");
data.periods = data.periods || []; data.logs = data.logs || {};
data.periodLen = data.periodLen || 5; data.cycleLen = data.cycleLen || 28;
const save = () => localStorage.setItem(KEY, JSON.stringify(data));
const fmt = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
const parse = s => { const [a, b, c] = s.split("-"); return new Date(+a, b - 1, +c); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const todayD = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
const diff = (a, b) => Math.round((a - b) / DAY);
const L = d => data.logs[d] || {};
const W = d => data.logs[d] || (data.logs[d] = {});
const TODAY = () => fmt(todayD());
let sel = TODAY();

const PH = {
  menstrual: { n: "Period days", d: "Your lining is shedding. Energy and iron run low and cramps are most likely.",
    eat: ["Iron: spinach, lentils, beans, dates, jaggery", "Warm ginger or chamomile tea", "Magnesium: banana, nuts, seeds", "Soups and warm home-cooked meals"],
    avoid: ["Very salty or fried snacks", "Too much caffeine", "Sugary drinks"] },
  follicular: { n: "Follicular phase", d: "Estrogen is rising. Many people feel more energetic and positive.",
    eat: ["Fresh fruit and vegetables", "Protein: eggs, paneer, sprouts", "Whole grains: oats, millets", "Flax and pumpkin seeds"],
    avoid: ["Skipping meals", "Heavy processed food"] },
  ovulation: { n: "Ovulation window", d: "Energy peaks. You may notice mild one-sided pain or a bigger appetite.",
    eat: ["Fibre-rich vegetables and salads", "Berries and citrus fruits", "Healthy fats: nuts, a little ghee", "Plenty of water"],
    avoid: ["Too much alcohol", "Very heavy late meals"] },
  luteal: { n: "Pre-period phase (PMS)", d: "Hormones drop. Mood swings, cravings, bloating and tender breasts are common.",
    eat: ["Complex carbs: brown rice, sweet potato, oats", "Calcium: curd, milk, ragi", "A small piece of dark chocolate", "Magnesium: almonds, pumpkin seeds"],
    avoid: ["Excess caffeine", "Salty chips and pickles", "Refined sugar"] }
};

/* ---------- cycle maths ---------- */
function avgCycle() {
  const p = [...data.periods].sort(), g = [];
  for (let i = Math.max(1, p.length - 6); i < p.length; i++) { const x = diff(parse(p[i]), parse(p[i - 1])); if (x >= 15 && x <= 60) g.push(x); }
  return g.length ? Math.round(g.reduce((a, b) => a + b) / g.length) : data.cycleLen;
}
const lastStartOn = d => { const p = data.periods.filter(x => x <= d).sort(); return p.length ? p[p.length - 1] : null; };
function calc() {
  const t = todayD(), ls = lastStartOn(fmt(t)); if (!ls) return null;
  const Lc = avgCycle(), P = data.periodLen, day = diff(t, parse(ls)) + 1, ov = Lc - 14;
  let ph = "luteal";
  if (day <= P) ph = "menstrual"; else if (day < ov - 1) ph = "follicular"; else if (day <= ov + 1) ph = "ovulation";
  const next = addDays(parse(ls), Lc);
  return { day, L: Lc, ph, next, ls, left: diff(next, t) };
}

/* ---------- tabs, theme, alerts ---------- */
$("tabs").onclick = e => { const b = e.target.closest("button"); if (b) showTab(b.dataset.tab); };
function showTab(t) {
  document.querySelectorAll(".tab").forEach(x => x.hidden = x.id !== "tab-" + t);
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.tab === t));
  if (t === "cal") drawCal(); if (t === "log") renderLog(); if (t === "ins") renderInsights();
}
function setTheme(t) { document.documentElement.dataset.theme = t; $("themeBtn").textContent = t === "dark" ? "Light mode" : "Dark mode"; data.theme = t; save(); }
$("themeBtn").onclick = () => setTheme(data.theme === "dark" ? "light" : "dark");
function notify(title, body) { if ("Notification" in window && Notification.permission === "granted") new Notification(title, { body }); }
function banner(msg) { const a = $("alert"); a.textContent = msg; a.hidden = !msg; }
$("notifyBtn").onclick = async () => {
  if (!("Notification" in window)) return alert("This browser does not support notifications.");
  const p = await Notification.requestPermission();
  $("notifyBtn").textContent = p === "granted" ? "Notifications on ✓" : "Notifications blocked";
};

/* ---------- Today ---------- */
function renderToday() {
  const c = calc(); $("setup").hidden = !!c; $("todayBody").hidden = !c; if (!c) return;
  const p = PH[c.ph];
  $("dayNum").textContent = c.day; $("dayOf").textContent = "of " + c.L + " days";
  $("prog").style.strokeDashoffset = 326.7 * (1 - Math.min(1, c.day / c.L)); $("prog").style.stroke = c.left < 0 ? "#e0b043" : "";
  $("phaseName").textContent = p.n; $("phaseDesc").textContent = p.d;
  const dt = c.next.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  $("nextInfo").textContent = c.left > 0 ? `Next period in ${c.left} day${c.left > 1 ? "s" : ""} (${dt})` : c.left === 0 ? "Your period is due today." : `Your period is ${-c.left} day${c.left < -1 ? "s" : ""} late.`;
  const cs = cycleStats();
  if (cs.irregular && c.left >= -2) $("nextInfo").textContent += ` · Your cycles vary, so it could arrive between ${fd(addDays(parse(c.ls), cs.min))} and ${fd(addDays(parse(c.ls), cs.max))}.`;
  let eat = p.eat.slice(), msg = "";
  if (c.left > 0 && c.left <= 3) {
    msg = `Your period is expected in ${c.left} day${c.left > 1 ? "s" : ""}. Eat light, iron- and magnesium-rich food, drink plenty of water and keep a heating pad ready.`;
    eat = ["Start iron-rich foods now: spinach, beetroot, lentils, dates", "Magnesium: banana, almonds, pumpkin seeds"].concat(eat.slice(0, 2));
  } else if (c.left === 4 || c.left === 5) msg = `Period expected in ${c.left} days. Time to stock up on pads or tampons.`;
  else if (c.left === 0) msg = "Your period is due today. Eat warm, iron-rich food and keep water nearby.";
  else if (c.left < 0) msg = `Your period is ${-c.left} day(s) late. Open the late-period check below for guidance.`;
  if (c.left < 0 && data.snoozeUntil && data.snoozeUntil > TODAY()) msg = "";
  banner(msg);
  if (msg && data.notifiedFor !== TODAY()) { notify("Luna", msg); data.notifiedFor = TODAY(); save(); }
  $("eatList").innerHTML = eat.map(x => `<li>${x}</li>`).join("");
  $("avoidList").innerHTML = p.avoid.map(x => `<li>${x}</li>`).join("");
  $("waterTip").textContent = c.ph === "menstrual" || c.ph === "luteal" ? "Water and warm fluids reduce bloating and ease cramps. Aim for 8 to 10 glasses." : "Aim for 8 glasses. Lemon, coconut water or buttermilk count too.";
  renderWater(); renderCare(); renderLate(c);
}
$("saveBtn").onclick = () => {
  const d = $("lastStart").value; if (!d) return alert("Pick the first day of your last period.");
  data.cycleLen = Math.min(45, Math.max(20, +$("cycleLen").value || 28));
  data.periodLen = Math.min(10, Math.max(2, +$("periodLen").value || 5));
  if (!data.periods.includes(d)) data.periods.push(d); data.notifiedFor = null; save(); renderToday();
};

/* water */
const GOAL = 8;
function renderWater() {
  const w = L(TODAY()).water || 0;
  $("glasses").innerHTML = Array.from({ length: GOAL }, (_, i) => `<span class="glass ${i < w ? "full" : ""}"></span>`).join("");
  $("addGlass").textContent = w >= GOAL ? "Goal reached! Add another" : `I drank a glass (${w}/${GOAL})`;
}
$("addGlass").onclick = () => { const l = W(TODAY()); l.water = (l.water || 0) + 1; save(); renderWater(); };
let wTimer;
function setWaterReminder() {
  clearInterval(wTimer); const m = +$("remindEvery").value; data.remind = m; save(); if (!m) return;
  wTimer = setInterval(() => { notify("Hydrate", "Time to drink a glass of water."); banner("Time to drink a glass of water."); setTimeout(renderToday, 8000); }, m * 60000);
}
$("remindEvery").onchange = setWaterReminder;

/* self-care */
const CARE = ["Took iron or supplement", "Stretched or did light exercise", "Slept 7+ hours", "Ate a healthy meal", "Drank 8 glasses of water", "Took a break to relax"];
function renderCare() {
  const done = L(TODAY()).care || [];
  $("care").innerHTML = CARE.map((t, i) => `<label><input type="checkbox" data-i="${i}" ${done.includes(i) ? "checked" : ""}>${t}</label>`).join("");
}
$("care").onchange = e => { const l = W(TODAY()); l.care = [...document.querySelectorAll("#care input:checked")].map(x => +x.dataset.i); save(); };

/* mood quiz */
const Q = [
  ["How is your mood right now?", ["Happy", "Okay", "Low", "Irritable"]],
  ["How is your energy?", ["High", "Normal", "Tired", "Exhausted"]],
  ["How did you sleep last night?", ["Well", "Fine", "Poorly", "Barely"]],
  ["Any anxiety or crying spells today?", ["None", "A little", "Quite a bit", "A lot"]],
  ["Cravings or appetite changes?", ["None", "Mild", "Strong", "Can't control"]]
];
const ans = [];
$("quiz").innerHTML = Q.map((x, i) => `<div class="q"><p>${x[0]}</p><div class="opts" data-i="${i}">${x[1].map((t, j) => `<button data-j="${j}">${t}</button>`).join("")}</div></div>`).join("");
$("quiz").onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  const i = +b.parentElement.dataset.i; ans[i] = +b.dataset.j;
  [...b.parentElement.children].forEach(x => x.classList.remove("on")); b.classList.add("on");
  if (ans.filter(a => a !== undefined).length === Q.length) showMood();
};
function showMood() {
  const t = ans.reduce((a, b) => a + b, 0); let h, tips;
  if (t <= 4) { h = "Mood status: Stable 😊"; tips = ["You are doing well. Keep your routine going.", "Keep sipping water through the day.", "A short walk keeps your mood bright."]; }
  else if (t <= 9) { h = "Mood status: Mild mood swings 🙂"; tips = ["Drink a glass of water and eat a balanced snack.", "Take 10 minutes for slow breathing or music.", "Limit caffeine and sugar today."]; }
  else if (t <= 12) { h = "Mood status: Moderate mood swings 😕"; tips = ["Hydrate and eat protein with complex carbs.", "Try gentle yoga, a warm bath or a walk.", "Tell someone close you need extra patience today.", "Go to bed 30 minutes earlier."]; }
  else { h = "Mood status: High mood swings 😣"; tips = ["Pause, breathe slowly and drink water.", "Eat a warm, nourishing meal and do not skip meals.", "Rest and cut down demands where you can.", "If low mood or anxiety lasts for days or feels overwhelming, please talk to a doctor or someone you trust."]; }
  $("moodResult").innerHTML = `<h3>${h}</h3><ul>${tips.map(x => `<li>${x}</li>`).join("")}</ul>`; $("moodResult").hidden = false;
  W(TODAY()).mood = t; save();
}

/* ---------- Calendar ---------- */
let cm = new Date(todayD().getFullYear(), todayD().getMonth(), 1);
function daySets() {
  const s = { period: new Set(), pred: new Set(), fert: new Set() }, ps = [...data.periods].sort();
  ps.forEach(p => { for (let i = 0; i < data.periodLen; i++) s.period.add(fmt(addDays(parse(p), i))); });
  if (ps.length) {
    const ls = parse(ps[ps.length - 1]), Lc = avgCycle();
    for (let k = 1; k <= 4; k++) {
      const st = addDays(ls, Lc * k);
      for (let i = 0; i < data.periodLen; i++) s.pred.add(fmt(addDays(st, i)));
      const ov = addDays(st, -14); for (let i = -4; i <= 1; i++) s.fert.add(fmt(addDays(ov, i)));
    }
  }
  return s;
}
function drawCal() {
  $("monthName").textContent = cm.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const s = daySets(), first = cm.getDay(), n = new Date(cm.getFullYear(), cm.getMonth() + 1, 0).getDate();
  let h = ["S", "M", "T", "W", "T", "F", "S"].map(x => `<b>${x}</b>`).join("") + "<span></span>".repeat(first);
  for (let d = 1; d <= n; d++) {
    const k = fmt(new Date(cm.getFullYear(), cm.getMonth(), d));
    const c = [s.period.has(k) ? "period" : s.pred.has(k) ? "pred" : s.fert.has(k) ? "fert" : "", k === TODAY() ? "today" : "", k === sel ? "sel" : ""].join(" ");
    h += `<button class="${c}" data-d="${k}">${d}</button>`;
  }
  $("cal").innerHTML = h;
}
$("prevM").onclick = () => { cm = new Date(cm.getFullYear(), cm.getMonth() - 1, 1); drawCal(); };
$("nextM").onclick = () => { cm = new Date(cm.getFullYear(), cm.getMonth() + 1, 1); drawCal(); };
$("cal").onclick = e => { const b = e.target.closest("button"); if (b) { sel = b.dataset.d; showTab("log"); } };

/* ---------- Log ---------- */
const SYM = ["Headache", "Back pain", "Bloating", "Nausea", "Acne", "Breast tenderness", "Fatigue", "Mood swings"];
const FLOW = ["Spotting", "Light", "Medium", "Heavy"];
const CT = ["No cramps. Great!", "Mild. A warm drink and light stretching can help.", "Mild to moderate. Try a heating pad and ginger tea.", "Moderate. Rest, heat, water and gentle stretches help.", "Strong. Heat, rest and fluids. Ask a doctor about a suitable pain reliever.", "Severe. If pain stops daily activity or is much worse than usual, please see a doctor."];
function renderLog() {
  const l = L(sel);
  $("logDate").textContent = parse(sel).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  $("startBtn").textContent = data.periods.includes(sel) ? "Remove 'period started' from this day" : "Mark period started on this day";
  $("flow").innerHTML = FLOW.map(f => `<button class="${l.flow === f ? "on" : ""}">${f}</button>`).join("");
  $("scale").innerHTML = [0, 1, 2, 3, 4, 5].map(n => `<button class="${l.cramp === n ? "on" : ""}" data-n="${n}">${n}</button>`).join("");
  $("crampTip").textContent = l.cramp === undefined ? "" : CT[l.cramp];
  $("sym").innerHTML = SYM.map(s => `<label><input type="checkbox" value="${s}" ${(l.sym || []).includes(s) ? "checked" : ""}>${s}</label>`).join("");
  $("note").value = l.note || "";
}
$("startBtn").onclick = () => {
  const i = data.periods.indexOf(sel); i >= 0 ? data.periods.splice(i, 1) : data.periods.push(sel);
  data.notifiedFor = null; save(); renderLog(); renderToday();
};
$("flow").onclick = e => { const b = e.target.closest("button"); if (!b) return; const l = W(sel); l.flow = l.flow === b.textContent ? "" : b.textContent; save(); renderLog(); };
$("scale").onclick = e => { const b = e.target.closest("button"); if (!b) return; W(sel).cramp = +b.dataset.n; save(); renderLog(); };
$("sym").onchange = () => { W(sel).sym = [...document.querySelectorAll("#sym input:checked")].map(x => x.value); save(); };
$("note").oninput = () => { W(sel).note = $("note").value; save(); };


/* ---------- Late / irregular period ---------- */
const fd = d => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
function gaps() {
  const p = [...data.periods].sort(), g = [];
  for (let i = Math.max(1, p.length - 8); i < p.length; i++) { const x = diff(parse(p[i]), parse(p[i - 1])); if (x >= 15 && x <= 90) g.push(x); }
  return g;
}
function cycleStats() {
  const g = gaps(); if (!g.length) return { g, irregular: false };
  const min = Math.min(...g), max = Math.max(...g);
  return { g, min, max, irregular: g.length >= 3 && max - min > 7 };
}
const lateState = {};
function renderLate(c) {
  const card = $("lateCard"); card.hidden = c.left >= 0; if (c.left >= 0) return;
  const n = -c.left;
  $("lateTitle").textContent = `Your period is ${n} day${n > 1 ? "s" : ""} late`;
  $("lateText").textContent = n <= 6
    ? "A delay of a few days is common and usually has a simple cause. Stay calm, keep tracking, and use the quick check below."
    : n <= 13 ? "It is more than a week late. If pregnancy is possible, take a home test, and note any changes you have had."
    : "It is two weeks or more late. Please talk to a doctor, even if you feel fine.";
}
document.querySelectorAll("#lateCard .opts").forEach(g => g.onclick = e => {
  const b = e.target.closest("button"); if (!b) return;
  lateState[g.dataset.k] = b.dataset.v; [...g.children].forEach(x => x.classList.toggle("on", x === b));
});
$("lateGo").onclick = () => {
  const c = calc(); if (!c) return; const n = -c.left, preg = lateState.preg || "no", warn = lateState.warn === "yes";
  const ch = [...document.querySelectorAll("#lateCh input:checked")].map(x => x.value.toLowerCase());
  let h, t;
  if (warn) { h = "Please get medical help soon"; t = ["Severe pain, very heavy bleeding, fainting or dizziness with a late period needs a doctor's check.", "If the pain is sudden and one-sided, or you could be pregnant, go to urgent care."]; }
  else if (preg !== "no") { h = "Take a pregnancy test"; t = ["Use a home test with morning urine, best from the first day your period is missed.", "If it is positive, or negative but there is still no period after a week, see a doctor.", "Until you know, avoid alcohol and smoking and eat folate-rich food like greens and lentils."]; }
  else if (n >= 14) { h = "Please see a doctor"; t = ["Two weeks or more late without a clear reason should be checked, even if you feel fine.", "Bring your Luna data (Insights tab, Download CSV) to the visit."]; }
  else { h = "Most likely a short delay"; t = [ch.length ? `Possible reasons you noted: ${ch.join(", ")}. These can shift ovulation and delay your period.` : "Common causes are stress, poor sleep, travel, illness, weight change or hard exercise.", "Rest, sleep well, eat regular balanced meals and stay hydrated.", "Keep logging. If it has not come in 7 days, take a test. At 14 days, see a doctor.", "Repeated late or very irregular periods can be linked to conditions like PCOS or thyroid problems, so mention them to a doctor."]; }
  $("lateResult").innerHTML = `<h3>${h}</h3><ul>${t.map(x => `<li>${x}</li>`).join("")}</ul>`; $("lateResult").hidden = false;
};
$("startToday").onclick = () => {
  if (!data.periods.includes(TODAY())) data.periods.push(TODAY());
  delete data.snoozeUntil; data.notifiedFor = null; save(); $("lateResult").hidden = true; renderToday(); banner("Period logged. Your cycle is updated.");
};
$("snooze").onclick = () => { data.snoozeUntil = fmt(addDays(todayD(), 3)); save(); banner(`Okay, I will remind you again on ${fd(addDays(todayD(), 3))}.`); };
function drawCycles() {
  const c = $("cycleChart"), x = c.getContext("2d"), w = c.width, h = c.height, ink = getComputedStyle(document.body).color, g = gaps(), top = 70;
  x.clearRect(0, 0, w, h); x.fillStyle = ink; x.font = "12px DM Sans, sans-serif";
  if (!g.length) return x.fillText("Log at least 2 period starts to see your cycle lengths.", 10, 30);
  const y = v => h - 24 - (v / top) * (h - 40);
  x.fillStyle = "rgba(79,181,154,.25)"; x.fillRect(0, y(35), w, y(21) - y(35));
  const bw = w / 8;
  g.forEach((v, i) => { x.fillStyle = v < 21 || v > 35 ? "#b0306a" : "#7b5ea7"; x.fillRect(i * bw + 8, y(v), bw - 16, h - 24 - y(v)); x.fillStyle = ink; x.fillText(v, i * bw + bw / 2 - 6, y(v) - 4); });
}

/* ---------- Insights ---------- */
function renderInsights() {
  const ps = [...data.periods].sort(), last = ps.length ? parse(ps[ps.length - 1]).toLocaleDateString(undefined, { day: "numeric", month: "short" }) : "–";
  $("stats").textContent = `Average cycle: ${avgCycle()} days (${ps.length > 1 ? "from your logged periods" : "your estimate; log more periods to improve it"}). Periods logged: ${ps.length}. Last start: ${last}.` + (() => { const cs = cycleStats(); if (!cs.g.length) return ""; let m = cs.irregular ? ` Your cycles are irregular (they vary by ${cs.max - cs.min} days), so predictions show a window.` : " Your cycles look regular so far."; if (cs.g.some(v => v < 21 || v > 35)) m += " Some cycles were outside 21 to 35 days. It is worth mentioning to a doctor."; return m; })();
  const by = {};
  Object.entries(data.logs).forEach(([d, l]) => { if (l.cramp === undefined) return; const ls = lastStartOn(d); if (!ls) return; const day = diff(parse(d), parse(ls)) + 1; (by[day] = by[day] || []).push(l.cramp); });
  const rows = Object.entries(by).map(([d, a]) => [+d, a.reduce((x, y) => x + y) / a.length]).sort((a, b) => b[1] - a[1]);
  const total = Object.values(by).reduce((n, a) => n + a.length, 0);
  $("pattern").textContent = total < 3 ? "Log cramps on a few days to see your pattern." : `Your cramps are usually strongest on cycle day ${rows[0][0]} (average ${rows[0][1].toFixed(1)} out of 5).`;
  drawCycles(); drawMood();
}
function drawMood() {
  const c = $("moodChart"), x = c.getContext("2d"), w = c.width, h = c.height, ink = getComputedStyle(document.body).color;
  x.clearRect(0, 0, w, h); x.fillStyle = ink; x.font = "12px DM Sans, sans-serif";
  const e = Object.keys(data.logs).filter(k => data.logs[k].mood !== undefined).sort().slice(-14);
  if (!e.length) return x.fillText("Complete the mood check-in on the Today tab to see your chart.", 10, 30);
  const bw = w / 14;
  e.forEach((k, i) => {
    const v = data.logs[k].mood, bh = (v / 15) * (h - 40) + 4;
    x.fillStyle = v <= 4 ? "#4fb59a" : v <= 9 ? "#e0b043" : "#b0306a"; x.fillRect(i * bw + 5, h - 22 - bh, bw - 10, bh);
    x.fillStyle = ink; x.fillText(k.slice(8), i * bw + 8, h - 6);
  });
}
$("csvBtn").onclick = () => {
  const r = [["date", "period_start", "flow", "cramp", "mood_score", "symptoms", "water_glasses", "note"]];
  Object.keys(data.logs).sort().forEach(d => { const l = data.logs[d]; r.push([d, data.periods.includes(d) ? "yes" : "", l.flow || "", l.cramp ?? "", l.mood ?? "", (l.sym || []).join("; "), l.water ?? "", (l.note || "").replace(/"/g, '""')]); });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([r.map(x => x.map(v => `"${v}"`).join(",")).join("\n")], { type: "text/csv" }));
  a.download = "luna-data.csv"; a.click();
};

/* ---------- Care ---------- */
let breathing, bT;
$("breathBtn").onclick = () => {
  breathing = !breathing; clearInterval(bT); const b = $("breath"), t = $("breathTxt");
  if (!breathing) { b.classList.remove("in"); t.textContent = "Start"; return; }
  let inn = true; const go = () => { b.classList.toggle("in", inn); t.textContent = inn ? "Breathe in" : "Breathe out"; inn = !inn; };
  go(); bT = setInterval(go, 4000);
};
$("suppBtn").onclick = () => { data.supp = { name: $("suppName").value || "supplement", time: $("suppTime").value }; save(); $("suppNote").textContent = data.supp.time ? `Reminder set for ${data.supp.time} daily (while this page is open).` : "Pick a time."; };
setInterval(() => {
  if (!data.supp || !data.supp.time) return; const n = new Date(), hm = String(n.getHours()).padStart(2, "0") + ":" + String(n.getMinutes()).padStart(2, "0");
  if (hm === data.supp.time && data.suppDone !== TODAY()) { data.suppDone = TODAY(); save(); notify("Luna", `Time for your ${data.supp.name}.`); banner(`Time for your ${data.supp.name}.`); }
}, 20000);
$("pinSet").onclick = () => { const p = $("pinNew").value; if (!/^\d{4}$/.test(p)) return alert("Enter exactly 4 digits."); data.pin = p; save(); alert("PIN set."); };
$("pinOff").onclick = () => { delete data.pin; save(); alert("PIN removed."); };
$("unlockBtn").onclick = () => { if ($("pinIn").value === data.pin) { $("lock").hidden = true; $("pinIn").value = ""; } else $("pinErr").textContent = "Wrong PIN."; };
$("resetBtn").onclick = () => { if (confirm("Delete all Luna data on this device?")) { localStorage.removeItem(KEY); location.reload(); } };

/* ---------- init ---------- */
setTheme(data.theme || "light");
if (data.pin) $("lock").hidden = false;
if (data.supp) { $("suppName").value = data.supp.name; $("suppTime").value = data.supp.time; }
$("remindEvery").value = String(data.remind ?? 90);
if ("Notification" in window && Notification.permission === "granted") $("notifyBtn").textContent = "Notifications on ✓";
renderToday(); setWaterReminder();
