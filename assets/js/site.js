(function () {
  "use strict";

  /* Opening hours come from assets/js/config.js (London time, index 0 = Sunday, minutes since midnight). */
  var HOURS = window.SITE_HOURS || {};
  var DAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  var DAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function fmt(min) {
    var h = Math.floor(min / 60), m = min % 60, ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return h + ":" + (m < 10 ? "0" : "") + m + " " + ap;
  }
  function londonNow() {
    var parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(new Date());
    var o = {};
    parts.forEach(function (p) { o[p.type] = p.value; });
    return { day: DAY[o.weekday], min: parseInt(o.hour, 10) * 60 + parseInt(o.minute, 10) };
  }
  function statusText(now) {
    var today = HOURS[now.day];
    if (today && now.min >= today[0] && now.min < today[1]) { return { state: "open", text: "Open today until " + fmt(today[1]) }; }
    if (today && now.min < today[0]) { return { state: "closed", text: "Closed. Opens today at " + fmt(today[0]) }; }
    var next = (now.day + 1) % 7;
    return { state: "closed", text: "Closed. Opens " + DAY_NAME[next] + " at " + fmt(HOURS[next][0]) };
  }
  try {
    var now = londonNow();
    var s = statusText(now);
    document.querySelectorAll("[data-open-status]").forEach(function (el) { el.textContent = s.text; el.setAttribute("data-state", s.state); });
    document.querySelectorAll("[data-hours] tr[data-day]").forEach(function (row) {
      if (parseInt(row.getAttribute("data-day"), 10) === now.day) { row.classList.add("is-today"); }
    });
  } catch (e) { /* status stays as the server-rendered fallback */ }

  /* Toast */
  var toast = document.querySelector(".toast");
  var toastTimer;
  window.showToast = function (msg) {
    if (!toast) { return; }
    toast.textContent = msg;
    toast.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove("show"); }, 3200);
  };
  document.querySelectorAll("[data-fullsite]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); window.showToast("This is part of the full site."); });
  });

  /* Mobile drawer */
  var drawer = document.getElementById("drawer");
  var burger = document.querySelector("[data-open-drawer]");
  var closeBtn = document.querySelector("[data-close-drawer]");
  function setDrawer(open) {
    if (!drawer) { return; }
    drawer.hidden = !open;
    if (burger) { burger.setAttribute("aria-expanded", String(open)); }
    document.body.style.overflow = open ? "hidden" : "";
    if (open && closeBtn) { closeBtn.focus(); }
    if (!open && burger) { burger.focus(); }
  }
  if (burger) { burger.addEventListener("click", function () { setDrawer(true); }); }
  if (closeBtn) { closeBtn.addEventListener("click", function () { setDrawer(false); }); }
  if (drawer) { drawer.addEventListener("click", function (e) { if (e.target.closest("a")) { setDrawer(false); } }); }

  /* Desktop dropdowns: click, hover and keyboard */
  var items = document.querySelectorAll(".nav-item[data-dropdown]");
  function closeAll(except) {
    items.forEach(function (it) {
      if (it !== except) { it.classList.remove("is-open"); var t = it.querySelector(".nav-trigger"); if (t) { t.setAttribute("aria-expanded", "false"); } }
    });
  }
  items.forEach(function (it) {
    var trig = it.querySelector(".nav-trigger");
    var timer;
    function open() { window.clearTimeout(timer); closeAll(it); it.classList.add("is-open"); trig.setAttribute("aria-expanded", "true"); }
    function close() { it.classList.remove("is-open"); trig.setAttribute("aria-expanded", "false"); }
    trig.addEventListener("click", function () { it.classList.contains("is-open") ? close() : open(); });
    it.addEventListener("mouseenter", function () { if (window.matchMedia("(hover: hover)").matches) { open(); } });
    it.addEventListener("mouseleave", function () { if (window.matchMedia("(hover: hover)").matches) { timer = window.setTimeout(close, 120); } });
    it.addEventListener("focusout", function (e) { if (!it.contains(e.relatedTarget)) { close(); } });
  });
  document.addEventListener("click", function (e) { if (!e.target.closest(".nav-item")) { closeAll(); } });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (drawer && !drawer.hidden) { setDrawer(false); }
      closeAll();
    }
  });

  /* Carousels */
  document.querySelectorAll("[data-carousel-dir]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var wrap = btn.closest("[data-carousel-wrap]");
      var car = wrap && wrap.querySelector("[data-carousel]");
      if (!car) { return; }
      car.scrollBy({ left: parseInt(btn.getAttribute("data-carousel-dir"), 10) * car.clientWidth * 0.8, behavior: "smooth" });
    });
  });

  /* Demo-only form handling (contact page) */
  document.querySelectorAll("form[data-demo-form]").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll(".field").forEach(function (field) {
        var input = field.querySelector("input, select, textarea");
        var bad = input && input.hasAttribute("required") && !input.value.trim();
        field.classList.toggle("is-invalid", !!bad);
        if (input) { input.setAttribute("aria-invalid", bad ? "true" : "false"); }
        if (bad) { ok = false; }
      });
      var consent = form.querySelector("input[type=checkbox][required]");
      if (consent && !consent.checked) { ok = false; }
      if (ok) { window.showToast("Demo form. Nothing was sent."); form.reset(); }
      else { window.showToast("Please complete the highlighted fields."); }
    });
  });
})();
