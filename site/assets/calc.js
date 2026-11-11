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
    return typeof v === "number" && isFinite(v) && Math.floor(v) === v && v > 0 && v <= MAX_MONEY;
  }
  function isMoneyOrZero(v) {
    return v === 0 || isMoney(v);
  }
  function isRate(v) {
    return typeof v === "number" && isFinite(v) && v >= 0 && v <= 100;
  }
  function isCount(v, max) {
    return typeof v === "number" && Math.floor(v) === v && v >= 1 && v <= max;
  }
  function fail(message) {
    throw new RangeError(message);
  }

  /**
   * Lịch trả nợ vay trả góp.
   * method: "annuity"  — trả đều hàng tháng (gốc + lãi cố định)
   *         "declining" — gốc đều, lãi tính trên dư nợ giảm dần
   * extraMonthly (tuỳ chọn): số tiền gốc trả thêm mỗi tháng; khoản vay tất toán sớm hơn.
   * Mọi khoản tiền làm tròn tới đồng; kỳ cuối tất toán toàn bộ dư nợ còn lại.
   */
  function loanSchedule(input) {
    var P = input.principal, months = input.months, method = input.method;
    var extra = input.extraMonthly == null ? 0 : input.extraMonthly;
    if (!isMoney(P)) fail("Số tiền vay không hợp lệ.");
    if (!isRate(input.annualRatePct)) fail("Lãi suất phải nằm trong khoảng 0–100%.");
    if (!isCount(months, 600)) fail("Thời hạn vay phải từ 1 đến 600 tháng.");
    if (method !== "annuity" && method !== "declining") fail("Cách trả nợ không hợp lệ.");
    if (!isMoneyOrZero(extra)) fail("Số tiền trả thêm không hợp lệ.");

    var r = input.annualRatePct / 100 / 12;
    var fixedPayment = 0;
    if (method === "annuity") {
      fixedPayment = Math.round(r === 0 ? P / months : (P * r) / (1 - Math.pow(1 + r, -months)));
    }

    var rows = [], balance = P, totalInterest = 0, totalPayment = 0;
    for (var k = 1; k <= months; k++) {
      var interest = Math.round(balance * r);
      var principalPart;
      if (k === months) {
        principalPart = balance;
      } else {
        var scheduled = method === "annuity"
          ? Math.max(0, fixedPayment - interest)
          : Math.round((P * k) / months) - Math.round((P * (k - 1)) / months); // chia gốc đều, không lệch do làm tròn
        principalPart = Math.min(balance, scheduled + extra);
      }
      var payment = principalPart + interest;
      balance -= principalPart;
      totalInterest += interest;
      totalPayment += payment;
      rows.push({ period: k, payment: payment, principal: principalPart, interest: interest, balance: balance });
      if (balance === 0 && extra > 0) break;
    }
    return {
      rows: rows,
      months: rows.length,
      firstPayment: rows[0].payment,
      lastPayment: rows[rows.length - 1].payment,
      totalInterest: totalInterest,
      totalPayment: totalPayment
    };
  }

  /** Số tiền vay tối đa (trả đều hàng tháng) với khoản trả mỗi tháng cho trước. */
  function maxLoan(input) {
    var M = input.payment, n = input.months;
    if (!isMoney(M)) fail("Số tiền trả mỗi tháng không hợp lệ.");
    if (!isRate(input.annualRatePct)) fail("Lãi suất phải nằm trong khoảng 0–100%.");
    if (!isCount(n, 600)) fail("Thời hạn vay phải từ 1 đến 600 tháng.");
    var r = input.annualRatePct / 100 / 12;
    var P = Math.floor(r === 0 ? M * n : (M * (1 - Math.pow(1 + r, -n))) / r);
    // Bảo đảm khoản trả thực tế (sau làm tròn) không vượt quá M
    while (P > 0 && Math.round(r === 0 ? P / n : (P * r) / (1 - Math.pow(1 + r, -n))) > M) P--;
    return P;
  }

  /**
   * Khả năng vay theo thu nhập: dành tối đa ratioPct% thu nhập để trả nợ,
   * trừ đi các khoản nợ đang trả hàng tháng.
   */
  function affordability(input) {
    var other = input.otherDebt == null ? 0 : input.otherDebt;
    if (!isMoney(input.income)) fail("Thu nhập hàng tháng không hợp lệ.");
    if (!(isRate(input.ratioPct) && input.ratioPct > 0)) fail("Tỷ lệ thu nhập dành trả nợ phải lớn hơn 0 và không quá 100%.");
    if (!isMoneyOrZero(other)) fail("Khoản nợ đang trả không hợp lệ.");
    if (!isRate(input.annualRatePct)) fail("Lãi suất phải nằm trong khoảng 0–100%.");
    if (!isCount(input.months, 600)) fail("Thời hạn vay phải từ 1 đến 600 tháng.");
    var maxPayment = Math.floor((input.income * input.ratioPct) / 100) - other;
    if (maxPayment <= 0) fail("Các khoản nợ đang trả đã chiếm hết phần thu nhập dành cho trả nợ.");
    var loan = maxLoan({ payment: maxPayment, annualRatePct: input.annualRatePct, months: input.months });
    if (loan <= 0) fail("Khoản trả hàng tháng quá nhỏ để vay với lãi suất này.");
    var schedule = loanSchedule({ principal: loan, annualRatePct: input.annualRatePct, months: input.months, method: "annuity" });
    return { maxPayment: maxPayment, maxLoan: loan, monthlyPayment: schedule.firstPayment, totalInterest: schedule.totalInterest };
  }

  /**
   * Lãi tiết kiệm lĩnh cuối kỳ: gốc × lãi suất năm × số tháng / 12.
   * terms (tuỳ chọn, mặc định 1): số kỳ gửi liên tiếp, tái tục cả gốc lẫn lãi với cùng lãi suất.
   */
  function savingsInterest(input) {
    var terms = input.terms == null ? 1 : input.terms;
    if (!isMoney(input.principal)) fail("Số tiền gửi không hợp lệ.");
    if (!isRate(input.annualRatePct)) fail("Lãi suất phải nằm trong khoảng 0–100%.");
    if (!isCount(input.months, 600)) fail("Kỳ hạn phải từ 1 đến 600 tháng.");
    if (!isCount(terms, 120)) fail("Số kỳ gửi phải từ 1 đến 120.");
    var balance = input.principal, rows = [];
    for (var k = 1; k <= terms; k++) {
      var interest = Math.round((balance * input.annualRatePct / 100) * input.months / 12);
      balance += interest;
      rows.push({ term: k, interest: interest, balance: balance });
    }
    return { interest: balance - input.principal, total: balance, rows: rows };
  }

  /**
   * Lãi kép, ghép lãi hàng tháng; khoản góp thêm nộp vào cuối mỗi tháng.
   * initial và monthly có thể bằng 0 nhưng không đồng thời bằng 0.
   */
  function compound(input) {
    var initial = input.initial, monthly = input.monthly, years = input.years;
    if (!isMoneyOrZero(initial)) fail("Vốn ban đầu không hợp lệ.");
    if (!isMoneyOrZero(monthly)) fail("Số tiền góp mỗi tháng không hợp lệ.");
    if (initial === 0 && monthly === 0) fail("Hãy nhập vốn ban đầu hoặc số tiền góp mỗi tháng.");
    if (!isRate(input.annualRatePct)) fail("Lãi suất phải nằm trong khoảng 0–100%.");
    if (!isCount(years, 60)) fail("Thời gian phải từ 1 đến 60 năm.");

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

  /** Cần góp bao nhiêu mỗi tháng để đạt mục tiêu target sau years năm (ghép lãi hàng tháng). */
  function goalMonthly(input) {
    var target = input.target, initial = input.initial == null ? 0 : input.initial, years = input.years;
    if (!isMoney(target)) fail("Số tiền mục tiêu không hợp lệ.");
    if (!isMoneyOrZero(initial)) fail("Số tiền đang có không hợp lệ.");
    if (!isRate(input.annualRatePct)) fail("Lãi suất phải nằm trong khoảng 0–100%.");
    if (!isCount(years, 60)) fail("Thời gian phải từ 1 đến 60 năm.");

    var i = input.annualRatePct / 100 / 12, n = years * 12, g = Math.pow(1 + i, n);
    var need = target - initial * g;
    var monthly = need <= 0 ? 0 : Math.ceil(i === 0 ? need / n : (need * i) / (g - 1));
    function project(c) {
      if (initial === 0 && c === 0) return null;
      return compound({ initial: initial, monthly: c, annualRatePct: input.annualRatePct, years: years });
    }
    var projection = project(monthly);
    for (var guard = 0; guard < 1000 && (!projection || projection.finalValue < target); guard++) {
      monthly++;
      projection = project(monthly);
    }
    while (monthly > 0) { // không góp thừa do sai số dấu phẩy động
      var lower = project(monthly - 1);
      if (!lower || lower.finalValue < target) break;
      monthly--; projection = lower;
    }
    return { monthly: monthly, alreadyEnough: monthly === 0, projection: projection };
  }

  return {
    parseMoney: parseMoney,
    parseRate: parseRate,
    loanSchedule: loanSchedule,
    maxLoan: maxLoan,
    affordability: affordability,
    savingsInterest: savingsInterest,
    compound: compound,
    goalMonthly: goalMonthly
  };
});
