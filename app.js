const STORAGE_KEY = "kumas-dock-v1.3";
const LEGACY_STORAGE_KEYS = ["kumas-dock-v1.2", "kumas-dock-v1.1", "kumas-dock-v1"];
const GOOGLE_CONFIG_KEY = "kumas-dock-google-config";
const DRIVE_FILE_NAME = "kumas-dock-data.json";
const LEGACY_DRIVE_FILE_NAMES = ["kumas-dock-v1.1.json"];
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const PIN_ITERATIONS = 150000;

function createId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createDefaultState() {
  return {
    version: "1.3",
    layout: "grid",
    collapsed: {},
    updatedAt: null,
    googleClientId: "",
    background: { source: "", opacity: 35, temperature: 0 },
    lock: { enabled: false, salt: "", verifier: "", iterations: PIN_ITERATIONS },
    links: [
      { id: createId(), name: "Google Calendar", url: "https://calendar.google.com", category: "日常", icon: "31", color: "#52677a", note: "行程與排班" },
      { id: createId(), name: "Google Drive", url: "https://drive.google.com", category: "日常", icon: "D", color: "#65725d", note: "檔案與備份" },
      { id: createId(), name: "ChatGPT", url: "https://chatgpt.com", category: "工具", icon: "✦", color: "#353b39", note: "工作與研究" },
      { id: createId(), name: "GitHub", url: "https://github.com", category: "工具", icon: "GH", color: "#46464b", note: "專案與版本" }
    ]
  };
}

const elements = {
  pages: document.querySelectorAll(".page"),
  navLinks: document.querySelectorAll("[data-page-link]"),
  categories: document.querySelector("#categories"),
  emptyState: document.querySelector("#empty-state"),
  addButtons: [document.querySelector("#add-link-button"), document.querySelector("#empty-add-button")],
  dialog: document.querySelector("#link-dialog"),
  form: document.querySelector("#link-form"),
  formTitle: document.querySelector("#dialog-title"),
  formEyebrow: document.querySelector("#dialog-eyebrow"),
  id: document.querySelector("#link-id"),
  name: document.querySelector("#link-name"),
  url: document.querySelector("#link-url"),
  note: document.querySelector("#link-note"),
  category: document.querySelector("#link-category"),
  icon: document.querySelector("#link-icon"),
  color: document.querySelector("#link-color"),
  colorText: document.querySelector("#link-color-text"),
  categorySuggestions: document.querySelector("#category-suggestions"),
  deleteButton: document.querySelector("#delete-link-button"),
  closeButton: document.querySelector("#close-dialog"),
  cancelButton: document.querySelector("#cancel-dialog"),
  linkCount: document.querySelector("#link-count"),
  categoryCount: document.querySelector("#category-count"),
  backgroundLayer: document.querySelector("#background-image-layer"),
  backgroundTemperatureLayer: document.querySelector("#background-temperature-layer"),
  backgroundPreview: document.querySelector("#background-preview"),
  backgroundUrl: document.querySelector("#background-url"),
  backgroundUpload: document.querySelector("#background-upload"),
  applyBackgroundUrl: document.querySelector("#apply-background-url"),
  clearBackground: document.querySelector("#clear-background"),
  backgroundOpacity: document.querySelector("#background-opacity"),
  backgroundOpacityValue: document.querySelector("#background-opacity-value"),
  backgroundTemperature: document.querySelector("#background-temperature"),
  backgroundTemperatureValue: document.querySelector("#background-temperature-value"),
  toast: document.querySelector("#toast"),
  categoryTemplate: document.querySelector("#category-template"),
  linkTemplate: document.querySelector("#link-template"),
  googleInput: document.querySelector("#google-oauth-input"),
  authorizedOrigin: document.querySelector("#authorized-origin"),
  saveGoogleConfig: document.querySelector("#save-google-config"),
  connectGoogle: document.querySelector("#connect-google"),
  syncGoogle: document.querySelector("#sync-google"),
  googleStatus: document.querySelector("#google-status"),
  syncNote: document.querySelector("#sync-note"),
  lockButton: document.querySelector("#lock-button"),
  pinStatus: document.querySelector("#pin-status"),
  changePinButton: document.querySelector("#change-pin-button"),
  pinDialog: document.querySelector("#pin-dialog"),
  pinForm: document.querySelector("#pin-form"),
  pinDialogTitle: document.querySelector("#pin-dialog-title"),
  currentPinField: document.querySelector("#current-pin-field"),
  currentPin: document.querySelector("#current-pin"),
  newPin: document.querySelector("#new-pin"),
  confirmPin: document.querySelector("#confirm-pin"),
  pinFormError: document.querySelector("#pin-form-error"),
  closePinDialog: document.querySelector("#close-pin-dialog"),
  cancelPinDialog: document.querySelector("#cancel-pin-dialog"),
  lockScreen: document.querySelector("#lock-screen"),
  unlockForm: document.querySelector("#unlock-form"),
  unlockPin: document.querySelector("#unlock-pin"),
  unlockError: document.querySelector("#unlock-error")
};

