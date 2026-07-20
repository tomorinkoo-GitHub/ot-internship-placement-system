// =============================================================
// 実習配置システム v9.5
// =============================================================
// 【変更履歴 v9.5】
//   - 配置実行のアルゴリズムを「正方行列パディング方式」から
//     「矩形ハンガリアン法」に変更
//     学生数とスロット数のうち少ない方を行、多い方を列とすることで、
//     ダミー行・ダミー列を一切作らずに済むようにした
//   - 旧方式は「ダミー値(1e9)で埋めた行/列」が生じた際、
//     探索アルゴリズム内部の番兵値とコストのダミー値が
//     同じ桁(1e9)だったため、学生数とスロット数が一致しない
//     ケース（特に施設側の枠数が学生数より多いケース）で
//     ほぼ確実にクラッシュしていた（TypeError: Cannot read
//     properties of undefined (reading '0')）
//   - 施設側の追加募集により枠数が随時変動する運用（学生数と
//     枠数のどちらが多いかが時期によって入れ替わる）に対応
// =============================================================
// 【変更履歴 v9.4】
//   - 学生マスタのヘッダー変更
//     エリア→エリア（住所1）、エリア（住所2）を新設
//     列順：学籍番号・氏名・学年・住所（現住所）・緯度・経度・
//           エリア（住所1）・最寄り駅・自宅→最寄り駅(分)・
//           住所2（実習中利用可能）・緯度2・経度2・エリア（住所2）・
//           希望領域・備考
//   - 緯度経度取得：住所1と住所2の書き込み先を厳密に分離
//   - エリア自動判定：住所1→エリア（住所1）、住所2→エリア（住所2）
//   - 需給管理：エリア列名をエリア（住所1）に変更
// =============================================================
// 【変更履歴 v9.3】
//   - セットアップで全シートの1行目を毎回強制上書き
//   - 施設マスタのヘッダーから枠列・配置可能数列を削除
//   - フォーム貼付のヘッダーに住所・緯度・経度を追加
//   - フォーム貼付を処理：施設IDをキーに住所・緯度・経度を補完
//   - フォーム貼付を処理：重複検出を施設IDベースに変更
//   - 配置シートのヘッダーを新構成に変更
//   - 「施設を展開」を新規追加
//   - 配置実行：手動配置・確定済みを除いた残りでハンガリアン法
//   - 配置実行：枠数・緯度経度の参照先をフォーム貼付に変更
//   - 需給管理：枠数参照先をフォーム貼付に変更
// =============================================================
// 【フォーム貼付シートの列構成（v9.3）】
//   A列：施設ID（マッチング後に自動入力）
//   B列：タイムスタンプ
//   C列：メールアドレス
//   D列：施設名
//   E列：ご入力者
//   F列：連絡メール
//   G列：早期体験_枠
//   H列：見学実習_枠
//   I列：臨床実習Ⅰ_枠
//   J列：臨床実習Ⅱ_枠
//   K列：臨床実習Ⅲ_枠
//   L列：施設名2
//   M列：空欄
//   N列：施設長名
//   O列：OT責任者
//   P列：実習担当者
//   Q列：公文書送付先
//   R列：資料送付先
//   S列：備考
//   T列：ご質問・お問い合わせ
//   U列：住所（施設マスタから補完）
//   V列：緯度（施設マスタから補完）
//   W列：経度（施設マスタから補完）
// =============================================================
// 【配置シートの列構成（v9.3）】
//   A列：施設ID
//   B列：施設名
//   C列：施設住所
//   D列：学籍番号
//   E列：学生氏名
//   F列：学生住所
//   G列：直線距離(km)
//   H列：移動時間(分)
//   I列：地図で確認
//   J列：ステータス（手動配置 / 自動配置 / 確定）
//   K列：備考
// =============================================================
// 【学生マスタの列構成（v9.4）】
//   A列：学籍番号
//   B列：氏名
//   C列：学年
//   D列：住所（現住所）
//   E列：緯度
//   F列：経度
//   G列：エリア（住所1）
//   H列：最寄り駅
//   I列：自宅→最寄り駅(分)
//   J列：住所2（実習中利用可能）
//   K列：緯度2
//   L列：経度2
//   M列：エリア（住所2）
//   N列：希望領域
//   O列：備考
// =============================================================

// =====================
// CONFIG
// =====================
const CONFIG = {
  シート: {
    施設マスタ:       "施設マスタ",
    学生マスタ:       "学生マスタ",
    フォーム貼付:     "フォーム貼付",
    需給管理:         "需給管理",
    配置ログ:         "配置ログ",
    エリアマスタ:     "エリアマスタ",
    過去配置:         "過去配置",
    実習期間マスタ:   "実習期間マスタ",
    就職説明会リスト: "就職説明会_送付先リスト",
  },
  キー: {
    施設: "施設ID",
    学生: "学籍番号",
  },
  実習: [
    { 名前: "早期体験",   対象学年: "1" },
    { 名前: "見学実習",   対象学年: "2" },
    { 名前: "臨床実習Ⅰ", 対象学年: "2" },
    { 名前: "臨床実習Ⅱ", 対象学年: "3" },
    { 名前: "臨床実習Ⅲ", 対象学年: "3" },
  ],
  配置ヘッダー: ["施設ID","施設名","施設住所","学籍番号","学生氏名","学生住所","直線距離(km)","移動時間(分)","地図で確認","ステータス","備考"],
  ステータス: {
    手動配置: "手動配置",
    自動配置: "自動配置",
    確定:     "確定",
  },
  需給管理: {
    GAS操作範囲: 18,
  },
  就職説明会ヘッダー: [
    "施設名","郵便番号","住所","施設長肩書","施設長名",
    "OT責任者","資料送付先","メールアドレス","記入者氏名",
    "臨床実習Ⅰ_枠","臨床実習Ⅱ_枠","臨床実習Ⅲ_枠"
  ],
  実習期間マスタヘッダー: ["依頼年度","学年","実習種別","開始日","終了日"],
  実習期間マスタ初期データ: [
    [2026, "1年次", "早期体験実習",  "2027/3/1",  "2027/3/5" ],
    [2026, "2年次", "見学実習",      "2027/2/15", "2027/2/19"],
    [2026, "3年次", "臨床実習Ⅰ",    "2027/8/23", "2027/10/9"],
    [2026, "4年次", "臨床実習Ⅱ",    "2027/4/12", "2027/5/29"],
    [2026, "4年次", "臨床実習Ⅲ",    "2027/6/7",  "2027/7/24"],
  ],
};

const 実習名一覧 = CONFIG.実習.map(r => r.名前);

// =====================
// メニュー
// =====================
function onOpen() {
  const menu = SpreadsheetApp.getUi().createMenu("🏥 実習配置")
    .addItem("① セットアップ（最初に1回）", "セットアップ実行")
    .addSeparator()
    .addItem("② 施設マスタ 緯度経度取得・エリア自動判定", "施設緯度経度とエリア取得")
    .addItem("② 学生マスタ 緯度経度取得", "学生緯度経度を取得")
    .addSeparator()
    .addItem("③ フォーム貼付を処理", "フォーム貼付を処理")
    .addSeparator();

  CONFIG.実習.forEach(r => {
    menu.addItem(`④ ${r.名前}　施設を展開`, `${r.名前}_施設を展開`);
  });

  menu.addSeparator();

  CONFIG.実習.forEach(r => {
    menu.addItem(`④ ${r.名前}　配置実行`, `${r.名前}_配置実行`);
  });

  menu
    .addSeparator()
    .addItem("⑤ 地図リンクを生成（早期体験・見学）", "地図リンク生成_早期体験見学")
    .addItem("⑤ 地図リンクを生成（臨床Ⅰ〜Ⅲ）", "地図リンク生成_臨床")
    .addSeparator()
    .addItem("⑥ 重複チェック・最終確認", "重複チェックと最終確認")
    .addItem("⑦ 需給管理を更新", "需給管理を更新")
    .addItem("⑦ 確定配置を書き出し", "確定配置を書き出し")
    .addSeparator()
    .addItem("⑧ 就職説明会リストを生成", "就職説明会リストを生成")
    .addToUi();
}

