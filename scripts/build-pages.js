#!/usr/bin/env node
/* Sinh các trang HTML trong site/ từ một khung chung.
 * Chạy: npm run build. Kết quả được commit sẵn nên máy chủ không cần bước build. */
"use strict";
const fs = require("fs");
const { articles } = require("./articles.js");
const { tablePages } = require("./tables.js");
const path = require("path");
const out = path.join(__dirname, "..", "site");

/* Địa chỉ công khai của trang (không có dấu / ở cuối) — dùng cho canonical, sitemap, thẻ chia sẻ.
 * Khi đổi sang tên miền riêng: sửa giá trị mặc định dưới đây (hoặc đặt biến môi trường SITE_URL). */
const SITE_URL = (process.env.SITE_URL || "https://nguyen62962-collab.github.io/Moneyprinter").replace(/\/+$/, "");

/* Mã AdSense lấy từ site/assets/config.js — nơi duy nhất người dùng cần sửa. */
const configText = fs.readFileSync(path.join(out, "assets", "config.js"), "utf8");
const adsMatch = configText.match(/adsenseClient\s*:\s*["']([^"']*)["']/);
const adsenseClient = adsMatch ? adsMatch[1].trim() : "";
if (adsenseClient && !/^ca-pub-\d{10,20}$/.test(adsenseClient)) {
  console.error('Mã AdSense trong site/assets/config.js sai định dạng: "' + adsenseClient + '". Đúng dạng: "ca-pub-" + 16 chữ số.');
  process.exit(1);
}
const gsvMatch = configText.match(/googleSiteVerification\s*:\s*["']([^"']*)["']/);
const googleSiteVerification = gsvMatch ? gsvMatch[1].trim() : "";
if (googleSiteVerification && !/^[A-Za-z0-9_-]{20,100}$/.test(googleSiteVerification)) {
  console.error("Mã xác minh Google Search Console trong site/assets/config.js sai định dạng. Chỉ dán phần giá trị trong content=\"...\".");
  process.exit(1);
}
const adsHead = (googleSiteVerification ? `
  <meta name="google-site-verification" content="${googleSiteVerification}">` : "") + (adsenseClient ? `
  <meta name="google-adsense-account" content="${adsenseClient}">
  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}" crossorigin="anonymous"></script>` : "");
const adsTxt = path.join(out, "ads.txt");
if (adsenseClient) {
  fs.writeFileSync(adsTxt, "google.com, " + adsenseClient.replace(/^ca-/, "") + ", DIRECT, f08c47fec0942fa0\n");
} else if (fs.existsSync(adsTxt)) {
  fs.unlinkSync(adsTxt);
}

const nav = [
  ["vay-tra-gop", "Vay trả góp"],
  ["kha-nang-vay", "Khả năng vay"],
  ["lai-tiet-kiem", "Lãi tiết kiệm"],
  ["lai-kep", "Lãi kép"],
  ["muc-tieu", "Mục tiêu"],
  ["bang-tinh", "Bảng tra"],
  ["huong-dan", "Hướng dẫn"]
];

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

const prefsPanel = `<details class="prefs">
        <summary>Tuỳ chỉnh</summary>
        <div class="panel">
          <fieldset>
            <legend>Giao diện</legend>
            <div class="seg">
              <label><input type="radio" name="pref-theme" data-pref="theme" value="auto"><span>Tự động</span></label>
              <label><input type="radio" name="pref-theme" data-pref="theme" value="light"><span>Sáng</span></label>
              <label><input type="radio" name="pref-theme" data-pref="theme" value="dark"><span>Tối</span></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Màu chủ đạo</legend>
            <div class="seg">
              <label><input type="radio" name="pref-accent" data-pref="accent" value="green"><span><i class="dot green"></i>Xanh lá</span></label>
              <label><input type="radio" name="pref-accent" data-pref="accent" value="blue"><span><i class="dot blue"></i>Xanh dương</span></label>
              <label><input type="radio" name="pref-accent" data-pref="accent" value="purple"><span><i class="dot purple"></i>Tím</span></label>
              <label><input type="radio" name="pref-accent" data-pref="accent" value="orange"><span><i class="dot orange"></i>Cam</span></label>
            </div>
          </fieldset>
          <fieldset>
            <legend>Cỡ chữ</legend>
            <div class="seg">
              <label><input type="radio" name="pref-size" data-pref="size" value="normal"><span>Vừa</span></label>
              <label><input type="radio" name="pref-size" data-pref="size" value="large"><span>Lớn</span></label>
            </div>
          </fieldset>
        </div>
      </details>`;

