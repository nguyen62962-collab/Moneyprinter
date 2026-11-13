/* Nội dung các bài hướng dẫn. Mọi con số ví dụ được TÍNH bằng site/assets/calc.js lúc dựng trang,
 * nên luôn khớp với kết quả của công cụ. Không gõ tay số liệu tính toán vào đây. */
"use strict";
const Calc = require("../site/assets/calc.js");

const nf = new Intl.NumberFormat("vi-VN");
const d1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
const d2 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
const m = (n) => nf.format(Math.round(n)) + " đ";
const tr = (n) => (n >= 1e9 ? d2.format(n / 1e9) + " tỷ" : d1.format(n / 1e6) + " triệu") + " đồng";
const pct = (x) => d1.format(x) + "%";
const q = (o) => new URLSearchParams(o).toString().replace(/&/g, "&amp;");
const cta = (tool, params, label) => `<p class="cta"><a class="primary-link" href="../../${tool}/?${q(params)}">${label} →</a></p>`;
const table = (headers, rows) => `<div class="table-scroll"><table>
<thead><tr>${headers.map((h) => `<th scope="col">${h}</th>`).join("")}</tr></thead>
<tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody>
</table></div>`;

/** Lãi suất tháng thực tế r sao cho khoản trả đều với r bằng đúng payment (chia đôi). */
function impliedMonthlyRate(principal, months, payment) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const pay = (principal * mid) / (1 - Math.pow(1 + mid, -months));
    if (pay > payment) hi = mid; else lo = mid;
  }
  return (lo + hi) / 2;
}

const articles = [];