// =====================
// セットアップ
// =====================
function セットアップ実行() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const シート定義 = [
    {
      名前: CONFIG.シート.施設マスタ,
      ヘッダー: [
        "施設ID","施設名","施設区分","訪問リハ","通所リハ","住所","緯度","経度","エリア","連絡メール",
        "施設長名","OT責任者","実習担当者","公文書送付先","資料送付先","備考",
        "抗体価検査・ワクチン","その他（提出書類等）",
        "GoogleアカウントID","スプシファイルID"
      ]
    },
    {
      名前: CONFIG.シート.学生マスタ,
      ヘッダー: [
        "学籍番号","氏名","学年",
        "住所（現住所）","緯度","経度","エリア（住所1）",
        "最寄り駅","自宅→最寄り駅(分)",
        "住所2（実習中利用可能）","緯度2","経度2","エリア（住所2）",
        "希望領域","備考"
      ]
    },
    {
      名前: CONFIG.シート.フォーム貼付,
      ヘッダー: [
        "施設ID","タイムスタンプ","メールアドレス","施設名","ご入力者","連絡メール",
        "早期体験_枠","見学実習_枠","臨床実習Ⅰ_枠","臨床実習Ⅱ_枠","臨床実習Ⅲ_枠",
        "施設名2","空欄","施設長名","OT責任者","実習担当者","公文書送付先","資料送付先",
        "備考","ご質問・お問い合わせ",
        "住所","緯度","経度"
      ]
    },
    ...CONFIG.実習.map(r => ({ 名前: r.名前, ヘッダー: CONFIG.配置ヘッダー })),
    {
      名前: CONFIG.シート.需給管理,
      ヘッダー: ["エリア", ...実習名一覧.flatMap(名 => [`${名}_枠計`, `${名}_配置済`])]
    },
    {
      名前: CONFIG.シート.配置ログ,
      ヘッダー: ["実行日時","実習種別","配置件数","未配置件数","未配置学生リスト"]
    },
    {
      名前: CONFIG.シート.エリアマスタ,
      ヘッダー: ["エリア","市区町村"]
    },
    {
      名前: CONFIG.シート.過去配置,
      ヘッダー: ["年度","実習種別","学籍番号","氏名","施設ID","施設名","直線距離(km)"]
    },
    {
      名前: CONFIG.シート.実習期間マスタ,
      ヘッダー: CONFIG.実習期間マスタヘッダー
    },
    {
      名前: CONFIG.シート.就職説明会リスト,
      ヘッダー: CONFIG.就職説明会ヘッダー
    },
  ];

  let 作成済み = [], 更新済み = [];
  シート定義.forEach(def => {
    let sheet = ss.getSheetByName(def.名前);
    if (!sheet) {
      sheet = ss.insertSheet(def.名前);
      作成済み.push(def.名前);
    } else {
      更新済み.push(def.名前);
    }
    sheet.getRange(1, 1, 1, def.ヘッダー.length).setValues([def.ヘッダー]);
    sheet.getRange(1, 1, 1, def.ヘッダー.length).setBackground("#d9ead3").setFontWeight("bold");
  });

  // エリアマスタ初期データ（空の場合のみ）
  const エリアSheet = ss.getSheetByName(CONFIG.シート.エリアマスタ);
  if (エリアSheet && エリアSheet.getLastRow() <= 1) {
    const エリア初期データ = [
      ["①都心","東京都千代田区"],["①都心","東京都中央区"],["①都心","東京都港区"],
      ["②新宿渋谷","東京都新宿区"],["②新宿渋谷","東京都渋谷区"],["②新宿渋谷","東京都豊島区"],
      ["③城南","東京都品川区"],["③城南","東京都目黒区"],["③城南","東京都大田区"],
      ["④城東","東京都墨田区"],["④城東","東京都江東区"],["④城東","東京都江戸川区"],["④城東","東京都葛飾区"],
      ["⑤城北","東京都北区"],["⑤城北","東京都荒川区"],["⑤城北","東京都足立区"],
      ["⑥城西","東京都杉並区"],["⑥城西","東京都中野区"],["⑥城西","東京都練馬区"],["⑥城西","東京都板橋区"],
      ["⑦多摩北","東京都東久留米市"],["⑦多摩北","東京都清瀬市"],["⑦多摩北","東京都東村山市"],["⑦多摩北","東京都武蔵村山市"],["⑦多摩北","東京都東大和市"],
      ["⑧多摩中","東京都立川市"],["⑧多摩中","東京都国分寺市"],["⑧多摩中","東京都小平市"],["⑧多摩中","東京都国立市"],["⑧多摩中","東京都昭島市"],
      ["⑨多摩南","東京都府中市"],["⑨多摩南","東京都調布市"],["⑨多摩南","東京都三鷹市"],["⑨多摩南","東京都狛江市"],["⑨多摩南","東京都稲城市"],
      ["⑩八王子町田","東京都八王子市"],["⑩八王子町田","東京都町田市"],
      ["⑪青梅","東京都青梅市"],["⑪青梅","東京都福生市"],["⑪青梅","東京都羽村市"],["⑪青梅","東京都あきる野市"],
      ["⑫川崎横浜","神奈川県川崎市"],["⑫川崎横浜","神奈川県横浜市"],
      ["⑬神奈川他","神奈川県相模原市"],["⑬神奈川他","神奈川県厚木市"],["⑬神奈川他","神奈川県大和市"],
      ["⑭埼玉","埼玉県さいたま市"],["⑭埼玉","埼玉県川口市"],["⑭埼玉","埼玉県川越市"],["⑭埼玉","埼玉県所沢市"],
      ["⑮千葉","千葉県千葉市"],["⑮千葉","千葉県船橋市"],["⑮千葉","千葉県市川市"],["⑮千葉","千葉県松戸市"],
      ["⑯北関東","茨城県"],["⑯北関東","栃木県"],["⑯北関東","群馬県"],
    ];
    エリアSheet.getRange(2, 1, エリア初期データ.length, 2).setValues(エリア初期データ);
  }

  // 実習期間マスタ初期データ（空の場合のみ）
  const 期間Sheet = ss.getSheetByName(CONFIG.シート.実習期間マスタ);
  if (期間Sheet && 期間Sheet.getLastRow() <= 1) {
    期間Sheet.getRange(2, 1, CONFIG.実習期間マスタ初期データ.length, CONFIG.実習期間マスタヘッダー.length)
      .setValues(CONFIG.実習期間マスタ初期データ);
  }

  let msg = "✅ セットアップ完了\n";
  if (作成済み.length > 0) msg += `\n新規作成：\n${作成済み.join("\n")}`;
  if (更新済み.length > 0) msg += `\n\nヘッダー更新：\n${更新済み.join("\n")}`;
  msg += "\n\n次の手順：\n";
  msg += "1. フォーム回答をフォーム貼付シートに貼り付け\n";
  msg += "2. 「③ フォーム貼付を処理」を実行（施設ID・住所・緯度経度を補完）\n";
  msg += "3. 「④ 施設を展開」で配置シートに施設行を生成\n";
  msg += "4. 手動配置が必要な学生を先に割り付け（ステータス：手動配置）\n";
  msg += "5. 「④ 配置実行」でハンガリアン法による自動配置を実行";
  ui.alert(msg);
}

// =====================
// 緯度経度取得（共通）
// =====================
function _緯度経度を取得(シート名, 住所列名, 緯度列名, 経度列名) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(シート名);
  if (!sheet) return { 取得: 0, スキップ: 0, エラー: 0, エラー詳細: `${シート名}シートが見つかりません` };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const 住所列idx = headers.indexOf(住所列名);
  const 緯度列idx = headers.indexOf(緯度列名);
  const 経度列idx = headers.indexOf(経度列名);

  if (住所列idx === -1 || 緯度列idx === -1 || 経度列idx === -1) {
    return { 取得: 0, スキップ: 0, エラー: 0, エラー詳細: `「${住所列名}」「${緯度列名}」「${経度列名}」列が見つかりません` };
  }

  let 取得 = 0, スキップ = 0, エラー = 0;
  for (let i = 1; i < data.length; i++) {
    const 住所 = String(data[i][住所列idx]).trim();
    // 住所が空またはエリア名っぽい値（数字始まりの丸囲み文字）はスキップ
    if (!住所 || /^[①-⑳]/.test(住所)) continue;
    if (data[i][緯度列idx] && data[i][経度列idx]) { スキップ++; continue; }
    try {
      const result = Maps.newGeocoder().geocode(住所);
      if (result.status === "OK" && result.results.length > 0) {
        const loc = result.results[0].geometry.location;
        // 指定された緯度・経度列にのみ書き込む（列を厳密に指定）
        sheet.getRange(i + 1, 緯度列idx + 1).setValue(loc.lat);
        sheet.getRange(i + 1, 経度列idx + 1).setValue(loc.lng);
        取得++;
        Utilities.sleep(100);
      } else { エラー++; }
    } catch (e) { エラー++; }
  }
  return { 取得, スキップ, エラー, エラー詳細: "" };
}

