# Kuma's Dock v1.4.2

一個可部署至 GitHub Pages 的純前端個人連結 Dock。支援拖曳排序與跨分類移動、分類重新命名與圖片、公開唯讀分享、Google Material Symbols 圖示、自訂背景圖片與色溫、帶動畫的分類收合、連結備註、Google Drive App Data 同步，以及 PIN 鎖定。

## 分類與拖曳

- 拖曳連結卡片可調整同一分類內的順序。
- 將連結拖曳到其他分類，可直接移動分類。
- 拖曳分類標題右側把手，可調整分類順序。
- 右下角「分類」按鈕可新增分類。
- 分類標題右側的編輯按鈕可重新命名，並上傳、更換或移除分類圖片。
- 刪除含有連結的分類時，可選擇把連結移至其他分類，或連同連結一起刪除。

## 連結圖示

新增或編輯連結時，可從下拉選單選擇常用的 Google Material Symbols 圖示。舊版本已使用的文字或 emoji 圖示會繼續保留。

## 公開分享

- 在連結的新增／編輯視窗勾選「允許顯示於分享頁面」，再按右下角「分享」產生網址。
- 分享頁面是唯讀模式，只顯示公開連結；不會顯示新增、編輯、刪除、拖曳、設定、鎖定等操作。
- PIN、Google OAuth 設定、私人連結、分類圖片及上傳的背景圖片不會放入分享網址，避免分享網址過長。
- 分享網址是產生當下的快照。日後將連結改為私人或刪除，已傳出的舊網址仍可能繼續顯示當時內容，因此請勿把機密資料設為公開。
- 分享資料位於網址的 `#share=` 片段中，不需要伺服器或資料庫，適合 GitHub Pages。

## 使用方式

直接用瀏覽器開啟 `index.html` 即可預覽。正式使用建議先部署到 GitHub Pages，再到「設定」連接 Google Drive。

## 部署至 GitHub Pages

1. 在 GitHub 建立一個新的 repository。
2. 將本資料夾內的所有檔案上傳到 repository 根目錄。
3. 到 repository 的 `Settings` → `Pages`。
4. 在 `Build and deployment` 中選擇 `Deploy from a branch`。
5. Branch 選擇 `main`、資料夾選擇 `/ (root)`，再按下 `Save`。
6. 等待 GitHub 顯示網站網址後即可使用。

## 設定 Google Drive App Data 同步

1. 在 Google Cloud Console 建立專案並啟用 **Google Drive API**。
2. 設定 OAuth 同意畫面。
3. 建立「網頁應用程式」OAuth 2.0 用戶端。
4. 將 GitHub Pages 網址的來源加入「已授權的 JavaScript 來源」，例如 `https://username.github.io`。
5. 在 Kuma's Dock 的「設定」頁貼上 OAuth Client ID，或貼上含 `client_id` 的 OAuth 授權連結。
6. 按下「登入 Google」並授權 App Data 權限。

App Data 是 Google Drive 提供給應用程式的隱藏資料空間，不會出現在一般「我的雲端硬碟」檔案清單。Google 存取權杖有效期較短，重新開啟頁面或權杖到期後可能需要再次按「登入 Google」。未連線時，變更會暫存在目前瀏覽器，重新連線後再同步。

從 v1.1 升級時，既有 App Data 檔案會自動沿用並改成固定檔名 `kumas-dock-data.json`，後續升級不會因版本號改變而建立不同資料檔。

## 背景圖片

- 可在「設定」中貼上圖片網址，或直接上傳裝置內的圖片。
- 支援 0–100% 背景透明度，以及冷色到暖色的色溫調整。
- 上傳圖片會轉換成 WebP，長邊最多 1600 像素；過大的圖片會再次縮小，以降低瀏覽器儲存與同步負擔。
- 背景設定與圖片資料會一併同步到 Google Drive App Data。
- v1.4 改用 FileReader 讀取上傳圖片，提高單檔預覽環境的相容性；HEIC／HEIF 仍需先轉成 JPG、PNG 或 WebP。
- v1.4.2 為 CSS 與 JavaScript 加入版本參數，避免 GitHub Pages 繼續使用舊快取而造成版面或按鈕功能不一致。
- v1.4.2 改用固定的瀏覽器資料名稱 `kumas-dock-data`；成功搬移後會清除舊版重複資料，避免背景圖片占用多份空間。

## PIN 鎖定

- 第一次按右下角「鎖定」時，可設定 4–8 位數 PIN。
- PIN 會以 PBKDF2-SHA256、隨機 salt 與 150,000 次運算產生驗證值，不會儲存明碼。
- PIN 驗證值會連同 Dock 資料同步到 Google Drive App Data。
- 已啟用鎖定後，每次重新進入頁面都必須輸入 PIN。
- 修改 PIN 請到「設定」→「PIN 鎖定」。
- PIN 鎖定適合防止一般誤觸或查看，不能取代完整的伺服器端身分驗證。

## 檔案

- `index.html`：網站結構
- `styles.css`：灰色調響應式介面與右下浮動操作列
- `app.js`：Dock、Google Drive 同步與 PIN 鎖定邏輯
- `favicon.svg`：網站圖示
