/* =========================================================================
   data.js — Datenschicht
   - lädt fixtures.json (Seed = verlässliche Basis)
   - verwaltet lokale Overrides (Resultate) in localStorage, mit Quelle+Zeit
   - Wikipedia-Merge (Action-API, CORS via origin=*)
   Konvention: result = [heim, gast] | null. venue immer aus Seed behalten.
   ========================================================================= */
(function () {
  "use strict";

  const LS_KEY = "wc2026.overrides.v1";
  const GROUP_IDS = ["A","B","C","D","E","F","G","H","I","J","K","L"];

  // ---- englische Team-Namen (Wikipedia) -> FIFA-Code (Merge-Mapping-Tabelle) ----
  const NAME_TO_CODE = {
    "mexico": "MEX", "south africa": "RSA", "south korea": "KOR", "korea republic": "KOR",
    "czech republic": "CZE", "czechia": "CZE",
    "canada": "CAN", "bosnia and herzegovina": "BIH", "qatar": "QAT", "switzerland": "SUI",
    "brazil": "BRA", "morocco": "MAR", "haiti": "HAI", "scotland": "SCO",
    "united states": "USA", "usa": "USA", "paraguay": "PAR", "australia": "AUS",
    "turkey": "TUR", "türkiye": "TUR", "turkiye": "TUR",
    "germany": "GER", "curaçao": "CUW", "curacao": "CUW", "ivory coast": "CIV",
    "côte d'ivoire": "CIV", "cote d'ivoire": "CIV", "ecuador": "ECU",
    "netherlands": "NED", "japan": "JPN", "sweden": "SWE", "tunisia": "TUN",
    "belgium": "BEL", "egypt": "EGY", "iran": "IRN", "ir iran": "IRN", "new zealand": "NZL",
    "spain": "ESP", "cape verde": "CPV", "cabo verde": "CPV", "saudi arabia": "KSA", "uruguay": "URU",
    "france": "FRA", "senegal": "SEN", "iraq": "IRQ", "norway": "NOR",
    "argentina": "ARG", "algeria": "ALG", "austria": "AUT", "jordan": "JOR",
    "portugal": "POR", "dr congo": "COD", "democratic republic of the congo": "COD",
    "uzbekistan": "UZB", "colombia": "COL",
    "england": "ENG", "croatia": "CRO", "ghana": "GHA", "panama": "PAN"
  };

  let DATA = null;                 // fixtures (Seed, evtl. mit angewandten Overrides für Anzeige)
  let OV = { groups: {}, knockout: {}, sources: {} }; // Overrides

  function loadOverrides() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) OV = Object.assign({ groups: {}, knockout: {}, sources: {} }, JSON.parse(raw));
    } catch (e) { /* localStorage evtl. blockiert (file://) */ }
  }
  function saveOverrides() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(OV)); } catch (e) {}
  }

  function matchKey(m) { return m.date + "_" + m.home + "_" + m.away; }

  // ------------------------------------------------------------------ laden
  async function load() {
    loadOverrides();
    if (window.FIXTURES) {
      DATA = window.FIXTURES;
    } else {
      // Fallback: über fetch (funktioniert unter lokalem Server / Preview)
      const res = await fetch("data/fixtures.json");
      DATA = await res.json();
    }
    return DATA;
  }

  // ------------------------------------------------------- effektive Resultate
  // Seed-Resultat hat Vorrang, sofern vorhanden; sonst Override.
  function effectiveGroupResult(m) {
    if (Array.isArray(m.result)) return { result: m.result, source: m.src || "seed" };
    const ov = OV.groups[matchKey(m)];
    if (ov && Array.isArray(ov.result)) return { result: ov.result, source: ov.source || "override" };
    return { result: null, source: null };
  }
  function knockoutResult(game) {
    // Seed-Resultat hat Vorrang (verifiziert), sonst Override (Merge/manuell).
    const k = DATA && DATA.knockout ? DATA.knockout.find(x => x.game === game) : null;
    if (k && Array.isArray(k.result)) {
      return { result: k.result, pens: k.pens || null, aet: !!k.aet, source: k.src || "seed" };
    }
    const ov = OV.knockout[String(game)];
    return ov && Array.isArray(ov.result)
      ? { result: ov.result, pens: ov.pens || null, aet: !!ov.aet, source: ov.source || "override" }
      : { result: null, pens: null, aet: false, source: null };
  }

  function setGroupResult(m, result, source) {
    const k = matchKey(m);
    if (result == null) { delete OV.groups[k]; }
    else { OV.groups[k] = { result: result, source: source || "manuell", ts: nowIso() }; }
    saveOverrides();
  }
  function setKnockoutResult(game, result, source, pens) {
    const g = String(game);
    if (result == null) { delete OV.knockout[g]; }
    else { OV.knockout[g] = { result: result, pens: pens || null, source: source || "manuell", ts: nowIso() }; }
    saveOverrides();
  }
  function clearOverrides() { OV = { groups: {}, knockout: {}, sources: {} }; saveOverrides(); }

  function nowIso() { try { return new Date().toISOString(); } catch (e) { return ""; } }

  // ----------------------------------------------------------- Zugriffshelfer
  const stadiumIndex = {};
  function stadiumById(id) {
    if (!Object.keys(stadiumIndex).length) DATA.stadiums.forEach(s => stadiumIndex[s.id] = s);
    return stadiumIndex[id];
  }
  const teamIndex = {};
  function teamByCode(code) {
    if (!Object.keys(teamIndex).length) DATA.teams.forEach(t => teamIndex[t.code] = t);
    return teamIndex[code] || { code: code, name: code, confed: "?", priorityRank: 9 };
  }
  function allMatches() {
    const out = [];
    GROUP_IDS.forEach(g => DATA.groups[g].matches.forEach(m => out.push(Object.assign({ phase: "group", group: g }, m))));
    DATA.knockout.forEach(k => out.push(Object.assign({ group: null }, k)));
    return out;
  }
  function matchesAtStadium(id) {
    return allMatches().filter(m => m.venue === id)
      .sort((a, b) => meszDate(a) - meszDate(b));
  }

  // MESZ-Zeitpunkt eines Spiels (für Sortierung/Anzeige/Tag-Gruppierung).
  // timeMESZ "HH:MM" (+ optional "+1"). Die MESZ-Wandzeit wird bewusst als
  // UTC-Felder abgelegt, damit getUTC*/toISOString direkt die MESZ-Wandzeit
  // und den MESZ-Kalendertag liefern.
  function meszDate(m) {
    const t = m.timeMESZ || "00:00";
    const plus = /\+1$/.test(t);
    const hm = t.replace("+1", "").split(":");
    const p = m.date.split("-").map(Number);
    const d = new Date(Date.UTC(p[0], p[1] - 1, p[2], parseInt(hm[0], 10), parseInt(hm[1], 10), 0));
    if (plus) d.setUTCDate(d.getUTCDate() + 1);
    return d;
  }

  // =======================================================================
  // WIKIPEDIA-MERGE
  // Liest die Gruppen-Artikel (Wikitext), parst {{Football box}} Templates,
  // übernimmt Resultate nur wenn: vorhanden UND date<=heute UND plausibel
  // UND Seed/Override noch kein Resultat hat. venue bleibt unberührt.
  // =======================================================================
  function normName(s) {
    return (s || "").toLowerCase()
      .replace(/\[\[|\]\]/g, "")
      .replace(/\{\{.*?\}\}/g, "")
      .replace(/\|.*$/, "")
      .replace(/\s*\(.*?\)\s*/g, " ")
      .replace(/&nbsp;/g, " ")
      .trim();
  }
  function codeFromName(raw) {
    const n = normName(raw);
    if (NAME_TO_CODE[n]) return NAME_TO_CODE[n];
    // Teil-Match (z.B. "Korea Republic")
    for (const key in NAME_TO_CODE) if (n.indexOf(key) !== -1 || key.indexOf(n) !== -1) return NAME_TO_CODE[key];
    return null;
  }
  // Falls eine Wikipedia-Tricode von unserem Seed-Code abweicht: hier remappen.
  const CODE_REMAP = {};

  // Wikipedia-Matchboxen kodieren Teams als {{#invoke:flag|fb-rt|FRA}} (FIFA-Code direkt)
  // und Scores als {{score link|...|3–1}}. Templates sind verschachtelt, daher
  // sequenzieller Token-Scan: in Dokumentreihenfolge kommt je Match team1, score, team2.
  function parseFootballBoxes(wikitext) {
    const boxes = [];
    const re = /\|\s*team1\s*=[^\n]*?\|([A-Z]{3})\s*\}\}|\|\s*team2\s*=[^\n]*?\|([A-Z]{3})\s*\}\}|\|\s*score\s*=([^\n]*)/g;
    let m, cur = null;
    const fix = c => CODE_REMAP[c] || c;
    while ((m = re.exec(wikitext)) !== null) {
      if (m[1]) {                       // team1
        cur = { c1: fix(m[1]), c2: null, score: null };
      } else if (m[3] !== undefined) {  // score-Zeile
        if (cur) {
          // letzten "Zahl–Zahl"-Treffer nehmen (der eigentliche Score steht am Ende)
          const all = m[3].match(/(\d+)\s*[–\-−:]\s*(\d+)/g);
          if (all && all.length) {
            const last = all[all.length - 1].match(/(\d+)\s*[–\-−:]\s*(\d+)/);
            cur.score = [parseInt(last[1], 10), parseInt(last[2], 10)];
          }
        }
      } else if (m[2]) {                // team2 -> Match abschliessen
        if (cur) { cur.c2 = fix(m[2]); boxes.push(cur); cur = null; }
      }
    }
    return boxes;
  }

  async function fetchGroupWikitext(groupId) {
    const page = "2026_FIFA_World_Cup_Group_" + groupId;
    const url = "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=" + encodeURIComponent(page);
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    return json.parse && json.parse.wikitext ? json.parse.wikitext : "";
  }

  function todayStr() {
    try { return new Date().toISOString().slice(0, 10); } catch (e) { return DATA._readme.seedMeta.asOf; }
  }

  // K.o.-Merge: liest den Knockout-Artikel, matcht Paarungen mit bekannten Codes,
  // uebernimmt Resultat + Penaltys, wenn date<=heute und noch kein Resultat vorliegt.
  async function fetchWikitext(page) {
    const url = "https://en.wikipedia.org/w/api.php?action=parse&prop=wikitext&format=json&formatversion=2&origin=*&page=" + encodeURIComponent(page);
    const res = await fetch(url, { headers: { "Accept": "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const json = await res.json();
    return json.parse && json.parse.wikitext ? json.parse.wikitext : "";
  }
  function parseKnockoutBoxes(wikitext) {
    // team1 / score / penaltyscore / team2 in Dokumentreihenfolge
    const boxes = [];
    const re = /\|\s*team1\s*=[^\n]*?\|([A-Z]{3})\s*\}\}|\|\s*team2\s*=[^\n]*?\|([A-Z]{3})\s*\}\}|\|\s*score\s*=([^\n]*)|\|\s*penaltyscore\s*=([^\n]*)/g;
    let m, cur = null;
    while ((m = re.exec(wikitext)) !== null) {
      if (m[1]) { cur = { c1: m[1], c2: null, score: null, pens: null }; }
      else if (m[3] !== undefined && cur) {
        const all = m[3].match(/(\d+)\s*[–\-−:]\s*(\d+)/g);
        if (all && all.length) {
          const last = all[all.length - 1].match(/(\d+)\s*[–\-−:]\s*(\d+)/);
          cur.score = [parseInt(last[1], 10), parseInt(last[2], 10)];
        }
      }
      else if (m[4] !== undefined && cur) {
        const p = m[4].match(/(\d+)\s*[–\-−:]\s*(\d+)/);
        if (p) cur.pens = [parseInt(p[1], 10), parseInt(p[2], 10)];
      }
      else if (m[2] && cur) { cur.c2 = m[2]; boxes.push(cur); cur = null; }
    }
    return boxes;
  }
  async function mergeKnockout(summary) {
    const today = todayStr();
    let boxes;
    try { boxes = parseKnockoutBoxes(await fetchWikitext("2026_FIFA_World_Cup_knockout_stage")); }
    catch (e) { summary.errors.push("Knockout: " + e.message); return; }
    for (const k of DATA.knockout) {
      // nur Paarungen mit zwei bekannten Codes, ohne Resultat, mit Datum <= heute
      if (knockoutResult(k.game).result) continue;
      if (k.date > today) continue;
      if (!/^[A-Z]{3}$/.test(k.home) || !/^[A-Z]{3}$/.test(k.away)) continue;
      const box = boxes.find(b => (b.c1 === k.home && b.c2 === k.away) || (b.c1 === k.away && b.c2 === k.home));
      if (!box || !box.score) continue;
      const flip = box.c1 !== k.home;
      const res = flip ? [box.score[1], box.score[0]] : box.score;
      const pens = box.pens ? (flip ? [box.pens[1], box.pens[0]] : box.pens) : null;
      if (res[0] < 0 || res[0] > 20 || res[1] < 0 || res[1] > 20) continue;
      setKnockoutResult(k.game, res, "wikipedia", pens);
      summary.updated++;
    }
  }

  async function mergeFromWikipedia(onProgress) {
    const today = todayStr();
    const summary = { updated: 0, checked: 0, groups: {}, errors: [] };
    if (onProgress) onProgress("K.o.-Runde …");
    await mergeKnockout(summary);
    // Gruppen nur abfragen, solange dort noch etwas offen ist (spart 12 Requests)
    const groupsOpen = GROUP_IDS.filter(g => DATA.groups[g].matches.some(m => !effectiveGroupResult(m).result));
    for (const g of groupsOpen) {
      if (onProgress) onProgress("Gruppe " + g + " …");
      let boxes;
      try {
        const wt = await fetchGroupWikitext(g);
        boxes = parseFootballBoxes(wt);
      } catch (e) {
        summary.errors.push("Gruppe " + g + ": " + e.message);
        continue;
      }
      let gUpdated = 0;
      for (const m of DATA.groups[g].matches) {
        summary.checked++;
        // bereits verifiziert? dann nicht überschreiben (Seed/Override-Vorrang)
        if (effectiveGroupResult(m).result) continue;
        // nur Spiele deren Datum <= heute
        if (m.date > today) continue;
        // passende Box finden (gleiche Team-Paarung, richtungsunabhängig)
        const box = boxes.find(b =>
          (b.c1 === m.home && b.c2 === m.away) || (b.c1 === m.away && b.c2 === m.home));
        if (!box || !box.score) continue;
        // Score auf Seed-Richtung (home, away) normalisieren
        let res = (box.c1 === m.home) ? box.score : [box.score[1], box.score[0]];
        // Plausibilität
        if (res[0] < 0 || res[1] < 0 || res[0] > 20 || res[1] > 20) continue;
        setGroupResult(m, res, "wikipedia");
        gUpdated++; summary.updated++;
      }
      summary.groups[g] = gUpdated;
    }
    summary.ts = nowIso();
    return summary;
  }

  // -------------------------------------------------------------- öffentliche API
  window.WC = window.WC || {};
  window.WC.store = {
    GROUP_IDS,
    load,
    get data() { return DATA; },
    effectiveGroupResult,
    knockoutResult,
    setGroupResult,
    setKnockoutResult,
    clearOverrides,
    matchKey,
    stadiumById,
    teamByCode,
    allMatches,
    matchesAtStadium,
    meszDate,
    todayStr,
    mergeFromWikipedia
  };
})();
