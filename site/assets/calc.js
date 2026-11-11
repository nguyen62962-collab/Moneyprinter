/* Các hàm tính toán thuần (không đụng DOM) — dùng chung cho trình duyệt và Node (test). */
(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_MONEY = 1e15; // giữ an toàn trong phạm vi số nguyên chính xác của JS

  /** "1.500.000 đ" -> 1500000. Trả về NaN nếu không có chữ số nào. */
  function parseMoney(text) {
    var digits = String(text == null ? "" : text).replace(/\D/g, "");
    if (!digits) return NaN;
    return Number(digits);
  }

  /** "6,5" hoặc "6.5" -> 6.5. Trả về NaN nếu sai định dạng. */
  function parseRate(text) {
    var s = String(text == null ? "" : text).trim().replace(",", ".");
    if (!/^\d+(\.\d+)?$/.test(s)) return NaN;
    return Number(s);
  }

  function isMoney(v) {
    return typeof v === "number" && isFinite(v) && v > 0 && v <= MAX_MONEY;
  }
  function isRate(v) {
    return typeof v === "number" && isFinite(v) && v >= 0 && v <= 100;
  }
  function isCount(v, max) {
    return typeof v === "number" && Math.floor(v) === v && v >= 1 && v <= max;
  }

  /**
   * Lịch trả nợ vay trả góp.
   * method: "annuity"  — trả đều hàng tháng (gốc + lãi cố định)
   *         "declining" — gốc đều, lãi tính trên dư nợ giảm dần
   * Mọi khoản tiền làm tròn tới đồng; kỳ cuối tất toán toàn bộ dư nợ còn lại.
   */
  function loanSchedule(input) {
    var P = input.principal, months = input.months, method = input.method;
    if (!isMoney(P)) throw new RangeError("Số tiền vay không hợp lệ");
    if (!isRate(input.annualRatePct)) throw new RangeError("Lãi suất không hợp lệ");
    if (!isCount(months, 600)) throw new RangeError("Kỳ hạn không hợp lệ");
    if (method !== "annuity" && method !== "declining") throw new RangeError("Phương thức không hợp lệ");

    var r = input.annualRatePct / 100 / 12;
    var fixedPayment = 0, fixedPrincipal = 0;
    if (method === "annuity") {
      fixedPayment = r === 0 ? P / months : (P * r) / (1 - Math.pow(1 + r, -months));
      fixedPayment = Math.round(fixedPayment);
    } else {
      fixedPrincipal = Math.round(P / months);
    }

    var rows = [], balance = P, totalInterest = 0, totalPayment = 0;
    for (var k = 1; k <= months; k++) {
      var interest = Math.round(balance * r);
      var principalPart;
      if (k === months) {
        principalPart = balance;
      } else if (method === "annuity") {
        principalPart = Math.min(balance, Math.max(0, fixedPayment - interest));
      } else {
        principalPart = Math.min(balance, fixedPrincipal);
      }
      var payment = principalPart + interest;
      balance -= principalPart;
      totalInterest += interest;
      totalPayment += payment;
      rows.push({ period: k, payment: payment, principal: principalPart, interest: interest, balance: balance });
    }
    return {
      rows: rows,
      firstPayment: rows[0].payment,
      lastPayment: rows[rows.length - 1].payment,
      totalInterest: totalInterest,
      totalPayment: totalPayment
    };
  }

  /** Lãi tiết kiệm lĩnh cuối kỳ (lãi đơn): gốc × lãi suất năm × số tháng / 12. */
  function savingsInterest(input) {
    if (!isMoney(input.principal)) throw new RangeError("Số tiền gửi không hợp lệ");
    if (!isRate(input.annualRatePct)) throw new RangeError("Lãi suất không hợp lệ");
    if (!isCount(input.months, 600)) throw new RangeError("Kỳ hạn không hợp lệ");
    var interest = Math.round((input.principal * input.annualRatePct / 100) * input.months / 12);
    return { interest: interest, total: input.principal + interest };
  }

  /**
   * Lãi kép, ghép lãi hàng tháng; khoản góp thêm nộp vào cuối mỗi tháng.
   * initial và monthly có thể bằng 0 nhưng không đồng thời bằng 0.
   */
  function compound(input) {
    var initial = input.initial, monthly = input.monthly, years = input.years;
    var okInitial = initial === 0 || isMoney(initial);
    var okMonthly = monthly === 0 || isMoney(monthly);
    if (!okInitial || !okMonthly || (initial === 0 && monthly === 0)) throw new RangeError("Số tiền không hợp lệ");
    if (!isRate(input.annualRatePct)) throw new RangeError("Lãi suất không hợp lệ");
    if (!isCount(years, 60)) throw new RangeError("Số năm không hợp lệ");

    var i = input.annualRatePct / 100 / 12;
    var balance = initial, contributed = initial, yearly = [];
    for (var m = 1; m <= years * 12; m++) {
      balance = balance * (1 + i) + monthly;
      contributed += monthly;
      if (m % 12 === 0) {
        yearly.push({ year: m / 12, contributed: contributed, value: Math.round(balance), interest: Math.round(balance) - contributed });
      }
    }
    var finalValue = Math.round(balance);
    return { finalValue: finalValue, totalContributed: contributed, totalInterest: finalValue - contributed, yearly: yearly };
  }

  return {
    parseMoney: parseMoney,
    parseRate: parseRate,
    loanSchedule: loanSchedule,
    savingsInterest: savingsInterest,
    compound: compound
  };
});
