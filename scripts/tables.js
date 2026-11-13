/* Các trang "bảng tra nhanh" trả lời trực tiếp những câu hỏi hay được tìm kiếm.
 * Mọi con số được TÍNH bằng site/assets/calc.js lúc dựng trang. */
"use strict";
const Calc = require("../site/assets/calc.js");

const nf = new Intl.NumberFormat("vi-VN");
const d1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const m = (n) => nf.format(Math.round(n)) + " đ";
const n0 = (n) => nf.format(Math.round(n)); // dùng trong ô bảng để vừa màn hình điện thoại
const amountName = (n) => (n >= 1e9 ? d1.format(n / 1e9) + " tỷ" : d1.format(n / 1e6) + " triệu");
const amountSlug = (n) => amountName(n).replace(",", "-").replace(" tỷ", "-ty").replace(" triệu", "-trieu");
const rateText = (r) => d1.format(r) + "%";
const q = (o) => new URLSearchParams(o).toString().replace(/&/g, "&amp;");
const table = (headers, rows) => `<div class="table-scroll"><table>
<thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>`;

const LOAN_RATE = 10; // lãi suất giả định cho bảng theo thời hạn
const LOAN_RATES = [6, 8, 10, 12, 14];
const LOAN_AMOUNTS = [100e6, 200e6, 300e6, 500e6, 700e6, 800e6, 1e9, 1.5e9, 2e9, 3e9];
const termsFor = (P) => (P <= 300e6 ? [1, 2, 3, 4, 5, 7] : P <= 800e6 ? [3, 5, 7, 10, 15, 20] : [5, 10, 15, 20, 25, 30]);
const focusTermFor = (P) => (P <= 300e6 ? 3 : P <= 800e6 ? 10 : 20);

const SAVE_RATES = [3, 4, 5, 5.5, 6, 7];
const SAVE_ROLL_RATE = 5.5;
const SAVE_AMOUNTS = [50e6, 100e6, 200e6, 300e6, 500e6, 1e9, 2e9, 5e9];

const pages = [];

LOAN_AMOUNTS.forEach((P) => {
  const name = amountName(P), terms = termsFor(P), focus = focusTermFor(P);
  const ann = (rate, years) => Calc.loanSchedule({ principal: P, annualRatePct: rate, months: years * 12, method: "annuity" });
  const dec = (rate, years) => Calc.loanSchedule({ principal: P, annualRatePct: rate, months: years * 12, method: "declining" });
  const f = ann(LOAN_RATE, focus);
  const income = Math.ceil(f.firstPayment / 0.4 / 1e5) * 1e5;
  pages.push({
    kind: "loan",
    slug: "vay-" + amountSlug(P),
    short: "Vay " + name,
    title: `Vay ${name} trả góp mỗi tháng bao nhiêu? Bảng tính theo thời hạn`,
    desc: `Bảng tra nhanh số tiền trả góp hàng tháng và tổng lãi khi vay ${name} đồng trong ${terms[0]}–${terms[terms.length - 1]} năm, theo cả hai cách trả đều và gốc đều, với nhiều mức lãi suất.`,
    body: `
<p>Vay ${name} đồng thì mỗi tháng phải trả bao nhiêu phụ thuộc vào ba yếu tố: lãi suất, thời hạn vay và cách trả nợ. Ví dụ với lãi suất ${LOAN_RATE}%/năm, vay trong ${focus} năm theo cách trả đều, mỗi tháng bạn trả khoảng <strong>${m(f.firstPayment)}</strong> và tổng tiền lãi là ${m(f.totalInterest)}. Các bảng dưới đây cho bạn con số ở những trường hợp phổ biến khác.</p>

<h2>Trả đều hàng tháng, lãi suất ${LOAN_RATE}%/năm</h2>
<p>Khoản trả cố định suốt thời hạn vay, gồm cả gốc và lãi.</p>
${table(["Thời hạn", "Trả mỗi tháng (đ)", "Tổng tiền lãi (đ)"], terms.map((y) => { const s = ann(LOAN_RATE, y); return [y + " năm", n0(s.firstPayment), n0(s.totalInterest)]; }))}

<h2>Gốc đều, lãi theo dư nợ giảm dần, lãi suất ${LOAN_RATE}%/năm</h2>
<p>Tháng đầu trả nhiều nhất rồi giảm dần đều tới tháng cuối; tổng lãi thấp hơn cách trả đều.</p>
${table(["Thời hạn", "Tháng đầu trả (đ)", "Tổng tiền lãi (đ)"], terms.map((y) => { const s = dec(LOAN_RATE, y); return [y + " năm", n0(s.firstPayment), n0(s.totalInterest)]; }))}

<h2>Lãi suất thay đổi thì khoản trả thay đổi thế nào?</h2>
<p>Vay ${name} đồng trong ${focus} năm, trả đều hàng tháng:</p>
${table(["Lãi suất năm", "Trả mỗi tháng (đ)", "Tổng tiền lãi (đ)"], LOAN_RATES.map((r) => { const s = ann(r, focus); return [rateText(r), n0(s.firstPayment), n0(s.totalInterest)]; }))}

<h2>Thu nhập bao nhiêu thì nên vay ${name}?</h2>
<p>Nếu giữ khoản trả nợ ở mức không quá 40% thu nhập, để vay ${name} đồng trong ${focus} năm với lãi suất ${LOAN_RATE}%/năm (trả ${m(f.firstPayment)} mỗi tháng), thu nhập hàng tháng của bạn nên từ khoảng <strong>${m(income)}</strong> trở lên. Đây là mốc tự đánh giá, không phải điều kiện xét duyệt của ngân hàng.</p>
<p class="cta"><a class="primary-link" href="../../vay-tra-gop/?${q({ principal: String(P), rate: String(LOAN_RATE), months: String(focus * 12), method: "annuity" })}">Tính với lãi suất và thời hạn của riêng bạn →</a></p>
<p>Lãi suất trong các bảng là giả định để minh hoạ và được giữ cố định suốt kỳ vay; lãi suất thực tế do ngân hàng công bố và thường thay đổi theo thời gian. Bảng chưa gồm phí bảo hiểm, phí trả nợ trước hạn và các loại phí khác.</p>`
  });
});

