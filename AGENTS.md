# JYP SELECT 系統層級與商品歸類準則

## 1. 資料層級架構（絕對不可混淆）
在後台新增商品、匯入資料、產出商品頁面或計算庫存時，均必須嚴格遵守以下兩層結構：

- **第一層（根目錄/團體）：`Artist`**
  - 例如：`TWICE`、`Stray Kids`、`ITZY`、`NMIXX`、`DAY6`、`Xdinary Heroes`
- **第二層（分類主題/批號）：`Campaign`**
  - 例如：`10th_Anniversary`、`WorldTour_MD`、`FanMeeting_3rd`、`Season_Greetings`、`Comeback_Album_POB`

## 2. 互動與歸類規則
1. 當用戶指示：『我要在 [某團體] 的 [某主題] 底下新增商品』時，必須自動將資料對應到該 `Artist` 與 `Campaign`。
2. **同名商品隔離規則**：
   若商品名稱在不同主題中重複（例如不同主題皆有『隨機小卡』或『應援手燈』），必須以第二層的 `Campaign` 做為區分依據，**絕對不能把 A 主題的庫存或價格算到 B 主題**。
3. 訂單與物流出貨批次（`batchCode`）亦與 `Artist` + `Campaign` 連動管理。