const PUBLISHED = "2026-11-13";
const bySlug = Object.fromEntries(articles.map((a) => [a.slug, a]));
function articleList(slugs, root) {
  return `<ul class="article-list">
${slugs.map((slug) => { const a = bySlug[slug]; return `        <li><a href="${root}huong-dan/${a.slug}/"><strong>${esc(a.title)}</strong><small>${esc(a.desc)}</small></a></li>`; }).join("\n")}
      </ul>`;
}

const built = [];
const jsonLd = (obj) => `\n  <script type="application/ld+json">${JSON.stringify(obj).replace(/</g, "\\u003c")}</script>`;
const crumbsLd = (items) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map(([name, p], i) => ({ "@type": "ListItem", position: i + 1, name, item: SITE_URL + "/" + p }))
});
const shareRow = `<p class="share-row"><button type="button" class="ghost" data-share>Chia sẻ trang này</button> <span class="note" data-share-note role="status"></span></p>`;

function page({ dir, tool, title, desc, body, scripts = true, ogType = "website", headExtra = "" }) {
  const url = SITE_URL + "/" + (dir ? dir + "/" : "");
  built.push(url);
  const depth = dir ? dir.split("/").length : 0;
  const root = depth ? "../".repeat(depth) : "./";
  const section = dir.split("/")[0];
  const links = nav.map(([d, t]) => `<a href="${root}${d}/"${d === section ? ' aria-current="page"' : ""}>${t}</a>`).join("\n        ");
  const html = `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(desc)}">
  <meta property="og:title" content="${esc(title)}">
  <meta property="og:description" content="${esc(desc)}">
  <meta property="og:type" content="${ogType}">
  <link rel="canonical" href="${url}">
  <meta property="og:url" content="${url}">
  <meta property="og:site_name" content="TínhTiền">
  <meta property="og:image" content="${SITE_URL}/assets/og.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta property="og:locale" content="vi_VN">
  <meta name="theme-color" content="#0b7a4b">${adsHead}
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%230b7a4b'/%3E%3Ctext x='16' y='23' font-size='20' font-family='Arial' font-weight='700' text-anchor='middle' fill='white'%3E%C4%91%3C/text%3E%3C/svg%3E">
  <script src="${root}assets/prefs.js"></script>
  <link rel="stylesheet" href="${root}assets/style.css">${headExtra}
</head>
<body${tool ? ` data-tool="${tool}"` : ""}>
  <header class="site">
    <div class="wrap">
      <a class="brand" href="${root}">Tính<span>Tiền</span></a>
      <nav class="main" aria-label="Công cụ">
        ${links}
      </nav>
      ${prefsPanel}
    </div>
  </header>
  <main>
    <div class="wrap">
${body}
    </div>
  </main>
  <footer class="site">
    <div class="wrap">
      <p>Kết quả chỉ mang tính tham khảo, không phải tư vấn tài chính. Số liệu thực tế tuỳ thuộc hợp đồng với ngân hàng hoặc tổ chức tín dụng của bạn.</p>
      <p><a href="${root}chinh-sach/">Chính sách quyền riêng tư</a></p>
    </div>
  </footer>
${scripts ? `  <script src="${root}assets/config.js"></script>
  <script src="${root}assets/calc.js"></script>
` : ""}  <script src="${root}assets/app.js"></script>
</body>
</html>
`;
  const file = path.join(out, dir, "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}

const money = (name, label, value, hint) => `          <div class="field">
            <label for="${name}">${label}</label>
            <input type="text" id="${name}" name="${name}" inputmode="numeric" autocomplete="off" data-money value="${value}">${hint ? `\n            <div class="hint">${hint}</div>` : ""}
          </div>`;
const num = (name, label, value, mode, hint) => `          <div class="field">
            <label for="${name}">${label}</label>
            <input type="text" id="${name}" name="${name}" inputmode="${mode}" autocomplete="off" value="${value}">${hint ? `\n            <div class="hint">${hint}</div>` : ""}
          </div>`;
const chips = (items) => `      <div class="chips">
        <span class="label">Ví dụ nhanh:</span>
${items.map(([label, preset]) => `        <button type="button" class="chip" data-preset="${esc(JSON.stringify(preset))}">${label}</button>`).join("\n")}
      </div>`;

function quickLinks(kind, root) {
  return `<ul class="quick-links">
${tablePages.filter((t) => t.kind === kind).map((t) => `        <li><a href="${root}bang-tinh/${t.slug}/">${t.short}</a></li>`).join("\n")}
      </ul>`;
}

function toolPage({ dir, tool, title, desc, h1, lead, presets, fields, extra = "", button, prose, related = [], quick = "" }) {
  page({
    dir, tool, title, desc,
    headExtra: jsonLd({
      "@context": "https://schema.org", "@type": "WebApplication", name: h1, description: desc, url: SITE_URL + "/" + dir + "/",
      applicationCategory: "FinanceApplication", operatingSystem: "Any", inLanguage: "vi",
      offers: { "@type": "Offer", price: "0", priceCurrency: "VND" }
    }),
    body: `      <h1>${h1}</h1>
      <p class="lead">${lead}</p>
${chips(presets)}
      <form class="card" id="tool-form" novalidate>
        <div class="grid">
${fields.join("\n")}
        </div>${extra}
        <button class="primary" type="submit">${button}</button>
      </form>
      <p class="error" id="error" role="alert"></p>
      <div class="result" id="result" aria-live="polite" hidden></div>
      <div class="actions" id="actions" hidden>
        <button type="button" class="ghost" id="copy-link">Sao chép liên kết</button>
        <button type="button" class="ghost" id="download-csv">Tải bảng (CSV)</button>
        <button type="button" class="ghost" id="print">In kết quả</button>
        <span class="note" id="action-note" role="status"></span>
      </div>
      <section class="card saved" id="saved">
        <h2>Kịch bản của bạn</h2>
        <form class="save-row" id="save-form">
          <input type="text" id="save-name" maxlength="40" autocomplete="off" aria-label="Tên kịch bản" placeholder="Đặt tên, ví dụ: Phương án ngân hàng A">
          <button class="primary" type="submit">Lưu phép tính này</button>
        </form>
        <p class="empty" id="saved-empty">Lưu lại các phương án để so sánh sau. Dữ liệu chỉ nằm trên thiết bị này của bạn.</p>
        <ul id="saved-list"></ul>
      </section>
      <div class="offers" id="offers" hidden></div>
      <section class="prose">
${prose}
      </section>${quick ? `
      <section class="related">
        <h2>Bảng tra nhanh</h2>
      ${quickLinks(quick, "../")}
      </section>` : ""}${related.length ? `
      <section class="related">
        <h2>Đọc thêm</h2>
      ${articleList(related, "../")}
      </section>` : ""}`
  });
}

/* ---------------- Trang chủ ---------------- */
const icon = (d) => `<span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg></span>`;
const needs = [
  ["./kha-nang-vay/", icon('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'), "Tôi muốn mua nhà", "Với thu nhập hiện tại, bạn vay được tối đa bao nhiêu?"],
  ["./vay-tra-gop/?principal=600000000&rate=8,5&months=84&method=annuity", icon('<path d="M5 16l1.5-5.5A2 2 0 0 1 8.4 9h7.2a2 2 0 0 1 1.9 1.5L19 16"/><rect x="3" y="14" width="18" height="5" rx="1.5"/><circle cx="7.5" cy="19" r="1.3"/><circle cx="16.5" cy="19" r="1.3"/>'), "Tôi sắp vay mua xe", "Mỗi tháng phải trả bao nhiêu, tổng lãi là bao nhiêu?"],
  ["./vay-tra-gop/?principal=500000000&rate=10&months=60&method=declining&extra=3000000", icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'), "Tôi muốn trả nợ sớm hơn", "Trả thêm mỗi tháng thì tiết kiệm được bao nhiêu tiền lãi?"],
  ["./lai-tiet-kiem/", icon('<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M7 15h4"/>'), "Tôi có khoản tiền nhàn rỗi", "Gửi tiết kiệm theo kỳ hạn thì nhận được bao nhiêu lãi?"],
  ["./lai-kep/", icon('<path d="M4 19h16"/><path d="M5 15l4-4 3 3 7-8"/><path d="M15 6h4v4"/>'), "Tôi muốn đầu tư dài hạn", "Góp đều mỗi tháng, sau 10–20 năm sẽ có bao nhiêu?"],
  ["./muc-tieu/", icon('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>'), "Tôi có một mục tiêu cụ thể", "Cần để dành bao nhiêu mỗi tháng để đạt được đúng hạn?"]
];
page({
  dir: "",
  headExtra: jsonLd({ "@context": "https://schema.org", "@type": "WebSite", name: "TínhTiền", url: SITE_URL + "/", inLanguage: "vi",
    description: "Bộ công cụ tài chính cá nhân miễn phí: vay trả góp, khả năng vay, lãi tiết kiệm, lãi kép, kế hoạch tiết kiệm." }),
  title: "TínhTiền — Tính lãi vay, khả năng vay, lãi tiết kiệm, lãi kép miễn phí",
  desc: "Bộ công cụ tài chính cá nhân miễn phí: lịch trả góp, khả năng vay theo thu nhập, lãi tiết kiệm, lãi kép và kế hoạch đạt mục tiêu. Có biểu đồ, lưu kịch bản, không cần đăng ký.",
  body: `      <section class="hero">
        <h1>Mọi quyết định về tiền, <em>tính rõ trong vài giây</em></h1>
        <p class="lead">Chọn đúng việc bạn đang cần — công cụ sẽ mở sẵn với số liệu ví dụ để bạn chỉnh theo hoàn cảnh của mình. Không đăng ký, không thu thập dữ liệu.</p>
      </section>
      <h2>Bạn đang cần gì?</h2>
      <div class="needs">
${needs.map(([href, ico, t, s]) => `        <a class="card need" href="${esc(href)}">${ico}<span><strong>${t}</strong><small>${s}</small></span></a>`).join("\n")}
      </div>
      <section class="card saved" id="saved" hidden>
        <h2>Kịch bản bạn đã lưu</h2>
        <ul id="saved-list"></ul>
      </section>
      <h2>Tra nhanh không cần nhập liệu</h2>
      <p class="lead">Vay bao nhiêu thì mỗi tháng trả bao nhiêu? Gửi bao nhiêu thì lãi bao nhiêu? Xem ngay bảng tính sẵn.</p>
      ${quickLinks("loan", "./")}
      ${quickLinks("savings", "./")}
      <h2>Hướng dẫn tài chính cá nhân</h2>
      ${articleList(["goc-deu-hay-tra-deu", "vay-mua-nha-bao-nhieu-la-vua", "lai-don-va-lai-kep"], "./")}
      <p><a href="./huong-dan/">Xem tất cả ${articles.length} bài hướng dẫn →</a></p>
      <h2>Vì sao dùng TínhTiền?</h2>
      <ul class="points">
        <li><strong>Riêng cho bạn</strong>Lưu nhiều phương án để so sánh, trang tự nhớ số liệu bạn nhập lần trước.</li>
        <li><strong>Dễ chia sẻ</strong>Mỗi phép tính có một liên kết riêng để gửi cho người thân hoặc nhân viên tư vấn.</li>
        <li><strong>Nhìn là hiểu</strong>Biểu đồ gốc – lãi theo từng năm, bảng chi tiết tải về được dưới dạng CSV.</li>
        <li><strong>Tuỳ chỉnh theo ý</strong>Chế độ sáng/tối, màu chủ đạo và cỡ chữ lớn cho người lớn tuổi.</li>
      </ul>
      <div class="offers" id="offers" hidden></div>`
});

/* ---------------- Các công cụ ---------------- */
toolPage({
  dir: "vay-tra-gop", quick: "loan", related: ["goc-deu-hay-tra-deu", "tra-no-truoc-han", "lai-suat-uu-dai-va-tha-noi"], tool: "loan",
  title: "Tính lãi vay trả góp — lịch trả nợ, trả nợ trước hạn | TínhTiền",
  desc: "Tính tiền trả góp hàng tháng, tổng lãi và lịch trả nợ chi tiết theo dư nợ giảm dần hoặc trả đều; xem trả thêm mỗi tháng tiết kiệm bao nhiêu lãi.",
  h1: "Tính lãi vay trả góp",
  lead: "Nhập khoản vay của bạn để xem số tiền phải trả mỗi tháng, biểu đồ gốc – lãi và lịch trả nợ chi tiết. Kết quả cập nhật ngay khi bạn gõ.",
  presets: [
    ["Mua nhà 2 tỷ · 20 năm", { principal: "2000000000", rate: "9", months: "240", method: "declining", extra: "" }],
    ["Mua xe 600 triệu · 7 năm", { principal: "600000000", rate: "8,5", months: "84", method: "annuity", extra: "" }],
    ["Tiêu dùng 50 triệu · 2 năm", { principal: "50000000", rate: "18", months: "24", method: "annuity", extra: "" }]
  ],
  fields: [
    money("principal", "Số tiền vay (đ)", "500000000"),
    num("rate", "Lãi suất (%/năm)", "10", "decimal"),
    num("months", "Thời hạn vay (tháng)", "60", "numeric", "Từ 1 đến 600 tháng"),
    money("extra", "Trả thêm mỗi tháng (đ)", "", "Không bắt buộc — để xem lợi ích khi trả nợ sớm")
  ],
  extra: `
        <fieldset>
          <legend>Cách trả nợ</legend>
          <div class="radios">
            <label><input type="radio" name="method" value="declining" checked> Gốc đều, lãi theo dư nợ giảm dần</label>
            <label><input type="radio" name="method" value="annuity"> Trả đều hàng tháng (gốc + lãi)</label>
          </div>
        </fieldset>`,
  button: "Tính lịch trả nợ",
  prose: `        <h2>Hai cách trả nợ khác nhau thế nào?</h2>
        <p><strong>Gốc đều, lãi theo dư nợ giảm dần:</strong> mỗi tháng trả một phần gốc bằng nhau (số tiền vay ÷ số tháng), tiền lãi tính trên dư nợ còn lại nên giảm dần theo thời gian. Những tháng đầu phải trả nhiều hơn, nhưng tổng lãi thấp hơn.</p>
        <p><strong>Trả đều hàng tháng:</strong> số tiền trả mỗi tháng cố định trong suốt thời hạn vay, dễ lập kế hoạch chi tiêu. Lãi vẫn tính trên dư nợ còn lại, nhưng gốc giảm chậm hơn ở giai đoạn đầu nên tổng lãi cao hơn.</p>
        <h2>Trả thêm mỗi tháng có lợi gì?</h2>
        <p>Khoản trả thêm được trừ thẳng vào dư nợ gốc, nên các tháng sau chịu ít lãi hơn và khoản vay kết thúc sớm hơn. Lưu ý nhiều hợp đồng có phí trả nợ trước hạn — hãy hỏi ngân hàng trước khi áp dụng.</p>
        <h2>Công thức</h2>
        <p>Lãi mỗi tháng = dư nợ đầu kỳ × lãi suất năm ÷ 12. Với cách trả đều: tiền trả hàng tháng = <code>P × r ÷ (1 − (1 + r)<sup>−n</sup>)</code>, trong đó P là số tiền vay, r là lãi suất tháng, n là số tháng. Công cụ giả định lãi suất cố định suốt kỳ vay và chưa gồm các loại phí.</p>`
});

toolPage({
  dir: "kha-nang-vay", related: ["vay-mua-nha-bao-nhieu-la-vua", "lai-suat-uu-dai-va-tha-noi", "quy-du-phong"], tool: "afford",
  title: "Tính khả năng vay theo thu nhập — vay được tối đa bao nhiêu | TínhTiền",
  desc: "Ước tính số tiền vay tối đa dựa trên thu nhập hàng tháng, tỷ lệ thu nhập dành trả nợ, lãi suất và thời hạn vay.",
  h1: "Tôi vay được tối đa bao nhiêu?",
  lead: "Ước tính số tiền có thể vay dựa trên thu nhập của bạn, trước khi đi xem nhà, xem xe hay làm việc với ngân hàng.",
  presets: [
    ["Thu nhập 20 triệu", { income: "20000000", ratio: "40", other: "", rate: "9", months: "240" }],
    ["Thu nhập 40 triệu", { income: "40000000", ratio: "40", other: "", rate: "9", months: "240" }],
    ["Hai vợ chồng 70 triệu", { income: "70000000", ratio: "45", other: "5000000", rate: "9", months: "300" }]
  ],
  fields: [
    money("income", "Thu nhập hàng tháng (đ)", "30000000", "Tổng thu nhập của những người cùng trả nợ"),
    num("ratio", "Phần thu nhập dành trả nợ (%)", "40", "decimal", "Nên giữ ở mức bạn vẫn sống thoải mái"),
    money("other", "Các khoản nợ đang trả mỗi tháng (đ)", "", "Không bắt buộc"),
    num("rate", "Lãi suất dự kiến (%/năm)", "9", "decimal"),
    num("months", "Thời hạn vay (tháng)", "240", "numeric", "Từ 1 đến 600 tháng")
  ],
  button: "Tính khả năng vay",
  prose: `        <h2>Cách tính</h2>
        <p>Khoản trả nợ tối đa mỗi tháng = thu nhập × tỷ lệ dành trả nợ − các khoản nợ đang trả. Từ đó suy ra số tiền vay tối đa theo cách trả đều hàng tháng: <code>P = M × (1 − (1 + r)<sup>−n</sup>) ÷ r</code>, với M là khoản trả mỗi tháng, r là lãi suất tháng, n là số tháng.</p>
        <p>Đây là con số ước tính để bạn tự cân đối. Hạn mức thực tế do ngân hàng thẩm định, còn phụ thuộc lịch sử tín dụng, tài sản bảo đảm và chính sách từng thời kỳ.</p>`
});

toolPage({
  dir: "lai-tiet-kiem", quick: "savings", related: ["lai-suat-thuc", "quy-du-phong", "lai-don-va-lai-kep"], tool: "savings",
  title: "Tính lãi tiết kiệm ngân hàng theo kỳ hạn, có tái tục | TínhTiền",
  desc: "Tính tiền lãi gửi tiết kiệm nhận cuối kỳ theo số tiền gửi, lãi suất năm và kỳ hạn; hỗ trợ tái tục cả gốc lẫn lãi qua nhiều kỳ.",
  h1: "Tính lãi tiết kiệm",
  lead: "Ước tính tiền lãi khi gửi tiết kiệm có kỳ hạn, lĩnh lãi cuối kỳ — kể cả khi bạn tái tục nhiều kỳ liên tiếp.",
  presets: [
    ["100 triệu · 6 tháng", { principal: "100000000", rate: "5", months: "6", terms: "1" }],
    ["500 triệu · 12 tháng", { principal: "500000000", rate: "5,5", months: "12", terms: "1" }],
    ["200 triệu · tái tục 5 năm", { principal: "200000000", rate: "5,5", months: "12", terms: "5" }]
  ],
  fields: [
    money("principal", "Số tiền gửi (đ)", "100000000"),
    num("rate", "Lãi suất (%/năm)", "5,5", "decimal", "Nhập lãi suất ngân hàng báo cho bạn"),
    num("months", "Kỳ hạn (tháng)", "12", "numeric", "Từ 1 đến 600 tháng"),
    num("terms", "Số kỳ gửi liên tiếp", "1", "numeric", "Lớn hơn 1 = tái tục cả gốc lẫn lãi")
  ],
  button: "Tính tiền lãi",
  prose: `        <h2>Cách tính</h2>
        <p>Tiền lãi mỗi kỳ = số dư đầu kỳ × lãi suất năm × số tháng ÷ 12. Ví dụ gửi 100.000.000 đ, lãi suất 6%/năm, kỳ hạn 6 tháng thì tiền lãi là 100.000.000 × 6% × 6 ÷ 12 = 3.000.000 đ. Khi tái tục, tiền lãi được nhập vào gốc để tính cho kỳ sau với cùng lãi suất.</p>
        <p>Ngân hàng thường tính lãi theo số ngày gửi thực tế (÷ 365) và lãi suất có thể thay đổi khi tái tục, nên số tiền thực nhận có thể chênh lệch đôi chút. Rút trước hạn thường chỉ được hưởng lãi suất không kỳ hạn.</p>`
});

toolPage({
  dir: "lai-kep", related: ["lai-don-va-lai-kep", "lai-suat-thuc"], tool: "compound",
  title: "Tính lãi kép — đầu tư tích luỹ hàng tháng | TínhTiền",
  desc: "Công cụ tính lãi kép có biểu đồ: xem tài sản tăng trưởng theo từng năm khi có vốn ban đầu và góp thêm đều đặn hàng tháng.",
  h1: "Tính lãi kép",
  lead: "Xem khoản tiết kiệm hoặc đầu tư của bạn lớn lên thế nào khi tiền lãi tiếp tục sinh lãi.",
  presets: [
    ["Mới đi làm · góp 2 triệu", { initial: "", monthly: "2000000", rate: "8", years: "10" }],
    ["Gia đình trẻ · góp 5 triệu", { initial: "100000000", monthly: "5000000", rate: "8", years: "15" }],
    ["Chuẩn bị hưu trí · 25 năm", { initial: "200000000", monthly: "8000000", rate: "7", years: "25" }]
  ],
  fields: [
    money("initial", "Vốn ban đầu (đ)", "50000000", "Để trống nếu bắt đầu từ 0"),
    money("monthly", "Góp thêm mỗi tháng (đ)", "3000000", "Để trống nếu không góp thêm"),
    num("rate", "Lãi suất kỳ vọng (%/năm)", "8", "decimal"),
    num("years", "Thời gian (năm)", "10", "numeric", "Từ 1 đến 60 năm")
  ],
  button: "Tính lãi kép",
  prose: `        <h2>Cách tính</h2>
        <p>Lãi được ghép hàng tháng với lãi suất tháng = lãi suất năm ÷ 12; khoản góp thêm được nộp vào cuối mỗi tháng. Lãi suất giả định không đổi trong suốt thời gian, chưa tính thuế, phí và lạm phát.</p>
        <p>Lợi nhuận đầu tư thực tế không cố định và không được đảm bảo; hãy coi kết quả là một kịch bản minh hoạ.</p>`
});

toolPage({
  dir: "muc-tieu", related: ["quy-du-phong", "lai-don-va-lai-kep", "lai-suat-thuc"], tool: "goal",
  title: "Kế hoạch tiết kiệm theo mục tiêu — mỗi tháng cần để dành bao nhiêu | TínhTiền",
  desc: "Nhập số tiền mục tiêu và thời hạn để biết mỗi tháng cần để dành bao nhiêu, kèm biểu đồ lộ trình theo từng năm.",
  h1: "Mỗi tháng cần để dành bao nhiêu?",
  lead: "Đặt một mục tiêu cụ thể — mua xe, quỹ dự phòng, học phí cho con — và xem số tiền cần góp mỗi tháng để tới đích đúng hạn.",
  presets: [
    ["Quỹ dự phòng 100 triệu · 2 năm", { target: "100000000", initial: "", rate: "5", years: "2" }],
    ["Mua xe 600 triệu · 5 năm", { target: "600000000", initial: "50000000", rate: "6", years: "5" }],
    ["Học phí cho con 2 tỷ · 15 năm", { target: "2000000000", initial: "100000000", rate: "8", years: "15" }]
  ],
  fields: [
    money("target", "Số tiền mục tiêu (đ)", "1000000000"),
    money("initial", "Số tiền đang có (đ)", "", "Không bắt buộc"),
    num("rate", "Lãi suất kỳ vọng (%/năm)", "7", "decimal"),
    num("years", "Thời hạn (năm)", "10", "numeric", "Từ 1 đến 60 năm")
  ],
  button: "Lập kế hoạch",
  prose: `        <h2>Cách tính</h2>
        <p>Công cụ tìm số tiền góp cuối mỗi tháng nhỏ nhất sao cho, với lãi ghép hàng tháng, tổng giá trị sau thời hạn đạt mục tiêu: <code>C = (T − P × (1 + i)<sup>n</sup>) × i ÷ ((1 + i)<sup>n</sup> − 1)</code>, với T là mục tiêu, P là số tiền đang có, i là lãi suất tháng, n là số tháng.</p>
        <p>Lãi suất giả định không đổi và chưa tính lạm phát; với mục tiêu dài hạn, hãy cân nhắc đặt mục tiêu cao hơn để bù trượt giá.</p>`
});

page({
  dir: "chinh-sach", scripts: false,
  title: "Chính sách quyền riêng tư | TínhTiền",
  desc: "Chính sách quyền riêng tư của TínhTiền: dữ liệu bạn nhập không rời khỏi trình duyệt.",
  body: `      <div class="prose">
        <h1>Chính sách quyền riêng tư</h1>
        <p>Mọi phép tính trên trang này được thực hiện ngay trong trình duyệt của bạn. Các con số bạn nhập không được gửi tới máy chủ của chúng tôi.</p>
        <h2>Dữ liệu lưu trên thiết bị của bạn</h2>
        <p>Để tiện cho bạn, trang lưu tuỳ chỉnh giao diện, số liệu bạn nhập lần gần nhất và các kịch bản bạn chủ động lưu vào bộ nhớ của trình duyệt (localStorage) trên chính thiết bị này. Dữ liệu đó không được gửi đi đâu; bạn có thể xoá từng kịch bản trên trang hoặc xoá dữ liệu trang web trong cài đặt trình duyệt.</p>
        <p>Khi bạn dùng nút “Sao chép liên kết”, các con số của phép tính nằm trong chính đường liên kết — hãy chỉ gửi cho người bạn muốn chia sẻ.</p>
        <h2>Quảng cáo và cookie</h2>
        <p>Trang có thể hiển thị quảng cáo do bên thứ ba cung cấp, chẳng hạn Google AdSense. Các nhà cung cấp này, trong đó có Google, có thể dùng cookie để hiển thị quảng cáo dựa trên những lần bạn truy cập trang này hoặc các trang web khác. Bạn có thể tắt quảng cáo cá nhân hoá tại <a href="https://www.google.com/settings/ads" rel="noopener">Cài đặt quảng cáo của Google</a>.</p>
        <h2>Liên kết tiếp thị</h2>
        <p>Một số liên kết trên trang có thể là liên kết tiếp thị và được ghi chú rõ ràng. Nếu bạn đăng ký dịch vụ qua các liên kết đó, chúng tôi có thể nhận hoa hồng mà bạn không phải trả thêm chi phí.</p>
        <h2>Miễn trừ trách nhiệm</h2>
        <p>Kết quả tính toán chỉ mang tính tham khảo và không phải là tư vấn tài chính, đầu tư hay pháp lý.</p>
      </div>`
});

page({
  dir: "huong-dan",
  title: "Hướng dẫn tài chính cá nhân: vay, trả nợ, tiết kiệm | TínhTiền",
  desc: "Các bài hướng dẫn dễ hiểu về vay mua nhà, trả nợ trước hạn, lãi suất thả nổi, lãi kép, lạm phát và quỹ dự phòng — có ví dụ tính toán cụ thể.",
  body: `      <h1>Hướng dẫn tài chính cá nhân</h1>
      <p class="lead">Những kiến thức cơ bản giúp bạn vay đúng sức, trả nợ thông minh và tiết kiệm hiệu quả. Mỗi bài đều có ví dụ tính toán bằng chính công cụ của TínhTiền.</p>
      ${articleList(articles.map((a) => a.slug), "../")}
      <div class="offers" id="offers" hidden></div>`
});

articles.forEach((a, i) => {
  const others = articles.filter((x) => x.slug !== a.slug);
  const related = others.slice(i % others.length).concat(others.slice(0, i % others.length)).slice(0, 3).map((x) => x.slug);
  const toolName = nav.find(([d]) => d === a.tool)[1];
  const articleUrl = SITE_URL + "/huong-dan/" + a.slug + "/";
  const ld = {
    "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.desc,
    inLanguage: "vi", datePublished: PUBLISHED, dateModified: PUBLISHED, mainEntityOfPage: articleUrl,
    image: SITE_URL + "/assets/og.png",
    author: { "@type": "Organization", name: "TínhTiền", url: SITE_URL + "/" },
    publisher: { "@type": "Organization", name: "TínhTiền", url: SITE_URL + "/" }
  };
  page({
    dir: "huong-dan/" + a.slug,
    ogType: "article",
    title: a.title + " | TínhTiền",
    desc: a.desc,
    headExtra: jsonLd(ld) + jsonLd(crumbsLd([["Trang chủ", ""], ["Hướng dẫn", "huong-dan/"], [a.title, "huong-dan/" + a.slug + "/"]])),
    body: `      <nav class="crumbs" aria-label="Vị trí"><a href="../../">Trang chủ</a> › <a href="../">Hướng dẫn</a></nav>
      <article class="prose article">
        <h1>${a.title}</h1>
        <p class="article-meta">Cập nhật ngày ${PUBLISHED.split("-").reverse().join("/")} · Công cụ liên quan: <a href="../../${a.tool}/">${toolName}</a></p>
${a.body.trim().split("\n").map((l) => (l ? "        " + l : l)).join("\n")}
        ${shareRow}
        <p class="disclaimer">Bài viết chỉ nhằm cung cấp thông tin chung, không phải tư vấn tài chính. Số liệu trong ví dụ là giả định để minh hoạ; điều kiện thực tế tuỳ hợp đồng và chính sách của từng tổ chức.</p>
      </article>
      <div class="offers" id="offers" hidden></div>
      <section class="related">
        <h2>Bài viết khác</h2>
      ${articleList(related, "../../")}
      </section>`
  });
});

const loanTables = tablePages.filter((t) => t.kind === "loan"), saveTables = tablePages.filter((t) => t.kind === "savings");
page({
  dir: "bang-tinh",
  title: "Bảng tra nhanh: vay trả góp mỗi tháng bao nhiêu, gửi tiết kiệm lãi bao nhiêu | TínhTiền",
  desc: "Các bảng tính sẵn: vay 100 triệu đến 3 tỷ trả góp mỗi tháng bao nhiêu, gửi tiết kiệm 50 triệu đến 5 tỷ lãi bao nhiêu theo từng kỳ hạn và lãi suất.",
  headExtra: jsonLd(crumbsLd([["Trang chủ", ""], ["Bảng tra nhanh", "bang-tinh/"]])),
  body: `      <h1>Bảng tra nhanh</h1>
      <p class="lead">Không cần nhập liệu — chọn số tiền gần với trường hợp của bạn để xem bảng tính sẵn theo thời hạn và lãi suất.</p>
      <h2>Vay trả góp mỗi tháng bao nhiêu?</h2>
      ${quickLinks("loan", "../")}
      <h2>Gửi tiết kiệm lãi bao nhiêu?</h2>
      ${quickLinks("savings", "../")}
      <div class="offers" id="offers" hidden></div>`
});
tablePages.forEach((t) => {
  const siblings = (t.kind === "loan" ? loanTables : saveTables).filter((x) => x.slug !== t.slug);
  page({
    dir: "bang-tinh/" + t.slug,
    title: t.title + " | TínhTiền",
    desc: t.desc,
    headExtra: jsonLd(crumbsLd([["Trang chủ", ""], ["Bảng tra nhanh", "bang-tinh/"], [t.short, "bang-tinh/" + t.slug + "/"]])),
    body: `      <nav class="crumbs" aria-label="Vị trí"><a href="../../">Trang chủ</a> › <a href="../">Bảng tra nhanh</a></nav>
      <article class="prose article wide">
        <h1>${t.title}</h1>
${t.body.trim().split("\n").map((l) => (l ? "        " + l : l)).join("\n")}
        ${shareRow}
      </article>
      <div class="offers" id="offers" hidden></div>
      <section class="related">
        <h2>${t.kind === "loan" ? "Vay số tiền khác" : "Gửi số tiền khác"}</h2>
      <ul class="quick-links">
${siblings.map((x) => `        <li><a href="../${x.slug}/">${x.short}</a></li>`).join("\n")}
      </ul>
      </section>
      <section class="related">
        <h2>Đọc thêm</h2>
      ${articleList(t.kind === "loan" ? ["goc-deu-hay-tra-deu", "vay-mua-nha-bao-nhieu-la-vua"] : ["lai-suat-thuc", "quy-du-phong"], "../../")}
      </section>`
  });
});

fs.writeFileSync(path.join(out, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${built.map((u) => `  <url><loc>${u}</loc></url>`).join("\n")}
</urlset>
`);
fs.writeFileSync(path.join(out, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log("Đã sinh " + built.length + " trang vào site/" + (adsenseClient ? " (AdSense: " + adsenseClient + ", kèm ads.txt)" : " (chưa bật AdSense)"));
