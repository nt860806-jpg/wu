# 追星便利店｜官方藝人周邊集單所

由 Google AI Studio 建立的 React + Vite 網站。

## 本機開發

需要 Node.js 22 與 pnpm 9。

```sh
pnpm install
pnpm dev
```

## 建置

```sh
pnpm install --frozen-lockfile
pnpm build
```

網站會輸出至 `dist/`，Vercel 可直接使用 Vite 預設建置設定。

## 環境變數

- `GEMINI_API_KEY`：只有網站呼叫 Gemini API 時需要。此份原始碼未找到實際讀取此變數的程式碼。
- `APP_URL`：AI Studio 的託管環境網址；此份原始碼未找到實際讀取此變數的程式碼。

## Vercel 登入帳號設定

登入 API 只讀取伺服器端環境變數 `AUTH_USERS_JSON`。請在 Vercel 專案 `twice` 的 Settings → Environment Variables 新增此變數，設為 Sensitive，套用 Production，並填入 JSON 陣列；每個項目格式為 `{"email":"帳號信箱","password":"帳號密碼"}`。不要把真實密碼放進 GitHub 或前端程式碼。設定後需重新部署 Production。

只有列在此變數中的帳號可以登入與切換角色；網站不提供自行註冊。此專案目前仍以瀏覽器本機儲存商品與訂單，管理畫面尚未連接具伺服器端權限控管的資料庫，因此登入限制目前只保護網站的登入與角色切換流程。