/* 1 ---------------------------------------------------------------- */
(() => {
  const P = 1e9, rate = 10, n = 240;
  const dec = Calc.loanSchedule({ principal: P, annualRatePct: rate, months: n, method: "declining" });
  const ann = Calc.loanSchedule({ principal: P, annualRatePct: rate, months: n, method: "annuity" });
  const year1Dec = dec.rows.slice(0, 12).reduce((a, r) => a + r.payment, 0);
  const year1Ann = ann.rows.slice(0, 12).reduce((a, r) => a + r.payment, 0);
  const crossover = dec.rows.findIndex((r, i) => r.payment <= ann.rows[i].payment) + 1;
  const fP = 50e6, fN = 24, flatMonthly = 1;
  const flatPay = fP / fN + (fP * flatMonthly) / 100;
  const flatTotalInterest = (fP * flatMonthly / 100) * fN;
  const eff = impliedMonthlyRate(fP, fN, flatPay) * 12 * 100;
  articles.push({
    slug: "goc-deu-hay-tra-deu",
    title: "Gốc đều hay trả đều: nên chọn cách trả nợ nào?",
    desc: "So sánh trả nợ theo dư nợ giảm dần và trả đều hàng tháng bằng ví dụ cụ thể, kèm cảnh báo về cách tính lãi phẳng.",
    tool: "vay-tra-gop",
    body: `
<p>Khi ký hợp đồng vay, bạn thường được chọn một trong hai cách trả nợ. Cùng số tiền vay, cùng lãi suất, cùng thời hạn, nhưng hai cách này cho ra số tiền phải trả mỗi tháng và tổng tiền lãi khác nhau đáng kể. Bài này giải thích từng cách bằng một ví dụ cụ thể để bạn chọn cho đúng với dòng tiền của mình.</p>

<h2>Hai cách trả nợ phổ biến</h2>
<p><strong>Gốc đều, lãi theo dư nợ giảm dần.</strong> Mỗi tháng bạn trả một phần gốc bằng nhau, cộng tiền lãi tính trên số dư nợ còn lại. Vì dư nợ giảm dần nên tiền lãi cũng giảm dần: tháng đầu trả nhiều nhất, tháng cuối trả ít nhất.</p>
<p><strong>Trả đều hàng tháng (gốc + lãi cố định).</strong> Ngân hàng tính ra một khoản trả cố định cho toàn bộ thời hạn. Những năm đầu, phần lớn khoản trả này là tiền lãi; về sau phần gốc mới chiếm nhiều hơn. Lãi vẫn tính trên dư nợ thực tế, nhưng vì gốc giảm chậm hơn nên tổng lãi cao hơn.</p>

<h2>Ví dụ: vay ${tr(P)}, lãi suất ${rate}%/năm, trong 20 năm</h2>
${table(["", "Gốc đều, dư nợ giảm dần", "Trả đều hàng tháng"], [
  ["Tháng đầu tiên trả", m(dec.firstPayment), m(ann.firstPayment)],
  ["Tháng cuối cùng trả", m(dec.lastPayment), m(ann.lastPayment)],
  ["Tổng trả trong năm đầu", m(year1Dec), m(year1Ann)],
  ["Tổng tiền lãi 20 năm", m(dec.totalInterest), m(ann.totalInterest)]
])}
<p>Với cách gốc đều, bạn trả ít hơn tổng cộng <strong>${m(ann.totalInterest - dec.totalInterest)}</strong> tiền lãi. Đổi lại, năm đầu tiên bạn phải trả nhiều hơn ${m(year1Dec - year1Ann)}, tức trung bình khoảng ${m((year1Dec - year1Ann) / 12)} mỗi tháng. Từ tháng thứ ${crossover} trở đi, khoản trả theo cách gốc đều bắt đầu thấp hơn cách trả đều.</p>
${cta("vay-tra-gop", { principal: String(P), rate: String(rate), months: String(n), method: "declining" }, "Xem lịch trả nợ chi tiết của ví dụ này")}

<h2>Nên chọn cách nào?</h2>
<ul>
  <li><strong>Chọn gốc đều</strong> nếu thu nhập hiện tại đủ dư để gánh những tháng đầu nặng nhất và bạn muốn tổng chi phí vay thấp nhất. Đây cũng là cách có lợi nếu bạn định trả nợ trước hạn, vì dư nợ giảm nhanh ngay từ đầu.</li>
  <li><strong>Chọn trả đều</strong> nếu bạn cần khoản trả cố định để dễ lập ngân sách, hoặc thu nhập hiện tại còn eo hẹp nhưng dự kiến tăng dần. Bạn chấp nhận trả thêm tiền lãi để đổi lấy sự dễ thở trong những năm đầu.</li>
</ul>
<p>Dù chọn cách nào, hãy kiểm tra khoản trả của <em>tháng đầu tiên</em> không vượt quá phần thu nhập bạn sẵn sàng dành cho trả nợ.</p>

<h2>Cẩn thận với cách tính "lãi phẳng"</h2>
<p>Một số khoản vay tiêu dùng hoặc mua trả góp báo lãi suất theo kiểu lãi phẳng: tiền lãi mỗi tháng tính trên <em>số tiền vay ban đầu</em> suốt cả kỳ hạn, dù bạn đã trả bớt gốc. Con số quảng cáo vì vậy trông thấp hơn chi phí thật.</p>
<p>Ví dụ vay ${tr(fP)} trong ${fN} tháng với lãi phẳng ${flatMonthly}%/tháng: mỗi tháng trả ${m(flatPay)}, tổng lãi ${m(flatTotalInterest)}. Để có cùng khoản trả này theo cách tính trên dư nợ giảm dần, lãi suất tương đương phải vào khoảng <strong>${pct(eff)}/năm</strong> — cao hơn nhiều so với con số ${flatMonthly * 12}%/năm mà bạn tưởng.</p>
<p>Khi so sánh các lời mời vay, hãy hỏi rõ lãi được tính trên dư nợ ban đầu hay dư nợ còn lại, và yêu cầu lịch trả nợ chi tiết trước khi ký.</p>`
  });
})();