function 施設緯度経度とエリア取得() { 施設緯度経度を取得(); エリアを自動判定(); }

function 施設緯度経度を取得() {
  const r = _緯度経度を取得(CONFIG.シート.施設マスタ, "住所", "緯度", "経度");
  if (r.エラー詳細) { SpreadsheetApp.getUi().alert(r.エラー詳細); return; }
  SpreadsheetApp.getUi().alert(`✅ 施設 緯度経度取得完了\n\n取得：${r.取得}件\nスキップ：${r.スキップ}件\nエラー：${r.エラー}件`);
}

function 学生緯度経度を取得() {
  const ui = SpreadsheetApp.getUi();
  // 住所1の緯度経度を取得（E列・F列のみに書き込む）
  const r1 = _緯度経度を取得(CONFIG.シート.学生マスタ, "住所（現住所）", "緯度", "経度");
  if (r1.エラー詳細) { ui.alert(r1.エラー詳細); return; }
  // 住所2の緯度経度を取得（K列・L列のみに書き込む）
  const r2 = _緯度経度を取得(CONFIG.シート.学生マスタ, "住所2（実習中利用可能）", "緯度2", "経度2");
  let msg = `✅ 学生 緯度経度取得完了\n\n【住所1（現住所）】\n取得：${r1.取得}件 / スキップ：${r1.スキップ}件 / エラー：${r1.エラー}件`;
  if (!r2.エラー詳細) msg += `\n\n【住所2（実習中利用可能）】\n取得：${r2.取得}件 / スキップ：${r2.スキップ}件 / エラー：${r2.エラー}件`;
  ui.alert(msg);
}

// =====================
// エリアを自動判定
// =====================
function エリアを自動判定() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const エリアSheet = ss.getSheetByName(CONFIG.シート.エリアマスタ);
  if (!エリアSheet) { ui.alert("エリアマスタシートが見つかりません。"); return; }

  const エリアデータ = エリアSheet.getDataRange().getValues();
  const エリアMap = new Map();
  for (let i = 1; i < エリアデータ.length; i++) {
    const e = String(エリアデータ[i][0]).trim();
    const m = String(エリアデータ[i][1]).trim();
    if (e && m) エリアMap.set(m, e);
  }

  function 住所からエリア判定(住所) {
    if (!住所) return "";
    const s = String(住所).trim();
    const keys = Array.from(エリアMap.keys()).sort((a, b) => b.length - a.length);
    for (const m of keys) {
      if (s.includes(m.replace(/^(東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県)/, ""))) {
        const p = m.match(/^(東京都|神奈川県|埼玉県|千葉県|茨城県|栃木県|群馬県)/);
        if (!p || s.startsWith(p[1])) return エリアMap.get(m);
      }
    }
    return "圏外";
  }

  let 施設更新 = 0, 学生更新1 = 0, 学生更新2 = 0, 施設圏外 = 0, 学生圏外1 = 0, 学生圏外2 = 0;

  // 施設マスタ：住所→エリア
  const 施設Sheet = ss.getSheetByName(CONFIG.シート.施設マスタ);
  if (施設Sheet) {
    const d = 施設Sheet.getDataRange().getValues();
    const H = d[0];
    const 住所列 = H.indexOf("住所"), エリア列 = H.indexOf("エリア");
    if (住所列 !== -1 && エリア列 !== -1) {
      for (let i = 1; i < d.length; i++) {
        if (!d[i][住所列]) continue;
        const e = 住所からエリア判定(d[i][住所列]);
        施設Sheet.getRange(i + 1, エリア列 + 1).setValue(e);
        e === "圏外" ? 施設圏外++ : 施設更新++;
      }
    }
  }

  // 学生マスタ：住所1→エリア（住所1）、住所2→エリア（住所2）
  const 学生Sheet = ss.getSheetByName(CONFIG.シート.学生マスタ);
  if (学生Sheet) {
    const d = 学生Sheet.getDataRange().getValues();
    const H = d[0];
    const 住所1列   = H.indexOf("住所（現住所）");
    const エリア1列 = H.indexOf("エリア（住所1）");
    const 住所2列   = H.indexOf("住所2（実習中利用可能）");
    const エリア2列 = H.indexOf("エリア（住所2）");

    for (let i = 1; i < d.length; i++) {
      // 住所1→エリア（住所1）
      if (住所1列 !== -1 && エリア1列 !== -1 && d[i][住所1列]) {
        const e = 住所からエリア判定(d[i][住所1列]);
        学生Sheet.getRange(i + 1, エリア1列 + 1).setValue(e);
        e === "圏外" ? 学生圏外1++ : 学生更新1++;
      }
      // 住所2→エリア（住所2）
      if (住所2列 !== -1 && エリア2列 !== -1 && d[i][住所2列]) {
        const e = 住所からエリア判定(d[i][住所2列]);
        学生Sheet.getRange(i + 1, エリア2列 + 1).setValue(e);
        e === "圏外" ? 学生圏外2++ : 学生更新2++;
      }
    }
  }

  ui.alert(`✅ エリア自動判定完了\n\n施設：${施設更新}件（圏外${施設圏外}件）\n学生（住所1）：${学生更新1}件（圏外${学生圏外1}件）\n学生（住所2）：${学生更新2}件（圏外${学生圏外2}件）`);
}