SAVE_AMOUNTS.forEach((P) => {
  const name = amountName(P);
  const si = (rate, months, terms) => Calc.savingsInterest({ principal: P, annualRatePct: rate, months, terms: terms || 1 });
  const ex = si(SAVE_ROLL_RATE, 1);
  pages.push({
    kind: "savings",
    slug: "gui-tiet-kiem-" + amountSlug(P),
    short: "Gửi " + name,
    title: `Gửi tiết kiệm ${name} lãi bao nhiêu một tháng, một năm?`,
    desc: `Bảng tra nhanh tiền lãi khi gửi tiết kiệm ${name} đồng theo kỳ hạn 1, 6 và 12 tháng với các mức lãi suất từ ${rateText(SAVE_RATES[0])} đến ${rateText(SAVE_RATES[SAVE_RATES.length - 1])}/năm, kèm bảng tái tục nhiều năm.`,
    body: `
<p>Tiền lãi gửi tiết kiệm = số tiền gửi × lãi suất năm × số tháng ÷ 12. Ví dụ gửi ${name} đồng với lãi suất ${rateText(SAVE_ROLL_RATE)}/năm, mỗi tháng bạn nhận khoảng <strong>${m(ex.interest)}</strong> tiền lãi. Bảng dưới đây tính sẵn cho các mức lãi suất và kỳ hạn phổ biến — bạn chỉ cần dò theo lãi suất ngân hàng báo cho mình.</p>

<h2>Tiền lãi theo lãi suất và kỳ hạn</h2>
<p>Gửi ${name} đồng, lĩnh lãi cuối kỳ (đơn vị: đồng):</p>
${table(["Lãi suất", "1 tháng", "6 tháng", "12 tháng"], SAVE_RATES.map((r) => [rateText(r), n0(si(r, 1).interest), n0(si(r, 6).interest), n0(si(r, 12).interest)]))}

<h2>Gửi nhiều năm, tái tục cả gốc lẫn lãi</h2>
<p>Gửi kỳ hạn 12 tháng với lãi suất giả định ${rateText(SAVE_ROLL_RATE)}/năm, hết kỳ nhập lãi vào gốc để gửi tiếp:</p>
${table(["Thời gian", "Tổng tiền lãi (đ)", "Số dư cuối kỳ (đ)"], [1, 2, 3, 5, 10].map((y) => { const s = si(SAVE_ROLL_RATE, 12, y); return [y + " năm", n0(s.interest), n0(s.total)]; }))}
<p class="cta"><a class="primary-link" href="../../lai-tiet-kiem/?${q({ principal: String(P), rate: String(SAVE_ROLL_RATE).replace(".", ","), months: "12", terms: "1" })}">Tính với lãi suất và kỳ hạn của riêng bạn →</a></p>

<h2>Lưu ý khi đọc bảng</h2>
<ul>
  <li>Lãi suất trong bảng là các mức giả định để bạn dò; lãi suất thực tế khác nhau giữa các ngân hàng, kỳ hạn và thời điểm.</li>
  <li>Ngân hàng thường tính lãi theo số ngày gửi thực tế nên con số thực nhận có thể chênh lệch đôi chút.</li>
  <li>Rút trước hạn thường chỉ được hưởng lãi suất không kỳ hạn, thấp hơn nhiều.</li>
  <li>Lãi suất khi tái tục có thể khác lãi suất ban đầu.</li>
</ul>`
  });
});

module.exports = { tablePages: pages };
