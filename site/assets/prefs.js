/* Áp dụng tuỳ chỉnh giao diện đã lưu trước khi trang vẽ, tránh nháy màu. */
(function () {
  "use strict";
  var allowed = { theme: ["auto", "light", "dark"], accent: ["green", "blue", "purple", "orange"], size: ["normal", "large"] };
  var prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("tt:prefs")) || {}; } catch (e) { prefs = {}; }
  var root = document.documentElement;
  Object.keys(allowed).forEach(function (key) {
    var value = allowed[key].indexOf(prefs[key]) >= 0 ? prefs[key] : allowed[key][0];
    root.setAttribute("data-" + key, value);
  });
})();