/* 2 ---------------------------------------------------------------- */
(() => {
  const P = 1e9, rate = 10, n = 240, extra = 5e6, feePct = 2;
  const base = Calc.loanSchedule({ principal: P, annualRatePct: rate, months: n, method: "declining" });
  const fast = Calc.loanSchedule({ principal: P, annualRatePct: rate, months: n, method: "declining", extraMonthly: extra });
  const saved = base.totalInterest - fast.totalInterest;
  const prepaid = P - Math.round((P * fast.months) / n);
  const fee = (prepaid * feePct) / 100;
  const years = Math.floor(fast.months / 12), monthsLeft = fast.months % 12;
  articles.push({
    slug: "tra-no-truoc-han",
    title: "Có nên trả nợ trước hạn? Cách tính số tiền lãi tiết kiệm được",
    desc: "Trả thêm mỗi tháng giúp tiết kiệm bao nhiêu tiền lãi và rút ngắn bao lâu? Khi nào nên và không nên trả nợ trước hạn.",
    tool: "vay-tra-gop",
    body: `
<p>Có khoản tiền dư, nên trả bớt nợ vay hay giữ lại? Câu trả lời phụ thuộc vào lãi suất khoản vay, phí trả trước hạn trong hợp đồng và việc bạn đã có quỹ dự phòng hay chưa. Bài này giúp bạn tự tính.</p>

<h2>Vì sao trả thêm lại tiết kiệm được nhiều?</h2>
<p>Tiền lãi mỗi tháng được tính trên dư nợ còn lại. Mỗi đồng trả thêm được trừ thẳng vào dư nợ gốc, nên mọi tháng sau đó bạn đều chịu ít lãi hơn. Trả thêm càng sớm, số tháng được hưởng lợi càng nhiều.</p>

<h2>Ví dụ: vay ${tr(P)}, ${rate}%/năm, 20 năm, trả thêm ${tr(extra)} mỗi tháng</h2>
${table(["", "Trả đúng lịch", "Trả thêm mỗi tháng"], [
  ["Thời gian trả hết nợ", base.months + " tháng", fast.months + " tháng"],
  ["Tháng đầu trả", m(base.firstPayment), m(fast.firstPayment)],
  ["Tổng tiền lãi", m(base.totalInterest), m(fast.totalInterest)]
])}
<p>Chỉ với ${tr(extra)} mỗi tháng, khoản vay kết thúc sau ${years} năm${monthsLeft ? " " + monthsLeft + " tháng" : ""} thay vì 20 năm, và bạn tiết kiệm <strong>${m(saved)}</strong> tiền lãi.</p>
${cta("vay-tra-gop", { principal: String(P), rate: String(rate), months: String(n), extra: String(extra), method: "declining" }, "Thử với khoản vay của bạn")}

<h2>Đừng quên phí trả nợ trước hạn</h2>
<p>Nhiều hợp đồng tính phí khi bạn trả nợ trước hạn, thường là một tỷ lệ phần trăm trên số tiền trả trước và giảm dần theo thời gian vay. Hãy đọc kỹ điều khoản này hoặc hỏi ngân hàng.</p>
<p>Trong ví dụ trên, tổng số gốc bạn trả trước so với lịch là khoảng ${m(prepaid)}. Giả sử phí là ${feePct}% trên số tiền này thì tổng phí khoảng ${m(fee)} — vẫn nhỏ hơn nhiều so với ${m(saved)} tiền lãi tiết kiệm được. Nhưng với khoản vay lãi suất thấp, thời hạn ngắn hoặc phí cao, phép so sánh có thể cho kết quả ngược lại.</p>

<h2>Khi nào chưa nên trả nợ trước hạn?</h2>
<ul>
  <li><strong>Chưa có quỹ dự phòng.</strong> Tiền đã trả vào khoản vay rất khó lấy lại khi gặp chuyện gấp. Hãy để dành đủ 3–6 tháng chi tiêu trước.</li>
  <li><strong>Đang có khoản nợ lãi cao hơn.</strong> Thẻ tín dụng hay vay tiêu dùng thường có lãi suất cao hơn vay mua nhà; trả các khoản đó trước có lợi hơn.</li>
  <li><strong>Đang trong thời gian ưu đãi lãi suất thấp</strong> và hợp đồng phạt nặng khi trả sớm: thường nên chờ hết thời gian phạt rồi mới trả.</li>
</ul>

<h2>Trả thêm hằng tháng hay trả một lần?</h2>
<p>Về mặt tiền lãi, trả một khoản lớn càng sớm càng có lợi. Tuy vậy, trả thêm đều đặn mỗi tháng dễ duy trì hơn và không làm bạn cạn tiền mặt. Một số ngân hàng chỉ cho trả trước theo từng đợt hoặc yêu cầu số tiền tối thiểu, nên hãy hỏi trước cách thức áp dụng.</p>`
  });
})();

