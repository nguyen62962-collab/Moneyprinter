"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const Calc = require("../site/assets/calc.js");

test("parseMoney", () => {
  assert.equal(Calc.parseMoney("1.500.000 đ"), 1500000);
  assert.equal(Calc.parseMoney("100,000,000"), 100000000);
  assert.equal(Calc.parseMoney("0"), 0);
  assert.ok(Number.isNaN(Calc.parseMoney("")));
  assert.ok(Number.isNaN(Calc.parseMoney("abc")));
});

test("parseRate", () => {
  assert.equal(Calc.parseRate("6,5"), 6.5);
  assert.equal(Calc.parseRate(" 6.5 "), 6.5);
  assert.equal(Calc.parseRate("12"), 12);
  for (const bad of ["", "-1", "6,5,1", "abc", "1e3", "6."]) assert.ok(Number.isNaN(Calc.parseRate(bad)), bad);
});

test("vay trả đều: khớp công thức niên kim", () => {
  // 100 triệu, 12%/năm, 12 tháng -> 8.884.879 đ/tháng (giá trị chuẩn 8.884.878,87)
  const s = Calc.loanSchedule({ principal: 100000000, annualRatePct: 12, months: 12, method: "annuity" });
  assert.equal(s.firstPayment, 8884879);
  assert.equal(s.rows.length, 12);
  assert.equal(s.rows[0].interest, 1000000);
  assert.equal(s.rows[11].balance, 0);
  // Tổng lãi chuẩn 6.618.546; sai số do làm tròn từng kỳ chỉ vài đồng
  assert.ok(Math.abs(s.totalInterest - 6618546) <= 12);
});

test("vay dư nợ giảm dần: gốc đều", () => {
  const s = Calc.loanSchedule({ principal: 120000000, annualRatePct: 12, months: 12, method: "declining" });
  assert.equal(s.rows[0].principal, 10000000);
  assert.equal(s.rows[0].interest, 1200000);
  assert.equal(s.firstPayment, 11200000);
  assert.equal(s.lastPayment, 10100000);
  assert.equal(s.totalInterest, 7800000); // 1% × (120+110+...+10) triệu
  assert.equal(s.totalPayment, 127800000);
});

test("lịch trả nợ luôn nhất quán", () => {
  const cases = [
    [100000000, 12, 12], [1, 5, 3], [999999999, 7.99, 240], [50000000, 0, 7],
    [1000, 100, 600], [2500000000, 9.5, 360], [10000000, 20, 1], [7, 3, 12]
  ];
  for (const [principal, annualRatePct, months] of cases) {
    for (const method of ["annuity", "declining"]) {
      const s = Calc.loanSchedule({ principal, annualRatePct, months, method });
      const label = `${principal}/${annualRatePct}/${months}/${method}`;
      assert.equal(s.rows.length, months, label);
      assert.equal(s.rows[months - 1].balance, 0, label);
      let sumP = 0, sumI = 0, prev = principal;
      for (const r of s.rows) {
        assert.ok(Number.isInteger(r.payment) && r.principal >= 0 && r.interest >= 0, label);
        assert.equal(r.payment, r.principal + r.interest, label);
        assert.equal(r.balance, prev - r.principal, label);
        assert.ok(r.balance >= 0, label);
        prev = r.balance; sumP += r.principal; sumI += r.interest;
      }
      assert.equal(sumP, principal, label);
      assert.equal(sumI, s.totalInterest, label);
      assert.equal(s.totalPayment, principal + s.totalInterest, label);
    }
  }
});

test("lãi suất 0%: không phát sinh lãi", () => {
  const s = Calc.loanSchedule({ principal: 12000000, annualRatePct: 0, months: 12, method: "annuity" });
  assert.equal(s.totalInterest, 0);
  assert.equal(s.firstPayment, 1000000);
});

test("vay: từ chối đầu vào sai", () => {
  const ok = { principal: 1000000, annualRatePct: 10, months: 12, method: "annuity" };
  for (const patch of [{ principal: 0 }, { principal: NaN }, { principal: -5 }, { principal: 1e16 },
    { annualRatePct: -1 }, { annualRatePct: 101 }, { annualRatePct: NaN },
    { months: 0 }, { months: 1.5 }, { months: 601 }, { method: "x" }, { extraMonthly: -1 }, { extraMonthly: 0.5 }, { principal: 1000.5 }]) {
    assert.throws(() => Calc.loanSchedule({ ...ok, ...patch }), RangeError, JSON.stringify(patch));
  }
});