let localStateWasSaved = Boolean(localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.some((key) => localStorage.getItem(key)));
let state = loadState();
let accessToken = "";
let driveFileId = "";
let cloudSaveTimer;
let toastTimer;
let syncing = false;
let pinDialogShouldLock = false;
let sessionUnlocked = false;

function sanitizeState(raw) {
  const fallback = createDefaultState();
  if (!raw || !Array.isArray(raw.links)) return fallback;
  return {
    version: "1.3",
    layout: raw.layout === "list" ? "list" : "grid",
    collapsed: raw.collapsed && typeof raw.collapsed === "object" ? raw.collapsed : {},
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : null,
    googleClientId: typeof raw.googleClientId === "string" ? raw.googleClientId : "",
    background: {
      source: typeof raw.background?.source === "string" ? raw.background.source : "",
      opacity: clampNumber(raw.background?.opacity, 0, 100, 35),
      temperature: clampNumber(raw.background?.temperature, -100, 100, 0)
    },
    lock: raw.lock?.enabled && raw.lock.salt && raw.lock.verifier ? {
      enabled: true,
      salt: String(raw.lock.salt),
      verifier: String(raw.lock.verifier),
      iterations: Number(raw.lock.iterations) || PIN_ITERATIONS
    } : fallback.lock,
    links: raw.links.filter(isValidLink).map((link) => ({ ...link, note: typeof link.note === "string" ? link.note : "" }))
  };
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean);
    return saved ? sanitizeState(JSON.parse(saved)) : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

function isValidLink(link) {
  return link && ["id", "name", "url", "category", "icon", "color"].every((key) => typeof link[key] === "string");
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function saveStateLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  localStateWasSaved = true;
}

function markChanged({ render = true } = {}) {
  state.updatedAt = new Date().toISOString();
  saveStateLocal();
  if (render) renderAll();
  queueCloudSave();
}

function safeUrl(value) {
  const trimmed = value.trim();
  const withProtocol = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Unsupported protocol");
  return url.href;
}

function getHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch { return url; }
}

