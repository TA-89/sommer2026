/* =========================================================================
   app.js — UI / Steuerung
   Views: Karte · Stadien · Gruppen · K.o. · Tagesvorschläge (Schweiz-raus)
   ========================================================================= */
(function () {
  "use strict";
  const store = () => window.WC.store;
  const eng = () => window.WC.engine;

  const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const PHASE_LABEL = { group: "Gruppe", r32: "Sechzehntel", r16: "Achtel", qf: "Viertel", sf: "Halb", third: "Platz 3", final: "Finale" };
  const PHASE_WEIGHT = { group: 1, r32: 3, r16: 5, qf: 7, third: 6, sf: 9, final: 12 };
  const PRIO_LABEL = { 1: "SUI", 2: "GER", 3: "NED", 4: "SCO", 5: "ENG" };
  const REISE_MIN_START = "2026-07-05"; // Reise ab Zürich frühestens an diesem Tag

  let map = null, markers = {};
  let state = { view: "map", swissOut: false, selectedStadium: null,
                origin: "ZRH", tripFrom: null, tripTo: null,
                reisePath: ["ZRH"], reiseFrom: null, reiseTo: null };

  const $ = sel => document.querySelector(sel);
  const $$ = sel => Array.from(document.querySelectorAll(sel));
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // ------------------------------------------------------------- Init
  async function init() {
    await store().load();
    const d = store().data;
    state.tripFrom = store().todayStr();
    state.tripTo = d.tournament.end;
    state.reiseFrom = REISE_MIN_START;
    state.reiseTo = d.tournament.end;
    $("#contextLine").textContent = d.tournament.hosts.join(" · ") + " · " +
      d.tournament.start + " – " + d.tournament.end;
    wireTabs();
    wireControls();
    initMap();
    renderAll();
  }

  function wireTabs() {
    $$("#tabs .tab").forEach(t => t.addEventListener("click", () => setView(t.dataset.view)));
  }
  function setView(v) {
    state.view = v;
    $$("#tabs .tab").forEach(t => t.classList.toggle("active", t.dataset.view === v));
    $$(".view").forEach(s => s.hidden = (s.id !== "view-" + v));
    if (v === "map" && map) setTimeout(() => map.invalidateSize(), 50);
  }
  function wireControls() {
    $("#swissOutToggle").addEventListener("change", e => {
      state.swissOut = e.target.checked;
      document.body.classList.toggle("swiss-out", state.swissOut);
      $("#suggestTab").hidden = !state.swissOut;
      if (state.swissOut) setView("suggest");
      else if (state.view === "suggest") setView("map");
      renderAll();
    });
    $("#mergeBtn").addEventListener("click", runMerge);
  }

  // ------------------------------------------------------------- Formatierung
  function meszLabel(m, withYear) {
    const dt = store().meszDate(m);
    const wd = WD[dt.getUTCDay()];
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    const mo = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const hh = String(dt.getUTCHours()).padStart(2, "0");
    const mi = String(dt.getUTCMinutes()).padStart(2, "0");
    return wd + " " + dd + "." + mo + ". · " + hh + ":" + mi + " MESZ";
  }
  function teamClass(code) {
    if (!code) return "";
    const t = store().teamByCode(code);
    let c = "team";
    if (t.confed === "UEFA") c += " eu";
    if (t.priorityRank <= 5) c += " prio";
    if (code === "SUI") c += " nati";
    return c;
  }
  // Chip für ein (evtl. aufgelöstes) Team
  function chip(resOrCode) {
    let res = resOrCode;
    if (typeof resOrCode === "string") res = { code: resOrCode, status: "final", label: resOrCode };
    const dsc = eng().describe(res);
    const span = el("span", teamClass(dsc.code) + (dsc.code ? "" : " placeholder"));
    if (dsc.code) {
      span.innerHTML = esc(dsc.name) + (res.status === "projected" ? " <i class='proj'>provisorisch</i>" : "");
      span.title = dsc.code + " · " + (store().teamByCode(dsc.code).confed);
    } else {
      span.textContent = dsc.text;
    }
    return span;
  }

  // Team-Kurzname mit Europa-Färbung (ohne Flag — Kandidatenlisten sind ohnehin provisorisch)
  function teamNameSpan(code) {
    const t = store().teamByCode(code);
    return "<span class='" + teamClass(code) + "'>" + esc(t.name) + "</span>";
  }
  // Ein K.o.-Platzhalter -> kurzes Label (Team falls bestimmbar, sonst beschreibend).
  function shortSlot(tok) {
    let m;
    if ((m = /^1([A-L])$/.exec(tok))) { const r = eng().rankedTeam(m[1], 1); return r.code ? teamNameSpan(r.code) : "Sieger Gr. " + m[1]; }
    if ((m = /^2([A-L])$/.exec(tok))) { const r = eng().rankedTeam(m[1], 2); return r.code ? teamNameSpan(r.code) : "2. Gr. " + m[1]; }
    if ((m = /^3([A-L]+)$/.exec(tok))) return "3. (" + m[1].split("").join("/") + ")";
    if ((m = /^W(\d+)$/.exec(tok))) return "Sieger " + m[1];
    if ((m = /^L(\d+)$/.exec(tok))) return "Verlierer " + m[1];
    return esc(tok);
  }
  // Rekursive Blatt-Kandidaten eines K.o.-Slots (bis zu echten Teams / Gruppen-Beschreibungen).
  function leafCandidates(tok, ko, depth) {
    let m = /^W(\d+)$/.exec(tok); const isW = !!m;
    if (!m) m = /^L(\d+)$/.exec(tok);
    if (m) {
      const game = +m[1];
      const dec = isW ? ko.winners[game] : ko.losers[game];
      if (dec && dec.code) return [teamNameSpan(dec.code)]; // schon entschieden -> ein Team
      const src = store().data.knockout.find(k => k.game === game);
      if (!src || depth >= 5) return [shortSlot(tok)];
      return leafCandidates(src.home, ko, depth + 1).concat(leafCandidates(src.away, ko, depth + 1));
    }
    return [shortSlot(tok)]; // 1X / 2X / 3set
  }
  function uniq(arr) { const seen = {}; return arr.filter(x => seen[x] ? false : (seen[x] = true)); }
  const CAND_CAP = 8; // max. Kandidaten pro Seite; darüber bleibt der Platzhalter (z.B. Finale)

  // Seiten-Element eines K.o.-Spiels: aufgelöstes Team (chip) ODER Kandidatenliste (X oder Y oder …).
  function koSideEl(m, res, token, ko) {
    if (res.code) return chip(res);
    const cands = uniq(leafCandidates(token, ko, 0));
    if (cands.length && cands.length <= CAND_CAP) {
      const sp = el("span", "cand");
      sp.innerHTML = cands.join(" <i>oder</i> ");
      return sp;
    }
    return chip(res);
  }

  // teilnehmende (aufgelöste) Codes eines Spiels
  function participants(m, resolvedKo) {
    if (m.phase === "group" || m.group) return [m.home, m.away];
    const r = resolvedKo.resolved[m.game];
    return [r.home.code, r.away.code];
  }
  function euFactor(codes) {
    const n = codes.filter(c => c && store().teamByCode(c).confed === "UEFA").length;
    return n >= 2 ? { lvl: "hoch", n } : n === 1 ? { lvl: "mittel", n } : { lvl: "niedrig", n };
  }

  // ------------------------------------------------------------- Render-Hub
  function renderAll() {
    renderStadiums();
    renderGroups();
    renderKnockout();
    renderReise();
    renderSuggest();
    updateMarkers();
    if (state.selectedStadium) renderTimeline(state.selectedStadium);
  }

  // ------------------------------------------------------------- KARTE
  function initMap() {
    if (typeof L === "undefined") { initFallbackMap(); return; }
    map = L.map("map", { scrollWheelZoom: true, worldCopyJump: false })
      .setView([37, -96], 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap"
    }).addTo(map);
    store().data.stadiums.forEach(s => {
      const mk = L.marker([s.lat, s.lng]).addTo(map);
      mk.on("click", () => selectStadium(s.id));
      markers[s.id] = mk;
    });
    updateMarkers();
  }

  function updateMarkers() {
    if (!map) { updateFallbackMarkers(); return; }
    const ko = eng().resolveKnockout();
    store().data.stadiums.forEach(s => {
      const mk = markers[s.id]; if (!mk) return;
      const ms = store().matchesAtStadium(s.id);
      const next = ms.find(m => store().meszDate(m) >= new Date()) || ms[ms.length - 1];
      const ef = next ? euFactor(participants(next, ko)) : { lvl: "niedrig" };
      mk.bindTooltip(s.metro, { permanent: false });
      const lab = next ? whatsOnLabel(s.id, ko) : s.name;
      mk.bindPopup("<b>" + esc(s.name) + "</b><br>" + esc(s.metro) + "<br><small>" + esc(lab) + "</small>");
    });
  }

  // SVG-Fallback (offline / falls Leaflet nicht lädt) — Mercator-Projektion
  function initFallbackMap() {
    $("#map").hidden = true;
    const fb = $("#mapFallback"); fb.hidden = false;
    const W = 720, H = 520;
    const lats = store().data.stadiums.map(s => s.lat), lngs = store().data.stadiums.map(s => s.lng);
    const minLng = Math.min(...lngs) - 4, maxLng = Math.max(...lngs) + 4;
    const minLat = Math.min(...lats) - 3, maxLat = Math.max(...lats) + 3;
    function merc(lat) { return Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)); }
    const y0 = merc(maxLat), y1 = merc(minLat);
    function px(s) {
      const x = (s.lng - minLng) / (maxLng - minLng) * W;
      const y = (merc(s.lat) - y0) / (y1 - y0) * H;
      return [x, y];
    }
    let svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fallback-svg">';
    svg += '<rect x="0" y="0" width="' + W + '" height="' + H + '" class="fb-bg"/>';
    store().data.stadiums.forEach(s => {
      const [x, y] = px(s);
      svg += '<g class="fb-dot" data-id="' + s.id + '" transform="translate(' + x.toFixed(1) + ',' + y.toFixed(1) + ')">';
      svg += '<circle r="7"/><text x="10" y="4">' + esc(s.metro) + '</text></g>';
    });
    svg += "</svg>";
    fb.innerHTML = svg;
    fb.querySelectorAll(".fb-dot").forEach(g => g.addEventListener("click", () => selectStadium(g.dataset.id)));
  }
  function updateFallbackMarkers() {
    const fb = $("#mapFallback"); if (!fb || fb.hidden) return;
    const ko = eng().resolveKnockout();
    fb.querySelectorAll(".fb-dot").forEach(g => {
      const ms = store().matchesAtStadium(g.dataset.id);
      const next = ms.find(m => store().meszDate(m) >= new Date()) || ms[ms.length - 1];
      const ef = next ? euFactor(participants(next, ko)) : { lvl: "niedrig" };
      g.setAttribute("class", "fb-dot ef-" + ef.lvl + (g.dataset.id === state.selectedStadium ? " sel" : ""));
    });
  }

  function whatsOnLabel(stadiumId, ko) {
    const ms = store().matchesAtStadium(stadiumId);
    const next = ms.find(m => store().meszDate(m) >= new Date()) || ms[ms.length - 1];
    if (!next) return store().stadiumById(stadiumId).name;
    const dt = store().meszDate(next);
    const codes = participants(next, ko);
    const ef = euFactor(codes);
    const names = codes.map(c => c ? store().teamByCode(c).name : "offen").join(" vs ");
    const dd = String(dt.getUTCDate()).padStart(2, "0") + "." + String(dt.getUTCMonth() + 1).padStart(2, "0") + ".";
    return dd + " — " + PHASE_LABEL[next.phase] + ": " + names + " · Europa-Faktor " + ef.lvl;
  }

  function selectStadium(id) {
    state.selectedStadium = id;
    if (state.view !== "map") setView("map");
    renderTimeline(id);
    if (map && markers[id]) markers[id].openPopup();
    updateFallbackMarkers();
  }

  // ------------------------------------------------ Belegungs-Timeline (Panel)
  function renderTimeline(stadiumId) {
    const s = store().stadiumById(stadiumId);
    const ko = eng().resolveKnockout();
    const ms = store().matchesAtStadium(stadiumId);
    $("#timelineEmpty").hidden = true;
    const c = $("#timelineContent"); c.hidden = false; c.innerHTML = "";

    const head = el("div", "tl-head");
    head.innerHTML = "<h2>" + esc(s.name) + "</h2>" +
      "<p class='muted'>" + esc(s.metro) + " · " + esc(s.country) +
      " · ✈ " + esc(s.airport) + " · " + ms.length + " Spiele</p>" +
      "<p class='whatson'>" + esc(whatsOnLabel(stadiumId, ko)) + "</p>";
    c.appendChild(head);

    ms.forEach(m => c.appendChild(matchRow(m, ko, true, false)));
  }

  // Eine Spielzeile (kompakt). editable=true erlaubt Ergebnis-Eingabe.
  // showVenue=false unterdrückt den Ort (z.B. in der Stadion-Timeline, wo er redundant ist).
  function matchRow(m, ko, editable, showVenue) {
    if (showVenue === undefined) showVenue = true;
    const row = el("div", "match phase-" + m.phase);
    const codes = participants(m, ko);
    const ef = euFactor(codes);
    if (ef.n >= 1) row.classList.add("has-eu");

    const meta = el("div", "m-meta");
    meta.innerHTML = "<span class='badge b-" + m.phase + "'>" + PHASE_LABEL[m.phase] +
      (m.group ? " " + m.group : "") + "</span>" +
      "<span class='m-when'>" + meszLabel(m) + "</span>";
    row.appendChild(meta);

    if (showVenue) {
      const s = store().stadiumById(m.venue);
      row.appendChild(el("div", "m-venue", "📍 " + esc(s.metro) + " · " + esc(s.name)));
    }

    const teams = el("div", "m-teams");
    let homeRes, awayRes, eff;
    if (m.group) {
      homeRes = { code: m.home, status: "final" }; awayRes = { code: m.away, status: "final" };
      eff = store().effectiveGroupResult(m);
    } else {
      homeRes = ko.resolved[m.game].home; awayRes = ko.resolved[m.game].away;
      eff = store().knockoutResult(m.game);
    }
    teams.appendChild(m.group ? chip(homeRes) : koSideEl(m, homeRes, m.home, ko));
    const mid = el("span", "m-score");
    mid.textContent = eff.result ? (eff.result[0] + " : " + eff.result[1]) : "–";
    teams.appendChild(mid);
    teams.appendChild(m.group ? chip(awayRes) : koSideEl(m, awayRes, m.away, ko));
    row.appendChild(teams);

    const tags = el("div", "m-tags");
    tags.innerHTML = "<span class='ef ef-" + ef.lvl + "'>Europa " + ef.lvl + "</span>" +
      (eff.source ? "<span class='src'>Quelle: " + esc(eff.source) + "</span>" : "<span class='src open'>offen</span>");
    row.appendChild(tags);

    // Ergebnis-Eingabe nur, wo sie Sinn macht: Gruppenspiele immer, K.o. erst wenn beide Teams definitiv feststehen.
    const editorOk = m.group ||
      (homeRes.code && awayRes.code && homeRes.status === "final" && awayRes.status === "final");
    if (editable && editorOk) row.appendChild(resultEditor(m, eff));
    return row;
  }

  function resultEditor(m, eff) {
    const wrap = el("div", "editor");
    const cur = eff.result || ["", ""];
    const seedLocked = m.group && Array.isArray(m.result); // Seed-Resultat: nicht editierbar
    if (seedLocked) { wrap.innerHTML = "<span class='muted small'>Seed-Resultat (verifiziert)</span>"; return wrap; }
    const h = el("input", "score-in"); h.type = "number"; h.min = 0; h.value = cur[0]; h.placeholder = "H";
    const a = el("input", "score-in"); a.type = "number"; a.min = 0; a.value = cur[1]; a.placeholder = "A";
    const save = el("button", "mini", "speichern");
    const clr = el("button", "mini ghost", "×");
    save.addEventListener("click", () => {
      if (h.value === "" || a.value === "") return;
      const res = [parseInt(h.value, 10), parseInt(a.value, 10)];
      if (m.group) store().setGroupResult(m, res, "manuell"); else store().setKnockoutResult(m.game, res, "manuell");
      renderAll(); toast("Ergebnis gespeichert");
    });
    clr.addEventListener("click", () => {
      if (m.group) store().setGroupResult(m, null); else store().setKnockoutResult(m.game, null);
      renderAll(); toast("Ergebnis entfernt");
    });
    wrap.append(h, el("span", "x", ":"), a, save, clr);
    return wrap;
  }

  // ------------------------------------------------------------- STADIEN-Liste
  function renderStadiums() {
    const v = $("#view-stadiums"); v.innerHTML = "";
    const ko = eng().resolveKnockout();
    const grid = el("div", "stadium-grid");
    store().data.stadiums.forEach(s => {
      const card = el("div", "stadium-card");
      const ms = store().matchesAtStadium(s.id);
      const euCount = ms.filter(m => euFactor(participants(m, ko)).n >= 1).length;
      card.innerHTML = "<h3>" + esc(s.name) + "</h3>" +
        "<p class='muted'>" + esc(s.metro) + " · " + esc(s.country) + " · ✈ " + esc(s.airport) + "</p>" +
        "<p class='small'>" + ms.length + " Spiele · " + euCount + " mit Europa-Bezug · Kapazität " + (s.capacity ? s.capacity.toLocaleString("de-CH") : "?") + "</p>" +
        "<p class='whatson small'>" + esc(whatsOnLabel(s.id, ko)) + "</p>";
      card.addEventListener("click", () => selectStadium(s.id));
      grid.appendChild(card);
    });
    v.appendChild(grid);
  }

  // ------------------------------------------------------------- GRUPPEN
  function renderGroups() {
    const v = $("#view-groups"); v.innerHTML = "";
    const wrap = el("div", "groups-grid");
    store().GROUP_IDS.forEach(g => {
      const t = eng().groupTable(g);
      const box = el("div", "group-box");
      const status = t.complete ? "abgeschlossen" : (t.anyPlayed ? "läuft (provisorisch)" : "offen");
      box.appendChild(el("div", "group-head", "<h3>Gruppe " + g + "</h3><span class='gstatus'>" + status + "</span>"));
      const tbl = el("table", "table");
      tbl.innerHTML = "<thead><tr><th>#</th><th>Team</th><th>Sp</th><th>Pkt</th><th>TD</th><th>Tore</th></tr></thead>";
      const tb = el("tbody");
      t.rows.forEach((r, i) => {
        const tr = el("tr", i < 2 ? "qualif" : (i === 2 ? "third" : ""));
        const team = store().teamByCode(r.code);
        tr.innerHTML = "<td>" + (i + 1) + "</td>" +
          "<td><span class='" + teamClass(r.code) + "'>" + esc(team.name) + "</span></td>" +
          "<td>" + r.played + "</td><td class='b'>" + r.pts + "</td>" +
          "<td>" + (r.gd > 0 ? "+" : "") + r.gd + "</td><td>" + r.gf + ":" + r.ga + "</td>";
        tb.appendChild(tr);
      });
      tbl.appendChild(tb); box.appendChild(tbl);
      wrap.appendChild(box);
    });
    v.appendChild(wrap);
    // Drittplatzierten-Ranking
    const tpa = eng().thirdPlaceAssignment();
    const third = el("div", "third-box");
    third.appendChild(el("h3", null, "Gruppendritte — Rangliste (beste 8 erreichen Sechzehntel)"));
    if (!tpa.ranking.some(r => groupAnyPlayed(r.group))) {
      third.appendChild(el("p", "muted", "Noch keine belastbaren Daten — wird mit Resultaten aufgelöst."));
    } else {
      const ol = el("ol", "third-list");
      tpa.ranking.forEach((r, i) => {
        const team = store().teamByCode(r.code);
        const li = el("li", i < 8 ? "in" : "out");
        li.innerHTML = "<span class='" + teamClass(r.code) + "'>" + esc(team.name) + "</span>" +
          " <span class='muted'>(Gr. " + r.group + " · " + r.pts + " Pkt · TD " + (r.gd > 0 ? "+" : "") + r.gd + ")</span>" +
          (i < 8 ? " <span class='ok'>✓</span>" : " <span class='no'>✗</span>");
        ol.appendChild(li);
      });
      third.appendChild(ol);
      third.appendChild(el("p", "muted small", "Status: " + tpa.status + " — Zuordnung zu den Sieger-Spielen erfolgt über die offizielle FIFA-Matrix (495 Kombinationen); bei Mehrdeutigkeit/offen wird 'offen' gezeigt."));
    }
    v.appendChild(third);
  }
  function groupAnyPlayed(g) { return eng().groupTable(g).anyPlayed; }

  // ------------------------------------------------------------- K.O.-BRACKET
  function renderKnockout() {
    const v = $("#view-knockout"); v.innerHTML = "";
    const ko = eng().resolveKnockout();
    const phases = [["r32", "Sechzehntelfinale"], ["r16", "Achtelfinale"], ["qf", "Viertelfinale"], ["sf", "Halbfinale"], ["third", "Spiel um Platz 3"], ["final", "Finale"]];
    const cols = el("div", "ko-cols");
    phases.forEach(([id, label]) => {
      const col = el("div", "ko-col");
      col.appendChild(el("h3", null, label));
      store().data.knockout.filter(k => k.phase === id).forEach(k => {
        col.appendChild(matchRow(k, ko, true));
      });
      cols.appendChild(col);
    });
    v.appendChild(cols);
  }

  // ------------------------------------------------ TAGESVORSCHLÄGE (Schweiz-raus)
  function airportCoords(iata) {
    const ta = store().data.tripAnchors;
    if (ta.start.airport === iata) return [ta.start.lat, ta.start.lng];
    if (ta.costaRica.airport === iata) return [ta.costaRica.lat, ta.costaRica.lng];
    const s = store().data.stadiums.find(x => x.airport === iata);
    return s ? [s.lat, s.lng] : null;
  }
  function haversine(a, b) {
    if (!a || !b) return 99999;
    const R = 6371, toR = x => x * Math.PI / 180;
    const dLat = toR(b[0] - a[0]), dLng = toR(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(a[0])) * Math.cos(toR(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function teamScore(codes) {
    const vals = codes.map(c => c ? (10 - store().teamByCode(c).priorityRank) : 1.5);
    vals.sort((a, b) => b - a);
    return vals[0] + 0.5 * (vals[1] || 0);
  }
  function scoreMatch(m, ko, originCoords, maxDist) {
    const codes = participants(m, ko);
    const ts = teamScore(codes);                          // 0..14
    const ps = PHASE_WEIGHT[m.phase];                     // 1..12
    const dist = haversine(originCoords, [store().stadiumById(m.venue).lat, store().stadiumById(m.venue).lng]);
    const reach = Math.max(0, 1 - dist / maxDist);        // 0..1
    const total = ts * 1.0 + ps * 0.8 + reach * 6.0;
    return { total, ts, ps, reach, dist, codes };
  }

  function renderSuggest() {
    const v = $("#view-suggest"); v.innerHTML = "";
    const d = store().data;
    const ko = eng().resolveKnockout();

    const ctrl = el("div", "suggest-ctrl");
    ctrl.innerHTML =
      "<label>Reisefenster <input type='date' id='tripFrom' value='" + state.tripFrom + "'> – " +
      "<input type='date' id='tripTo' value='" + state.tripTo + "'></label>" +
      "<label>Aktueller Standort " + originSelect("originSel", state.origin) + "</label>" +
      "<p class='muted small'>Vorschlag pro Tag = attraktivstes erreichbares Spiel · Gewichtung: Team-Priorität, Turnierphase, Direktflug-Nähe (Distanz-Proxy ab Standort).</p>";
    v.appendChild(ctrl);
    $("#tripFrom").addEventListener("change", e => { state.tripFrom = e.target.value; renderSuggest(); });
    $("#tripTo").addEventListener("change", e => { state.tripTo = e.target.value; renderSuggest(); });
    $("#originSel").addEventListener("change", e => { state.origin = e.target.value; renderSuggest(); });

    const originCoords = airportCoords(state.origin);
    const maxDist = 7000;
    // Spiele nach MESZ-Tag gruppieren, im Reisefenster
    const byDay = {};
    store().allMatches().forEach(m => {
      const dt = store().meszDate(m);
      const day = dt.toISOString().slice(0, 10);
      if (day < state.tripFrom || day > state.tripTo) return;
      (byDay[day] = byDay[day] || []).push(m);
    });
    const days = Object.keys(byDay).sort();
    if (!days.length) { v.appendChild(el("p", "muted", "Keine Spiele im gewählten Reisefenster.")); return; }

    const list = el("div", "suggest-list");
    days.forEach(day => {
      const scored = byDay[day].map(m => ({ m, sc: scoreMatch(m, ko, originCoords, maxDist) }))
        .sort((a, b) => b.sc.total - a.sc.total);
      const best = scored[0];
      const s = store().stadiumById(best.m.venue);
      const codes = best.sc.codes;
      const names = codes.map(c => c ? store().teamByCode(c).name : "offen").join(" vs ");
      const ef = euFactor(codes);
      const dt = store().meszDate(best.m);
      const dd = WD[dt.getUTCDay()] + " " + String(dt.getUTCDate()).padStart(2, "0") + "." + String(dt.getUTCMonth() + 1).padStart(2, "0") + ".";
      const deeplink = d.flightFacts.deeplinkTemplate
        .replace("{originIATA}", state.origin).replace("{destIATA}", s.airport).replace("{date}", day);

      const card = el("div", "suggest-card ef-" + ef.lvl);
      card.innerHTML =
        "<div class='sc-day'>" + dd + "</div>" +
        "<div class='sc-main'>" +
          "<div class='sc-city'>" + esc(s.metro) + " · " + esc(s.name) + "</div>" +
          "<div class='sc-match'>" + esc(names) + "</div>" +
          "<div class='sc-tags'>" +
            "<span class='badge b-" + best.m.phase + "'>" + PHASE_LABEL[best.m.phase] + (best.m.group ? " " + best.m.group : "") + "</span>" +
            "<span class='m-when'>" + meszLabel(best.m) + "</span>" +
            "<span class='ef ef-" + ef.lvl + "'>Europa " + ef.lvl + "</span>" +
            "<span class='muted small'>✈ " + state.origin + "→" + s.airport + " ~" + Math.round(best.sc.dist) + " km</span>" +
          "</div>" +
        "</div>" +
        "<div class='sc-actions'>" +
          "<a class='btn small' href='" + deeplink + "' target='_blank' rel='noopener'>Flug suchen</a>" +
          "<button class='btn small ghost' data-st='" + s.id + "'>Stadion</button>" +
        "</div>";
      card.querySelector("[data-st]").addEventListener("click", () => selectStadium(s.id));
      list.appendChild(card);
    });
    v.appendChild(list);
  }

  function originSelect(id, selected) {
    const opts = originEntries().map(([iata, label]) =>
      "<option value='" + iata + "'" + (iata === selected ? " selected" : "") + ">" + iata + " · " + esc(label) + "</option>");
    return "<select id='" + id + "'>" + opts.join("") + "</select>";
  }
  function originEntries() {
    const ta = store().data.tripAnchors;
    const entries = [[ta.start.airport, ta.start.city]];
    store().data.stadiums.slice().sort((a, b) => a.metro.localeCompare(b.metro)).forEach(s => entries.push([s.airport, s.metro]));
    entries.push([ta.costaRica.airport, ta.costaRica.city]);
    return entries;
  }
  function originLabel(iata) {
    const e = originEntries().find(x => x[0] === iata);
    return e ? e[1] : iata;
  }

  // ------------------------------------------------ REISE (Explorer / Hub-Hopping)
  // Start in Zürich -> erste Stadt wählen. Danach zeigt jede Ausgangsstadt die
  // möglichen Weiterreisen. Der Reisepfad wird als Breadcrumb Schritt für Schritt aufgebaut.
  function renderReise() {
    const v = $("#view-reise"); v.innerHTML = "";
    const d = store().data; const ko = eng().resolveKnockout();
    const curAir = state.reisePath[state.reisePath.length - 1];
    const curCoords = airportCoords(curAir);
    const curLabel = originLabel(curAir);

    // Harter Floor: Reise ab Zürich frühestens am REISE_MIN_START (05.07.).
    const fromFloor = REISE_MIN_START;
    if (!state.reiseFrom || state.reiseFrom < fromFloor) state.reiseFrom = fromFloor;
    if (state.reiseTo < state.reiseFrom) state.reiseTo = state.reiseFrom;

    // Steuerleiste: Zeitfenster + Reset
    const ctrl = el("div", "suggest-ctrl");
    ctrl.innerHTML =
      "<label>Zeitfenster <input type='date' id='reiseFrom' min='" + fromFloor + "' value='" + state.reiseFrom + "'> – " +
      "<input type='date' id='reiseTo' min='" + fromFloor + "' value='" + state.reiseTo + "'></label>" +
      "<p class='muted small'>Start in Zürich frühestens am <b>05.07.2026</b>. Erste Stadt wählen, danach zeigt jede Ausgangsstadt die möglichen Weiterreisen " +
      "(Distanz ab aktueller Stadt + Spiele dort im Zeitfenster). Mit „Weiter ab …“ baust du die Reise auf.</p>";
    const reset = el("button", "btn small ghost", "↺ Neu ab Zürich");
    reset.addEventListener("click", () => { state.reisePath = ["ZRH"]; renderReise(); });
    ctrl.appendChild(reset);
    v.appendChild(ctrl);
    $("#reiseFrom").addEventListener("change", e => { state.reiseFrom = e.target.value < fromFloor ? fromFloor : e.target.value; renderReise(); });
    $("#reiseTo").addEventListener("change", e => { state.reiseTo = e.target.value < fromFloor ? fromFloor : e.target.value; renderReise(); });

    // Breadcrumb (Reisepfad) — Klick springt zu einem früheren Punkt zurück
    const bc = el("div", "reise-bc");
    state.reisePath.forEach((air, i) => {
      const last = i === state.reisePath.length - 1;
      const node = el("a", "bc-node" + (last ? " cur" : ""), esc(originLabel(air)) + " (" + air + ")");
      node.href = "#";
      node.addEventListener("click", ev => { ev.preventDefault(); state.reisePath = state.reisePath.slice(0, i + 1); renderReise(); });
      bc.appendChild(node);
      if (!last) bc.appendChild(el("span", "bc-sep", "→"));
    });
    v.appendChild(bc);
    v.appendChild(el("h3", "reise-h", curAir === "ZRH" ? "Erste Stadt ab Zürich wählen" : ("Mögliche Weiterreisen ab " + esc(curLabel))));

    // Ziel-Städte (Stadien mit Spielen im Fenster), nach Attraktivität sortiert
    const maxDist = 9000;
    const inWindow = m => {
      const day = store().meszDate(m).toISOString().slice(0, 10);
      return day >= state.reiseFrom && day <= state.reiseTo;
    };
    const dests = store().data.stadiums
      .filter(s => s.airport !== curAir)
      .map(s => {
        const ms = store().matchesAtStadium(s.id).filter(inWindow);
        let best = 0;
        ms.forEach(m => { const sc = scoreMatch(m, ko, curCoords, maxDist).total; if (sc > best) best = sc; });
        return { s, ms, best, dist: Math.round(haversine(curCoords, [s.lat, s.lng])) };
      })
      .filter(x => x.ms.length > 0)
      .sort((a, b) => b.best - a.best);

    if (!dests.length) v.appendChild(el("p", "muted", "Keine erreichbaren Spiele im Zeitfenster."));

    const grid = el("div", "reise-dest-grid");
    dests.forEach(x => {
      const firstDay = store().meszDate(x.ms[0]).toISOString().slice(0, 10);
      const deeplink = d.flightFacts.deeplinkTemplate
        .replace("{originIATA}", curAir).replace("{destIATA}", x.s.airport).replace("{date}", firstDay);
      const card = el("div", "dest-card");
      card.innerHTML =
        "<div class='dest-head'><h4>" + esc(x.s.metro) + "</h4><span class='dest-dist'>✈ ~" + x.dist + " km</span></div>" +
        "<p class='muted small'>" + esc(x.s.name) + " · " + esc(x.s.country) + " · " + x.s.airport + " · " + x.ms.length + " Spiele</p>";
      const ml = el("div", "dest-matches");
      x.ms.slice(0, 4).forEach(m => ml.appendChild(miniMatchLine(m, ko)));
      if (x.ms.length > 4) ml.appendChild(el("p", "muted small", "+ " + (x.ms.length - 4) + " weitere Spiele"));
      card.appendChild(ml);
      const act = el("div", "dest-actions");
      act.innerHTML = "<a class='btn small' target='_blank' rel='noopener' href='" + deeplink + "'>Flug " + curAir + "→" + x.s.airport + "</a>";
      const go = el("button", "btn small", "Weiter ab " + esc(x.s.metro) + " →");
      go.addEventListener("click", () => { state.reisePath.push(x.s.airport); renderReise(); window.scrollTo(0, 0); });
      act.appendChild(go);
      card.appendChild(act);
      grid.appendChild(card);
    });
    v.appendChild(grid);

    // Abschluss/Rückreise nach Costa Rica (immer verfügbar, sofern nicht bereits dort)
    const cr = d.tripAnchors.costaRica;
    if (curAir !== cr.airport) {
      const dist = Math.round(haversine(curCoords, [cr.lat, cr.lng]));
      const deeplink = d.flightFacts.deeplinkTemplate
        .replace("{originIATA}", curAir).replace("{destIATA}", cr.airport).replace("{date}", state.reiseTo);
      const ret = el("div", "reise-leg ret");
      ret.innerHTML = "<span class='leg-ic'>🌴</span> <b>Abschluss / Rückreise:</b> " + esc(curLabel) + " (" + curAir + ") → " +
        esc(cr.city) + " (" + cr.airport + ") · ~" + dist + " km " +
        "<a class='btn small' target='_blank' rel='noopener' href='" + deeplink + "'>Flug suchen</a>";
      v.appendChild(ret);
    }
  }

  function miniMatchLine(m, ko) {
    const codes = participants(m, ko); const ef = euFactor(codes);
    const names = codes.map(c => c ? store().teamByCode(c).name : "offen").join(" – ");
    const line = el("div", "mini-match" + (ef.n >= 1 ? " has-eu" : ""));
    line.innerHTML =
      "<span class='badge b-" + m.phase + "'>" + PHASE_LABEL[m.phase] + (m.group ? " " + m.group : "") + "</span> " +
      "<span class='mm-when'>" + meszLabel(m).replace(" MESZ", "") + "</span> " +
      "<span class='mm-teams'>" + esc(names) + "</span> " +
      "<span class='ef ef-" + ef.lvl + "'>" + ef.lvl + "</span>";
    return line;
  }

  // ------------------------------------------------------------- Merge / Toast
  async function runMerge() {
    const btn = $("#mergeBtn");
    btn.disabled = true; const old = btn.textContent;
    try {
      const sum = await store().mergeFromWikipedia(msg => { btn.textContent = "↻ " + msg; });
      renderAll();
      if (sum.errors.length && sum.updated === 0) {
        toast("Merge fehlgeschlagen (Netz/CORS?). " + sum.errors.length + " Fehler.", true);
      } else {
        toast(sum.updated + " Resultate aktualisiert (Wikipedia)." + (sum.errors.length ? " " + sum.errors.length + " Gruppen übersprungen." : ""));
      }
    } catch (e) {
      toast("Merge-Fehler: " + e.message, true);
    } finally {
      btn.disabled = false; btn.textContent = old;
    }
  }

  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    t.classList.toggle("err", !!isErr);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  // Start
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
