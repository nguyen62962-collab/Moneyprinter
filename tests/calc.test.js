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
    { months: 0 }, { months: 1.5 }, { months: 601 }, { method: "x" }]) {
    assert.throws(() => Calc.loanSchedule({ ...ok, ...patch }), RangeError, JSON.stringify(patch));
  }
});

test("lãi tiết kiệm", () => {
  assert.deepEqual(Calc.savingsInterest({ principal: 100000000, annualRatePct: 6, months: 12 }), { interest: 6000000, total: 106000000 });
  assert.deepEqual(Calc.savingsInterest({ principal: 100000000, annualRatePct: 6, months: 6 }), { interest: 3000000, total: 103000000 });
  assert.deepEqual(Calc.savingsInterest({ principal: 50000000, annualRatePct: 5.5, months: 1 }), { interest: 229167, total: 50229167 });
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