function showPage(pageName) {
  elements.pages.forEach((page) => page.classList.toggle("is-active", page.id === `${pageName}-page`));
  document.querySelectorAll(".fab[data-page-link]").forEach((tab) => {
    const active = tab.dataset.pageLink === pageName;
    tab.classList.toggle("is-active", active);
    if (active) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });
  if (pageName === "settings") renderSettings();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function groupedLinks() {
  return state.links.reduce((groups, link) => {
    const category = link.category.trim() || "未分類";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(link);
    return groups;
  }, new Map());
}

function renderDock() {
  elements.categories.replaceChildren();
  const groups = groupedLinks();
  elements.emptyState.hidden = state.links.length !== 0;

  groups.forEach((links, categoryName) => {
    const fragment = elements.categoryTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".category-section");
    const header = fragment.querySelector(".category-header");
    const collection = fragment.querySelector(".link-collection");
    const isCollapsed = Boolean(state.collapsed[categoryName]);

    fragment.querySelector(".category-name").textContent = categoryName;
    fragment.querySelector(".category-count").textContent = links.length;
    fragment.querySelector(".collapse-label").textContent = isCollapsed ? "展開" : "收合";
    section.classList.toggle("is-collapsed", isCollapsed);
    collection.classList.toggle("list-layout", state.layout === "list");
    header.setAttribute("aria-expanded", String(!isCollapsed));

    header.addEventListener("click", () => {
      const collapsing = !state.collapsed[categoryName];
      state.collapsed[categoryName] = collapsing;
      header.setAttribute("aria-expanded", String(!collapsing));
      section.querySelector(".collapse-label").textContent = collapsing ? "展開" : "收合";

      if (collapsing) {
        collection.style.height = `${collection.scrollHeight}px`;
        collection.style.opacity = "1";
        requestAnimationFrame(() => {
          section.classList.add("is-collapsed");
          collection.style.height = "0px";
          collection.style.opacity = "0";
        });
      } else {
        section.classList.remove("is-collapsed");
        collection.style.height = "0px";
        collection.style.opacity = "0";
        requestAnimationFrame(() => {
          collection.style.height = `${collection.scrollHeight}px`;
          collection.style.opacity = "1";
        });
      }

      const finishAnimation = (event) => {
        if (event.propertyName !== "height") return;
        if (!state.collapsed[categoryName]) collection.style.height = "auto";
        collection.removeEventListener("transitionend", finishAnimation);
      };
      collection.addEventListener("transitionend", finishAnimation);
      markChanged({ render: false });
    });

    links.forEach((link) => collection.append(createLinkCard(link)));
    elements.categories.append(fragment);
  });
}

function createLinkCard(link) {
  const fragment = elements.linkTemplate.content.cloneNode(true);
  const article = fragment.querySelector(".dock-item");
  const anchor = fragment.querySelector(".dock-link");
  anchor.href = link.url;
  anchor.style.setProperty("--link-color", link.color);
  anchor.setAttribute("aria-label", `開啟 ${link.name}`);
  fragment.querySelector(".link-icon").textContent = link.icon;
  fragment.querySelector(".link-name").textContent = link.name;
  const note = fragment.querySelector(".link-note");
  note.textContent = link.note;
  note.hidden = !link.note;
  fragment.querySelector(".link-host").textContent = getHost(link.url);
  fragment.querySelector(".edit-link-button").addEventListener("click", () => openLinkDialog(link));
  return article;
}

function renderSettings() {
  document.querySelectorAll('input[name="layout"]').forEach((radio) => { radio.checked = radio.value === state.layout; });
  const categories = groupedLinks();
  elements.linkCount.textContent = state.links.length;
  elements.categoryCount.textContent = categories.size;
  elements.categorySuggestions.replaceChildren(...Array.from(categories.keys()).map((name) => {
    const option = document.createElement("option");
    option.value = name;
    return option;
  }));
  elements.pinStatus.textContent = state.lock.enabled ? "已啟用" : "尚未設定";
  elements.pinStatus.classList.toggle("is-connected", state.lock.enabled);
  elements.changePinButton.textContent = state.lock.enabled ? "修改 PIN" : "設定 PIN";
  elements.backgroundUrl.value = state.background.source.startsWith("http") ? state.background.source : "";
  elements.backgroundOpacity.value = state.background.opacity;
  elements.backgroundTemperature.value = state.background.temperature;
  updateBackgroundValueLabels();
}

function renderAll() {
  renderDock();
  renderSettings();
  applyBackground();
}

function temperatureLabel(value) {
  if (value <= -70) return "偏冷";
  if (value <= -20) return "微冷";
  if (value >= 70) return "偏暖";
  if (value >= 20) return "微暖";
  return "中性";
}

function updateBackgroundValueLabels() {
  elements.backgroundOpacityValue.value = `${state.background.opacity}%`;
  elements.backgroundTemperatureValue.value = temperatureLabel(state.background.temperature);
}

