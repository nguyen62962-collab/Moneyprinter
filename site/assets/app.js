/* Giao diện: biểu mẫu, biểu đồ, tuỳ chỉnh cá nhân, kịch bản đã lưu, quảng cáo.
 * Mọi dữ liệu người dùng được đưa vào trang bằng textContent — không dùng innerHTML. */
(function () {
  "use strict";

  var fmt = new Intl.NumberFormat("vi-VN");
  var dec1 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
  var dec2 = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });
  function money(n) { return fmt.format(n) + " đ"; }
  function compact(n) {
    if (n >= 1e9) return dec2.format(n / 1e9) + " tỷ";
    if (n >= 1e6) return dec1.format(n / 1e6) + " tr";
    if (n >= 1e3) return dec1.format(n / 1e3) + "k";
    return fmt.format(n);
  }
  function $(id) { return document.getElementById(id); }
  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }
  var SVG = "http://www.w3.org/2000/svg";
  function svg(tag, attrs) {
    var e = document.createElementNS(SVG, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  var store = {
    get: function (key, fallback) {
      try { var v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; }
    },
    set: function (key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
    }
  };

  var TOOL_DIRS = { loan: "vay-tra-gop", afford: "kha-nang-vay", savings: "lai-tiet-kiem", compound: "lai-kep", goal: "muc-tieu" };
  var TOOL_NAMES = { loan: "Vay trả góp", afford: "Khả năng vay", savings: "Lãi tiết kiệm", compound: "Lãi kép", goal: "Mục tiêu tiết kiệm" };

  /* ================= Tuỳ chỉnh giao diện ================= */
  (function prefs() {
    var root = document.documentElement;
    var inputs = document.querySelectorAll("input[data-pref]");
    inputs.forEach(function (input) {
      var key = input.getAttribute("data-pref");
      input.checked = root.getAttribute("data-" + key) === input.value;
      input.addEventListener("change", function () {
        if (!input.checked) return;
        root.setAttribute("data-" + key, input.value);
        var saved = store.get("tt:prefs", {});
        if (typeof saved !== "object" || Array.isArray(saved)) saved = {};
        saved[key] = input.value;
        store.set("tt:prefs", saved);
        redrawChart();
      });
    });
    var details = document.querySelector("details.prefs");
    if (details) {
      document.addEventListener("click", function (e) { if (details.open && !details.contains(e.target)) details.open = false; });
      document.addEventListener("keydown", function (e) { if (e.key === "Escape" && details.open) { details.open = false; details.querySelector("summary").focus(); } });
    }
  })();

  /* ================= Ô nhập ================= */
  function formatMoneyInput(input) {
    var digits = input.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
    input.value = digits ? fmt.format(Number(digits)) : "";
  }
  document.querySelectorAll("input[data-money]").forEach(function (input) {
    input.addEventListener("input", function () { formatMoneyInput(input); });
    formatMoneyInput(input);
  });

  function readForm(form) {
    var values = {};
    Array.prototype.forEach.call(form.elements, function (c) {
      if (!c.name) return;
      if (c.type === "radio") { if (c.checked) values[c.name] = c.value; }
      else if (c.hasAttribute("data-money")) values[c.name] = c.value.replace(/\D/g, "");
      else values[c.name] = c.value.trim();
    });
    return values;
  }
  function writeForm(form, values) {
    if (!values || typeof values !== "object") return false;
    var touched = false;
    Array.prototype.forEach.call(form.elements, function (c) {
      if (!c.name || !Object.prototype.hasOwnProperty.call(values, c.name)) return;
      var v = values[c.name];
      if (typeof v !== "string" || v.length > 30) return;
      if (c.type === "radio") { if (c.value === v) { c.checked = true; touched = true; } return; }
      c.value = v;
      if (c.hasAttribute("data-money")) formatMoneyInput(c);
      touched = true;
    });
    return touched;
  }
  function toQuery(values) {
    var p = new URLSearchParams();
    Object.keys(values).forEach(function (k) { if (values[k] !== "") p.set(k, values[k]); });
    return p.toString();
  }
  function fromQuery(search) {
    var values = {}, any = false;
    new URLSearchParams(search).forEach(function (v, k) { values[k] = v; any = true; });
    return any ? values : null;
  }

  /* ================= Hiển thị kết quả ================= */
  function renderStats(container, items) {
    var box = el("div", null, "stats");
    items.forEach(function (it) {
      var s = el("div", null, "stat");
      s.appendChild(el("div", it[0], "k"));
      s.appendChild(el("div", it[1], "v"));
      box.appendChild(s);
    });
    container.appendChild(box);
  }
  function renderInsight(container, parts) {
    if (!parts || !parts.length) return;
    var p = el("p", null, "insight");
    parts.forEach(function (part) {
      if (typeof part === "string") { p.appendChild(document.createTextNode(part)); return; }
      var a = el(part.href ? "a" : "strong", part.text);
      if (part.href) a.href = part.href;
      p.appendChild(a);
    });
    container.appendChild(p);
  }
  function renderTable(container, t) {
    var wrap = el("div", null, "table-scroll");
    wrap.tabIndex = 0;
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", t.caption);
    var table = el("table"), thead = el("thead"), tbody = el("tbody"), hr = el("tr");
    t.headers.forEach(function (h) { var th = el("th", h); th.scope = "col"; hr.appendChild(th); });
    thead.appendChild(hr);
    t.rows.forEach(function (r) {
      var tr = el("tr");
      r.forEach(function (c, i) { tr.appendChild(el("td", i === 0 ? String(c) : fmt.format(c))); });
      tbody.appendChild(tr);
    });
    table.appendChild(thead); table.appendChild(tbody); wrap.appendChild(table); container.appendChild(wrap);
  }

  /* ---- Biểu đồ cột chồng (SVG thuần, vẽ theo bề rộng thật) ---- */
  var chartState = null; // { host, data, width }
  function niceStep(raw) {
    var pow = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / pow;
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * pow;
  }
  function drawChart(host, data) {
    host.replaceChildren();
    var card = el("div", null, "card viz");
    card.appendChild(el("h3", data.title));
    var legend = el("div", null, "legend");
    data.series.forEach(function (s, i) {
      var item = el("span");
      item.appendChild(el("i", null, "swatch s" + (i + 1)));
      item.appendChild(document.createTextNode(s.name));
      legend.appendChild(item);
    });
    card.appendChild(legend);
    var plot = el("div", null, "plot");
    card.appendChild(plot);
    host.appendChild(card);

    var W = Math.max(260, Math.floor(plot.clientWidth)), H = 230;
    var mL = 52, mR = 6, mT = 10, mB = 24, plotW = W - mL - mR, plotH = H - mT - mB, y0 = H - mB;
    var n = data.labels.length;
    var totals = data.labels.map(function (_, i) { return data.series.reduce(function (a, s) { return a + s.values[i]; }, 0); });
    var max = Math.max.apply(null, totals);
    if (!(max > 0)) max = 1;
    var step = niceStep(max / 4), yMax = Math.ceil(max / step) * step;

    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, width: W, height: H, role: "img", "aria-label": data.title + ". Số liệu chi tiết có trong bảng bên dưới." });
    for (var v = 0; v <= yMax + step / 2; v += step) {
      var gy = Math.round(y0 - (v / yMax) * plotH) + 0.5;
      root.appendChild(svg("line", { x1: mL, x2: W - mR, y1: gy, y2: gy, "class": v === 0 ? "baseline" : "gridline" }));
      var tick = svg("text", { x: mL - 8, y: gy, "text-anchor": "end", "dominant-baseline": "middle" });
      tick.textContent = compact(v);
      root.appendChild(tick);
    }

    var band = plotW / n;
    var barW = band >= 6 ? Math.min(24, band - 2) : Math.max(1, band * 0.7);
    var every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 52))));
    function topRounded(x, yTop, w, h) {
      var r = Math.min(4, w / 2, h), yb = yTop + h;
      return "M" + x + "," + yb + "V" + (yTop + r) + "Q" + x + "," + yTop + " " + (x + r) + "," + yTop +
        "H" + (x + w - r) + "Q" + (x + w) + "," + yTop + " " + (x + w) + "," + (yTop + r) + "V" + yb + "Z";
    }

    var tip = el("div", null, "tip");
    tip.hidden = true;
    var bands = [];
    function showTip(i) {
      bands.forEach(function (b, j) { b.classList.toggle("on", j === i); });
      tip.replaceChildren(el("div", data.labels[i], "t"));
      data.series.forEach(function (s, k) {
        var row = el("div", null, "r");
        row.appendChild(el("i", null, "swatch s" + (k + 1)));
        row.appendChild(document.createTextNode(s.name));
        row.appendChild(el("b", money(s.values[i])));
        tip.appendChild(row);
      });
      var sum = el("div", null, "r sum");
      sum.appendChild(document.createTextNode(data.totalLabel));
      sum.appendChild(el("b", money(totals[i])));
      tip.appendChild(sum);
      tip.hidden = false;
      var scale = plot.clientWidth / W, cx = (mL + band * (i + 0.5)) * scale, tw = tip.offsetWidth;
      var left = cx + 12 + tw > plot.clientWidth ? cx - 12 - tw : cx + 12;
      tip.style.left = Math.max(0, Math.min(left, plot.clientWidth - tw)) + "px";
      tip.style.top = "4px";
    }
    function hideTip() {
      tip.hidden = true;
      bands.forEach(function (b) { b.classList.remove("on"); });
    }

    for (var i = 0; i < n; i++) {
      var x = mL + band * i + (band - barW) / 2;
      var hit = svg("rect", { x: mL + band * i, y: mT, width: band, height: plotH, "class": "hover-band" });
      bands.push(hit);
      root.appendChild(hit);
      var h1 = (data.series[0].values[i] / yMax) * plotH, h2 = (data.series[1].values[i] / yMax) * plotH;
      var gap = h1 >= 4 && h2 >= 4 ? 2 : 0; // khe hở 2px tách hai phần chồng nhau
      if (h1 > 0) {
        root.appendChild(h2 > 0
          ? svg("rect", { x: x, y: y0 - h1, width: barW, height: h1, "class": "bar s1" })
          : svg("path", { d: topRounded(x, y0 - h1, barW, h1), "class": "bar s1" }));
      }
      if (h2 - gap > 0) root.appendChild(svg("path", { d: topRounded(x, y0 - h1 - h2, barW, h2 - gap), "class": "bar s2" }));
      if (i % every === 0) {
        var lab = svg("text", { x: mL + band * (i + 0.5), y: H - 7, "text-anchor": "middle" });
        lab.textContent = data.labels[i].replace(/^(Năm|Tháng) /, "");
        root.appendChild(lab);
      }
      (function (index) {
        hit.addEventListener("pointerenter", function () { showTip(index); });
        hit.addEventListener("pointermove", function () { showTip(index); });
      })(i);
    }
    root.addEventListener("pointerleave", hideTip);
    plot.appendChild(root);
    plot.appendChild(tip);
    card.appendChild(el("div", data.axisNote, "hint"));
    chartState = { host: host, data: data, width: plot.clientWidth };
  }
  function redrawChart() {
    if (chartState && chartState.host.isConnected) drawChart(chartState.host, chartState.data);
  }
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (!chartState) return;
      var plot = chartState.host.querySelector(".plot");
      if (plot && plot.clientWidth !== chartState.width) redrawChart();
    }, 150);
  });

  /* ================= Định nghĩa từng công cụ ================= */
  function int(text) { return /^\d+$/.test(text || "") ? Number(text) : NaN; }
  function moneyOpt(text) { return text === "" || text == null ? 0 : Calc.parseMoney(text); }
  function pct(part, whole) { return whole > 0 ? dec1.format((part / whole) * 100) + "%" : "0%"; }
  function yearChart(title, yearly) {
    return {
      title: title, totalLabel: "Tổng giá trị", axisNote: "Trục ngang: năm thứ. Di chuột hoặc chạm vào cột để xem số liệu.",
      labels: yearly.map(function (y) { return "Năm " + y.year; }),
      series: [
        { name: "Tiền đã góp", values: yearly.map(function (y) { return y.contributed; }) },
        { name: "Tiền lãi", values: yearly.map(function (y) { return Math.max(0, y.interest); }) }
      ]
    };
  }
  function yearTable(yearly) {
    return {
      caption: "Bảng tăng trưởng theo năm", file: "tang-truong-theo-nam",
      headers: ["Năm", "Đã góp", "Tiền lãi", "Giá trị"],
      rows: yearly.map(function (y) { return [y.year, y.contributed, y.interest, y.value]; })
    };
  }

  var TOOLS = {
    loan: function (v) {
      var args = { principal: Calc.parseMoney(v.principal), annualRatePct: Calc.parseRate(v.rate), months: int(v.months), method: v.method };
      var extra = moneyOpt(v.extra);
      var r = Calc.loanSchedule({ principal: args.principal, annualRatePct: args.annualRatePct, months: args.months, method: args.method, extraMonthly: extra });
      var insight;
      if (extra > 0) {
        var base = Calc.loanSchedule(args), savedInterest = base.totalInterest - r.totalInterest, sooner = base.months - r.months;
        insight = ["Trả thêm " + money(extra) + " mỗi tháng giúp bạn tiết kiệm ", { text: money(savedInterest) }, " tiền lãi",
          sooner > 0 ? " và tất toán sớm " + sooner + " tháng (còn " + r.months + " tháng)." : "."];
      } else {
        var otherMethod = args.method === "annuity" ? "declining" : "annuity";
        var other = Calc.loanSchedule({ principal: args.principal, annualRatePct: args.annualRatePct, months: args.months, method: otherMethod });
        var diff = other.totalInterest - r.totalInterest;
        var otherName = otherMethod === "annuity" ? "trả đều hàng tháng" : "gốc đều, dư nợ giảm dần";
        insight = diff === 0 ? ["Với khoản vay này, hai cách trả nợ có tổng lãi như nhau."]
          : ["So với cách " + otherName + ", lựa chọn này ", { text: (diff > 0 ? "ít hơn " : "nhiều hơn ") + money(Math.abs(diff)) },
            " tiền lãi; tháng đầu cách kia phải trả " + money(other.firstPayment) + "."];
      }
      var size = r.months <= 24 ? 1 : 12, labels = [], gp = [], gi = [];
      r.rows.forEach(function (row, idx) {
        var g = Math.floor(idx / size);
        if (!labels[g]) { labels[g] = (size === 1 ? "Tháng " : "Năm ") + (g + 1); gp[g] = 0; gi[g] = 0; }
        gp[g] += row.principal; gi[g] += row.interest;
      });
      return {
        headline: (args.method === "annuity" ? "Trả mỗi tháng " : "Tháng đầu trả ") + money(r.firstPayment),
        stats: [
          [args.method === "annuity" && extra === 0 ? "Trả mỗi tháng" : "Trả tháng đầu", money(r.firstPayment)],
          ["Tổng lãi phải trả", money(r.totalInterest)],
          ["Tổng gốc + lãi", money(r.totalPayment)],
          ["Thời gian trả nợ", r.months + " tháng"]
        ],
        insight: insight,
        chart: {
          title: size === 1 ? "Gốc và lãi phải trả từng tháng" : "Gốc và lãi phải trả từng năm", totalLabel: "Tổng trả",
          axisNote: "Trục ngang: " + (size === 1 ? "tháng" : "năm") + " thứ. Di chuột hoặc chạm vào cột để xem số liệu.",
          labels: labels, series: [{ name: "Tiền gốc", values: gp }, { name: "Tiền lãi", values: gi }]
        },
        table: {
          caption: "Lịch trả nợ chi tiết", file: "lich-tra-no",
          headers: ["Kỳ", "Tiền trả", "Gốc", "Lãi", "Dư nợ còn lại"],
          rows: r.rows.map(function (x) { return [x.period, x.payment, x.principal, x.interest, x.balance]; })
        }
      };
    },

    afford: function (v) {
      var months = int(v.months), rate = Calc.parseRate(v.rate);
      var a = Calc.affordability({ income: Calc.parseMoney(v.income), ratioPct: Calc.parseRate(v.ratio), otherDebt: moneyOpt(v.other), annualRatePct: rate, months: months });
      var link = "../vay-tra-gop/?" + toQuery({ principal: String(a.maxLoan), rate: v.rate, months: String(months), method: "annuity" });
      return {
        headline: "Vay tối đa " + money(a.maxLoan),
        stats: [
          ["Số tiền vay tối đa", money(a.maxLoan)],
          ["Trả nợ mỗi tháng", money(a.monthlyPayment)],
          ["Tổng lãi dự kiến", money(a.totalInterest)]
        ],
        insight: ["Bạn có thể dành tối đa " + money(a.maxPayment) + " mỗi tháng cho khoản vay mới. ", { text: "Xem lịch trả nợ chi tiết cho khoản vay này →", href: link }]
      };
    },

    savings: function (v) {
      var months = int(v.months), terms = v.terms === "" || v.terms == null ? 1 : int(v.terms);
      var r = Calc.savingsInterest({ principal: Calc.parseMoney(v.principal), annualRatePct: Calc.parseRate(v.rate), months: months, terms: terms });
      var totalMonths = months * terms;
      var insight = ["Bình quân mỗi tháng bạn nhận khoảng ", { text: money(Math.round(r.interest / totalMonths)) }, " tiền lãi."];
      if (terms > 1) {
        var bonus = r.interest - r.rows[0].interest * terms;
        insight.push(" Nhờ tái tục cả gốc lẫn lãi, bạn nhận thêm " + money(bonus) + " so với rút lãi sau mỗi kỳ.");
      }
      return {
        headline: "Lãi " + money(r.interest),
        stats: [["Tiền lãi nhận được", money(r.interest)], ["Tổng nhận về", money(r.total)], ["Tổng thời gian gửi", totalMonths + " tháng"]],
        insight: insight,
        table: terms > 1 ? {
          caption: "Tiền lãi theo từng kỳ gửi", file: "lai-tiet-kiem",
          headers: ["Kỳ gửi", "Tiền lãi kỳ này", "Số dư cuối kỳ"],
          rows: r.rows.map(function (x) { return [x.term, x.interest, x.balance]; })
        } : null
      };
    },

    compound: function (v) {
      var years = int(v.years);
      var r = Calc.compound({ initial: moneyOpt(v.initial), monthly: moneyOpt(v.monthly), annualRatePct: Calc.parseRate(v.rate), years: years });
      return {
        headline: "Sau " + years + " năm: " + money(r.finalValue),
        stats: [["Giá trị cuối kỳ", money(r.finalValue)], ["Tổng tiền đã góp", money(r.totalContributed)], ["Tiền lãi sinh ra", money(r.totalInterest)]],
        insight: ["Sau " + years + " năm, tiền lãi chiếm ", { text: pct(r.totalInterest, r.finalValue) }, " giá trị cuối kỳ — tài sản gấp " +
          dec2.format(r.finalValue / r.totalContributed) + " lần số tiền bạn đã góp."],
        chart: yearChart("Tiền đã góp và tiền lãi qua từng năm", r.yearly),
        table: yearTable(r.yearly)
      };
    },

    goal: function (v) {
      var years = int(v.years), target = Calc.parseMoney(v.target);
      var g = Calc.goalMonthly({ target: target, initial: moneyOpt(v.initial), annualRatePct: Calc.parseRate(v.rate), years: years });
      var p = g.projection;
      return {
        headline: g.alreadyEnough ? "Đã đủ, không cần góp thêm" : "Góp " + money(g.monthly) + "/tháng",
        stats: [["Cần góp mỗi tháng", money(g.monthly)], ["Tổng tiền tự góp", money(p.totalContributed)], ["Tiền lãi sinh ra", money(p.totalInterest)], ["Dự kiến đạt được", money(p.finalValue)]],
        insight: g.alreadyEnough
          ? ["Số tiền đang có tự sinh lãi đã đủ đạt mục tiêu sau " + years + " năm — ", { text: "bạn không cần góp thêm." }]
          : ["Để có " + money(target) + " sau " + years + " năm, bạn cần góp ", { text: money(g.monthly) + " mỗi tháng" },
            "; tiền lãi đóng góp " + pct(p.totalInterest, p.finalValue) + " mục tiêu."],
        chart: yearChart("Lộ trình tới mục tiêu qua từng năm", p.yearly),
        table: yearTable(p.yearly)
      };
    }
  };

  /* ================= Vận hành công cụ trên trang ================= */
  var tool = document.body.getAttribute("data-tool");
  var form = $("tool-form");
  var current = null; // { values, result }

  function run(userTriggered) {
    var out = $("result"), err = $("error"), actions = $("actions");
    var values = readForm(form);
    out.replaceChildren();
    err.textContent = "";
    chartState = null;
    try {
      var result = TOOLS[tool](values);
      renderStats(out, result.stats);
      renderInsight(out, result.insight);
      if (result.chart) { var host = el("div"); out.appendChild(host); out.hidden = false; drawChart(host, result.chart); }
      if (result.table) renderTable(out, result.table);
      out.hidden = false;
      actions.hidden = false;
      $("download-csv").hidden = !result.table;
      current = { values: values, result: result };
      if (userTriggered) {
        store.set("tt:last:" + tool, values);
        try { history.replaceState(null, "", "?" + toQuery(values)); } catch (e) { /* file:// */ }
      }
    } catch (ex) {
      current = null;
      out.hidden = true;
      actions.hidden = true;
      err.textContent = ex instanceof RangeError ? ex.message : "Đã có lỗi xảy ra, vui lòng thử lại.";
      if (!(ex instanceof RangeError)) throw ex;
    }
  }

  function note(text) {
    var n = $("action-note");
    n.textContent = text;
    clearTimeout(note.timer);
    note.timer = setTimeout(function () { n.textContent = ""; }, 4000);
  }

  if (tool && form && TOOLS[tool]) {
    var fromUrl = fromQuery(location.search);
    if (!(fromUrl && writeForm(form, fromUrl))) writeForm(form, store.get("tt:last:" + tool, null));

    var typing = null;
    form.addEventListener("submit", function (e) { e.preventDefault(); clearTimeout(typing); run(true); });
    form.addEventListener("input", function () { clearTimeout(typing); typing = setTimeout(function () { run(true); }, 250); });

    document.querySelectorAll(".chip[data-preset]").forEach(function (chip) {
      chip.addEventListener("click", function () {
        var preset = null;
        try { preset = JSON.parse(chip.getAttribute("data-preset")); } catch (e) { return; }
        writeForm(form, preset);
        clearTimeout(typing);
        run(true);
      });
    });

    $("copy-link").addEventListener("click", function () {
      if (!current) return;
      var url = location.origin + location.pathname + "?" + toQuery(current.values);
      var done = function () { note("Đã sao chép liên kết — gửi cho ai, người đó sẽ thấy đúng phép tính này."); };
      var manual = function () { window.prompt("Sao chép liên kết này:", url); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, manual);
      else manual();
    });
    $("download-csv").addEventListener("click", function () {
      if (!current || !current.result.table) return;
      var t = current.result.table;
      var lines = [t.headers].concat(t.rows).map(function (row) {
        return row.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(",");
      });
      var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      var a = el("a");
      a.href = URL.createObjectURL(blob);
      a.download = t.file + ".csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    });
    $("print").addEventListener("click", function () { window.print(); });

    $("save-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if (!current) { note("Hãy nhập số liệu hợp lệ trước khi lưu."); return; }
      var input = $("save-name"), name = input.value.trim().slice(0, 40) || TOOL_NAMES[tool];
      var list = loadSaved();
      list.unshift({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tool: tool, name: name, query: toQuery(current.values), headline: current.result.headline });
      if (!store.set("tt:saved", list.slice(0, 30))) { note("Trình duyệt đang chặn lưu trữ nên không lưu được kịch bản."); return; }
      input.value = "";
      renderSaved();
    });

    run(false);
  }

  /* ================= Kịch bản đã lưu ================= */
  function loadSaved() {
    var list = store.get("tt:saved", []);
    if (!Array.isArray(list)) return [];
    return list.filter(function (s) {
      return s && typeof s.id === "string" && typeof s.name === "string" && typeof s.query === "string" &&
        typeof s.headline === "string" && Object.prototype.hasOwnProperty.call(TOOL_DIRS, s.tool);
    });
  }
  function renderSaved() {
    var listEl = $("saved-list");
    if (!listEl) return;
    var all = loadSaved();
    var items = tool ? all.filter(function (s) { return s.tool === tool; }) : all;
    listEl.replaceChildren();
    var section = $("saved"), empty = $("saved-empty");
    if (!tool && section) section.hidden = items.length === 0; // trang chủ: chỉ hiện khi có dữ liệu
    if (empty) empty.hidden = items.length > 0;
    items.forEach(function (s) {
      var li = el("li");
      var a = el("a", s.name, "name");
      a.href = (tool ? "./" : "./" + TOOL_DIRS[s.tool] + "/") + "?" + s.query;
      li.appendChild(a);
      li.appendChild(el("span", (tool ? "" : TOOL_NAMES[s.tool] + " · ") + s.headline, "meta"));
      var del = el("button", "Xoá");
      del.type = "button";
      del.setAttribute("aria-label", "Xoá kịch bản " + s.name);
      del.addEventListener("click", function () {
        store.set("tt:saved", loadSaved().filter(function (x) { return x.id !== s.id; }));
        renderSaved();
      });
      li.appendChild(del);
      listEl.appendChild(li);
    });
  }
  renderSaved();

  /* ================= Kiếm tiền: chỉ kích hoạt khi đã điền config.js ================= */
  var cfg = window.SITE_CONFIG || {};
  if (typeof cfg.adsenseClient === "string" && /^ca-pub-\d{10,20}$/.test(cfg.adsenseClient) &&
      !document.querySelector('script[src*="adsbygoogle.js"]')) {
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + cfg.adsenseClient;
    document.head.appendChild(s);
  }
  var slot = $("offers");
  var links = Array.isArray(cfg.affiliateLinks) ? cfg.affiliateLinks.filter(function (l) {
    return l && typeof l.title === "string" && typeof l.url === "string" && /^https:\/\//.test(l.url);
  }) : [];
  if (slot && links.length) {
    slot.appendChild(el("div", "Liên kết tiếp thị — chúng tôi có thể nhận hoa hồng", "tag"));
    links.forEach(function (l) {
      var a = el("a", null, "card");
      a.href = l.url; a.target = "_blank"; a.rel = "sponsored noopener";
      a.appendChild(el("strong", l.title));
      if (typeof l.text === "string" && l.text) { a.appendChild(document.createElement("br")); a.appendChild(document.createTextNode(l.text)); }
      slot.appendChild(a);
    });
    slot.hidden = false;
  }
})();