// =====================
// 施設名マッチング
// =====================
function _施設名正規化(名前) {
  return String(名前)
    .replace(/[\s　]/g, "")
    .replace(/[Ａ-Ｚａ-ｚ０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .replace(/[・･]/g, "")
    .replace(/[「」『』【】〔〕［］()（）]/g, "")
    .toLowerCase();
}

function _法人格除去(名前) {
  const 法人プレフィックス = [
    "国立研究開発法人","地方独立行政法人","独立行政法人","特定非営利活動法人",
    "社会医療法人財団","社会医療法人社団","社会医療法人",
    "医療法人財団","医療法人社団","医療法人",
    "公益財団法人","公益社団法人",
    "社会福祉法人","一般社団法人","一般財団法人",
    "国立大学法人","学校法人",
    "川崎医療生活協同組合","医療生協さいたま生活協同組合","医療生協さいたま生協協同組合",
    "株式会社","合同会社","有限会社",
  ];
  let s = _施設名正規化(名前);
  for (const p of 法人プレフィックス) {
    const pn = _施設名正規化(p);
    if (s.startsWith(pn)) { s = s.slice(pn.length); break; }
  }
  return s;
}

function _マスタテーブルを構築(マスタデータ, ID列, 名前列) {
  const 完全Map  = {};
  const 短縮Map  = {};
  const 全リスト = [];
  マスタデータ.slice(1).forEach(行 => {
    const id   = String(行[ID列]).trim();
    const 名前  = String(行[名前列]).trim();
    if (!id || !名前) return;
    const 正規化 = _施設名正規化(名前);
    const 短縮   = _法人格除去(名前);
    完全Map[正規化] = id;
    if (短縮 && 短縮.length >= 4) 短縮Map[短縮] = id;
    全リスト.push({ 正規化, 短縮, id });
  });
  return { 完全Map, 短縮Map, 全リスト };
}

function _施設IDを探す(フォーム施設名, テーブル) {
  const { 完全Map, 短縮Map, 全リスト } = テーブル;
  const raw  = _施設名正規化(フォーム施設名);
  const 短縮 = _法人格除去(フォーム施設名);
  if (!raw || raw.length < 2) return null;

  if (完全Map[raw]) return 完全Map[raw];
  if (短縮 && 短縮.length >= 4 && 短縮Map[短縮]) return 短縮Map[短縮];

  if (raw.length >= 4) {
    const hits = 全リスト.filter(m => m.正規化.includes(raw));
    if (hits.length === 1) return hits[0].id;
    if (hits.length > 1 && 短縮.length >= 4) {
      const hits2 = hits.filter(m => m.正規化.includes(短縮));
      if (hits2.length === 1) return hits2[0].id;
    }
  }

  if (raw.length >= 4) {
    const hits = 全リスト.filter(m => m.短縮.length >= 4 && raw.includes(m.短縮));
    if (hits.length === 1) return hits[0].id;
  }

  return null;
}

// =====================
// フォーム貼付を処理
// =====================
function フォーム貼付を処理() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const sheet = ss.getSheetByName(CONFIG.シート.フォーム貼付);
  if (!sheet) { ui.alert("フォーム貼付シートが見つかりません。"); return; }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { ui.alert("データが貼り付けられていません。"); return; }

  const confirm = ui.alert("フォーム貼付を処理", "施設IDと住所・緯度経度を上書きします。続けますか？", ui.ButtonSet.OK_CANCEL);
  if (confirm !== ui.Button.OK) return;

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const データ  = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();

  // 枠列を数値に正規化
  const 枠列名 = CONFIG.実習.map(r => `${r.名前}_枠`);
  const 枠列インデックス = 枠列名.map(名 => headers.indexOf(名)).filter(i => i !== -1);
  データ.forEach((行, rowIdx) => {
    枠列インデックス.forEach(colIdx => {
      const num = parseInt(行[colIdx], 10);
      if (!isNaN(num)) sheet.getRange(rowIdx + 2, colIdx + 1).setValue(num);
    });
  });

  const 施設名列   = headers.indexOf("施設名");
  const 施設ID列   = headers.indexOf("施設ID");
  const 住所列     = headers.indexOf("住所");
  const 緯度列     = headers.indexOf("緯度");
  const 経度列     = headers.indexOf("経度");
  const タイムスタンプ列 = headers.indexOf("タイムスタンプ");

  if (施設名列 === -1 || 施設ID列 === -1) { ui.alert("施設名または施設ID列が見つかりません。"); return; }

  // 施設マスタ読み込み
  const マスタSheet = ss.getSheetByName(CONFIG.シート.施設マスタ);
  if (!マスタSheet) { ui.alert("施設マスタが見つかりません。"); return; }

  const マスタデータ = マスタSheet.getDataRange().getValues();
  const マスタH      = マスタデータ[0].map(h => String(h).replace(/[\s　]/g, ""));
  const マスタID列   = マスタH.indexOf("施設ID");
  const マスタ名列   = マスタH.indexOf("施設名");
  const マスタ住所列 = マスタH.indexOf("住所");
  const マスタ緯度列 = マスタH.indexOf("緯度");
  const マスタ経度列 = マスタH.indexOf("経度");

  if (マスタID列 === -1 || マスタ名列 === -1) {
    ui.alert("施設マスタに「施設ID」または「施設名」列が見つかりません。");
    return;
  }

  const テーブル = _マスタテーブルを構築(マスタデータ, マスタID列, マスタ名列);

  const 施設情報Map = new Map();
  マスタデータ.slice(1).forEach(行 => {
    const id = String(行[マスタID列]).trim();
    if (!id) return;
    施設情報Map.set(id, {
      住所: マスタ住所列 !== -1 ? String(行[マスタ住所列]).trim() : "",
      緯度: マスタ緯度列 !== -1 ? 行[マスタ緯度列] : "",
      経度: マスタ経度列 !== -1 ? 行[マスタ経度列] : "",
    });
  });

  let マッチ数 = 0, 補完数 = 0;
  const 未マッチ = [];
  const マッチ結果 = データ.map(行 => {
    const raw = String(行[施設名列]).trim();
    if (!raw) return { id: "", key: "" };
    const id = _施設IDを探す(raw, テーブル);
    const key = id || _施設名正規化(raw);
    return { id, key, raw };
  });

  const キー別カウント = {};
  マッチ結果.forEach(r => {
    if (r.key) キー別カウント[r.key] = (キー別カウント[r.key] || 0) + 1;
  });

  マッチ結果.forEach((r, i) => {
    if (!r.raw) return;
    if (r.id) {
      sheet.getRange(i + 2, 施設ID列 + 1).setValue(r.id);
      マッチ数++;
      const info = 施設情報Map.get(r.id);
      if (info) {
        if (住所列 !== -1) sheet.getRange(i + 2, 住所列 + 1).setValue(info.住所);
        if (緯度列 !== -1) sheet.getRange(i + 2, 緯度列 + 1).setValue(info.緯度);
        if (経度列 !== -1) sheet.getRange(i + 2, 経度列 + 1).setValue(info.経度);
        補完数++;
      }
    } else {
      sheet.getRange(i + 2, 施設ID列 + 1).setValue("");
      未マッチ.push(r.raw);
    }
    const isDup = r.key && キー別カウント[r.key] > 1;
    sheet.getRange(i + 2, 1, 1, headers.length).setBackground(isDup ? "#fff2cc" : null);
  });

  const 重複リスト = Object.entries(キー別カウント)
    .filter(([_, c]) => c > 1)
    .map(([key, c]) => `${key}（${c}件）`);

  let msg = `✅ 処理完了\n施設ID自動入力：${マッチ数}件\n住所・緯度経度補完：${補完数}件`;
  if (未マッチ.length > 0)   msg += `\n\n⚠️ 施設ID未マッチ（手入力必要）：\n${未マッチ.join("\n")}`;
  if (重複リスト.length > 0) msg += `\n\n⚠️ 同一施設の重複（黄色）：\n${重複リスト.join("\n")}\n不要な行を手動で削除してください。`;
  ui.alert(msg);
}

// =====================
// 距離計算
// =====================
function _直線距離km(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2
          + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function _学生施設間距離(学生, 施設lat, 施設lng) {
  const dist1 = (学生.lat && 学生.lng)   ? _直線距離km(学生.lat,  学生.lng,  施設lat, 施設lng) : Infinity;
  const dist2 = (学生.lat2 && 学生.lng2) ? _直線距離km(学生.lat2, 学生.lng2, 施設lat, 施設lng) : Infinity;
  return Math.min(dist1, dist2);
}

// =====================
// 矩形ハンガリアン法
// =====================
// 前提：cost は n行 x m列 で、必ず n <= m（行数 <= 列数）であること。
// 呼び出し側（_配置実行）で、学生数とスロット数のうち
// 「少ない方を行、多い方を列」になるよう組み立てる。
// この前提により、正方化のためのダミー行・ダミー列が一切不要になり、
// v9.4で発生していた「ダミー行が全列で同値になり探索が破綻する」
// バグの土台そのものを排除している。
// （コストのダミー値=1e9と、探索用の番兵値=BIGを別次元の大きさに
//   分離しているため、施設側の緯度経度欠損など、特定の行が
//   全列で同じ大きな値になるケースが万一発生しても安全に動作する）
function _矩形ハンガリアン法(cost) {
  const n = cost.length, m = cost[0].length;
  if (n > m) {
    throw new Error("_矩形ハンガリアン法は行数<=列数の前提です（呼び出し側の組み立てミス）");
  }
  const BIG = Number.MAX_SAFE_INTEGER; // 探索アルゴリズム内部の番兵値（コストの値域とは別次元にする）
  const u = new Array(n + 1).fill(0);
  const v = new Array(m + 1).fill(0);
  const p = new Array(m + 1).fill(0);
  const way = new Array(m + 1).fill(0);

  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minVal = new Array(m + 1).fill(BIG);
    const used   = new Array(m + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = BIG, j1 = -1;
      for (let j = 1; j <= m; j++) {
        if (!used[j]) {
          const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
          if (cur < minVal[j]) { minVal[j] = cur; way[j] = j0; }
          if (minVal[j] < delta) { delta = minVal[j]; j1 = j; }
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; }
        else { minVal[j] -= delta; }
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }

  // 行（0-indexed）-> 列（0-indexed）の対応を返す。n<=mが保証されているため、
  // 全ての行が必ず割り当てられる（-1は発生しない）。
  const assignment = new Array(n).fill(-1);
  for (let j = 1; j <= m; j++) {
    if (p[j] > 0) assignment[p[j] - 1] = j - 1;
  }
  return assignment;
}

// =====================
// フォーム貼付から施設リストを取得（共通）
// =====================
function _フォームから施設リストを取得(実習種別) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.シート.フォーム貼付);
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const H = data[0];
  const 施設ID列  = H.indexOf("施設ID");
  const 施設名列  = H.indexOf("施設名");
  const 住所列    = H.indexOf("住所");
  const 緯度列    = H.indexOf("緯度");
  const 経度列    = H.indexOf("経度");
  const 枠列      = H.indexOf(`${実習種別}_枠`);

  if (施設ID列 === -1 || 枠列 === -1) return null;

  const 施設リスト = [];
  for (let i = 1; i < data.length; i++) {
    const id   = String(data[i][施設ID列]).trim();
    const 枠数 = parseInt(data[i][枠列], 10) || 0;
    if (!id || 枠数 <= 0) continue;
    const lat = 緯度列 !== -1 ? parseFloat(data[i][緯度列]) || 0 : 0;
    const lng = 経度列 !== -1 ? parseFloat(data[i][経度列]) || 0 : 0;
    施設リスト.push({
      id,
      名前:   施設名列 !== -1 ? String(data[i][施設名列]).trim() : "",
      住所:   住所列   !== -1 ? String(data[i][住所列]).trim()   : "",
      lat, lng, 枠数,
    });
  }
  return 施設リスト;
}

// =====================
// 施設を展開
// =====================
function _施設を展開(実習種別) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const 施設リスト = _フォームから施設リストを取得(実習種別);
  if (!施設リスト || 施設リスト.length === 0) {
    ui.alert(`フォーム貼付シートに「${実習種別}_枠」が1以上の施設が見つかりません。`);
    return;
  }

  const 配置Sheet = ss.getSheetByName(実習種別);
  if (!配置Sheet) { ui.alert(`「${実習種別}」シートが見つかりません。`); return; }

  const H = 配置Sheet.getDataRange().getValues()[0];
  const ステータス列 = H.indexOf("ステータス");

  // 自動配置行・空行のみ削除（手動配置・確定は残す）
  for (let i = 配置Sheet.getLastRow(); i >= 2; i--) {
    const st = String(配置Sheet.getRange(i, ステータス列 + 1).getValue()).trim();
    if (st === CONFIG.ステータス.自動配置 || st === "") {
      配置Sheet.deleteRow(i);
    }
  }

  // 確定・手動配置済みの施設IDカウント
  const 既存カウント = {};
  const 既存Data = 配置Sheet.getDataRange().getValues();
  const 既存H    = 既存Data[0];
  const 既存施設ID列    = 既存H.indexOf("施設ID");
  const 既存ステータス列 = 既存H.indexOf("ステータス");
  for (let i = 1; i < 既存Data.length; i++) {
    const st = String(既存Data[i][既存ステータス列]).trim();
    if (st === CONFIG.ステータス.確定 || st === CONFIG.ステータス.手動配置) {
      const id = String(既存Data[i][既存施設ID列]).trim();
      既存カウント[id] = (既存カウント[id] || 0) + 1;
    }
  }

  // 残り枠分だけ行を追加
  const 書き込み行 = [];
  const 展開詳細  = [];
  施設リスト.forEach(f => {
    const 残り = f.枠数 - (既存カウント[f.id] || 0);
    展開詳細.push(`${f.名前}：枠${f.枠数} → ${残り}行展開`);
    for (let k = 0; k < 残り; k++) {
      書き込み行.push([f.id, f.名前, f.住所, "", "", "", "", "", "", "", ""]);
    }
  });

  if (書き込み行.length > 0) {
    配置Sheet.getRange(配置Sheet.getLastRow() + 1, 1, 書き込み行.length, CONFIG.配置ヘッダー.length)
      .setValues(書き込み行);
  }

  ui.alert(`✅ ${実習種別} 施設展開完了\n\n展開行数：${書き込み行.length}行\n\n${展開詳細.join("\n")}\n\n手動配置が必要な学生を先に割り付けてからステータスを「手動配置」にしてください。\n完了後「配置実行」を実行してください。`);
}