function backgroundImageValue(source) {
  return source ? `url(${JSON.stringify(source)})` : "none";
}

function applyBackground() {
  const { source, opacity, temperature } = state.background;
  const image = backgroundImageValue(source);
  elements.backgroundLayer.style.backgroundImage = image;
  elements.backgroundLayer.style.opacity = source ? String(opacity / 100) : "0";
  elements.backgroundPreview.style.backgroundImage = image;
  elements.backgroundPreview.classList.toggle("has-image", Boolean(source));

  const intensity = source ? Math.abs(temperature) / 100 : 0;
  elements.backgroundTemperatureLayer.style.backgroundColor = temperature < 0 ? "#4d92ff" : "#ff9c4d";
  elements.backgroundTemperatureLayer.style.opacity = String(intensity * 0.42 * (opacity / 100));
  updateBackgroundValueLabels();
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("無法讀取這張圖片"));
    };
    image.src = objectUrl;
  });
}

function resizeImage(image, maxDimension, quality) {
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#e8e8e5";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/webp", quality);
}

async function compressBackground(file) {
  if (!file.type.startsWith("image/")) throw new Error("請選擇圖片檔案");
  if (file.size > 20 * 1024 * 1024) throw new Error("原始圖片請勿超過 20 MB");
  const image = await loadImageFile(file);
  let dataUrl = resizeImage(image, 1920, 0.82);
  if (dataUrl.length > 2000000) dataUrl = resizeImage(image, 1280, 0.72);
  if (dataUrl.length > 2000000) throw new Error("圖片壓縮後仍過大，請改用較小的圖片");
  return dataUrl;
}

function openLinkDialog(link = null) {
  elements.form.reset();
  const editing = Boolean(link);
  elements.formTitle.textContent = editing ? "編輯連結" : "新增連結";
  elements.formEyebrow.textContent = editing ? "EDIT SHORTCUT" : "NEW SHORTCUT";
  elements.deleteButton.hidden = !editing;
  elements.id.value = link?.id ?? "";
  elements.name.value = link?.name ?? "";
  elements.url.value = link?.url ?? "";
  elements.note.value = link?.note ?? "";
  elements.category.value = link?.category ?? (groupedLinks().keys().next().value || "日常");
  elements.icon.value = link?.icon ?? "↗";
  elements.color.value = link?.color ?? "#525252";
  elements.colorText.value = link?.color ?? "#525252";
  elements.dialog.showModal();
  requestAnimationFrame(() => elements.name.focus());
}

function closeLinkDialog() { elements.dialog.close(); }

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2200);
}

function parseClientId(value) {
  const input = value.trim();
  if (!input) throw new Error("請先填入 OAuth 用戶端 ID 或授權連結");
  if (/^[\w-]+\.apps\.googleusercontent\.com$/.test(input)) return input;
  try {
    const url = new URL(input);
    const clientId = url.searchParams.get("client_id");
    if (clientId && /^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId)) return clientId;
  } catch { /* handled below */ }
  throw new Error("找不到有效的 Google OAuth client_id");
}

function readGoogleConfig() {
  try { return JSON.parse(localStorage.getItem(GOOGLE_CONFIG_KEY)) || {}; }
  catch { return {}; }
}

function persistGoogleConfig(clientId) {
  localStorage.setItem(GOOGLE_CONFIG_KEY, JSON.stringify({ clientId }));
  state.googleClientId = clientId;
  saveStateLocal();
  elements.googleInput.value = clientId;
}

function setGoogleStatus(text, type = "") {
  elements.googleStatus.textContent = text;
  elements.googleStatus.classList.toggle("is-connected", type === "connected");
  elements.googleStatus.classList.toggle("is-warning", type === "warning");
}

async function requestGoogleAccess(clientId) {
  if (!window.google?.accounts?.oauth2) throw new Error("Google 登入元件尚未載入，請稍後再試");
  return new Promise((resolve, reject) => {
    const client = google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response?.access_token) resolve(response.access_token);
        else reject(new Error(response?.error_description || "Google 授權未完成"));
      },
      error_callback: () => reject(new Error("Google 登入視窗已關閉或無法開啟"))
    });
    client.requestAccessToken({ prompt: "" });
  });
}