/* 3 ---------------------------------------------------------------- */
(() => {
  const P = 2e9, n = 240, promoRate = 7, promoMonths = 24, floatRate = 11;
  const promo = Calc.loanSchedule({ principal: P, annualRatePct: promoRate, months: n, method: "annuity" });
  const balance = promo.rows[promoMonths - 1].balance;
  const after = Calc.loanSchedule({ principal: balance, annualRatePct: floatRate, months: n - promoMonths, method: "annuity" });
  const stress = Calc.loanSchedule({ principal: balance, annualRatePct: floatRate + 2, months: n - promoMonths, method: "annuity" });
  const jump = after.firstPayment - promo.firstPayment;
  articles.push({
    slug: "lai-suat-uu-dai-va-tha-noi",
    title: "Lãi suất ưu đãi và lãi suất thả nổi: khoản trả sẽ tăng bao nhiêu?",
    desc: "Hết thời gian ưu đãi, khoản trả góp hàng tháng có thể tăng mạnh. Cách đọc lãi suất thả nổi và tự kiểm tra khả năng chịu đựng.",
    tool: "vay-tra-gop",
    body: `
<p>Nhiều gói vay mua nhà quảng cáo lãi suất rất thấp, nhưng mức đó thường chỉ áp dụng trong 6 tháng đến vài năm đầu. Sau đó lãi suất được "thả nổi" và khoản trả hàng tháng có thể tăng đáng kể. Hiểu trước điều này giúp bạn không bị bất ngờ.</p>

<h2>Lãi suất thả nổi được tính thế nào?</h2>
<p>Sau thời gian ưu đãi, lãi suất thường được tính bằng <strong>lãi suất tham chiếu cộng biên độ</strong>. Lãi suất tham chiếu do ngân hàng quy định (thường gắn với lãi suất tiết kiệm của chính ngân hàng đó) và thay đổi theo thị trường; biên độ là phần cộng thêm cố định ghi trong hợp đồng. Trước khi ký, hãy hỏi rõ:</p>
<ul>
  <li>Lãi suất tham chiếu là gì, hiện bằng bao nhiêu và được điều chỉnh bao lâu một lần.</li>
  <li>Biên độ là bao nhiêu phần trăm.</li>
  <li>Phí trả nợ trước hạn sau khi hết ưu đãi ra sao, phòng khi bạn muốn chuyển sang ngân hàng khác.</li>
</ul>

<h2>Ví dụ: vay ${tr(P)} trong 20 năm, ưu đãi ${promoRate}% trong ${promoMonths} tháng đầu</h2>
<p>Giả sử bạn chọn trả đều hàng tháng và sau ưu đãi, lãi suất thả nổi ở mức ${floatRate}%/năm (chỉ là giả định để minh hoạ).</p>
${table(["Giai đoạn", "Lãi suất", "Trả mỗi tháng"], [
  [promoMonths + " tháng đầu", pct(promoRate), m(promo.firstPayment)],
  ["Từ tháng thứ " + (promoMonths + 1), pct(floatRate), m(after.firstPayment)],
  ["Nếu lãi suất lên thêm 2%", pct(floatRate + 2), m(stress.firstPayment)]
])}
<p>Sau ${promoMonths} tháng, bạn mới trả được khoảng ${m(P - balance)} tiền gốc vì những năm đầu phần lớn khoản trả là tiền lãi. Khi lãi suất lên ${floatRate}%, khoản trả mỗi tháng tăng thêm <strong>${m(jump)}</strong> (khoảng ${pct((jump / promo.firstPayment) * 100)}).</p>
${cta("vay-tra-gop", { principal: String(balance), rate: String(floatRate), months: String(n - promoMonths), method: "annuity" }, "Tính lại khoản trả sau ưu đãi")}

<h2>Tự kiểm tra trước khi vay</h2>
<ol>
  <li>Tính khoản trả hàng tháng với <strong>lãi suất sau ưu đãi</strong>, không phải lãi suất quảng cáo.</li>
  <li>Cộng thêm 2–3 điểm phần trăm để thử trường hợp lãi suất tăng, và chắc chắn bạn vẫn trả được.</li>
  <li>Đối chiếu với thu nhập: khoản trả trong trường hợp xấu không nên vượt quá phần thu nhập bạn sẵn sàng dành cho trả nợ.</li>
</ol>
<p>Nếu con số ở bước 2 khiến bạn lo lắng, hãy cân nhắc vay ít hơn, kéo dài thời hạn, hoặc tìm gói có thời gian cố định lãi suất dài hơn.</p>`
  });
})();

