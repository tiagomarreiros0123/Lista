/* ═══════════════════════════════════════════════════
   KAMILLY & TIAGO — script.js
   Armazenamento em nuvem via GitHub Gist
   ═══════════════════════════════════════════════════

   CONFIGURAÇÃO (faça isso uma vez):
   1. Acesse https://github.com/settings/tokens
   2. Clique em "Generate new token (classic)"
   3. Marque apenas a permissão: "gist"
   4. Copie o token gerado
   5. Cole abaixo em GITHUB_TOKEN
   6. Deixe GIST_ID em branco na primeira vez —
      o sistema cria o Gist automaticamente e salva o ID.
   ═══════════════════════════════════════════════════ */

const CONFIG = {
  GITHUB_TOKEN: "",   // ← Cole seu token aqui
  GIST_ID:      "",   // ← Deixe vazio; será preenchido automaticamente
};

/* ─────────────────────────────────────────
   ESTADO
───────────────────────────────────────── */
let gifts   = [];
let pixData = { key: "", name: "" };
let pendingImg = null;
let isSaving   = false;

const DEFAULT_PW = "kamilly2027";
const LS_PW      = "kt_pw";
const LS_GIST    = "kt_gist_id";

/* ─────────────────────────────────────────
   GITHUB GIST — HELPERS
───────────────────────────────────────── */
function getGistId() {
  return CONFIG.GIST_ID || localStorage.getItem(LS_GIST) || "";
}

function getHeaders() {
  return {
    "Content-Type":  "application/json",
    "Authorization": `token ${CONFIG.GITHUB_TOKEN}`,
    "Accept":        "application/vnd.github.v3+json",
  };
}