async function driveRequest(path, options = {}) {
  const response = await fetch(`https://www.googleapis.com${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) }
  });
  if (response.status === 401) {
    accessToken = "";
    elements.syncGoogle.disabled = true;
    setGoogleStatus("連線已逾時", "warning");
    throw new Error("Google 連線已逾時，請重新登入");
  }
  if (!response.ok) {
    let detail = "";
    try { detail = (await response.json())?.error?.message || ""; } catch { /* ignore */ }
    throw new Error(detail || `Google Drive 同步失敗 (${response.status})`);
  }
  return response;
}

async function findDriveFile() {
  const nameQuery = [DRIVE_FILE_NAME, ...LEGACY_DRIVE_FILE_NAMES].map((name) => `name='${name}'`).join(" or ");
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `(${nameQuery}) and trashed=false`,
    fields: "files(id,name,modifiedTime)",
    pageSize: "10"
  });
  const response = await driveRequest(`/drive/v3/files?${params}`);
  const data = await response.json();
  return data.files?.find((file) => file.name === DRIVE_FILE_NAME) || data.files?.[0] || null;
}

async function renameDriveFile(fileId) {
  await driveRequest(`/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: DRIVE_FILE_NAME })
  });
}

async function downloadDriveState(fileId) {
  const response = await driveRequest(`/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`);
  return sanitizeState(await response.json());
}

async function createDriveFile() {
  const boundary = `kumas-dock-${createId()}`;
  const metadata = JSON.stringify({ name: DRIVE_FILE_NAME, parents: ["appDataFolder"] });
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    JSON.stringify(state),
    `--${boundary}--`,
    ""
  ].join("\r\n");
  const response = await driveRequest("/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  driveFileId = (await response.json()).id;
}

async function uploadDriveState() {
  if (!driveFileId) return createDriveFile();
  await driveRequest(`/upload/drive/v3/files/${encodeURIComponent(driveFileId)}?uploadType=media`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(state)
  });
}

async function syncWithDrive({ forceUpload = false } = {}) {
  if (!accessToken || syncing) return;
  syncing = true;
  setGoogleStatus("同步中…", "warning");
  elements.syncNote.textContent = "正在讀取 Google Drive App Data…";
  try {
    const file = await findDriveFile();
    if (!file) {
      await createDriveFile();
    } else {
      driveFileId = file.id;
      const cloudState = await downloadDriveState(file.id);
      if (file.name !== DRIVE_FILE_NAME) await renameDriveFile(file.id);
      const cloudTime = Date.parse(cloudState.updatedAt || 0);
      const localTime = Date.parse(state.updatedAt || 0);
      if (!forceUpload && (!localStateWasSaved || cloudTime >= localTime)) {
        state = cloudState;
        const currentClientId = parseClientId(elements.googleInput.value);
        state.googleClientId ||= currentClientId;
        saveStateLocal();
        renderAll();
        if (state.lock.enabled && !sessionUnlocked) showLockScreen();
      } else {
        await uploadDriveState();
      }
    }
    setGoogleStatus("已同步", "connected");
    elements.syncNote.textContent = `上次同步：${new Date().toLocaleString("zh-TW", { hour12: false })}`;
  } catch (error) {
    setGoogleStatus("同步失敗", "warning");
    elements.syncNote.textContent = error.message;
    showToast(error.message);
  } finally {
    syncing = false;
  }
}

function queueCloudSave() {
  window.clearTimeout(cloudSaveTimer);
  if (!accessToken) {
    elements.syncNote.textContent = "尚未連線；變更已先保留在此裝置。";
    return;
  }
  setGoogleStatus("等待同步", "warning");
  cloudSaveTimer = window.setTimeout(async () => {
    try {
      await uploadDriveState();
      setGoogleStatus("已同步", "connected");
      elements.syncNote.textContent = `上次同步：${new Date().toLocaleString("zh-TW", { hour12: false })}`;
    } catch (error) {
      setGoogleStatus("同步失敗", "warning");
      elements.syncNote.textContent = error.message;
    }
  }, 650);
}