/* 4 ---------------------------------------------------------------- */
(() => {
  const income = 35e6, rate = 10, n = 300, ratio = 40, ltv = 70;
  const a40 = Calc.affordability({ income, ratioPct: ratio, annualRatePct: rate, months: n });
  const a30 = Calc.affordability({ income, ratioPct: 30, annualRatePct: rate, months: n });
  const a40hi = Calc.affordability({ income, ratioPct: ratio, annualRatePct: rate + 2, months: n });
  const price = a40.maxLoan / (ltv / 100);
  const down = price - a40.maxLoan;
  articles.push({
    slug: "vay-mua-nha-bao-nhieu-la-vua",
    title: "Vay mua nhà bao nhiêu là vừa sức? Cách tính theo thu nhập",
    desc: "Quy tắc dành bao nhiêu phần trăm thu nhập cho trả nợ, ví dụ tính số tiền vay tối đa và giá nhà phù hợp với thu nhập của bạn.",
    tool: "kha-nang-vay",
    body: `
<p>Câu hỏi đầu tiên khi tính chuyện mua nhà không phải là ngân hàng cho vay bao nhiêu, mà là <em>bạn trả được bao nhiêu mà vẫn sống thoải mái</em>. Hạn mức ngân hàng duyệt có thể cao hơn mức an toàn cho gia đình bạn.</p>

<h2>Quy tắc phần trăm thu nhập</h2>
<p>Một mốc thường được dùng để tự đánh giá là tổng các khoản trả nợ mỗi tháng không vượt quá khoảng 30–40% thu nhập. Phần còn lại dành cho chi tiêu thiết yếu, quỹ dự phòng và tiết kiệm. Gia đình có con nhỏ, thu nhập không ổn định hoặc đang hỗ trợ cha mẹ nên chọn mức thấp hơn.</p>

<h2>Ví dụ: thu nhập ${tr(income)} mỗi tháng, vay 25 năm, lãi suất ${rate}%/năm</h2>
${table(["Dành cho trả nợ", "Trả mỗi tháng tối đa", "Số tiền vay tối đa"], [
  ["30% thu nhập", m(a30.maxPayment), m(a30.maxLoan)],
  ["40% thu nhập", m(a40.maxPayment), m(a40.maxLoan)],
  ["40%, nhưng lãi suất " + (rate + 2) + "%", m(a40hi.maxPayment), m(a40hi.maxLoan)]
])}
<p>Lưu ý dòng cuối: cùng khoản trả mỗi tháng, chỉ cần lãi suất cao hơn 2 điểm phần trăm thì số tiền vay được giảm khoảng ${m(a40.maxLoan - a40hi.maxLoan)}. Vì lãi suất vay mua nhà thường thả nổi, hãy chừa khoảng an toàn thay vì vay sát mức tối đa.</p>
${cta("kha-nang-vay", { income: String(income), ratio: String(ratio), rate: String(rate), months: String(n) }, "Tính khả năng vay với thu nhập của bạn")}

<h2>Từ số tiền vay suy ra giá nhà phù hợp</h2>
<p>Ngân hàng thường chỉ cho vay một phần giá trị căn nhà, phần còn lại bạn phải tự có. Giả sử ngân hàng cho vay tối đa ${ltv}% giá trị nhà, với khoản vay khoảng ${tr(a40.maxLoan)} như trên thì giá nhà phù hợp vào khoảng <strong>${tr(price)}</strong>, và bạn cần tự chuẩn bị khoảng ${tr(down)}.</p>
<p>Ngoài phần vốn tự có, hãy dự trù thêm chi phí công chứng, thuế phí sang tên, sửa chữa, nội thất — những khoản này dễ bị quên nhưng cộng lại không nhỏ.</p>

<h2>Danh sách kiểm tra trước khi vay</h2>
<ul>
  <li>Đã có quỹ dự phòng ít nhất 3–6 tháng chi tiêu, tách riêng khỏi tiền mua nhà.</li>
  <li>Đã tính khoản trả với lãi suất sau ưu đãi và thử tăng thêm 2–3%.</li>
  <li>Khoản trả vẫn ổn nếu một người trong gia đình tạm mất thu nhập vài tháng.</li>
  <li>Đã hiểu phí trả nợ trước hạn và các điều kiện bảo hiểm đi kèm khoản vay.</li>
</ul>`
  });
})();

