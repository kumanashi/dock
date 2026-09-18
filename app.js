const APP_VERSION = "1.4.2";
const STORAGE_KEY = "kumas-dock-data";
const LEGACY_STORAGE_KEYS = ["kumas-dock-v1.4.2", "kumas-dock-v1.4.1", "kumas-dock-v1.4", "kumas-dock-v1.3", "kumas-dock-v1.2", "kumas-dock-v1.1", "kumas-dock-v1"];
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
    version: APP_VERSION,
    layout: "grid",
    categories: ["日常", "工具"],
    categoryImages: {},
    collapsed: {},
    updatedAt: null,
    googleClientId: "",
    background: { source: "", opacity: 35, temperature: 0 },
    lock: { enabled: false, salt: "", verifier: "", iterations: PIN_ITERATIONS },
    links: [
      { id: createId(), name: "Google Calendar", url: "https://calendar.google.com", category: "日常", icon: "mi:calendar_month", color: "#52677a", note: "行程與排班", isPublic: false },
      { id: createId(), name: "Google Drive", url: "https://drive.google.com", category: "日常", icon: "mi:cloud", color: "#65725d", note: "檔案與備份", isPublic: false },
      { id: createId(), name: "ChatGPT", url: "https://chatgpt.com", category: "工具", icon: "mi:chat", color: "#353b39", note: "工作與研究", isPublic: false },
      { id: createId(), name: "GitHub", url: "https://github.com", category: "工具", icon: "mi:work", color: "#46464b", note: "專案與版本", isPublic: false }
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
  publicCheckbox: document.querySelector("#link-public"),
  category: document.querySelector("#link-category"),
  icon: document.querySelector("#link-icon"),
  iconPreview: document.querySelector("#icon-select-preview"),
  color: document.querySelector("#link-color"),
  colorText: document.querySelector("#link-color-text"),
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
  addCategoryButton: document.querySelector("#add-category-button"),
  categoryDialog: document.querySelector("#category-dialog"),
  categoryForm: document.querySelector("#category-form"),
  categoryNameInput: document.querySelector("#category-name-input"),
  categoryDialogTitle: document.querySelector("#category-dialog-title"),
  categoryDialogEyebrow: document.querySelector("#category-dialog-eyebrow"),
  categorySubmitButton: document.querySelector("#category-submit-button"),
  categoryImagePreview: document.querySelector("#category-image-preview"),
  categoryImageUpload: document.querySelector("#category-image-upload"),
  removeCategoryImage: document.querySelector("#remove-category-image"),
  categoryFormError: document.querySelector("#category-form-error"),
  closeCategoryDialog: document.querySelector("#close-category-dialog"),
  cancelCategoryDialog: document.querySelector("#cancel-category-dialog"),
  deleteCategoryDialog: document.querySelector("#delete-category-dialog"),
  deleteCategoryCopy: document.querySelector("#delete-category-copy"),
  deleteCategoryTargetField: document.querySelector("#delete-category-target-field"),
  deleteCategoryTarget: document.querySelector("#delete-category-target"),
  closeDeleteCategory: document.querySelector("#close-delete-category"),
  cancelDeleteCategory: document.querySelector("#cancel-delete-category"),
  moveLinksDeleteCategory: document.querySelector("#move-links-delete-category"),
  deleteCategoryWithLinks: document.querySelector("#delete-category-with-links"),
  shareButton: document.querySelector("#share-button"),
  shareDialog: document.querySelector("#share-dialog"),
  closeShareDialog: document.querySelector("#close-share-dialog"),
  shareSummary: document.querySelector("#share-summary"),
  shareUrl: document.querySelector("#share-url"),
  shareWarning: document.querySelector("#share-warning"),
  copyShareButton: document.querySelector("#copy-share-button"),
  nativeShareButton: document.querySelector("#native-share-button"),
  sharedBanner: document.querySelector("#shared-banner"),
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

let localStateWasSaved = Boolean(readStorage(STORAGE_KEY) || LEGACY_STORAGE_KEYS.some((key) => readStorage(key)));
const sharedPayload = readSharedPayload();
const sharedMode = Boolean(sharedPayload);
let state = sharedMode ? sanitizeSharedState(sharedPayload) : loadState();
let accessToken = "";
let driveFileId = "";
let cloudSaveTimer;
let toastTimer;
let syncing = false;
let pinDialogShouldLock = false;
let sessionUnlocked = false;
let dragState = null;
let deletingCategoryName = "";
let editingCategoryName = "";
let pendingCategoryImage = "";

function sanitizeState(raw) {
  const fallback = createDefaultState();
  if (!raw || !Array.isArray(raw.links)) return fallback;
  const cleanLinks = raw.links.filter(isValidLink).map((link) => ({
    ...link,
    category: link.category.trim() || "未分類",
    note: typeof link.note === "string" ? link.note : "",
    isPublic: link.isPublic === true
  }));
  const derivedCategories = [...new Set(cleanLinks.map((link) => link.category))];
  const savedCategories = Array.isArray(raw.categories)
    ? raw.categories.filter((name) => typeof name === "string" && name.trim()).map((name) => name.trim())
    : [];
  const categories = [...new Set([...savedCategories, ...derivedCategories])];
  return {
    version: APP_VERSION,
    layout: raw.layout === "list" ? "list" : "grid",
    categories,
    categoryImages: Object.fromEntries(categories.flatMap((name) => {
      const source = raw.categoryImages?.[name];
      return typeof source === "string" && source ? [[name, source]] : [];
    })),
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
    links: cleanLinks
  };
}

function loadState() {
  try {
    const saved = readStorage(STORAGE_KEY) || LEGACY_STORAGE_KEYS.map((key) => readStorage(key)).find(Boolean);
    return saved ? sanitizeState(JSON.parse(saved)) : createDefaultState();
  } catch {
    return createDefaultState();
  }
}

function readStorage(key) {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function isValidLink(link) {
  return link && ["id", "name", "url", "category", "icon", "color"].every((key) => typeof link[key] === "string");
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function encodeSharePayload(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  for (let index = 0; index < bytes.length; index += 8192) {
    binary += String.fromCharCode(...bytes.subarray(index, index + 8192));
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeSharePayload(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function readSharedPayload() {
  try {
    const encoded = new URLSearchParams(location.hash.slice(1)).get("share");
    return encoded ? decodeSharePayload(encoded) : null;
  } catch {
    return null;
  }
}

function sanitizeSharedState(raw) {
  const fallback = createDefaultState();
  const links = Array.isArray(raw?.links)
    ? raw.links.filter(isValidLink).flatMap((link) => {
      try {
        return [{
          id: link.id,
          name: link.name.slice(0, 40),
          url: safeUrl(link.url),
          category: (link.category.trim() || "未分類").slice(0, 24),
          icon: link.icon.slice(0, 40),
          color: /^#[0-9a-f]{6}$/i.test(link.color) ? link.color : "#525252",
          note: typeof link.note === "string" ? link.note.slice(0, 100) : "",
          isPublic: true
        }];
      } catch { return []; }
    })
    : [];
  const derivedCategories = [...new Set(links.map((link) => link.category))];
  const requestedCategories = Array.isArray(raw?.categories)
    ? raw.categories.filter((name) => typeof name === "string" && derivedCategories.includes(name))
    : [];
  const categories = [...new Set([...requestedCategories, ...derivedCategories])];
  const source = typeof raw?.background?.source === "string" && /^https?:\/\//i.test(raw.background.source)
    ? raw.background.source
    : "";
  return {
    version: APP_VERSION,
    layout: raw?.layout === "list" ? "list" : "grid",
    categories,
    categoryImages: Object.fromEntries(categories.flatMap((name) => {
      const image = raw?.categoryImages?.[name];
      return typeof image === "string" && (/^data:image\/(?:webp|png|jpeg);base64,/i.test(image) || /^https?:\/\//i.test(image)) ? [[name, image]] : [];
    })),
    collapsed: {},
    updatedAt: null,
    googleClientId: "",
    background: {
      source,
      opacity: clampNumber(raw?.background?.opacity, 0, 100, 35),
      temperature: clampNumber(raw?.background?.temperature, -100, 100, 0)
    },
    lock: fallback.lock,
    links
  };
}

function createPublicSnapshot() {
  const links = state.links.filter((link) => link.isPublic).map(({ id, name, url, note, category, icon, color }) => ({
    id, name, url, note, category, icon, color
  }));
  const usedCategories = new Set(links.map((link) => link.category));
  const categories = state.categories.filter((name) => usedCategories.has(name));
  return {
    v: 1,
    layout: state.layout,
    categories,
    categoryImages: {},
    links,
    background: {
      source: /^https?:\/\//i.test(state.background.source) ? state.background.source : "",
      opacity: state.background.opacity,
      temperature: state.background.temperature
    }
  };
}

function buildShareUrl() {
  const baseUrl = location.href.split("#")[0];
  return `${baseUrl}#share=${encodeSharePayload(createPublicSnapshot())}`;
}

async function copyText(value) {
  try {
    await navigator.clipboard.writeText(value);
  } catch {
    elements.shareUrl.focus();
    elements.shareUrl.select();
    if (!document.execCommand("copy")) throw new Error("無法自動複製，請手動選取網址");
  }
}

function openShareDialog() {
  const publicCount = state.links.filter((link) => link.isPublic).length;
  if (!publicCount) {
    elements.shareUrl.value = "";
    elements.shareSummary.textContent = "目前沒有可分享的連結。請先編輯至少一個連結，並開啟「允許顯示於分享頁面」。";
    elements.shareWarning.textContent = "私人連結不會出現在分享頁面；設定完成後再次按下分享即可產生唯讀網址。";
    elements.copyShareButton.disabled = true;
    elements.nativeShareButton.hidden = true;
    elements.shareDialog.showModal();
    return;
  }
  const shareUrl = buildShareUrl();
  elements.shareUrl.value = shareUrl;
  elements.shareSummary.textContent = `這次會分享 ${publicCount} 個公開連結；私人連結、PIN、Google 設定與上傳圖片不會包含在內。`;
  elements.copyShareButton.disabled = false;
  const isLong = shareUrl.length > 12000;
  elements.shareWarning.textContent = isLong
    ? "分享網址包含較多公開連結，部分通訊軟體可能會截斷網址。此網址仍是不可撤回的內容快照。"
    : "此網址是目前公開內容的快照。日後改成私人或刪除連結，不會讓已產生的舊網址失效。";
  elements.nativeShareButton.hidden = typeof navigator.share !== "function";
  elements.shareDialog.showModal();
}

function saveStateLocal() {
  if (sharedMode) return;
  const legacyBackups = LEGACY_STORAGE_KEYS.flatMap((key) => {
    const value = readStorage(key);
    return value === null ? [] : [[key, value]];
  });
  try {
    legacyBackups.forEach(([key]) => localStorage.removeItem(key));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    localStateWasSaved = true;
  } catch (error) {
    legacyBackups.forEach(([key, value]) => {
      try { localStorage.setItem(key, value); } catch { /* best-effort rollback */ }
    });
    if (error?.name === "QuotaExceededError") throw new Error("瀏覽器儲存空間不足，請改用較小的圖片");
    throw new Error("瀏覽器無法儲存資料，請確認未使用無痕模式或封鎖網站儲存空間");
  }
}

function markChanged({ render = true } = {}) {
  if (sharedMode) {
    if (render) renderAll();
    return;
  }
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
  const groups = new Map(state.categories.map((name) => [name, []]));
  state.links.forEach((link) => {
    const category = link.category.trim() || "未分類";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(link);
  });
  return groups;
}

function clearDragIndicators() {
  document.querySelectorAll(".is-dragging, .link-drop-before, .link-drop-after, .is-link-drop-target, .category-drop-before, .category-drop-after")
    .forEach((node) => node.classList.remove("is-dragging", "link-drop-before", "link-drop-after", "is-link-drop-target", "category-drop-before", "category-drop-after"));
}

function moveLink(linkId, targetCategory, targetLinkId = "", position = "after") {
  const sourceIndex = state.links.findIndex((link) => link.id === linkId);
  if (sourceIndex < 0) return;
  const [moved] = state.links.splice(sourceIndex, 1);
  moved.category = targetCategory;
  let insertIndex;
  if (targetLinkId) {
    const targetIndex = state.links.findIndex((link) => link.id === targetLinkId);
    insertIndex = targetIndex < 0 ? state.links.length : targetIndex + (position === "after" ? 1 : 0);
  } else {
    insertIndex = state.links.reduce((last, link, index) => link.category === targetCategory ? index + 1 : last, state.links.length);
  }
  state.links.splice(insertIndex, 0, moved);
  clearDragIndicators();
  markChanged();
}

function moveCategory(sourceName, targetName, position) {
  if (sourceName === targetName) return;
  const sourceIndex = state.categories.indexOf(sourceName);
  if (sourceIndex < 0) return;
  state.categories.splice(sourceIndex, 1);
  const targetIndex = state.categories.indexOf(targetName);
  state.categories.splice(targetIndex + (position === "after" ? 1 : 0), 0, sourceName);
  clearDragIndicators();
  markChanged();
}

function renderDock() {
  elements.categories.replaceChildren();
  const groups = groupedLinks();
  elements.emptyState.hidden = state.links.length !== 0 || state.categories.length !== 0;

  groups.forEach((links, categoryName) => {
    const fragment = elements.categoryTemplate.content.cloneNode(true);
    const section = fragment.querySelector(".category-section");
    const toggle = fragment.querySelector(".category-toggle");
    const collection = fragment.querySelector(".link-collection");
    const editButton = fragment.querySelector(".category-edit-button");
    const deleteButton = fragment.querySelector(".category-delete-button");
    const dragHandle = fragment.querySelector(".category-drag-handle");
    const categoryImage = fragment.querySelector(".category-image");
    const isCollapsed = Boolean(state.collapsed[categoryName]);

    if (sharedMode) fragment.querySelector(".category-controls").remove();

    section.dataset.category = categoryName;
    fragment.querySelector(".category-name").textContent = categoryName;
    fragment.querySelector(".category-count").textContent = links.length;
    if (state.categoryImages[categoryName]) {
      categoryImage.style.backgroundImage = backgroundImageValue(state.categoryImages[categoryName]);
      categoryImage.hidden = false;
    }
    fragment.querySelector(".collapse-label").textContent = isCollapsed ? "展開" : "收合";
    section.classList.toggle("is-collapsed", isCollapsed);
    collection.classList.toggle("list-layout", state.layout === "list");
    toggle.setAttribute("aria-expanded", String(!isCollapsed));

    toggle.addEventListener("click", () => {
      const collapsing = !state.collapsed[categoryName];
      state.collapsed[categoryName] = collapsing;
      toggle.setAttribute("aria-expanded", String(!collapsing));
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
      if (!sharedMode) markChanged({ render: false });
    });

    if (!sharedMode) {
      editButton.addEventListener("click", () => openCategoryDialog(categoryName));
      deleteButton.addEventListener("click", () => openDeleteCategoryDialog(categoryName));
      dragHandle.addEventListener("dragstart", (event) => {
        dragState = { type: "category", name: categoryName };
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", `category:${categoryName}`);
        section.classList.add("is-dragging");
      });
      dragHandle.addEventListener("dragend", () => { dragState = null; clearDragIndicators(); });

      section.addEventListener("dragover", (event) => {
        if (dragState?.type !== "category" || dragState.name === categoryName) return;
        event.preventDefault();
        clearDragIndicators();
        const position = event.clientY < section.getBoundingClientRect().top + section.offsetHeight / 2 ? "before" : "after";
        section.classList.add(position === "before" ? "category-drop-before" : "category-drop-after");
      });
      section.addEventListener("drop", (event) => {
        if (dragState?.type !== "category") return;
        event.preventDefault();
        const position = section.classList.contains("category-drop-before") ? "before" : "after";
        moveCategory(dragState.name, categoryName, position);
        dragState = null;
      });

      collection.addEventListener("dragover", (event) => {
        if (dragState?.type !== "link") return;
        event.preventDefault();
        event.stopPropagation();
        collection.classList.add("is-link-drop-target");
      });
      collection.addEventListener("dragleave", (event) => {
        if (!collection.contains(event.relatedTarget)) collection.classList.remove("is-link-drop-target");
      });
      collection.addEventListener("drop", (event) => {
        if (dragState?.type !== "link") return;
        event.preventDefault();
        event.stopPropagation();
        moveLink(dragState.id, categoryName);
        dragState = null;
      });
    }

    links.forEach((link) => collection.append(createLinkCard(link, categoryName)));
    elements.categories.append(fragment);
  });
}

function createLinkCard(link, categoryName) {
  const fragment = elements.linkTemplate.content.cloneNode(true);
  const article = fragment.querySelector(".dock-item");
  const anchor = fragment.querySelector(".dock-link");
  const icon = fragment.querySelector(".link-icon");
  if (sharedMode) {
    fragment.querySelector(".edit-link-button").remove();
    fragment.querySelector(".link-drag-handle").remove();
  }
  article.draggable = !sharedMode;
  article.dataset.linkId = link.id;
  anchor.href = link.url;
  anchor.style.setProperty("--link-color", link.color);
  anchor.setAttribute("aria-label", `開啟 ${link.name}`);
  if (link.icon.startsWith("mi:")) {
    icon.classList.add("material-symbols-outlined");
    icon.textContent = link.icon.slice(3);
  } else {
    icon.textContent = link.icon;
  }
  fragment.querySelector(".link-name").textContent = link.name;
  const note = fragment.querySelector(".link-note");
  note.textContent = link.note;
  note.hidden = !link.note;
  fragment.querySelector(".link-host").textContent = getHost(link.url);
  if (!sharedMode) {
    fragment.querySelector(".edit-link-button").addEventListener("click", () => openLinkDialog(link));
    article.addEventListener("dragstart", (event) => {
      dragState = { type: "link", id: link.id };
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", `link:${link.id}`);
      requestAnimationFrame(() => article.classList.add("is-dragging"));
    });
    article.addEventListener("dragend", () => { dragState = null; clearDragIndicators(); });
    article.addEventListener("dragover", (event) => {
      if (dragState?.type !== "link" || dragState.id === link.id) return;
      event.preventDefault();
      event.stopPropagation();
      document.querySelectorAll(".link-drop-before, .link-drop-after").forEach((node) => node.classList.remove("link-drop-before", "link-drop-after"));
      const position = event.clientY < article.getBoundingClientRect().top + article.offsetHeight / 2 ? "before" : "after";
      article.classList.add(position === "before" ? "link-drop-before" : "link-drop-after");
    });
    article.addEventListener("drop", (event) => {
      if (dragState?.type !== "link" || dragState.id === link.id) return;
      event.preventDefault();
      event.stopPropagation();
      const position = article.classList.contains("link-drop-before") ? "before" : "after";
      moveLink(dragState.id, categoryName, link.id, position);
      dragState = null;
    });
  }
  return article;
}

function renderSettings() {
  document.querySelectorAll('input[name="layout"]').forEach((radio) => { radio.checked = radio.value === state.layout; });
  elements.linkCount.textContent = state.links.length;
  elements.categoryCount.textContent = state.categories.length;
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
    const reader = new FileReader();
    const image = new Image();
    reader.onload = () => { image.src = reader.result; };
    reader.onerror = () => reject(new Error("無法讀取圖片檔案"));
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("瀏覽器無法解碼這張圖片，請改用 JPG、PNG 或 WebP"));
    reader.readAsDataURL(file);
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
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw new Error("HEIC／HEIF 暫不支援，請先轉成 JPG 或 PNG");
  if (file.size > 20 * 1024 * 1024) throw new Error("原始圖片請勿超過 20 MB");
  const image = await loadImageFile(file);
  let dataUrl = resizeImage(image, 1600, 0.78);
  if (dataUrl.length > 900000) dataUrl = resizeImage(image, 1280, 0.68);
  if (dataUrl.length > 900000) dataUrl = resizeImage(image, 960, 0.62);
  if (dataUrl.length > 900000) throw new Error("圖片壓縮後仍過大，請改用較小的圖片");
  return dataUrl;
}

function resizeSquareImage(image, size = 112, quality = 0.78) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d", { alpha: false });
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = (image.naturalWidth - sourceSize) / 2;
  const sourceY = (image.naturalHeight - sourceSize) / 2;
  context.fillStyle = "#e8e8e5";
  context.fillRect(0, 0, size, size);
  context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
  return canvas.toDataURL("image/webp", quality);
}

async function compressCategoryImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("請選擇圖片檔案");
  if (/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) throw new Error("HEIC／HEIF 暫不支援，請先轉成 JPG、PNG 或 WebP");
  if (file.size > 10 * 1024 * 1024) throw new Error("分類圖片請勿超過 10 MB");
  return resizeSquareImage(await loadImageFile(file));
}

function renderCategoryImagePreview() {
  elements.categoryImagePreview.style.backgroundImage = pendingCategoryImage ? backgroundImageValue(pendingCategoryImage) : "none";
  elements.categoryImagePreview.classList.toggle("has-image", Boolean(pendingCategoryImage));
  elements.removeCategoryImage.disabled = !pendingCategoryImage;
}

function populateCategoryOptions(selectedCategory = "") {
  if (!state.categories.length) state.categories.push("未分類");
  elements.category.replaceChildren(...state.categories.map((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    return option;
  }));
  elements.category.value = state.categories.includes(selectedCategory) ? selectedCategory : state.categories[0];
}

function updateIconPreview() {
  const value = elements.icon.value;
  const isMaterial = value.startsWith("mi:");
  elements.iconPreview.classList.toggle("material-symbols-outlined", isMaterial);
  elements.iconPreview.textContent = isMaterial ? value.slice(3) : value;
}

function prepareIconOption(value) {
  elements.icon.querySelectorAll(".temporary-icon-option").forEach((option) => option.remove());
  if ([...elements.icon.options].some((option) => option.value === value)) return;
  const option = document.createElement("option");
  option.value = value;
  option.textContent = `原有圖示（${value}）`;
  option.className = "temporary-icon-option";
  elements.icon.append(option);
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
  elements.publicCheckbox.checked = link?.isPublic === true;
  populateCategoryOptions(link?.category ?? "");
  const iconValue = link?.icon ?? "mi:link";
  prepareIconOption(iconValue);
  elements.icon.value = iconValue;
  updateIconPreview();
  elements.color.value = link?.color ?? "#525252";
  elements.colorText.value = link?.color ?? "#525252";
  elements.dialog.showModal();
  requestAnimationFrame(() => elements.name.focus());
}

function openCategoryDialog(categoryName = "") {
  elements.categoryForm.reset();
  elements.categoryFormError.textContent = "";
  editingCategoryName = categoryName;
  pendingCategoryImage = categoryName ? state.categoryImages[categoryName] || "" : "";
  const editing = Boolean(categoryName);
  elements.categoryDialogTitle.textContent = editing ? "編輯分類" : "新增分類";
  elements.categoryDialogEyebrow.textContent = editing ? "EDIT CATEGORY" : "NEW CATEGORY";
  elements.categorySubmitButton.textContent = editing ? "儲存變更" : "新增分類";
  elements.categoryNameInput.value = categoryName;
  renderCategoryImagePreview();
  elements.categoryDialog.showModal();
  requestAnimationFrame(() => {
    elements.categoryNameInput.focus();
    if (editing) elements.categoryNameInput.select();
  });
}

function openDeleteCategoryDialog(categoryName) {
  deletingCategoryName = categoryName;
  const linkCount = state.links.filter((link) => link.category === categoryName).length;
  const targets = state.categories.filter((name) => name !== categoryName);
  elements.deleteCategoryCopy.textContent = linkCount
    ? `「${categoryName}」內有 ${linkCount} 個連結，請選擇移動至其他分類，或將連結一起刪除。`
    : `「${categoryName}」目前沒有連結，可以直接刪除。`;
  elements.deleteCategoryTarget.replaceChildren(...targets.map((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    return option;
  }));
  elements.deleteCategoryTargetField.hidden = !linkCount || !targets.length;
  elements.moveLinksDeleteCategory.hidden = !linkCount || !targets.length;
  elements.deleteCategoryWithLinks.textContent = linkCount ? "連結一起刪除" : "刪除分類";
  elements.deleteCategoryDialog.showModal();
}

function removeCategory(categoryName) {
  state.categories = state.categories.filter((name) => name !== categoryName);
  delete state.collapsed[categoryName];
  delete state.categoryImages[categoryName];
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
elements.addCategoryButton.addEventListener("click", () => openCategoryDialog());
elements.closeButton.addEventListener("click", closeLinkDialog);
elements.cancelButton.addEventListener("click", closeLinkDialog);
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) closeLinkDialog(); });
elements.icon.addEventListener("change", updateIconPreview);

elements.closeCategoryDialog.addEventListener("click", () => elements.categoryDialog.close());
elements.cancelCategoryDialog.addEventListener("click", () => elements.categoryDialog.close());
elements.categoryImageUpload.addEventListener("change", async () => {
  const file = elements.categoryImageUpload.files?.[0];
  if (!file) return;
  elements.categoryFormError.textContent = "正在處理圖片…";
  try {
    pendingCategoryImage = await compressCategoryImage(file);
    renderCategoryImagePreview();
    elements.categoryFormError.textContent = "";
  } catch (error) {
    elements.categoryFormError.textContent = error.message;
  } finally {
    elements.categoryImageUpload.value = "";
  }
});
elements.removeCategoryImage.addEventListener("click", () => {
  pendingCategoryImage = "";
  renderCategoryImagePreview();
});
elements.categoryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = elements.categoryNameInput.value.trim();
  if (!name) return;
  if (state.categories.some((category) => category !== editingCategoryName && category.toLocaleLowerCase() === name.toLocaleLowerCase())) {
    elements.categoryFormError.textContent = "已經有同名分類。";
    return;
  }
  const previousState = JSON.parse(JSON.stringify(state));
  if (editingCategoryName) {
    const index = state.categories.indexOf(editingCategoryName);
    if (index >= 0) state.categories[index] = name;
    state.links.forEach((link) => { if (link.category === editingCategoryName) link.category = name; });
    if (state.collapsed[editingCategoryName] !== undefined) {
      state.collapsed[name] = state.collapsed[editingCategoryName];
      if (name !== editingCategoryName) delete state.collapsed[editingCategoryName];
    }
    if (name !== editingCategoryName) delete state.categoryImages[editingCategoryName];
  } else {
    state.categories.push(name);
  }
  if (pendingCategoryImage) state.categoryImages[name] = pendingCategoryImage;
  else delete state.categoryImages[name];
  try {
    markChanged();
  } catch (error) {
    state = previousState;
    renderAll();
    elements.categoryFormError.textContent = error.message;
    return;
  }
  elements.categoryDialog.close();
  showToast(editingCategoryName ? `已更新「${name}」分類` : `已新增「${name}」分類`);
});

