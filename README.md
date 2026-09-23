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
