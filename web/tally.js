(function () {
  "use strict";
  var el = document.getElementById("tally");
  if (!el) return;
  function money(c) { var d = c / 100; return "A$" + (d % 1 ? d.toFixed(2) : String(d)); }
  function load() {
    fetch("stats.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (s) {
        var n = s.backers || 0;
        el.textContent = "Collected so far: " + money(s.total_cents || 0) + " from " + n + (n === 1 ? " backer" : " backers") + " (live)";
      })
      .catch(function () {});
  }
  load();
  setInterval(load, 20000);
})();