async function connectGoogle() {
  try {
    const clientId = parseClientId(elements.googleInput.value);
    persistGoogleConfig(clientId);
    setGoogleStatus("登入中…", "warning");
    accessToken = await requestGoogleAccess(clientId);
    elements.connectGoogle.textContent = "重新連線";
    elements.syncGoogle.disabled = false;
    setGoogleStatus("已連線", "connected");
    await syncWithDrive();
  } catch (error) {
    setGoogleStatus("尚未連線", "warning");
    elements.syncNote.textContent = error.message;
    showToast(error.message);
  }
}

function bytesToBase64(bytes) {
  let value = "";
  bytes.forEach((byte) => { value += String.fromCharCode(byte); });
  return btoa(value);
}

function base64ToBytes(value) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function derivePinVerifier(pin, salt, iterations = PIN_ITERATIONS) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return bytesToBase64(new Uint8Array(bits));
}

async function createPinRecord(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return {
    enabled: true,
    salt: bytesToBase64(salt),
    verifier: await derivePinVerifier(pin, salt),
    iterations: PIN_ITERATIONS
  };
}

async function verifyPin(pin) {
  if (!state.lock.enabled) return true;
  const verifier = await derivePinVerifier(pin, base64ToBytes(state.lock.salt), state.lock.iterations);
  return verifier === state.lock.verifier;
}

function openPinDialog({ lockAfterSave = false } = {}) {
  elements.pinForm.reset();
  elements.pinFormError.textContent = "";
  pinDialogShouldLock = lockAfterSave;
  const changing = state.lock.enabled;
  elements.pinDialogTitle.textContent = changing ? "修改 PIN" : "設定 PIN";
  elements.currentPinField.hidden = !changing;
  elements.currentPin.required = changing;
  elements.pinDialog.showModal();
  requestAnimationFrame(() => (changing ? elements.currentPin : elements.newPin).focus());
}

function showLockScreen() {
  sessionUnlocked = false;
  elements.unlockForm.reset();
  elements.unlockError.textContent = "";
  elements.lockScreen.hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => elements.unlockPin.focus());
}

function hideLockScreen() {
  sessionUnlocked = true;
  elements.lockScreen.hidden = true;
  document.body.style.overflow = "";
}

elements.navLinks.forEach((link) => link.addEventListener("click", () => showPage(link.dataset.pageLink)));
elements.addButtons.forEach((button) => button.addEventListener("click", () => openLinkDialog()));
elements.closeButton.addEventListener("click", closeLinkDialog);
elements.cancelButton.addEventListener("click", closeLinkDialog);
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) closeLinkDialog(); });

elements.color.addEventListener("input", () => { elements.colorText.value = elements.color.value.toUpperCase(); });
elements.colorText.addEventListener("input", () => {
  if (/^#[0-9a-f]{6}$/i.test(elements.colorText.value)) elements.color.value = elements.colorText.value;
});

document.querySelectorAll('input[name="layout"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    state.layout = radio.value;
    markChanged();
    showToast(state.layout === "grid" ? "已切換為圖示布局" : "已切換為清單布局");
  });
});

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  let normalizedUrl;
  try { normalizedUrl = safeUrl(elements.url.value); }
  catch {
    elements.url.setCustomValidity("請輸入有效的 http 或 https 網址");
    elements.url.reportValidity();
    return;
  }
  elements.url.setCustomValidity("");
  const item = {
    id: elements.id.value || createId(),
    name: elements.name.value.trim(),
    url: normalizedUrl,
    note: elements.note.value.trim(),
    category: elements.category.value.trim(),
    icon: elements.icon.value.trim(),
    color: elements.color.value
  };
  const index = state.links.findIndex((link) => link.id === item.id);
  if (index >= 0) state.links[index] = item;
  else state.links.push(item);
  markChanged();
  closeLinkDialog();
  showToast(index >= 0 ? "連結已更新" : "連結已新增");
});