/* 5 ---------------------------------------------------------------- */
(() => {
  const P = 100e6, rate = 7, years = 20;
  const simple = P * (1 + (rate / 100) * years);
  const comp = Calc.compound({ initial: P, monthly: 0, annualRatePct: rate, years });
  const doubleYears = 72 / rate;
  const atTen = Calc.compound({ initial: P, monthly: 0, annualRatePct: rate, years: 10 });
  const c = 3e6, r2 = 8;
  const aSave = Calc.compound({ initial: 0, monthly: c, annualRatePct: r2, years: 10 });
  const aFinal = Calc.compound({ initial: aSave.finalValue, monthly: 0, annualRatePct: r2, years: 25 });
  const bFinal = Calc.compound({ initial: 0, monthly: c, annualRatePct: r2, years: 25 });
  articles.push({
    slug: "lai-don-va-lai-kep",
    title: "Lãi đơn và lãi kép khác nhau thế nào? Vì sao nên bắt đầu sớm",
    desc: "Giải thích lãi đơn, lãi kép và quy tắc 72 bằng ví dụ; so sánh người bắt đầu tiết kiệm sớm 10 năm với người bắt đầu muộn.",
    tool: "lai-kep",
    body: `
<p>Lãi kép được gọi là "kỳ quan thứ tám" không phải vì nó phức tạp, mà vì kết quả của nó sau nhiều năm thường vượt xa trực giác. Hiểu rõ lãi kép giúp bạn ra hai quyết định quan trọng: bắt đầu tiết kiệm sớm và không rút tiền lãi ra tiêu.</p>

<h2>Lãi đơn và lãi kép</h2>
<p><strong>Lãi đơn:</strong> tiền lãi chỉ tính trên số tiền gốc ban đầu. Bạn rút lãi ra mỗi kỳ, gốc giữ nguyên.</p>
<p><strong>Lãi kép:</strong> tiền lãi được cộng vào gốc, và kỳ sau tiền lãi lại được tính trên cả phần lãi đó. Tiền lãi "đẻ" ra tiền lãi.</p>

<h2>Ví dụ: ${tr(P)} với lợi suất ${rate}%/năm trong ${years} năm</h2>
${table(["", "Lãi đơn", "Lãi kép (ghép lãi hàng tháng)"], [
  ["Giá trị sau " + years + " năm", m(simple), m(comp.finalValue)],
  ["Tiền lãi nhận được", m(simple - P), m(comp.totalInterest)]
])}
<p>Cùng số vốn, cùng lãi suất, lãi kép cho thêm <strong>${m(comp.finalValue - simple)}</strong> chỉ vì tiền lãi được giữ lại để tiếp tục sinh lãi.</p>

<h2>Quy tắc 72: bao lâu thì tiền tăng gấp đôi?</h2>
<p>Lấy 72 chia cho lãi suất năm, bạn có số năm gần đúng để tiền tăng gấp đôi. Với ${rate}%/năm: 72 ÷ ${rate} ≈ ${d1.format(doubleYears)} năm. Kiểm tra lại bằng công cụ: sau 10 năm, ${tr(P)} trở thành ${m(atTen.finalValue)}, tức gấp ${d2.format(atTen.finalValue / P)} lần.</p>

<h2>Bắt đầu sớm quan trọng hơn góp nhiều</h2>
<p>Hai người cùng để dành ${tr(c)} mỗi tháng với lợi suất ${r2}%/năm:</p>
<ul>
  <li><strong>An</strong> góp từ năm 25 tuổi, đều đặn trong 10 năm rồi dừng hẳn, để nguyên tiền tới năm 60 tuổi. Tổng tiền tự góp: ${m(aSave.totalContributed)}.</li>
  <li><strong>Bình</strong> bắt đầu từ năm 35 tuổi và góp liên tục 25 năm tới năm 60 tuổi. Tổng tiền tự góp: ${m(bFinal.totalContributed)}.</li>
</ul>
${table(["", "An (góp 10 năm, bắt đầu sớm)", "Bình (góp 25 năm, bắt đầu muộn)"], [
  ["Tổng tiền tự góp", m(aSave.totalContributed), m(bFinal.totalContributed)],
  ["Giá trị năm 60 tuổi", m(aFinal.finalValue), m(bFinal.finalValue)]
])}
<p>${aFinal.finalValue > bFinal.finalValue
  ? `An chỉ góp bằng ${pct((aSave.totalContributed / bFinal.totalContributed) * 100)} số tiền của Bình nhưng lại có nhiều hơn ${m(aFinal.finalValue - bFinal.finalValue)}.`
  : `Dù góp ít hơn hẳn — chỉ bằng ${pct((aSave.totalContributed / bFinal.totalContributed) * 100)} số tiền của Bình — An vẫn đạt được ${pct((aFinal.finalValue / bFinal.finalValue) * 100)} kết quả của Bình.`} Mười năm đi trước cho tiền của An thêm thời gian để lãi kép phát huy.</p>
${cta("lai-kep", { initial: "", monthly: String(c), rate: String(r2), years: "25" }, "Tính lãi kép với số tiền của bạn")}

<h2>Lưu ý thực tế</h2>
<ul>
  <li>Các ví dụ giả định lợi suất cố định. Lợi suất đầu tư thực tế dao động và không được đảm bảo.</li>
  <li>Lãi kép chỉ hoạt động khi bạn <em>không rút lãi ra tiêu</em>. Với tiền gửi tiết kiệm, hãy chọn hình thức tái tục cả gốc lẫn lãi.</li>
  <li>Hãy nhìn vào lợi suất sau khi trừ lạm phát — xem bài <a href="../lai-suat-thuc/">lãi suất thực</a>.</li>
</ul>`
  });
})();