function 早期体験_施設を展開()  { _施設を展開("早期体験"); }
function 見学実習_施設を展開()  { _施設を展開("見学実習"); }
function 臨床実習Ⅰ_施設を展開() { _施設を展開("臨床実習Ⅰ"); }
function 臨床実習Ⅱ_施設を展開() { _施設を展開("臨床実習Ⅱ"); }
function 臨床実習Ⅲ_施設を展開() { _施設を展開("臨床実習Ⅲ"); }

// =====================
// 配置実行（共通）
// =====================
function _配置実行(実習種別, 対象学年) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const 配置Sheet = ss.getSheetByName(実習種別);
  if (!配置Sheet) { ui.alert(`「${実習種別}」シートが見つかりません。`); return; }

  const 配置Data = 配置Sheet.getDataRange().getValues();
  if (!配置Data || 配置Data.length === 0) { ui.alert("配置シートが空です。"); return; }

  const 配置H              = 配置Data[0];
  const 配置_施設ID列      = 配置H.indexOf("施設ID");
  const 配置_施設住所列    = 配置H.indexOf("施設住所");
  const 配置_学籍列        = 配置H.indexOf("学籍番号");
  const 配置_ステータス列  = 配置H.indexOf("ステータス");

  if (配置_施設ID列 === -1 || 配置_ステータス列 === -1) {
    ui.alert("配置シートのヘッダーが正しくありません。セットアップを再実行してください。");
    return;
  }

  // 空き行（学籍番号が空 かつ ステータスが空or自動配置）を対象スロットとして収集
  const 空きスロット = [];
  for (let i = 1; i < 配置Data.length; i++) {
    const st      = String(配置Data[i][配置_ステータス列]).trim();
    const 学籍番号 = String(配置Data[i][配置_学籍列]).trim();
    if (学籍番号) continue;
    if (st === CONFIG.ステータス.確定 || st === CONFIG.ステータス.手動配置) continue;

    const 施設ID   = String(配置Data[i][配置_施設ID列]).trim();
    const 施設住所 = 配置_施設住所列 !== -1 ? String(配置Data[i][配置_施設住所列]).trim() : "";
    空きスロット.push({ rowIdx: i, 施設ID, 施設住所 });
  }

  if (空きスロット.length === 0) { ui.alert("配置可能な空き行がありません。先に「施設を展開」を実行してください。"); return; }

  // フォーム貼付から施設の緯度経度を取得
  const フォームSheet = ss.getSheetByName(CONFIG.シート.フォーム貼付);
  const 施設緯度経度Map = new Map();
  if (フォームSheet) {
    const fd = フォームSheet.getDataRange().getValues();
    const fH = fd[0];
    const fID列   = fH.indexOf("施設ID");
    const f緯度列 = fH.indexOf("緯度");
    const f経度列 = fH.indexOf("経度");
    if (fID列 !== -1 && f緯度列 !== -1 && f経度列 !== -1) {
      for (let i = 1; i < fd.length; i++) {
        const id = String(fd[i][fID列]).trim();
        if (!id) continue;
        施設緯度経度Map.set(id, {
          lat: parseFloat(fd[i][f緯度列]) || 0,
          lng: parseFloat(fd[i][f経度列]) || 0,
        });
      }
    }
  }

  // 学生マスタ読み込み
  const 学生Sheet = ss.getSheetByName(CONFIG.シート.学生マスタ);
  if (!学生Sheet) { ui.alert("学生マスタが見つかりません。"); return; }
  const 学生Data = 学生Sheet.getDataRange().getValues();
  const 学生H    = 学生Data[0];
  const 学籍番号列  = 学生H.indexOf("学籍番号");
  const 氏名列      = 学生H.indexOf("氏名");
  const 学年列      = 学生H.indexOf("学年");
  const 現住所列    = 学生H.indexOf("住所（現住所）");
  const 住所2列     = 学生H.indexOf("住所2（実習中利用可能）");
  const 学生緯度列  = 学生H.indexOf("緯度");
  const 学生経度列  = 学生H.indexOf("経度");
  const 学生緯度2列 = 学生H.indexOf("緯度2");
  const 学生経度2列 = 学生H.indexOf("経度2");

  // 手動配置・確定済みの学籍番号を除外
  const 配置済み学籍Set = new Set();
  for (let i = 1; i < 配置Data.length; i++) {
    const st = String(配置Data[i][配置_ステータス列]).trim();
    if (st === CONFIG.ステータス.確定 || st === CONFIG.ステータス.手動配置) {
      const no = String(配置Data[i][配置_学籍列]).trim();
      if (no) 配置済み学籍Set.add(no);
    }
  }

  const 学生リスト = [];
  for (let i = 1; i < 学生Data.length; i++) {
    const 学年str = String(学生Data[i][学年列]).trim();
    if (対象学年 && 学年str !== String(対象学年).trim()) continue;
    const no = String(学生Data[i][学籍番号列]).trim();
    if (!no || 配置済み学籍Set.has(no)) continue;
    学生リスト.push({
      学籍番号: no,
      氏名:     String(学生Data[i][氏名列]).trim(),
      住所:     現住所列 !== -1 ? String(学生Data[i][現住所列]).trim() : "",
      lat:  学生緯度列  !== -1 ? parseFloat(学生Data[i][学生緯度列])  || 0 : 0,
      lng:  学生経度列  !== -1 ? parseFloat(学生Data[i][学生経度列])  || 0 : 0,
      lat2: 学生緯度2列 !== -1 ? parseFloat(学生Data[i][学生緯度2列]) || 0 : 0,
      lng2: 学生経度2列 !== -1 ? parseFloat(学生Data[i][学生経度2列]) || 0 : 0,
    });
  }

  if (学生リスト.length === 0) { ui.alert("配置対象の学生が見つかりません。"); return; }

  // ---------------------------------------------------------
  // コスト行列構築（v9.5：矩形ハンガリアン法）
  // 学生数とスロット数のうち少ない方を「行」、多い方を「列」とする。
  // どちらが多いかは募集状況によって時期ごとに変わるため、
  // 実行ごとに動的に判定する。これによりダミー行・ダミー列を
  // 一切作らずに済み、v9.4で発生していたクラッシュの土台が
  // 構造的になくなる。
  // ---------------------------------------------------------
  const 学生が行 = 学生リスト.length <= 空きスロット.length;
  const 行数 = 学生が行 ? 学生リスト.length : 空きスロット.length;
  const 列数 = 学生が行 ? 空きスロット.length : 学生リスト.length;

  const コスト = Array.from({ length: 行数 }, () => new Array(列数).fill(1e9));

  for (let i = 0; i < 行数; i++) {
    for (let j = 0; j < 列数; j++) {
      const 学生idx   = 学生が行 ? i : j;
      const スロットidx = 学生が行 ? j : i;
      const 施設geo = 施設緯度経度Map.get(空きスロット[スロットidx].施設ID);
      if (!施設geo || !施設geo.lat || !施設geo.lng) continue;
      コスト[i][j] = _学生施設間距離(学生リスト[学生idx], 施設geo.lat, 施設geo.lng);
    }
  }

  const 割り当て行列 = _矩形ハンガリアン法(コスト);

  // 学生idx -> スロットidx の対応表を作る（行が学生か施設かで読み方を変える）
  const 学生toスロット = new Array(学生リスト.length).fill(-1);
  if (学生が行) {
    // 行=学生、列=スロット：そのまま読める
    割り当て行列.forEach((slotIdx, studentIdx) => {
      学生toスロット[studentIdx] = slotIdx;
    });
  } else {
    // 行=スロット、列=学生：列→行の向きなので反転させる
    割り当て行列.forEach((studentIdx, slotIdx) => {
      学生toスロット[studentIdx] = slotIdx;
    });
  }

  // 書き込み
  let 配置数 = 0;
  const 未配置学生 = [];

  学生リスト.forEach((s, studentIdx) => {
    const slotIdx = 学生toスロット[studentIdx];
    if (slotIdx === undefined || slotIdx < 0 || slotIdx >= 空きスロット.length) {
      未配置学生.push(s);
      return;
    }
    const slot = 空きスロット[slotIdx];
    const 施設geo = 施設緯度経度Map.get(slot.施設ID);
    const 距離 = 施設geo ? _学生施設間距離(s, 施設geo.lat, 施設geo.lng) : "";
    const row = slot.rowIdx + 1;
    配置Sheet.getRange(row, 配置H.indexOf("学籍番号") + 1).setValue(s.学籍番号);
    配置Sheet.getRange(row, 配置H.indexOf("学生氏名") + 1).setValue(s.氏名);
    配置Sheet.getRange(row, 配置H.indexOf("学生住所") + 1).setValue(s.住所);
    配置Sheet.getRange(row, 配置H.indexOf("直線距離(km)") + 1).setValue(距離 !== "" ? Math.round(距離 * 10) / 10 : "");
    配置Sheet.getRange(row, 配置H.indexOf("ステータス") + 1).setValue(CONFIG.ステータス.自動配置);
    配置数++;
  });

  // 未配置学生を末尾に追記（再実行時は既存の未配置行を削除してから）
  for (let i = 配置Sheet.getLastRow(); i >= 2; i--) {
    const st = String(配置Sheet.getRange(i, 配置H.indexOf("ステータス") + 1).getValue()).trim();
    if (st === "未配置") 配置Sheet.deleteRow(i);
  }
  if (未配置学生.length > 0) {
    const 未配置行 = 未配置学生.map(s => ["", "", "", s.学籍番号, s.氏名, s.住所, "", "", "", "未配置", ""]);
    const 開始行 = 配置Sheet.getLastRow() + 1;
    配置Sheet.getRange(開始行, 1, 未配置行.length, CONFIG.配置ヘッダー.length).setValues(未配置行);
  }

  // ログ
  const logSheet = ss.getSheetByName(CONFIG.シート.配置ログ);
  if (logSheet) {
    logSheet.appendRow([
      new Date(), 実習種別, 配置数,
      未配置学生.length,
      未配置学生.map(s => s.氏名).join("、")
    ]);
  }

  let msg = `✅ ${実習種別} 配置完了\n\n配置：${配置数}名`;
  if (未配置学生.length > 0) msg += `\n未配置：${未配置学生.length}名（空き枠不足）\n${未配置学生.map(s => `  ${s.氏名}`).join("\n")}`;
  msg += "\n\n配置結果を確認し、問題なければステータスを「確定」に変更してください。";
  ui.alert(msg);
}

