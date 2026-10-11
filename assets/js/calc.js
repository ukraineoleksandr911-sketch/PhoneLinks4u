(function () {
  "use strict";
  var D = window.SITE_CALC;
  if (!D) { return; }

  var state = { brand: null, model: null, tier: null, fault: null };
  function shown(m) { return m === "My model is not listed" ? "Your phone" : m; }
  function brandById(id) { return D.brands.filter(function (b) { return b.id === id; })[0]; }
  function faultById(id) { return D.faults.filter(function (f) { return f.id === id; })[0]; }

  function fillModels(select, brandId, placeholder) {
    select.innerHTML = "";
    var o = document.createElement("option");
    o.value = ""; o.textContent = placeholder; select.appendChild(o);
    var b = brandById(brandId);
    if (!b) { select.disabled = true; return; }
    b.models.forEach(function (m, i) {
      var op = document.createElement("option");
      op.value = String(i); op.textContent = m[0]; select.appendChild(op);
    });
    select.disabled = false;
  }
  function fillBrands(select) {
    select.innerHTML = '<option value="">Choose a brand</option>';
    D.brands.forEach(function (b) {
      var op = document.createElement("option");
      op.value = b.id; op.textContent = b.name; select.appendChild(op);
    });
  }

  /* ---------- Repair calculator ---------- */
  var calc = document.getElementById("calculator");
  if (calc) {
    var chipsBox = calc.querySelector("[data-brand-chips]");
    var modelSel = calc.querySelector("[data-model]");
    var faultBtns = calc.querySelectorAll("[data-fault]");
    var faultGroup = calc.querySelector("[data-fault-group]");
    var modelGroup = calc.querySelector("[data-model-group]");
    var result = calc.querySelector("[data-result]");
    var book = calc.querySelector("[data-book]");
    var steps = calc.querySelectorAll(".calc-steps li");
    var waLinks = calc.querySelectorAll("[data-wa]");
    var resetBtn = calc.querySelector("[data-reset]");

    D.brands.forEach(function (b) {
      var c = document.createElement("button");
      c.type = "button"; c.className = "chip"; c.textContent = b.name;
      c.setAttribute("data-brand", b.id); c.setAttribute("aria-pressed", "false");
      chipsBox.appendChild(c);
    });

    function setSteps(n) {
      steps.forEach(function (li, i) {
        li.classList.toggle("is-active", i === n);
        li.classList.toggle("is-done", i < n);
      });
    }
    function money(n) { return D.currency + n; }
    function waText() {
      var f = faultById(state.fault);
      var txt = "Hi, I would like a quote";
      if (state.model && shown(state.model) !== "Your phone") { txt += " for my " + state.model; }
      if (f) { txt += ": " + f.name.toLowerCase(); }
      return txt + ".";
    }
    function update() {
      var hasModel = state.model !== null;
      modelGroup.classList.toggle("group-locked", !state.brand);
      faultGroup.classList.toggle("group-locked", !hasModel);
      faultBtns.forEach(function (b) { b.disabled = !hasModel; b.setAttribute("aria-pressed", String(b.getAttribute("data-fault") === state.fault)); });
      chipsBox.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", String(c.getAttribute("data-brand") === state.brand)); });

      var ready = hasModel && state.fault;
      result.hidden = !ready;
      book.hidden = !ready;
      setSteps(ready ? 2 : (hasModel ? 1 : 0));
      if (ready) {
        var f = faultById(state.fault);
        var priceEl = result.querySelector("[data-price]");
        var whenEl = result.querySelector("[data-when]");
        var titleEl = result.querySelector("[data-title]");
        titleEl.textContent = shown(state.model) + ": " + f.name.toLowerCase();
        if (f.prices && state.tier) {
          priceEl.textContent = "from " + money(f.prices[state.tier - 1]);
          whenEl.textContent = "Usual time: " + f.time;
        } else {
          priceEl.textContent = "Price after a quick look";
          whenEl.textContent = "Call or send a request and we will tell you the price.";
        }
        var link = "https://wa.me/" + D.wa + "?text=" + encodeURIComponent(waText());
        waLinks.forEach(function (a) { a.setAttribute("href", link); });
        book.querySelector("[data-summary]").value = shown(state.model) + ", " + f.name;
      }
    }
    function pick(brandId, modelIdx, faultId) {
      state.brand = brandId || null;
      var b = brandById(state.brand);
      fillModels(modelSel, state.brand, "Choose a model");
      state.model = null; state.tier = null;
      if (b && modelIdx !== null && modelIdx !== undefined && b.models[modelIdx]) {
        modelSel.value = String(modelIdx);
        state.model = b.models[modelIdx][0]; state.tier = b.models[modelIdx][1];
      }
      if (faultId !== undefined) { state.fault = faultId; }
      update();
    }
    chipsBox.addEventListener("click", function (e) {
      var c = e.target.closest("[data-brand]");
      if (c) { pick(c.getAttribute("data-brand"), null); }
    });
    modelSel.addEventListener("change", function () {
      var b = brandById(state.brand);
      if (modelSel.value === "") { state.model = null; state.tier = null; }
      else { var m = b.models[parseInt(modelSel.value, 10)]; state.model = m[0]; state.tier = m[1]; }
      update();
    });
    faultBtns.forEach(function (btn) {
      btn.addEventListener("click", function () { state.fault = btn.getAttribute("data-fault"); update(); });
    });
    if (resetBtn) { resetBtn.addEventListener("click", function () { state.fault = null; pick(null, null); window.scrollTo({ top: calc.offsetTop - 80, behavior: "smooth" }); }); }

    /* Booking form */
    var form = calc.querySelector("[data-book-form]");
    var success = calc.querySelector("[data-success]");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var phone = form.querySelector("[name=phone]");
      var field = phone.closest(".field");
      var ok = /^[+()\d][\d\s()-]{6,}$/.test(phone.value.trim());
      field.classList.toggle("is-invalid", !ok);
      phone.setAttribute("aria-invalid", ok ? "false" : "true");
      var consent = form.querySelector("[name=consent]");
      var cf = consent.closest(".check");
      if (!consent.checked) { ok = false; cf.style.color = "var(--c-error)"; } else { cf.style.color = ""; }
      if (!ok) { window.showToast("Please check the highlighted fields."); phone.focus(); return; }
      var btn = form.querySelector("button[type=submit]");
      btn.classList.add("is-loading");
      window.setTimeout(function () {
        btn.classList.remove("is-loading");
        success.classList.add("is-visible");
        success.focus();
        form.reset();
        form.querySelector("[data-summary]").value = shown(state.model) + ", " + faultById(state.fault).name;
      }, 700);
    });

    /* Expose for hero mini-form and repair cards */
    window.SiteCalc = {
      start: function (brandId, modelIdx, faultId) {
        pick(brandId, modelIdx, faultId === undefined ? null : faultId);
        calc.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };
    pick(null, null);

    document.querySelectorAll("[data-pick-fault]").forEach(function (a) {
      a.addEventListener("click", function (e) {
        e.preventDefault();
        var f = a.getAttribute("data-pick-fault");
        state.fault = f;
        calc.scrollIntoView({ behavior: "smooth", block: "start" });
        update();
      });
    });
  }

  /* ---------- Hero quick form ---------- */
  var quick = document.querySelector("[data-quick]");
  if (quick) {
    var qb = quick.querySelector("[data-q-brand]");
    var qm = quick.querySelector("[data-q-model]");
    fillBrands(qb);
    fillModels(qm, null, "Choose a model");
    qb.addEventListener("change", function () { fillModels(qm, qb.value, "Choose a model"); });
    quick.addEventListener("submit", function (e) {
      e.preventDefault();
      var ok = true;
      [qb, qm].forEach(function (el) {
        var bad = !el.value;
        el.closest(".field").classList.toggle("is-invalid", bad);
        if (bad) { ok = false; }
      });
      if (!ok) { return; }
      if (window.SiteCalc) { window.SiteCalc.start(qb.value, parseInt(qm.value, 10)); }
    });
  }

  /* ---------- Accessories filter ---------- */
  var acc = document.querySelector("[data-acc]");
  if (acc) {
    var ab = acc.querySelector("[data-a-brand]");
    var am = acc.querySelector("[data-a-model]");
    var title = acc.querySelector("[data-acc-title]");
    var cards = acc.querySelectorAll("[data-tpl]");
    fillBrands(ab);
    fillModels(am, null, "Choose a model");
    ab.addEventListener("change", function () { fillModels(am, ab.value, "Choose a model"); apply(); });
    am.addEventListener("change", apply);
    function apply() {
      var b = brandById(ab.value);
      var name = (b && am.value !== "") ? b.models[parseInt(am.value, 10)][0] : "";
      if (name === "My model is not listed") { name = ""; }
      cards.forEach(function (c) {
        var t = c.querySelector("[data-name]");
        var tag = c.querySelector("[data-fit]");
        if (c.getAttribute("data-specific") === "1" && name) { t.textContent = c.getAttribute("data-tpl").replace("{model}", name); }
        else { t.textContent = c.getAttribute("data-generic"); }
        if (tag) { tag.hidden = !(name && c.getAttribute("data-specific") === "1"); }
      });
      title.textContent = name ? "Accessories for " + name : "Popular accessories";
    }
    apply();
  }
})();
