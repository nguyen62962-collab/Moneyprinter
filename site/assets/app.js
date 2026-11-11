/* Gắn các biểu mẫu với Calc + nạp cấu hình kiếm tiền. Không dùng innerHTML với dữ liệu người dùng. */
(function () {
  "use strict";
  var fmt = new Intl.NumberFormat("vi-VN");
  function money(n) { return fmt.format(n) + " đ"; }
  function $(id) { return document.getElementById(id); }
  function el(tag, text, cls) {
    var e = document.createElement(tag);
    if (text != null) e.textContent = text;
    if (cls) e.className = cls;
    return e;
  }

  // Tự thêm dấu chấm phân tách hàng nghìn khi gõ số tiền
  document.querySelectorAll("input[data-money]").forEach(function (input) {
    function reformat() {
      var digits = input.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 15);
      input.value = digits ? fmt.format(Number(digits)) : "";
    }
    input.addEventListener("input", reformat);
    reformat();
  });

  function stats(container, items) {
    var box = el("div", null, "stats");
    items.forEach(function (it) {
      var s = el("div", null, "stat");
      s.appendChild(el("div", it[0], "k"));
      s.appendChild(el("div", it[1], "v"));
      box.appendChild(s);
    });
    container.appendChild(box);
  }

  function table(container, headers, rows) {
    var wrap = el("div", null, "table-scroll");
    wrap.tabIndex = 0;
    var t = el("table"), thead = el("thead"), tbody = el("tbody"), hr = el("tr");
    headers.forEach(function (h) { var th = el("th", h); th.scope = "col"; hr.appendChild(th); });
    thead.appendChild(hr);
    rows.forEach(function (r) {
      var tr = el("tr");
      r.forEach(function (c) { tr.appendChild(el("td", c)); });
      tbody.appendChild(tr);
    });
    t.appendChild(thead); t.appendChild(tbody); wrap.appendChild(t); container.appendChild(wrap);
  }

  function bind(formId, compute) {
    var form = $(formId);
    if (!form) return;
    var out = $("result"), err = $("error");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      out.replaceChildren();
      err.textContent = "";
      try {
        compute(out);
        out.hidden = false;
      } catch (ex) {
        out.hidden = true;
        err.textContent = ex instanceof RangeError ? ex.message + ". Vui lòng kiểm tra lại." : "Đã có lỗi xảy ra, vui lòng thử lại.";
      }
    });
  }

  function intField(id) {
    var s = $(id).value.trim();
    return /^\d+$/.test(s) ? Number(s) : NaN;
  }

  bind("loan-form", function (out) {
    var method = document.querySelector('input[name="method"]:checked').value;
    var r = Calc.loanSchedule({
      principal: Calc.parseMoney($("principal").value),
      annualRatePct: Calc.parseRate($("rate").value),
      months: intField("months"),
      method: method
    });
    stats(out, [
      [method === "annuity" ? "Trả mỗi tháng" : "Trả tháng đầu", money(r.firstPayment)],
      ["Tổng lãi phải trả", money(r.totalInterest)],
      ["Tổng gốc + lãi", money(r.totalPayment)]
    ]);
    table(out, ["Kỳ", "Tiền trả", "Gốc", "Lãi", "Dư nợ còn lại"], r.rows.map(function (x) {
      return [String(x.period), fmt.format(x.payment), fmt.format(x.principal), fmt.format(x.interest), fmt.format(x.balance)];
    }));
  });

  bind("savings-form", function (out) {
    var r = Calc.savingsInterest({
      principal: Calc.parseMoney($("principal").value),
      annualRatePct: Calc.parseRate($("rate").value),
      months: intField("months")
    });
    stats(out, [["Tiền lãi cuối kỳ", money(r.interest)], ["Tổng nhận về", money(r.total)]]);
  });

  bind("compound-form", function (out) {
    var initial = $("initial").value.trim() === "" ? 0 : Calc.parseMoney($("initial").value);
    var monthly = $("monthly").value.trim() === "" ? 0 : Calc.parseMoney($("monthly").value);
    var r = Calc.compound({
      initial: initial, monthly: monthly,
      annualRatePct: Calc.parseRate($("rate").value),
      years: intField("years")
    });
    stats(out, [
      ["Giá trị cuối kỳ", money(r.finalValue)],
      ["Tổng tiền đã góp", money(r.totalContributed)],
      ["Tiền lãi sinh ra", money(r.totalInterest)]
    ]);
    table(out, ["Năm", "Đã góp", "Tiền lãi", "Giá trị"], r.yearly.map(function (y) {
      return [String(y.year), fmt.format(y.contributed), fmt.format(y.interest), fmt.format(y.value)];
    }));
  });

  // ---- Kiếm tiền: chỉ kích hoạt khi đã điền config.js ----
  var cfg = window.SITE_CONFIG || {};
  if (typeof cfg.adsenseClient === "string" && /^ca-pub-\d{10,20}$/.test(cfg.adsenseClient)) {
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