function 早期体験_配置実行()  { _配置実行("早期体験",  CONFIG.実習.find(r => r.名前 === "早期体験").対象学年); }
function 見学実習_配置実行()  { _配置実行("見学実習",  CONFIG.実習.find(r => r.名前 === "見学実習").対象学年); }
function 臨床実習Ⅰ_配置実行() { _配置実行("臨床実習Ⅰ", CONFIG.実習.find(r => r.名前 === "臨床実習Ⅰ").対象学年); }
function 臨床実習Ⅱ_配置実行() { _配置実行("臨床実習Ⅱ", CONFIG.実習.find(r => r.名前 === "臨床実習Ⅱ").対象学年); }
function 臨床実習Ⅲ_配置実行() { _配置実行("臨床実習Ⅲ", CONFIG.実習.find(r => r.名前 === "臨床実習Ⅲ").対象学年); }

// =====================
// 地図リンク生成
// =====================
function _地図リンク生成(シート名リスト) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  let 生成 = 0, スキップ = 0, エラー = 0;
  シート名リスト.forEach(シート名 => {
    const sheet = ss.getSheetByName(シート名);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const H = data[0];
    const 施設住所列   = H.indexOf("施設住所");
    const 学生住所列   = H.indexOf("学生住所");
    const 学籍列       = H.indexOf("学籍番号");
    const ステータス列 = H.indexOf("ステータス");
    const 地図列       = H.indexOf("地図で確認");
    if (施設住所列 === -1 || 学生住所列 === -1 || 地図列 === -1) return;

    for (let i = 1; i < data.length; i++) {
      const st = String(data[i][ステータス列]).trim();
      if (st === "未配置" || st === "") continue;
      const 学籍 = String(data[i][学籍列]).trim();
      if (!学籍 || 学籍 === "配置見送り") continue;
      if (sheet.getRange(i + 1, 地図列 + 1).getValue()) { スキップ++; continue; }
      const 出発地 = String(data[i][学生住所列]).trim();
      const 目的地 = String(data[i][施設住所列]).trim();
      if (!出発地 || !目的地) { エラー++; continue; }
      const url = "https://www.google.com/maps/dir/?api=1&origin=" + encodeURIComponent(出発地)
                + "&destination=" + encodeURIComponent(目的地) + "&travelmode=transit";
      sheet.getRange(i + 1, 地図列 + 1).setFormula('=HYPERLINK("' + url + '","地図で確認")');
      生成++;
    }
  });
  ui.alert(`✅ 地図リンク生成完了\n\n生成：${生成}件\nスキップ：${スキップ}件\nエラー：${エラー}件`);
}

