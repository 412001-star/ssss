# Google Apps Script 後端設定與前端整合說明

## 1. 建立 Google 試算表
1. 開啟 Google Drive。
2. 建立新的 Google 試算表。
3. 將工作表名稱改成 `單字表`（或任意名稱，但後續腳本要同步更新）。
4. 將第一列設定為欄位名稱：
   - A1: 英文單字
   - B1: 中文翻譯
   - C1: 詞性
   - D1: 例句
   - E1: 字根分析

## 2. 建立 Google Apps Script 專案
1. 在試算表中，點選「擴充功能」>「Apps Script」。
2. 在 Apps Script 編輯器中，建立新的腳本檔案 `Code.gs`，貼上以下內容：

```javascript
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: '沒有有效的 POST 資料'})).setMimeType(ContentService.MimeType.JSON);
    }

    const payload = JSON.parse(e.postData.contents);
    const word = payload.word || '';
    const chinese = payload.chinese || '';
    const pos = payload.pos || '';
    const example = payload.example || '';
    const root = payload.root || '';

    if (!word) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: '英文單字為必填'})).setMimeType(ContentService.MimeType.JSON);
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName('單字表');
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({status: 'error', message: '找不到工作表：單字表'})).setMimeType(ContentService.MimeType.JSON);
    }

    sheet.appendRow([word, chinese, pos, example, root]);

    return ContentService.createTextOutput(JSON.stringify({status: 'success', message: '已寫入試算表'})).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', message: error.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
```

## 3. 部署 Web App
1. 點選右上角「部署」>「新建立部署」。
2. 選擇「Web 應用程式」。
3. `描述` 填寫：`單字管理 Web App`。
4. `執行應用程式的使用者` 選擇：`我`。
5. `可以存取的人員` 選擇：`任何人，包括匿名使用者`。
6. 按下「部署」。
7. 取得部署後顯示的 Web App URL，類似：
   `https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec`

## 4. 更新前端 `app.js`
1. 開啟 `app.js`。
2. 找到 `GAS_ENDPOINT` 常數，將預設值替換為剛剛部署後的 Web App URL：

```javascript
const GAS_ENDPOINT = 'https://script.google.com/macros/s/XXXXXXXXXXXXXXXXXXXXXXXX/exec'
```

3. 儲存 `app.js`。

## 5. 前端行為說明
- 使用者在管理頁面輸入英文單字、中文翻譯、字根分析、例句、詞性。
- 按下「儲存單字」時，前端會同時：
  1. 將資料送到 Google Apps Script 後端（POST JSON）。
  2. 將資料儲存在瀏覽器 `localStorage`（可離線瀏覽）。
- 若後端提交成功，會顯示 `已儲存並送出後端`。
- 若後端提交失敗，會顯示 `已儲存到本機，但後端提交失敗，請查看控制台`。

## 6. 測試步驟
1. 開啟 `index.html`。
2. 點選 `管理`。
3. 輸入一筆單字資料，確認欄位完整。
4. 點擊 `儲存單字`。
5. 前往 Google 試算表，確認新資料是否已新增在下一列。

## 7. 注意事項
- 若部署 Web App 的存取權限不是匿名，可導致前端呼叫失敗。
- 若使用 `https://script.google.com/macros/s/.../exec`，須確保該 URL 有 `https://` 協議。
- Google Apps Script 的 `doPost` 需要資料以 JSON 形式傳入，且 Content-Type 為 `application/json`。