async function gistLoad() {
  const id = getGistId();
  if (!id) return null;
  try {
    const res  = await fetch(`https://api.github.com/gists/${id}`, { headers: getHeaders() });
    if (!res.ok) return null;
    const data = await res.json();
    const raw  = data.files["wedding-data.json"]?.content;
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

async function gistSave(payload) {
  const body = { files: { "wedding-data.json": { content: JSON.stringify(payload, null, 2) } } };
  const id   = getGistId();

  if (id) {
    /* atualiza gist existente */
    const res = await fetch(`https://api.github.com/gists/${id}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Falha ao salvar no GitHub");
  } else {
    /* cria novo gist */
    const res = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ...body, description: "Kamilly & Tiago — Lista de Presentes", public: false }),
    });
    if (!res.ok) throw new Error("Falha ao criar Gist");
    const data = await res.json();
    localStorage.setItem(LS_GIST, data.id);
    CONFIG.GIST_ID = data.id;
  }
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
async function init() {
  startCountdown();

  if (!CONFIG.GITHUB_TOKEN) {
    /* sem token: usa localStorage como fallback */
    const local = localStorage.getItem("kt_local");
    if (local) {
      const d = JSON.parse(local);
      gifts   = d.gifts   || [];
      pixData = d.pixData || { key: "", name: "" };
    }
    renderGifts();
    renderPix();
    return;
  }

  showStatus("Carregando…");
  const data = await gistLoad();
  if (data) {
    gifts   = data.gifts   || [];
    pixData = data.pixData || { key: "", name: "" };
  }
  renderGifts();
  renderPix();
  showStatus("");
}

/* ─────────────────────────────────────────
   SALVAR (Gist ou localStorage)
───────────────────────────────────────── */
async function persist() {
  const payload = { gifts, pixData };
  if (CONFIG.GITHUB_TOKEN) {
    await gistSave(payload);
  } else {
    localStorage.setItem("kt_local", JSON.stringify(payload));
  }
}

/* ─────────────────────────────────────────
   RENDER GIFTS
───────────────────────────────────────── */
function renderGifts() {
  const grid  = document.getElementById("gifts-grid");
  const empty = document.getElementById("empty-state");

  [...grid.children].forEach(c => { if (c !== empty) c.remove(); });

  if (gifts.length === 0) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  gifts.forEach((g, i) => {
    const card = document.createElement("div");
    card.className = "gift-card";
    card.style.animationDelay = (i * 0.07) + "s";

    const imgHtml = g.img
      ? `<div class="gift-img"><img src="${g.img}" alt="${esc(g.name)}" loading="lazy"></div>`
      : `<div class="gift-no-img">
           <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
           <span>sem foto</span>
         </div>`;

    card.innerHTML = `
      ${imgHtml}
      <div class="gift-body">
        ${g.cat  ? `<p class="gift-cat">${esc(g.cat)}</p>` : ""}
        <h3 class="gift-name">${esc(g.name)}</h3>
        ${g.desc ? `<p class="gift-desc">${esc(g.desc)}</p>` : ""}
        <div class="gift-foot">
          ${g.link ? `<a href="${esc(g.link)}" target="_blank" rel="noopener" class="btn-link">
            Ver presente
            <svg viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          </a>` : ""}
        </div>
      </div>`;
    grid.appendChild(card);
  });
}

/* ─────────────────────────────────────────
   RENDER PIX
───────────────────────────────────────── */
function renderPix() {
  document.getElementById("pix-key-display").textContent = pixData.key || "—";
  document.getElementById("pix-name-display").textContent = pixData.name ? "Em nome de: " + pixData.name : "";
}

/* ─────────────────────────────────────────
   COPY PIX
───────────────────────────────────────── */
function copyPix() {
  if (!pixData.key || pixData.key === "—") return;
  navigator.clipboard.writeText(pixData.key).then(() => {
    const t = document.getElementById("pix-toast");
    t.textContent = "✓ Chave copiada!";
    setTimeout(() => (t.textContent = ""), 2800);
  });
}

/* ─────────────────────────────────────────
   COUNTDOWN
───────────────────────────────────────── */
function startCountdown() {
  const target = new Date("2027-11-20T18:30:00");
  function tick() {
    const diff = target - new Date();
    if (diff <= 0) return;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);
    document.getElementById("cd-d").textContent = String(d).padStart(3, "0");
    document.getElementById("cd-h").textContent = String(h).padStart(2, "0");
    document.getElementById("cd-m").textContent = String(m).padStart(2, "0");
    document.getElementById("cd-s").textContent = String(s).padStart(2, "0");
  }
  tick();
  setInterval(tick, 1000);
}

/* ─────────────────────────────────────────
   IMAGE UPLOAD
───────────────────────────────────────── */
function handleImg(e) {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) { showStatus("Imagem muito grande (máx 2MB)"); return; }
  const reader = new FileReader();
  reader.onload = ev => {
    pendingImg = ev.target.result;
    const area = document.getElementById("img-upload");
    const prev = document.getElementById("img-preview");
    const ph   = document.getElementById("img-placeholder");
    prev.src = pendingImg;
    prev.style.display = "block";
    ph.style.display   = "none";
    area.classList.add("has-img");
  };
  reader.readAsDataURL(file);
}

function resetImgUpload() {
  pendingImg = null;
  document.getElementById("img-preview").style.display = "none";
  document.getElementById("img-placeholder").style.display = "block";
  document.getElementById("img-upload").classList.remove("has-img");
  document.getElementById("f-img").value = "";
}

/* ─────────────────────────────────────────
   ADD GIFT
───────────────────────────────────────── */
async function addGift() {
  const name = document.getElementById("f-name").value.trim();
  if (!name) { document.getElementById("f-name").focus(); return; }
  if (isSaving) return;

  isSaving = true;
  const btn = document.getElementById("btn-add");
  btn.disabled = true;
  btn.textContent = "Salvando…";

  gifts.push({
    name,
    cat:  document.getElementById("f-cat").value.trim(),
    desc: document.getElementById("f-desc").value.trim(),
    link: document.getElementById("f-link").value.trim(),
    img:  pendingImg || null,
  });

  try {
    await persist();
    ["f-name","f-cat","f-desc","f-link"].forEach(id => document.getElementById(id).value = "");
    resetImgUpload();
    renderGifts();
    renderAdminList();
    showStatus("✓ Presente adicionado!");
  } catch (err) {
    gifts.pop();
    showStatus("Erro ao salvar. Verifique o token.");
    console.error(err);
  } finally {
    isSaving = false;
    btn.disabled = false;
    btn.textContent = "Adicionar à lista";
  }
}

/* ─────────────────────────────────────────
   REMOVE GIFT
───────────────────────────────────────── */
async function removeGift(i) {
  if (!confirm("Remover este presente da lista?")) return;
  const removed = gifts.splice(i, 1);
  try {
    await persist();
    renderGifts();
    renderAdminList();
    showStatus("Presente removido");
  } catch (err) {
    gifts.splice(i, 0, ...removed);
    showStatus("Erro ao remover.");
  }
}

/* ─────────────────────────────────────────
   SAVE PIX
───────────────────────────────────────── */
async function savePix() {
  const k = document.getElementById("p-key").value.trim();
  const n = document.getElementById("p-name").value.trim();
  if (!k && !n) return;
  if (k) pixData.key  = k;
  if (n) pixData.name = n;
  try {
    await persist();
    renderPix();
    showStatus("✓ Pix salvo!");
  } catch {
    showStatus("Erro ao salvar Pix.");
  }
}

/* ─────────────────────────────────────────
   ADMIN LIST
───────────────────────────────────────── */
function renderAdminList() {
  const el = document.getElementById("admin-list");
  if (gifts.length === 0) {
    el.innerHTML = '<p style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:18px;color:var(--m5);text-align:center;padding:24px 0">Nenhum presente ainda</p>';
    return;
  }
  el.innerHTML = gifts.map((g, i) => `
    <div class="admin-item">
      ${g.img ? `<img class="admin-item-thumb" src="${g.img}" alt="">` : `<div class="admin-item-thumb" style="display:flex;align-items:center;justify-content:center"><svg width="16" height="16" viewBox="0 0 24 24" style="stroke:rgba(196,104,125,0.4);fill:none;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg></div>`}
      <span class="admin-item-name">${esc(g.name)}</span>
      <button class="btn-del" onclick="removeGift(${i})">Remover</button>
    </div>`).join("");
}

/* ─────────────────────────────────────────
   PASSWORD
───────────────────────────────────────── */
function getPw() { return localStorage.getItem(LS_PW) || DEFAULT_PW; }

function openPwModal() {
  openOverlay("pw-overlay");
  setTimeout(() => document.getElementById("pw-input").focus(), 200);
}

function checkPw() {
  const val = document.getElementById("pw-input").value;
  const err = document.getElementById("pw-err");
  if (val === getPw()) {
    err.style.display = "none";
    document.getElementById("pw-input").value = "";
    closeOverlay("pw-overlay");
    openOverlay("admin-overlay");
    renderAdminList();
    document.getElementById("p-key").value  = pixData.key;
    document.getElementById("p-name").value = pixData.name;
  } else {
    err.style.display = "block";
    document.getElementById("pw-input").select();
  }
}

function changePw() {
  const n = document.getElementById("pw-new").value;
  const c = document.getElementById("pw-confirm").value;
  if (n.length < 4) { showStatus("Senha muito curta"); return; }
  if (n !== c)       { showStatus("As senhas não coincidem"); return; }
  localStorage.setItem(LS_PW, n);
  document.getElementById("pw-new").value    = "";
  document.getElementById("pw-confirm").value = "";
  showStatus("✓ Senha alterada!");
}

/* ─────────────────────────────────────────
   TABS
───────────────────────────────────────── */
function switchTab(id, btn) {
  ["tab-add","tab-list","tab-pix","tab-pw"].forEach(t => {
    document.getElementById(t).style.display = t === id ? "block" : "none";
  });
  document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
}

/* ─────────────────────────────────────────
   OVERLAY HELPERS
───────────────────────────────────────── */
function openOverlay(id)  { document.getElementById(id).classList.add("open"); }
function closeOverlay(id) {
  document.getElementById(id).classList.remove("open");
  if (id === "pw-overlay") document.getElementById("pw-err").style.display = "none";
}

document.querySelectorAll(".overlay").forEach(el => {
  el.addEventListener("click", e => { if (e.target === el) closeOverlay(el.id); });
});

/* ─────────────────────────────────────────
   STATUS BAR
───────────────────────────────────────── */
let statusTimer;
function showStatus(msg) {
  const el = document.getElementById("status-bar");
  el.textContent = msg;
  if (!msg) { el.classList.remove("show"); return; }
  el.classList.add("show");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.classList.remove("show"), 3000);
}

/* ─────────────────────────────────────────
   UTILS
───────────────────────────────────────── */
function esc(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

/* ─────────────────────────────────────────
   START
───────────────────────────────────────── */
init();