function 地図リンク生成_早期体験見学() { _地図リンク生成(["早期体験","見学実習"]); }
function 地図リンク生成_臨床()         { _地図リンク生成(["臨床実習Ⅰ","臨床実習Ⅱ","臨床実習Ⅲ"]); }

// =====================
// 重複チェック
// =====================
function 重複チェックと最終確認() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  const 組み合わせ = {};
  const 重複リスト = [];
  実習名一覧.forEach(シート名 => {
    const sheet = ss.getSheetByName(シート名);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const H = data[0];
    const 学籍列       = H.indexOf("学籍番号");
    const 施設列       = H.indexOf("施設ID");
    const ステータス列 = H.indexOf("ステータス");
    if (学籍列 === -1 || 施設列 === -1) return;
    for (let i = 1; i < data.length; i++) {
      const st = String(data[i][ステータス列]).trim();
      if (!st || st === "") continue;
      const gNo = String(data[i][学籍列]).trim();
      const sId = String(data[i][施設列]).trim();
      if (!gNo || !sId) continue;
      const key = `${gNo}__${sId}`;
      if (!組み合わせ[key]) 組み合わせ[key] = [];
      組み合わせ[key].push(シート名);
    }
  });
  Object.entries(組み合わせ).forEach(([key, list]) => {
    if (list.length > 1) {
      const [学籍番号, 施設ID] = key.split("__");
      重複リスト.push(`${学籍番号} × ${施設ID}：${list.join(", ")}`);
    }
  });
  if (重複リスト.length === 0) ui.alert("✅ 重複なし\n\n同一学生×同一施設の重複は見つかりませんでした。");
  else ui.alert(`⚠️ 重複あり（${重複リスト.length}件）\n\n${重複リスト.slice(0,20).join("\n")}${重複リスト.length > 20 ? "\n…他" + (重複リスト.length - 20) + "件" : ""}`);
}

// =====================
// 需給管理を更新
// =====================
function 需給管理を更新() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const 需給Sheet    = ss.getSheetByName(CONFIG.シート.需給管理);
  const 施設Sheet    = ss.getSheetByName(CONFIG.シート.施設マスタ);
  const フォームSheet = ss.getSheetByName(CONFIG.シート.フォーム貼付);
  const 学生Sheet    = ss.getSheetByName(CONFIG.シート.学生マスタ);
  if (!需給Sheet || !施設Sheet || !フォームSheet) {
    ui.alert("需給管理・施設マスタ・フォーム貼付シートのいずれかが見つかりません。");
    return;
  }

  // 施設IDとエリアのMap
  const 施設Data = 施設Sheet.getDataRange().getValues();
  const 施設H    = 施設Data[0];
  const 施設ID列  = 施設H.indexOf("施設ID");
  const エリア列  = 施設H.indexOf("エリア");
  const 施設IDエリアMap = {};
  for (let i = 1; i < 施設Data.length; i++) {
    const id     = String(施設Data[i][施設ID列]).trim();
    const エリア = String(施設Data[i][エリア列]).trim() || "圏外";
    if (id) 施設IDエリアMap[id] = エリア;
  }

  // フォーム貼付から枠数を集計
  const フォームData = フォームSheet.getDataRange().getValues();
  const フォームH    = フォームData[0];
  const f施設ID列    = フォームH.indexOf("施設ID");

  const エリア集計 = {};
  実習名一覧.forEach(種別 => {
    const 枠列 = フォームH.indexOf(`${種別}_枠`);
    if (枠列 === -1) return;
    for (let i = 1; i < フォームData.length; i++) {
      const id   = String(フォームData[i][f施設ID列]).trim();
      const 枠数 = parseInt(フォームData[i][枠列], 10) || 0;
      if (!id || 枠数 <= 0) continue;
      const エリア = 施設IDエリアMap[id] || "圏外";
      if (!エリア集計[エリア]) エリア集計[エリア] = {};
      エリア集計[エリア][`${種別}_枠`] = (エリア集計[エリア][`${種別}_枠`] || 0) + 枠数;
    }
  });

  // 配置済み数を集計
  実習名一覧.forEach(種別 => {
    const sheet = ss.getSheetByName(種別);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const H    = data[0];
    const 施設ID列_P  = H.indexOf("施設ID");
    const ステータス列 = H.indexOf("ステータス");
    const 学籍列      = H.indexOf("学籍番号");
    if (施設ID列_P === -1) return;
    for (let i = 1; i < data.length; i++) {
      const st   = String(data[i][ステータス列]).trim();
      if (!st) continue;
      const 学籍 = String(data[i][学籍列]).trim();
      if (!学籍) continue;
      const id     = String(data[i][施設ID列_P]).trim();
      const エリア = 施設IDエリアMap[id] || "圏外";
      if (!エリア集計[エリア]) エリア集計[エリア] = {};
      エリア集計[エリア][`${種別}_配置済`] = (エリア集計[エリア][`${種別}_配置済`] || 0) + 1;
    }
  });

  // 学生数集計（エリア（住所1）を参照）
  const 学生エリア集計 = {};
  if (学生Sheet) {
    const 学生Data  = 学生Sheet.getDataRange().getValues();
    const 学生H     = 学生Data[0];
    const 学年列    = 学生H.indexOf("学年");
    const エリア列S = 学生H.indexOf("エリア（住所1）");
    if (学年列 !== -1 && エリア列S !== -1) {
      for (let i = 1; i < 学生Data.length; i++) {
        const 学年str = String(学生Data[i][学年列]).trim();
        if (!学年str) continue;
        const エリア = String(学生Data[i][エリア列S]).trim() || "圏外";
        if (!学生エリア集計[エリア]) 学生エリア集計[エリア] = {};
        学生エリア集計[エリア][学年str] = (学生エリア集計[エリア][学年str] || 0) + 1;
      }
    }
  }

  // ヘッダー・書き込み
  const ヘッダー = ["エリア"];
  CONFIG.実習.forEach(r => {
    ヘッダー.push(`${r.名前}_枠計`, `${r.名前}_${r.対象学年}年生数`, `${r.名前}_過不足`);
  });
  const 列数 = ヘッダー.length;

  const エリア一覧 = Object.keys(エリア集計).sort();
  const 書き込み  = エリア一覧.map(エリア => {
    const row = [エリア];
    CONFIG.実習.forEach(r => {
      const 枠計   = エリア集計[エリア][`${r.名前}_枠`]    || 0;
      const 学生数 = (学生エリア集計[エリア] && 学生エリア集計[エリア][r.対象学年]) || 0;
      row.push(枠計, 学生数, 枠計 - 学生数);
    });
    return row;
  });

  const 操作範囲 = CONFIG.需給管理.GAS操作範囲;
  需給Sheet.getRange(1, 1, 操作範囲, 列数).clearContent();
  需給Sheet.getRange(1, 1, 操作範囲, 列数).clearFormat();
  需給Sheet.getRange(1, 1, 1, 列数).setValues([ヘッダー]);
  需給Sheet.getRange(1, 1, 1, 列数).setBackground("#d9ead3").setFontWeight("bold");

  if (書き込み.length > 0) {
    需給Sheet.getRange(2, 1, 書き込み.length, 列数).setValues(書き込み);
    書き込み.forEach((row, rowIdx) => {
      CONFIG.実習.forEach((r, idx) => {
        if (row[1 + idx * 3 + 2] < 0) {
          需給Sheet.getRange(rowIdx + 2, 2 + idx * 3 + 2)
            .setBackground("#f4cccc").setFontColor("#cc0000").setFontWeight("bold");
        }
      });
    });
  }

  ui.alert("✅ 需給管理を更新しました。");
}