elements.deleteButton.addEventListener("click", () => {
  const link = state.links.find((item) => item.id === elements.id.value);
  if (!link || !window.confirm(`確定要刪除「${link.name}」嗎？`)) return;
  state.links = state.links.filter((item) => item.id !== link.id);
  markChanged();
  closeLinkDialog();
  showToast("連結已刪除");
});

elements.applyBackgroundUrl.addEventListener("click", () => {
  try {
    state.background.source = safeUrl(elements.backgroundUrl.value);
    markChanged();
    showToast("背景圖片已套用");
  } catch {
    showToast("請輸入有效的 http 或 https 圖片網址");
  }
});

elements.backgroundUpload.addEventListener("change", async () => {
  const file = elements.backgroundUpload.files?.[0];
  if (!file) return;
  showToast("正在處理背景圖片…");
  try {
    state.background.source = await compressBackground(file);
    markChanged();
    showToast("背景圖片已上傳");
  } catch (error) {
    showToast(error.message);
  } finally {
    elements.backgroundUpload.value = "";
  }
});

elements.clearBackground.addEventListener("click", () => {
  state.background.source = "";
  elements.backgroundUrl.value = "";
  markChanged();
  showToast("背景圖片已移除");
});

elements.backgroundOpacity.addEventListener("input", () => {
  state.background.opacity = Number(elements.backgroundOpacity.value);
  applyBackground();
});
elements.backgroundOpacity.addEventListener("change", () => markChanged({ render: false }));

elements.backgroundTemperature.addEventListener("input", () => {
  state.background.temperature = Number(elements.backgroundTemperature.value);
  applyBackground();
});
elements.backgroundTemperature.addEventListener("change", () => markChanged({ render: false }));

elements.saveGoogleConfig.addEventListener("click", () => {
  try {
    persistGoogleConfig(parseClientId(elements.googleInput.value));
    showToast("Google OAuth 設定已儲存");
  } catch (error) { showToast(error.message); }
});
elements.connectGoogle.addEventListener("click", connectGoogle);
elements.syncGoogle.addEventListener("click", () => syncWithDrive({ forceUpload: true }));

elements.lockButton.addEventListener("click", () => {
  if (!state.lock.enabled) openPinDialog({ lockAfterSave: true });
  else showLockScreen();
});
elements.changePinButton.addEventListener("click", () => openPinDialog());
elements.closePinDialog.addEventListener("click", () => elements.pinDialog.close());
elements.cancelPinDialog.addEventListener("click", () => elements.pinDialog.close());

elements.pinForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.pinFormError.textContent = "";
  const newPin = elements.newPin.value;
  if (!/^\d{4,8}$/.test(newPin)) {
    elements.pinFormError.textContent = "PIN 必須是 4–8 位數字。";
    return;
  }
  if (newPin !== elements.confirmPin.value) {
    elements.pinFormError.textContent = "兩次輸入的 PIN 不一致。";
    return;
  }
  if (state.lock.enabled && !(await verifyPin(elements.currentPin.value))) {
    elements.pinFormError.textContent = "目前 PIN 不正確。";
    return;
  }
  state.lock = await createPinRecord(newPin);
  markChanged();
  elements.pinDialog.close();
  showToast("PIN 已儲存");
  if (pinDialogShouldLock) showLockScreen();
});

elements.unlockForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  elements.unlockError.textContent = "";
  if (await verifyPin(elements.unlockPin.value)) {
    hideLockScreen();
    showToast("Dock 已解鎖");
  } else {
    elements.unlockError.textContent = "PIN 不正確，請再試一次。";
    elements.unlockPin.select();
  }
});

const googleConfig = readGoogleConfig();
elements.googleInput.value = googleConfig.clientId || state.googleClientId || "";
elements.authorizedOrigin.value = location.origin === "null" ? "部署到 GitHub Pages 後顯示" : location.origin;
renderAll();
if (state.lock.enabled) showLockScreen();