/* 6 ---------------------------------------------------------------- */
(() => {
  const nominal = 5.5, infl = 3.5, years = 10, P = 100e6;
  const real = ((1 + nominal / 100) / (1 + infl / 100) - 1) * 100;
  const power = P / Math.pow(1 + infl / 100, years);
  const grown = Calc.savingsInterest({ principal: P, annualRatePct: nominal, months: 12, terms: years });
  const grownReal = grown.total / Math.pow(1 + infl / 100, years);
  articles.push({
    slug: "lai-suat-thuc",
    title: "Lãi suất thực: vì sao tiền gửi tiết kiệm vẫn có thể mất giá",
    desc: "Lạm phát làm giảm sức mua của tiền như thế nào, cách tính lãi suất thực và ý nghĩa với khoản tiết kiệm của bạn.",
    tool: "lai-tiet-kiem",
    body: `
<p>Số dư tài khoản tăng lên mỗi năm chưa chắc có nghĩa là bạn giàu hơn. Nếu giá cả tăng nhanh hơn tiền lãi, sức mua của khoản tiết kiệm thực ra đang giảm. Đó là lý do cần nhìn vào lãi suất thực chứ không chỉ lãi suất ghi trên sổ.</p>

<h2>Lạm phát "ăn mòn" tiền như thế nào?</h2>
<p>Giả sử lạm phát trung bình ${pct(infl)}/năm. Một khoản ${tr(P)} để nguyên không sinh lãi, sau ${years} năm chỉ còn mua được lượng hàng hoá tương đương khoảng <strong>${m(power)}</strong> ngày hôm nay — mất gần ${pct((1 - power / P) * 100)} sức mua.</p>

<h2>Cách tính lãi suất thực</h2>
<p>Lãi suất thực ≈ lãi suất danh nghĩa − lạm phát. Công thức chính xác hơn:</p>
<p class="formula"><code>Lãi suất thực = (1 + lãi suất danh nghĩa) ÷ (1 + lạm phát) − 1</code></p>
<p>Với lãi suất tiết kiệm ${pct(nominal)}/năm và lạm phát ${pct(infl)}/năm, lãi suất thực khoảng <strong>${d2.format(real)}%/năm</strong>. Đây mới là tốc độ sức mua của bạn thực sự tăng lên.</p>

<h2>Ví dụ: gửi ${tr(P)}, tái tục ${years} năm</h2>
${table(["", "Số tiền"], [
  ["Số dư sau " + years + " năm (lãi " + pct(nominal) + ", tái tục hằng năm)", m(grown.total)],
  ["Sức mua tương đương theo giá hôm nay", m(grownReal)],
  ["Sức mua tăng thêm thực sự", m(grownReal - P)]
])}
<p>Số dư tăng ${m(grown.total - P)}, nhưng sau khi trừ lạm phát, sức mua chỉ tăng khoảng ${m(grownReal - P)}. Nếu lãi suất tiết kiệm thấp hơn lạm phát, con số cuối cùng sẽ âm.</p>
${cta("lai-tiet-kiem", { principal: String(P), rate: String(nominal).replace(".", ","), months: "12", terms: String(years) }, "Tính lãi tiết kiệm tái tục")}

<h2>Điều này có ý nghĩa gì với bạn?</h2>
<ul>
  <li><strong>Tiền dự phòng</strong> vẫn nên để ở nơi an toàn, dễ rút như tiền gửi ngân hàng — mục tiêu của nó là sẵn sàng khi cần, không phải sinh lời cao.</li>
  <li><strong>Tiền để dành cho mục tiêu 10–20 năm</strong> chịu ảnh hưởng lạm phát rõ rệt. Khi lập kế hoạch, hãy đặt mục tiêu cao hơn giá hiện tại để bù trượt giá.</li>
  <li>Đừng để quá nhiều tiền nhàn rỗi trong tài khoản thanh toán gần như không có lãi.</li>
</ul>
<p>Các con số lạm phát trong bài là giả định để minh hoạ. Bạn có thể tham khảo chỉ số giá tiêu dùng (CPI) do cơ quan thống kê công bố hằng tháng để có số liệu thực tế.</p>`
  });
})();