// =====================
// 確定配置を書き出し
// =====================
function 確定配置を書き出し() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const res = ui.prompt("確定配置を書き出し", "年度を入力してください（例：2026）", ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const 年度 = res.getResponseText().trim();
  if (!年度) { ui.alert("年度が入力されていません。"); return; }

  const 過去Sheet = ss.getSheetByName(CONFIG.シート.過去配置);
  if (!過去Sheet) { ui.alert("過去配置シートが見つかりません。"); return; }

  // 同年度分を削除してから書き直し
  const 既存Data = 過去Sheet.getDataRange().getValues();
  for (let i = 既存Data.length - 1; i >= 1; i--) {
    if (String(既存Data[i][0]).trim() === 年度) {
      過去Sheet.deleteRow(i + 1);
    }
  }

  let 書き出し件数 = 0;
  実習名一覧.forEach(シート名 => {
    const sheet = ss.getSheetByName(シート名);
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const H    = data[0];
    const 学籍列      = H.indexOf("学籍番号");
    const 施設ID列    = H.indexOf("施設ID");
    const 氏名列      = H.indexOf("学生氏名");
    const 施設名列    = H.indexOf("施設名");
    const 距離列      = H.indexOf("直線距離(km)");
    const ステータス列 = H.indexOf("ステータス");
    if (学籍列 === -1 || 施設ID列 === -1) return;

    const 書き込み行 = [];
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][ステータス列]).trim() !== CONFIG.ステータス.確定) continue;
      書き込み行.push([
        年度, シート名,
        String(data[i][学籍列]).trim(),
        氏名列   !== -1 ? String(data[i][氏名列]).trim()   : "",
        String(data[i][施設ID列]).trim(),
        施設名列 !== -1 ? String(data[i][施設名列]).trim() : "",
        距離列   !== -1 ? data[i][距離列] : "",
      ]);
    }
    if (書き込み行.length > 0) {
      過去Sheet.getRange(過去Sheet.getLastRow() + 1, 1, 書き込み行.length, 書き込み行[0].length).setValues(書き込み行);
      書き出し件数 += 書き込み行.length;
    }
  });

  ui.alert(`✅ 確定配置を書き出しました。\n\n年度：${年度}\n件数：${書き出し件数}件\n（同年度の既存データは上書きしました）`);
}

// =====================
// 就職説明会リストを生成
// =====================
function 就職説明会リストを生成() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const フォームSheet = ss.getSheetByName(CONFIG.シート.フォーム貼付);
  if (!フォームSheet) { ui.alert("フォーム貼付シートが見つかりません。"); return; }

  const フォームData = フォームSheet.getDataRange().getValues();
  const フォームH    = フォームData[0];

  const 施設名列        = フォームH.indexOf("施設名");
  const メール列        = フォームH.indexOf("メールアドレス");
  const 記入者列        = フォームH.indexOf("ご入力者");
  const 施設ID列        = フォームH.indexOf("施設ID");
  const 臨1枠列         = フォームH.indexOf("臨床実習Ⅰ_枠");
  const 臨2枠列         = フォームH.indexOf("臨床実習Ⅱ_枠");
  const 臨3枠列         = フォームH.indexOf("臨床実習Ⅲ_枠");
  const タイムスタンプ列 = フォームH.indexOf("タイムスタンプ");

  if (施設名列 === -1 || 臨1枠列 === -1) {
    ui.alert("フォーム貼付シートに必要な列が見つかりません。");
    return;
  }

  // 施設マスタから情報を取得
  const 施設Sheet = ss.getSheetByName(CONFIG.シート.施設マスタ);
  const 施設Map   = new Map();
  if (施設Sheet) {
    const 施設Data  = 施設Sheet.getDataRange().getValues();
    const 施設H     = 施設Data[0];
    const mID列     = 施設H.indexOf("施設ID");
    const m住所列   = 施設H.indexOf("住所");
    const m施設長列 = 施設H.indexOf("施設長名");
    const mOT列     = 施設H.indexOf("OT責任者");
    const m資料列   = 施設H.indexOf("資料送付先");
    for (let i = 1; i < 施設Data.length; i++) {
      const id = String(施設Data[i][mID列]).trim();
      if (!id) continue;
      施設Map.set(id, {
        住所:       m住所列   !== -1 ? String(施設Data[i][m住所列]).trim()   : "",
        施設長名:   m施設長列 !== -1 ? String(施設Data[i][m施設長列]).trim() : "",
        OT責任者:   mOT列     !== -1 ? String(施設Data[i][mOT列]).trim()     : "",
        資料送付先: m資料列   !== -1 ? String(施設Data[i][m資料列]).trim()   : "",
      });
    }
  }

  // 対象行抽出（臨Ⅰ/Ⅱ/Ⅲいずれかに枠あり・最新行優先）
  const 施設別最新行 = new Map();
  for (let i = 1; i < フォームData.length; i++) {
    const 行   = フォームData[i];
    const 臨1 = parseInt(行[臨1枠列], 10) || 0;
    const 臨2 = parseInt(行[臨2枠列], 10) || 0;
    const 臨3 = parseInt(行[臨3枠列], 10) || 0;
    if (臨1 <= 0 && 臨2 <= 0 && 臨3 <= 0) continue;
    const 施設ID = String(行[施設ID列]).trim();
    const 施設名 = String(行[施設名列]).trim();
    const キー   = 施設ID || 施設名;
    if (!キー) continue;
    const ts   = タイムスタンプ列 !== -1 ? new Date(行[タイムスタンプ列]).getTime() : 0;
    const 既存 = 施設別最新行.get(キー);
    if (!既存 || ts > 既存.ts) {
      施設別最新行.set(キー, {
        ts, 施設名, 施設ID,
        メール:  メール列 !== -1 ? String(行[メール列]).trim()  : "",
        記入者:  記入者列 !== -1 ? String(行[記入者列]).trim()  : "",
        臨1, 臨2, 臨3,
      });
    }
  }

  if (施設別最新行.size === 0) {
    ui.alert("対象施設が見つかりませんでした。\nフォーム貼付シートに臨床実習Ⅰ〜Ⅲの枠数が入力されているか確認してください。");
    return;
  }

  // 出力シート準備
  let リストSheet = ss.getSheetByName(CONFIG.シート.就職説明会リスト);
  if (!リストSheet) {
    リストSheet = ss.insertSheet(CONFIG.シート.就職説明会リスト);
  } else {
    const 確認 = ui.alert("上書き確認", "「就職説明会_送付先リスト」を上書きしますか？", ui.ButtonSet.OK_CANCEL);
    if (確認 !== ui.Button.OK) return;
    リストSheet.clearContents();
    リストSheet.clearFormats();
  }

  リストSheet.getRange(1, 1, 1, CONFIG.就職説明会ヘッダー.length)
    .setValues([CONFIG.就職説明会ヘッダー])
    .setBackground("#cfe2f3").setFontWeight("bold");

  const 書き込み行 = [];
  施設別最新行.forEach(データ => {
    const マスタ = データ.施設ID ? 施設Map.get(データ.施設ID) : null;
    let 施設長肩書 = "", 施設長名 = "";
    if (マスタ && マスタ.施設長名) {
      const parts = マスタ.施設長名.split(/[\s　]+/);
      施設長肩書 = parts.length >= 2 ? parts[0] : "";
      施設長名   = parts.length >= 2 ? parts.slice(1).join("　") : マスタ.施設長名;
    }
    書き込み行.push([
      データ.施設名, "",
      マスタ ? マスタ.住所     : "",
      施設長肩書, 施設長名,
      マスタ ? マスタ.OT責任者   : "",
      マスタ ? マスタ.資料送付先 : "",
      データ.メール, データ.記入者,
      データ.臨1 > 0 ? データ.臨1 : "",
      データ.臨2 > 0 ? データ.臨2 : "",
      データ.臨3 > 0 ? データ.臨3 : "",
    ]);
  });

  書き込み行.sort((a, b) => String(a[0]).localeCompare(String(b[0]), "ja"));

  if (書き込み行.length > 0) {
    リストSheet.getRange(2, 1, 書き込み行.length, CONFIG.就職説明会ヘッダー.length).setValues(書き込み行);
  }

  const 住所なし件数 = 書き込み行.filter(行 => !行[2]).length;
  let msg = `✅ 就職説明会リスト生成完了\n\n出力件数：${書き込み行.length}件`;
  if (住所なし件数 > 0) msg += `\n\n⚠️ 住所未取得：${住所なし件数}件（施設IDが未入力か施設マスタに住所なし）`;
  ui.alert(msg);
}
