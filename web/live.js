(function () {
  "use strict";
  var TIERS = { backer: "$1+ backer", founding: "$5 founding", suburb: "$20 suburb", pilot: "$50 pilot" };
  function money(c) { var d = c / 100; return "$" + (d % 1 ? d.toFixed(2) : String(d)); }
  function set(id, t) { document.getElementById(id).textContent = t; }
  function render(s) {
    set("total", money(s.total_cents || 0));
    set("backers", String(s.backers || 0));
    set("blabel", s.backers === 1 ? "backer" : "backers");
    var parts = [];
    Object.keys(TIERS).forEach(function (k) { if (s.by_tier && s.by_tier[k]) parts.push(s.by_tier[k] + " x " + TIERS[k]); });
    set("tiers", parts.join(", "));
    var age = Math.max(0, Math.round(Date.now() / 1000 - (s.updated_epoch || 0)));
    set("upd", "Last updated " + (s.updated_awst || "") + (age > 180 ? " (checking again...)" : ""));
    var ul = document.getElementById("latest");
    while (ul.firstChild) ul.removeChild(ul.firstChild);
    var list = s.latest || [];
    if (!list.length) { var e = document.createElement("li"); e.textContent = "Be the first backer."; ul.appendChild(e); }
    list.forEach(function (p) {
      var li = document.createElement("li"), b = document.createElement("b"), t = document.createElement("span");
      b.textContent = money(p.amount_cents) + " " + (TIERS[p.tier] || "");
      t.textContent = p.time_awst + " AWST";
      li.appendChild(b); li.appendChild(t); ul.appendChild(li);
    });
  }
  function load() {
    fetch("stats.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(render)
      .catch(function () { set("upd", "Live numbers are refreshing, try again in a moment."); });
  }
  load();
  setInterval(load, 20000);
})();