elements.shareButton.addEventListener("click", openShareDialog);
elements.closeShareDialog.addEventListener("click", () => elements.shareDialog.close());
elements.shareDialog.addEventListener("click", (event) => { if (event.target === elements.shareDialog) elements.shareDialog.close(); });
elements.copyShareButton.addEventListener("click", async () => {
  try {
    await copyText(elements.shareUrl.value);
    showToast("分享網址已複製");
  } catch (error) { showToast(error.message); }
});
elements.nativeShareButton.addEventListener("click", async () => {
  try {
    await navigator.share({ title: "Kuma's Dock", text: "Kuma's Dock 公開連結", url: elements.shareUrl.value });
  } catch (error) {
    if (error.name !== "AbortError") showToast("無法開啟系統分享");
  }
});

elements.closeDeleteCategory.addEventListener("click", () => elements.deleteCategoryDialog.close());
elements.cancelDeleteCategory.addEventListener("click", () => elements.deleteCategoryDialog.close());
elements.moveLinksDeleteCategory.addEventListener("click", () => {
  const target = elements.deleteCategoryTarget.value;
  if (!deletingCategoryName || !target) return;
  state.links.forEach((link) => { if (link.category === deletingCategoryName) link.category = target; });
  removeCategory(deletingCategoryName);
  markChanged();
  elements.deleteCategoryDialog.close();
  showToast("分類已刪除，連結已移動");
});
elements.deleteCategoryWithLinks.addEventListener("click", () => {
  if (!deletingCategoryName) return;
  const linkCount = state.links.filter((link) => link.category === deletingCategoryName).length;
  if (linkCount && !window.confirm(`確定要一起刪除「${deletingCategoryName}」內的 ${linkCount} 個連結嗎？`)) return;
  state.links = state.links.filter((link) => link.category !== deletingCategoryName);
  removeCategory(deletingCategoryName);
  markChanged();
  elements.deleteCategoryDialog.close();
  showToast("分類已刪除");
});

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
    color: elements.color.value,
    isPublic: elements.publicCheckbox.checked
  };
  const previousState = JSON.parse(JSON.stringify(state));
  const index = state.links.findIndex((link) => link.id === item.id);
  if (index >= 0) state.links[index] = item;
  else state.links.push(item);
  try {
    markChanged();
  } catch (error) {
    state = previousState;
    renderAll();
    showToast(error.message);
    return;
  }
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
  const previousBackground = { ...state.background };
  const previousUpdatedAt = state.updatedAt;
  try {
    state.background.source = safeUrl(elements.backgroundUrl.value);
    markChanged();
    showToast("背景圖片已套用");
  } catch (error) {
    state.background = previousBackground;
    state.updatedAt = previousUpdatedAt;
    renderAll();
    showToast(error.message.includes("儲存") ? error.message : "請輸入有效的 http 或 https 圖片網址");
  }
});

elements.backgroundUpload.addEventListener("change", async () => {
  const file = elements.backgroundUpload.files?.[0];
  if (!file) return;
  showToast("正在處理背景圖片…");
  const previousBackground = { ...state.background };
  const previousUpdatedAt = state.updatedAt;
  try {
    state.background.source = await compressBackground(file);
    markChanged();
    showToast("背景圖片已上傳");
  } catch (error) {
    state.background = previousBackground;
    state.updatedAt = previousUpdatedAt;
    renderAll();
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
elements.googleInput.value = sharedMode ? "" : googleConfig.clientId || state.googleClientId || "";
elements.authorizedOrigin.value = location.origin === "null" ? "部署到 GitHub Pages 後顯示" : location.origin;
document.body.classList.toggle("shared-mode", sharedMode);
elements.sharedBanner.hidden = !sharedMode;
renderAll();
if (!sharedMode && state.lock.enabled) showLockScreen();