test("lãi tiết kiệm", () => {
  const pick = (r) => ({ interest: r.interest, total: r.total });
  assert.deepEqual(pick(Calc.savingsInterest({ principal: 100000000, annualRatePct: 6, months: 12 })), { interest: 6000000, total: 106000000 });
  assert.deepEqual(pick(Calc.savingsInterest({ principal: 100000000, annualRatePct: 6, months: 6 })), { interest: 3000000, total: 103000000 });
  assert.deepEqual(pick(Calc.savingsInterest({ principal: 50000000, annualRatePct: 5.5, months: 1 })), { interest: 229167, total: 50229167 });
  // Tái tục 2 kỳ 6 tháng, 6%/năm: 100tr -> 103tr -> 106,09tr
  const rolled = Calc.savingsInterest({ principal: 100000000, annualRatePct: 6, months: 6, terms: 2 });
  assert.equal(rolled.total, 106090000);
  assert.equal(rolled.interest, 6090000);
  assert.deepEqual(rolled.rows, [{ term: 1, interest: 3000000, balance: 103000000 }, { term: 2, interest: 3090000, balance: 106090000 }]);
  assert.throws(() => Calc.savingsInterest({ principal: 1000, annualRatePct: 6, months: 6, terms: 0 }), RangeError);
  assert.throws(() => Calc.savingsInterest({ principal: 1000, annualRatePct: 6, months: 6, terms: 121 }), RangeError);
  assert.equal(Calc.savingsInterest({ principal: 1000000, annualRatePct: 0, months: 3 }).interest, 0);
  assert.throws(() => Calc.savingsInterest({ principal: 0, annualRatePct: 6, months: 6 }), RangeError);
  assert.throws(() => Calc.savingsInterest({ principal: 1000, annualRatePct: 6, months: 0 }), RangeError);
});

test("lãi kép: khớp công thức đóng", () => {
  const closed = (P, C, ratePct, years) => {
    const i = ratePct / 100 / 12, n = years * 12, g = Math.pow(1 + i, n);
    return P * g + (i === 0 ? C * n : C * (g - 1) / i);
  };
  for (const [P, C, rate, years] of [[100000000, 0, 12, 1], [0, 1000000, 8, 10], [50000000, 3000000, 7.5, 25], [10000000, 500000, 0, 5], [1000000, 0, 100, 60]]) {
    const r = Calc.compound({ initial: P, monthly: C, annualRatePct: rate, years });
    const expected = closed(P, C, rate, years);
    assert.ok(Math.abs(r.finalValue - expected) <= Math.max(1, expected * 1e-9), `${P}/${C}/${rate}/${years}`);
    assert.equal(r.totalContributed, P + C * years * 12);
    assert.equal(r.totalInterest, r.finalValue - r.totalContributed);
    assert.equal(r.yearly.length, years);
    assert.equal(r.yearly[years - 1].value, r.finalValue);
  }
  // 100 triệu, 12%/năm ghép tháng, 1 năm -> 112.682.503
  assert.equal(Calc.compound({ initial: 100000000, monthly: 0, annualRatePct: 12, years: 1 }).finalValue, 112682503);
});

test("lãi kép: từ chối đầu vào sai", () => {
  const ok = { initial: 1000000, monthly: 0, annualRatePct: 10, years: 5 };
  for (const patch of [{ initial: 0 }, { initial: NaN }, { monthly: -1 }, { annualRatePct: 200 }, { years: 0 }, { years: 61 }, { years: 2.5 }]) {
    assert.throws(() => Calc.compound({ ...ok, ...patch }), RangeError, JSON.stringify(patch));
  }
});

test("vay: trả thêm mỗi tháng rút ngắn kỳ hạn và giảm lãi", () => {
  for (const method of ["annuity", "declining"]) {
    const base = Calc.loanSchedule({ principal: 500000000, annualRatePct: 10, months: 60, method });
    const fast = Calc.loanSchedule({ principal: 500000000, annualRatePct: 10, months: 60, method, extraMonthly: 5000000 });
    assert.equal(base.months, 60);
    assert.ok(fast.months < 60, method);
    assert.ok(fast.totalInterest < base.totalInterest, method);
    assert.equal(fast.rows[fast.months - 1].balance, 0);
    assert.equal(fast.rows.reduce((a, r) => a + r.principal, 0), 500000000);
    assert.equal(fast.totalPayment, 500000000 + fast.totalInterest);
    for (const r of fast.rows) assert.ok(r.principal > 0 && r.balance >= 0);
    // extraMonthly = 0 cho kết quả y hệt khi không truyền
    assert.deepEqual(Calc.loanSchedule({ principal: 500000000, annualRatePct: 10, months: 60, method, extraMonthly: 0 }), base);
  }
  // Trả thêm rất lớn: tất toán ngay kỳ đầu, chỉ chịu lãi 1 tháng
  const one = Calc.loanSchedule({ principal: 12000000, annualRatePct: 12, months: 12, method: "annuity", extraMonthly: 100000000 });
  assert.equal(one.months, 1);
  assert.equal(one.totalInterest, 120000);
  assert.equal(one.totalPayment, 12120000);
});