/* 7 ---------------------------------------------------------------- */
(() => {
  const spend = 15e6, months = 6, rate = 4.5, years = 2;
  const target = spend * months;
  const g = Calc.goalMonthly({ target, initial: 0, annualRatePct: rate, years });
  articles.push({
    slug: "quy-du-phong",
    title: "Quỹ dự phòng: cần bao nhiêu tiền và nên để ở đâu?",
    desc: "Vì sao cần quỹ dự phòng, cách tính số tiền phù hợp với hoàn cảnh và kế hoạch để dành từng tháng cho tới khi đủ.",
    tool: "muc-tieu",
    body: `
<p>Mất việc, ốm đau, xe hỏng, nhà dột — những khoản chi bất ngờ luôn đến vào lúc không ai muốn. Quỹ dự phòng là khoản tiền để dành riêng cho những lúc đó, giúp bạn không phải vay nóng, quẹt thẻ tín dụng hay bán vội tài sản.</p>

<h2>Cần bao nhiêu là đủ?</h2>
<p>Một mốc phổ biến là <strong>3 đến 6 tháng chi tiêu thiết yếu</strong>: tiền nhà, ăn uống, đi lại, điện nước, học phí, các khoản trả nợ bắt buộc. Nên chọn mức cao hơn nếu:</p>
<ul>
  <li>Thu nhập không đều (làm tự do, kinh doanh, hưởng hoa hồng).</li>
  <li>Bạn là người có thu nhập chính trong gia đình hoặc đang nuôi con nhỏ.</li>
  <li>Bạn đang có khoản vay lớn như vay mua nhà.</li>
</ul>
<p>Ví dụ chi tiêu thiết yếu ${tr(spend)} mỗi tháng thì quỹ dự phòng nên ở khoảng ${tr(spend * 3)} đến ${tr(target)}.</p>

<h2>Lập kế hoạch để dành</h2>
<p>Để có ${tr(target)} sau ${years} năm, với lãi suất tiền gửi giả định ${pct(rate)}/năm, bạn cần để dành khoảng <strong>${m(g.monthly)} mỗi tháng</strong>. Trong đó tiền tự góp là ${m(g.projection.totalContributed)}, phần còn lại ${m(g.projection.totalInterest)} là tiền lãi.</p>
${cta("muc-tieu", { target: String(target), initial: "", rate: String(rate).replace(".", ","), years: String(years) }, "Lập kế hoạch quỹ dự phòng của bạn")}
<p>Mẹo nhỏ: cài chuyển khoản tự động sang một tài khoản riêng ngay ngày nhận lương. Khoản tiền không nằm trong tài khoản chi tiêu sẽ ít bị tiêu lẹm hơn.</p>

<h2>Nên để quỹ dự phòng ở đâu?</h2>
<p>Ba tiêu chí theo thứ tự ưu tiên: <strong>an toàn, rút được nhanh, có chút lãi</strong>. Lợi nhuận là yếu tố cuối cùng.</p>
<ul>
  <li><strong>Tiền gửi tiết kiệm kỳ hạn ngắn hoặc tiền gửi linh hoạt</strong> ở ngân hàng là lựa chọn phổ biến.</li>
  <li><strong>Chia thành vài sổ nhỏ</strong> với kỳ hạn khác nhau thay vì một sổ lớn. Khi cần một phần tiền, bạn chỉ phải rút trước hạn một sổ và không mất lãi của cả khoản.</li>
  <li><strong>Tránh</strong> để quỹ dự phòng vào cổ phiếu, vàng, tiền số hay bất kỳ tài sản nào có giá biến động — lúc bạn cần tiền gấp có thể đúng lúc giá đang thấp.</li>
</ul>

<h2>Khi nào dùng đến quỹ?</h2>
<p>Chỉ cho chi tiêu <em>bất ngờ và cần thiết</em>. Du lịch, mua điện thoại mới hay đợt giảm giá không phải là trường hợp khẩn cấp — hãy để dành riêng cho những mục tiêu đó. Sau mỗi lần dùng, ưu tiên bù lại quỹ trước khi quay về các mục tiêu tiết kiệm khác.</p>`
  });
})();

module.exports = { articles };