test("vay dư nợ giảm dần: gốc chia đều kể cả khi không chia hết", () => {
  const s = Calc.loanSchedule({ principal: 500000000, annualRatePct: 10, months: 60, method: "declining" });
  const parts = s.rows.map((r) => r.principal);
  assert.ok(Math.max(...parts) - Math.min(...parts) <= 1);
  // Giá trị chuẩn: 500tr × (10%/12) × 61/2 = 127.083.333,33
  assert.ok(Math.abs(s.totalInterest - 127083333) <= 60);
});

test("số tiền vay tối đa", () => {
  // Ngược với ví dụ niên kim: trả 8.884.879 đ/tháng, 12%/năm, 12 tháng -> ~100 triệu
  const P = Calc.maxLoan({ payment: 8884879, annualRatePct: 12, months: 12 });
  assert.ok(Math.abs(P - 100000000) <= 12, String(P));
  assert.equal(Calc.maxLoan({ payment: 1000000, annualRatePct: 0, months: 12 }), 12000000);
  for (const [payment, rate, months] of [[8884879, 12, 12], [15000000, 9.5, 240], [1, 20, 600], [3333333, 7.77, 37], [1000000, 0, 7]]) {
    const loan = Calc.maxLoan({ payment, annualRatePct: rate, months });
    if (loan > 0) {
      const s = Calc.loanSchedule({ principal: loan, annualRatePct: rate, months, method: "annuity" });
      assert.ok(s.firstPayment <= payment, `${payment}/${rate}/${months}`);
    }
    if (loan > 0 && payment > 1000) { // vay thêm 0,1% là vượt khả năng trả
      const more = Calc.loanSchedule({ principal: Math.ceil(loan * 1.001) + 1, annualRatePct: rate, months, method: "annuity" });
      assert.ok(more.firstPayment > payment, `${payment}/${rate}/${months}`);
    }
  }
  assert.throws(() => Calc.maxLoan({ payment: 0, annualRatePct: 10, months: 12 }), RangeError);
});

test("khả năng vay theo thu nhập", () => {
  const a = Calc.affordability({ income: 30000000, ratioPct: 40, otherDebt: 2000000, annualRatePct: 10, months: 240 });
  assert.equal(a.maxPayment, 10000000);
  assert.ok(a.monthlyPayment <= 10000000 && a.monthlyPayment >= 9999990);
  // Giá trị chuẩn: 10tr × (1 − (1+r)^−240) / r với r = 10%/12 ≈ 1.036.246.000
  assert.ok(Math.abs(a.maxLoan - 1036246000) < 5000, String(a.maxLoan));
  assert.ok(a.totalInterest > 0);
  assert.throws(() => Calc.affordability({ income: 10000000, ratioPct: 40, otherDebt: 4000000, annualRatePct: 10, months: 120 }), RangeError);
  assert.throws(() => Calc.affordability({ income: 10000000, ratioPct: 0, annualRatePct: 10, months: 120 }), RangeError);
  assert.throws(() => Calc.affordability({ income: 10000000, ratioPct: 101, annualRatePct: 10, months: 120 }), RangeError);
  assert.throws(() => Calc.affordability({ income: 0, ratioPct: 40, annualRatePct: 10, months: 120 }), RangeError);
});

test("mục tiêu tiết kiệm: số tiền góp nhỏ nhất đủ đạt mục tiêu", () => {
  for (const [target, initial, rate, years] of [[1000000000, 0, 8, 10], [600000000, 50000000, 6.5, 5], [100000000, 0, 0, 2], [2000000000, 100000000, 10, 15], [5000000, 0, 100, 60], [123456789, 1, 7.3, 1]]) {
    const g = Calc.goalMonthly({ target, initial, annualRatePct: rate, years });
    const label = `${target}/${initial}/${rate}/${years}`;
    assert.ok(g.monthly > 0 && !g.alreadyEnough, label);
    assert.ok(g.projection.finalValue >= target, label);
    if (initial > 0 || g.monthly > 1) {
      const less = Calc.compound({ initial, monthly: g.monthly - 1, annualRatePct: rate, years });
      assert.ok(less.finalValue < target, label);
    }
  }
  // 0% lãi: chia đều, làm tròn lên
  assert.equal(Calc.goalMonthly({ target: 100000000, initial: 0, annualRatePct: 0, years: 2 }).monthly, 4166667);
  // Vốn sẵn có tự sinh lãi đã đủ
  const enough = Calc.goalMonthly({ target: 110000000, initial: 100000000, annualRatePct: 12, years: 1 });
  assert.equal(enough.monthly, 0);
  assert.ok(enough.alreadyEnough);
  assert.equal(enough.projection.finalValue, 112682503);
  assert.throws(() => Calc.goalMonthly({ target: 0, initial: 0, annualRatePct: 5, years: 5 }), RangeError);
  assert.throws(() => Calc.goalMonthly({ target: 1000, initial: -1, annualRatePct: 5, years: 5 }), RangeError);
});
