/* =========================================================================
   NATI ON TOUR — WM 2026 · App v2 "Stadium Night"
   Views: Mein Trip (Dashboard) · Turnierbaum · Karte
   Alles datengetrieben: swissStatus() leitet den kompletten Reiseplan aus
   dem Bracket ab und aktualisiert sich mit jedem neuen Resultat.
   ========================================================================= */
(function () {
  "use strict";
  const store = () => window.WC.store;
  const eng = () => window.WC.engine;

  const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  const PHASE_LABEL = { group: "Gruppe", r32: "Sechzehntelfinale", r16: "Achtelfinale", qf: "Viertelfinale", sf: "Halbfinale", third: "Spiel um Platz 3", final: "FINALE" };
  const PHASE_SHORT = { r32: "1/16", r16: "1/8", qf: "1/4", sf: "1/2", third: "P3", final: "🏆" };

  // ---------------------------------------------------------- Stadt-Infos
  // tips: 1-2 Ausflugtipps · vibe: Nightlife/Party-Faktor 1-10 · party: warum hier feiern
  const CITY_INFO = {
    bcplace:  { tips: ["Stanley Park Seawall mit dem Velo — Skyline, Berge & Meer in einer Runde (3–4 h)", "Grouse Mountain oder Capilano Suspension Bridge — Bergpanorama über der Stadt"], vibe: 7, party: "Granville Street & Gastown — entspannte Fan-Meile am Wasser" },
    arrowhead:{ tips: ["Kansas City BBQ — Pflicht: Joe's KC (Gas Station) oder Arthur Bryant's", "National WWI Museum & Liberty Memorial — bester Blick über die Stadt"], vibe: 6, party: "Power & Light District — offizielles Fan-Fest-Viertel, ein einziger Block Party" },
    mercedes: { tips: ["Georgia Aquarium — eines der grössten der Welt (Walhaie!)", "BeltLine & Ponce City Market — Streetfood und Rooftop-Vibes"], vibe: 7, party: "Midtown & The Battery — Südstaaten-Gastfreundschaft trifft Fussballfieber" },
    metlife:  { tips: ["Little Island & High Line am Hudson — Skyline-Spaziergang", "Top of the Rock bei Sonnenuntergang — der Blick auf Manhattan"], vibe: 9, party: "Times Square bis Meatpacking — die Stadt, die nie schläft, im WM-Modus" },
    hardrock: { tips: ["South Beach & Ocean Drive — Art déco, Strand, Cocktails", "Wynwood Walls — Streetart-Viertel mit Bars"], vibe: 10, party: "South Beach — Lateinamerika-Fankulturen + Miami-Nightlife = grösste Party der WM" },
    sofi:     { tips: ["Venice Beach & Santa Monica Pier — Kalifornien pur", "Griffith Observatory — Hollywood-Sign & Sonnenuntergang"], vibe: 8, party: "LA Live & Venice — Westcoast-Partys mit riesiger Latino-Fanszene" },
    gillette: { tips: ["Boston Freedom Trail — Geschichte kompakt in 2–3 h", "North End — italienisches Viertel mit den besten Cannoli"], vibe: 7, party: "Fenway & Seaport — Pub-Kultur, laut und herzlich" },
    att:      { tips: ["Fort Worth Stockyards — Texas-Klischee in echt (Rodeo!)", "Deep Ellum — Livemusik-Viertel von Dallas"], vibe: 6, party: "Deep Ellum — Texas-BBQ, Country & Fussball" },
    azteca:   { tips: ["Centro Histórico & Zócalo — Weltkulturerbe", "Teotihuacán-Pyramiden — Tagesausflug (1 h ausserhalb)"], vibe: 9, party: "Zócalo & Condesa — wenn El Tri spielt, bebt die ganze Stadt" },
    lumen:    { tips: ["Pike Place Market & Waterfront", "Kerry Park — die Postkarten-Sicht auf Seattle"], vibe: 6, party: "Capitol Hill — Craft Beer und Indie-Vibes" },
    lincoln:  { tips: ["Rocky Steps am Museum of Art", "Reading Terminal Market — Foodie-Paradies"], vibe: 6, party: "South Street — Philly feiert rau und ehrlich" },
    nrg:      { tips: ["Space Center Houston — NASA hautnah", "Museum District — 19 Museen in Gehdistanz"], vibe: 6, party: "Midtown Houston — Tex-Mex und grosse Screens" },
    levis:    { tips: ["San Francisco: Golden Gate & Fisherman's Wharf (1 h Anfahrt)", "Santa Cruz Beach Boardwalk — Pazifik-Kirmes"], vibe: 6, party: "SF Mission District — Craft-Bier trifft Fussball" },
    bmo:      { tips: ["CN Tower & Harbourfront", "Kensington Market — Multikulti-Viertel"], vibe: 7, party: "King Street West — Toronto im Fussballfieber" },
    bbva:     { tips: ["Parque Fundidora & Paseo Santa Lucía", "Cerro de la Silla — Wahrzeichen-Wanderung"], vibe: 7, party: "Barrio Antiguo — Norteño-Party" },
    akron:    { tips: ["Guadalajara Centro & Mariachi-Plaza", "Tequila-Tour (Jalisco ist das Original)"], vibe: 7, party: "Chapultepec Avenue — Tequila & Fussball" }
  };
  const FAN_POWER = { ARG: 10, BRA: 10, MEX: 10, COL: 9, ENG: 9, MAR: 9, ALG: 8, SEN: 8, POR: 8, ESP: 8, CPV: 8, EGY: 7, PAR: 7, GHA: 7, USA: 7, FRA: 7, JPN: 7, SUI: 7, CAN: 6, BEL: 6, NOR: 6, AUS: 6, SWE: 6, ECU: 6 };

  // ------------------------------------------- Flüge (geschätzte Spannen)
  // Anreise ZRH→YVR am So 05.07.2026 (frühester Abflug: Nachmittag)
  const OUTBOUND = [
    { airline: "Edelweiss", tag: "Direktflug · Empfohlen", best: true, dep: "13:00", from: "ZRH", arr: "14:15", to: "YVR", dur: "10 h 15", stops: "nonstop", price: "CHF 950–1450", note: "Einziger Nonstop ZRH→YVR (5×/Woche, So ✓). Abflug am Nachmittag — genau wie gewünscht. Ankunft So-Nachmittag: ganzer Montag als Puffer.", date: "2026-07-05" },
    { airline: "Icelandair", tag: "Günstigste Option", dep: "14:00", from: "ZRH", arr: "18:35", to: "YVR", dur: "13 h 35", stops: "1 Stopp (KEF)", price: "CHF 650–950", note: "Nachmittagsabflug ✓, kurzer Umstieg in Reykjavík. Meist die tiefsten Last-Minute-Preise.", date: "2026-07-05" },
    { airline: "Air Canada / Lufthansa", tag: "Viele Abflüge", dep: "12:55", from: "ZRH", arr: "17:30", to: "YVR", dur: "13 h 35", stops: "1 Stopp (FRA/MUC)", price: "CHF 800–1150", note: "Mehrere Verbindungen ab Mittag, robust bei Umbuchungen (grosse Allianz).", date: "2026-07-05" },
    { airline: "KLM", tag: "Alternative", dep: "12:25", from: "ZRH", arr: "16:50", to: "YVR", dur: "13 h 25", stops: "1 Stopp (AMS)", price: "CHF 750–1050", note: "Knapp vor Nachmittag — nur falls 12:25 noch okay ist.", date: "2026-07-05" },
    { airline: "Condor", tag: "Budget-Direktflug ab FRA", dep: "13:20", from: "FRA", arr: "15:05", to: "YVR", dur: "10 h 45", stops: "nonstop", price: "€ 550–900", note: "Direktflug ab Frankfurt — Anreise per Zug ab St. Gallen/Zürich (~4 h). Oft deutlich günstiger als ZRH nonstop.", date: "2026-07-05" }
  ];
  const FDH_NOTE = "Ab Friedrichshafen (FDH) gibt es keine sinnvolle Verbindung nach Vancouver. Beste Alternativen aus der Region: Zürich (1 h) mit dem Edelweiss-Nonstop — oder München (2.5 h), von wo Lufthansa/Air Canada nonstop nach YVR fliegen (CHF 800–1200).";

  // Anschlussflüge (Economy, one-way, Last-Minute-Schätzung)
  const LEGS = {
    "YVR-MCI": { dur: "6–8 h", stops: "1 Stopp (DEN/SEA)", price: "CHF 280–450" },
    "MCI-ATL": { dur: "2 h", stops: "nonstop (Delta)", price: "CHF 180–320" },
    "ATL-EWR": { dur: "2 h 15", stops: "nonstop", price: "CHF 180–350" },
    "ATL-MIA": { dur: "2 h", stops: "nonstop", price: "CHF 150–300" },
    "YVR-SJO": { dur: "9–12 h", stops: "1–2 Stopps (LAX/DFW)", price: "CHF 380–600" },
    "MCI-SJO": { dur: "8–10 h", stops: "1 Stopp (DFW/MIA)", price: "CHF 350–550" },
    "ATL-SJO": { dur: "3 h 40", stops: "nonstop (Delta)", price: "CHF 280–480" },
    "EWR-SJO": { dur: "5 h 30", stops: "nonstop (United)", price: "CHF 300–500" },
    "MIA-SJO": { dur: "3 h", stops: "nonstop", price: "CHF 250–420" }
  };

  let state = { view: "trip", map: null, mapInit: false, cdTimer: null };
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  function el(tag, cls, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }

  // ------------------------------------------------------------ Helpers
  function team(code) { return store().teamByCode(code); }
  // FIFA-Code -> ISO (flagcdn.com) — echte Flaggen-Bilder, weil Windows keine Flaggen-Emojis rendert
  const ISO = { MEX:"mx",RSA:"za",KOR:"kr",CZE:"cz",CAN:"ca",BIH:"ba",QAT:"qa",SUI:"ch",BRA:"br",MAR:"ma",HAI:"ht",SCO:"gb-sct",USA:"us",PAR:"py",AUS:"au",TUR:"tr",GER:"de",CUW:"cw",CIV:"ci",ECU:"ec",NED:"nl",JPN:"jp",SWE:"se",TUN:"tn",BEL:"be",EGY:"eg",IRN:"ir",NZL:"nz",ESP:"es",CPV:"cv",KSA:"sa",URU:"uy",FRA:"fr",SEN:"sn",IRQ:"iq",NOR:"no",ARG:"ar",ALG:"dz",AUT:"at",JOR:"jo",POR:"pt",COD:"cd",UZB:"uz",COL:"co",ENG:"gb-eng",CRO:"hr",GHA:"gh",PAN:"pa" };
  function flag(code, big) {
    const iso = ISO[code];
    if (!iso) return "⚽";
    return "<img class='flg" + (big ? " flg-big" : "") + "' src='https://flagcdn.com/" + (big ? "w160" : "w40") + "/" + iso + ".png' alt='" + code + "' loading='lazy'>";
  }
  function kickoffUTC(m) { return store().meszDate(m).getTime() - 2 * 3600 * 1000; } // MESZ = UTC+2
  // Lokales Spieldatum (fuer Reiseplanung massgeblich — nicht der MESZ-Kalendertag)
  function fmtWhen(m) {
    const p = m.date.split("-");
    const d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2]));
    return WD[d.getUTCDay()] + " " + p[2] + "." + p[1] + ".";
  }
  function fmtTimes(m) { return m.timeLocal + " Ortszeit · " + m.timeMESZ.replace("+1", " (+1 Tag)") + " MESZ"; }
  function stadium(m) { return store().stadiumById(m.venue); }
  function airportCoords(iata) {
    const ta = store().data.tripAnchors;
    if (ta.start.airport === iata) return [ta.start.lat, ta.start.lng];
    if (ta.costaRica.airport === iata) return [ta.costaRica.lat, ta.costaRica.lng];
    const s = store().data.stadiums.find(x => x.airport === iata);
    return s ? [s.lat, s.lng] : null;
  }
  function haversine(a, b) {
    if (!a || !b) return 0;
    const R = 6371, t = x => x * Math.PI / 180;
    const dLat = t(b[0] - a[0]), dLng = t(b[1] - a[1]);
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(t(a[0])) * Math.cos(t(b[0])) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(s));
  }
  function estLeg(from, to) {
    const key = from + "-" + to;
    if (LEGS[key]) return LEGS[key];
    const d = haversine(airportCoords(from), airportCoords(to));
    const lo = Math.round((120 + d * 0.07) / 10) * 10, hi = Math.round((160 + d * 0.12) / 10) * 10;
    return { dur: "~" + Math.max(2, Math.round(d / 750)) + "–" + Math.max(3, Math.round(d / 550)) + " h", stops: d > 3200 ? "1+ Stopp" : "meist nonstop", price: "CHF " + lo + "–" + hi };
  }
  function flightLink(from, to, date) {
    return store().data.flightFacts.deeplinkTemplate.replace("{originIATA}", from).replace("{destIATA}", to).replace("{date}", date);
  }
  function resultLine(g) {
    const r = store().knockoutResult(g.game);
    if (!r.result) return null;
    let s = r.result[0] + " : " + r.result[1];
    if (r.pens) s += " (" + r.pens[0] + ":" + r.pens[1] + " i.P.)";
    else if (r.aet) s += " n.V.";
    return s;
  }

  // -------------------------------------------------- Schweiz-Status (Kern)
  // Leitet alles aus dem Bracket ab: gespielt, nächstes Spiel, Zukunftspfad,
  // ausgeschieden oder gar Weltmeister. Aktualisiert sich mit jedem Resultat.
  function swissStatus() {
    const k = eng().resolveKnockout();
    const games = store().data.knockout
      .map(g => ({ g, home: k.resolved[g.game].home, away: k.resolved[g.game].away }))
      .filter(x => x.home.code === "SUI" || x.away.code === "SUI")
      .sort((a, b) => a.g.game - b.g.game);

    let eliminated = null, lastWin = null, next = null;
    for (const x of games) {
      const w = k.winners[x.g.game];
      const r = store().knockoutResult(x.g.game);
      if (r.result && w.code) {
        if (w.code === "SUI") lastWin = x;
        else eliminated = x;
      } else if (!next && !eliminated) {
        next = x;
      }
    }
    const champion = !eliminated && lastWin && lastWin.g.phase === "final";

    // Zukunftspfad: vom nächsten Spiel der Kette entlang (W<game> in den Slots)
    const path = [];
    let cur = next ? next.g : null;
    while (cur) {
      const nxt = store().data.knockout.find(kk => kk.homeSlot === "W" + cur.game || kk.awaySlot === "W" + cur.game);
      if (!nxt) break;
      path.push(nxt);
      cur = nxt;
    }
    return { k, games, eliminated, next, path, champion, lastWin };
  }
  function baseAirport(st) {
    if (st.eliminated) return stadium(st.eliminated.g).airport;
    const today = store().todayStr();
    return today < "2026-07-05" ? "ZRH" : "YVR";
  }

  // Kandidaten einer Seite (rekursiv bis echte Teams)
  function leafCandidates(slot, k, depth) {
    let m = /^W(\d+)$/.exec(slot); const isW = !!m;
    if (!m) m = /^L(\d+)$/.exec(slot);
    if (m) {
      const game = +m[1];
      const dec = isW ? k.winners[game] : k.losers[game];
      if (dec && dec.code) return [dec.code];
      const src = store().data.knockout.find(x => x.game === game);
      if (!src || depth >= 5) return [];
      // echte Codes bevorzugen (home/away), sonst dem Slot weiter folgen
      const hTok = /^[A-Z]{3}$/.test(src.home) ? src.home : (src.homeSlot || src.home);
      const aTok = /^[A-Z]{3}$/.test(src.away) ? src.away : (src.awaySlot || src.away);
      return leafCandidates(hTok, k, depth + 1).concat(leafCandidates(aTok, k, depth + 1));
    }
    if (/^[A-Z]{3}$/.test(slot)) return [slot];
    return [];
  }
  function candText(codes, max) {
    const uniq = codes.filter((c, i) => codes.indexOf(c) === i);
    const names = uniq.map(c => flag(c) + " " + team(c).name);
    if (!names.length) return "offen";
    if (max && names.length > max) return names.slice(0, max).join(" <i>oder</i> ") + " <i>oder …</i>";
    return names.join(" <i>oder</i> ");
  }
  function sideCand(g, side, k) {
    const res = k.resolved[g.game][side];
    if (res.code) return { code: res.code, html: flag(res.code) + " " + esc(team(res.code).name) };
    const codes = leafCandidates(g[side + "Slot"] || g[side], k, 0);
    return { code: null, html: codes.length ? candText(codes, 4) : esc(res.label || "offen"), codes };
  }

  // =====================================================================
  // VIEW: MEIN TRIP
  // =====================================================================
  function renderTrip() {
    const v = $("#view-trip"); v.innerHTML = "";
    const st = swissStatus();

    if (st.champion) {
      v.appendChild(el("div", "status-banner champ", "🏆 <b>DIE SCHWEIZ IST WELTMEISTER!</b> Es gibt nichts mehr zu planen — nur noch zu feiern. Für immer."));
    }
    if (st.eliminated) {
      const g = st.eliminated.g; const s = stadium(g);
      v.appendChild(el("div", "status-banner out",
        "😢 <b>Die Nati ist ausgeschieden</b> — " + PHASE_LABEL[g.phase] + " in " + esc(s.metro) + " (" + esc(resultLine(g) || "") + "). " +
        "Kopf hoch: Plan B unten ist bereit — die WM läuft weiter, und Costa Rica wartet. 🌴"));
    }

    // ---- HERO: nächstes Nati-Spiel + Countdown
    if (st.next) v.appendChild(heroCard(st));

    // ---- Bisheriger Weg
    v.appendChild(pathStrip(st));

    // ---- Anreise (nur solange die Reise noch bevorsteht)
    if (store().todayStr() <= "2026-07-05" && !st.eliminated) {
      v.appendChild(el("div", "section-title", "✈️ <span>Anreise nach <span class='em'>Vancouver</span></span> <span class='sub'>So 05.07. — frühester Abflug am Nachmittag · 1 Person · Economy</span>"));
      const grid = el("div", "flights");
      OUTBOUND.forEach((f, i) => grid.appendChild(flightCard(f, i)));
      v.appendChild(grid);
      v.appendChild(el("div", "callout", "💡 <div><b>Zeitplan:</b> Ankunft Sonntag ca. 14–19 Uhr Ortszeit → der ganze <b>Montag bleibt als Puffer</b> (Jetlag, Stadt erkunden, Fanzone) — Anpfiff ist erst <b>Dienstag 13:00</b>. Entspannter geht's nicht.</div>"));
      v.appendChild(el("div", "callout warn", "🛫 <div><b>Ab Friedrichshafen?</b> " + esc(FDH_NOTE) + "</div>"));
    }

    // ---- Weiterreise-Pfad
    if (!st.eliminated && !st.champion) {
      v.appendChild(el("div", "section-title", "🚀 <span>Wenn die Nati <span class='em'>gewinnt</span></span> <span class='sub'>der Weg bis ins Finale — Anschlussflüge ohne Stress, mit Ausflugtipps</span>"));
      v.appendChild(journey(st));
    }

    // ---- Party-Button
    v.appendChild(partySection(st));

    // ---- Plan B
    v.appendChild(planB(st));
  }

  function heroCard(st) {
    const g = st.next.g; const s = stadium(g); const k = st.k;
    const home = sideCand(g, "home", k), away = sideCand(g, "away", k);
    const hero = el("div", "hero");
    const chips = el("div", "hero-top");
    chips.append(
      el("span", "chip red", PHASE_LABEL[g.phase]),
      el("span", "chip", fmtWhen(g) + " · Spiel " + g.game),
      el("span", "chip blue", "📍 " + esc(s.metro) + " · " + esc(s.name)),
      el("span", "chip gold", "🎫 " + (s.capacity ? s.capacity.toLocaleString("de-CH") + " Plätze" : ""))
    );
    hero.appendChild(chips);

    const match = el("div", "hero-match");
    match.appendChild(heroTeam(home));
    match.appendChild(el("div", "hero-vs", "VS"));
    match.appendChild(heroTeam(away));
    hero.appendChild(match);

    hero.appendChild(el("p", "hero-meta", "Anpfiff <b>" + g.timeLocal + " Ortszeit</b> · <b>" + esc(g.timeMESZ.replace("+1", " (+1 Tag)")) + " MESZ</b>" +
      (away.code ? "" : " · Gegner wird heute Nacht ermittelt (Spiel " + String((g.awaySlot || "").replace("W", "")) + ")")));

    const cd = el("div", "countdown");
    ["Tage", "Std", "Min", "Sek"].forEach((lab, i) => {
      cd.appendChild(el("div", "cd-box", "<div class='cd-num' id='cd" + i + "'>–</div><div class='cd-lab'>" + lab + "</div>"));
    });
    hero.appendChild(cd);
    startCountdown(kickoffUTC(g));
    return hero;
  }
  function heroTeam(side) {
    const w = el("div", "hero-team");
    if (side.code) {
      w.appendChild(el("div", "hero-flag", flag(side.code, true)));
      w.appendChild(el("div", "hero-name", esc(team(side.code).name)));
    } else {
      w.appendChild(el("div", "hero-flag", "❓"));
      w.appendChild(el("div", "hero-name open", side.html));
    }
    return w;
  }
  function startCountdown(targetMs) {
    clearInterval(state.cdTimer);
    function tick() {
      let d = Math.max(0, targetMs - Date.now());
      const dd = Math.floor(d / 86400000); d -= dd * 86400000;
      const hh = Math.floor(d / 3600000); d -= hh * 3600000;
      const mi = Math.floor(d / 60000); d -= mi * 60000;
      const ss = Math.floor(d / 1000);
      const vals = [dd, hh, mi, ss];
      for (let i = 0; i < 4; i++) { const n = $("#cd" + i); if (n) n.textContent = String(vals[i]).padStart(2, "0"); }
    }
    tick();
    state.cdTimer = setInterval(tick, 1000);
  }

  function pathStrip(st) {
    const wrap = el("div", "hero-path");
    const sw = store().data.swissState;
    wrap.appendChild(el("span", "path-step done", "✓ Gruppe B gewonnen (7 Pkt)"));
    wrap.appendChild(el("span", "path-step done", "✓ 1/16: 2:0 vs " + flag("ALG") + " Algerien"));
    const order = ["r16", "qf", "sf", "final"];
    const labels = { r16: "Achtelfinale", qf: "Viertelfinale", sf: "Halbfinale", final: "Finale" };
    let nowPhase = st.next ? st.next.g.phase : null;
    let reached = true;
    order.forEach(p => {
      const played = st.games.find(x => x.g.phase === p && store().knockoutResult(x.g.game).result);
      if (played) {
        const won = st.k.winners[played.g.game].code === "SUI";
        wrap.appendChild(el("span", "path-step " + (won ? "done" : ""), (won ? "✓ " : "✗ ") + labels[p] + ": " + resultLine(played.g)));
        if (!won) reached = false;
      } else if (p === nowPhase && reached) {
        wrap.appendChild(el("span", "path-step now", "● " + labels[p] + " — JETZT"));
      } else if (reached && !st.eliminated) {
        wrap.appendChild(el("span", "path-step", labels[p]));
      }
    });
    return wrap;
  }

  function flightCard(f, i) {
    const c = el("div", "card flight" + (f.best ? " best" : ""));
    c.style.animationDelay = (i * 60) + "ms";
    c.appendChild(el("div", "fl-head", "<span class='fl-airline'>" + esc(f.airline) + "</span><span class='chip " + (f.best ? "gold" : "") + "'>" + esc(f.tag) + "</span>"));
    c.appendChild(el("div", "fl-route", "<span class='fl-time'>" + f.dep + "</span><span class='fl-arrow'></span><span class='fl-time'>" + f.arr + "</span>"));
    c.appendChild(el("div", "fl-dur", f.dur + " · " + esc(f.stops)));
    c.appendChild(el("div", "fl-airports", "<span>" + f.from + "</span><span>" + f.to + "</span>"));
    c.appendChild(el("p", "fl-note", esc(f.note)));
    const foot = el("div", "fl-foot");
    foot.appendChild(el("span", "fl-price", esc(f.price) + " <span class='ca'>ca. · one-way</span>"));
    foot.appendChild(Object.assign(el("a", "btn sm" + (f.best ? "" : " ghost"), "Preise prüfen →"), { href: flightLink(f.from, f.to, f.date), target: "_blank", rel: "noopener" }));
    c.appendChild(foot);
    return c;
  }

  // Weiterreise: vom nächsten Spiel entlang des Brackets
  function journey(st) {
    const wrap = el("div", "journey");
    const chain = st.next ? [st.next.g].concat(st.path) : st.path;
    let prev = null;
    chain.forEach((g, idx) => {
      const s = stadium(g);
      const stage = el("div", "stage" + (idx === 0 ? " hot" : ""));
      const rail = el("div", "stage-rail");
      rail.appendChild(el("div", "stage-dot", PHASE_SHORT[g.phase] || "•"));
      if (idx < chain.length - 1) rail.appendChild(el("div", "stage-line"));
      stage.appendChild(rail);

      const card = el("div", "card stage-card");
      const head = el("div", "stage-head");
      head.appendChild(el("h3", null, PHASE_LABEL[g.phase]));
      head.appendChild(el("span", "chip" + (idx === 0 ? " red" : ""), fmtWhen(g)));
      head.appendChild(el("span", "stage-city", "📍 " + esc(s.metro) + " · " + esc(s.name) + " · " + fmtTimes(g)));
      card.appendChild(head);

      // Gegner
      const k = st.k;
      const suiSide = (k.resolved[g.game].home.code === "SUI") ? "away" : (k.resolved[g.game].away.code === "SUI" ? "home" : null);
      let oppHtml;
      if (suiSide) oppHtml = sideCand(g, suiSide, k).html;
      else {
        const other = (g.homeSlot && /W\d+/.test(g.homeSlot) && chainContains(st, g.homeSlot)) ? "away" : "home";
        oppHtml = sideCand(g, other, k).html;
      }
      card.appendChild(el("p", "stage-opp", "<b>Möglicher Gegner:</b> " + oppHtml));

      // Anschlussflug + Pacing
      if (idx > 0 || store().todayStr() >= "2026-07-05") {
        const fromS = prev ? stadium(prev) : null;
        const from = fromS ? fromS.airport : "YVR";
        const fromCity = fromS ? fromS.metro : "Vancouver";
        if (from !== s.airport) {
          const legInfo = estLeg(from, s.airport);
          const prevDate = prev ? prev.date : "2026-07-07";
          const restDays = Math.round((new Date(g.date) - new Date(prevDate)) / 86400000);
          const fl = el("div", "stage-flight");
          fl.innerHTML = "✈ <b>" + from + " → " + s.airport + "</b> · " + legInfo.dur + " · " + esc(legInfo.stops) +
            " · <b>" + esc(legInfo.price) + "</b> <span class='muted'>· " + restDays + " Tage Zeit — ohne Stress (Flug am Tag danach, " + (restDays - 1) + " Tage für " + esc(s.metro) + ")</span>";
          const a = Object.assign(el("a", "btn sm ghost", "Flug suchen"), { href: flightLink(from, s.airport, nextDay(prevDate)), target: "_blank", rel: "noopener" });
          fl.appendChild(a);
          card.appendChild(fl);
        }
      }

      // Ausflugtipps
      const info = CITY_INFO[g.venue];
      if (info) {
        const ul = el("ul", "tips");
        info.tips.forEach(t => ul.appendChild(el("li", null, esc(t))));
        card.appendChild(ul);
      }
      // Wer spielt sonst hier
      const others = otherMatchesAt(g.venue, g.game);
      if (others.length) card.appendChild(el("p", "also-here", "<b>Sonst noch hier:</b> " + others.join(" · ")));

      stage.appendChild(card);
      wrap.appendChild(stage);
      prev = g;
    });

    // Hinweis Spiel um Platz 3
    const third = store().data.knockout.find(x => x.phase === "third");
    if (third && chain.some(g => g.phase === "sf")) {
      const s3 = stadium(third);
      wrap.appendChild(el("p", "muted small", "ℹ️ Falls das Halbfinale verloren geht: <b>Spiel um Platz 3</b> am " + fmtWhen(third) + " in " + esc(s3.metro) + " (" + esc(s3.name) + ") — Flug ATL → MIA, nonstop, ~2 h, CHF 150–300."));
    }
    return wrap;
  }
  function chainContains(st, slot) {
    const m = /^W(\d+)$/.exec(slot);
    if (!m) return false;
    const num = +m[1];
    if (st.next && st.next.g.game === num) return true;
    return st.games.some(x => x.g.game === num) || st.path.some(p => p.game === num);
  }
  function nextDay(dateStr) {
    const d = new Date(dateStr + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  function otherMatchesAt(venueId, exceptGame) {
    const k = eng().resolveKnockout();
    const now = Date.now();
    return store().data.knockout
      .filter(g => g.venue === venueId && g.game !== exceptGame && kickoffUTC(g) > now && !store().knockoutResult(g.game).result)
      .map(g => {
        const h = sideCand(g, "home", k), a = sideCand(g, "away", k);
        const hn = h.code ? team(h.code).name : "offen", an = a.code ? team(a.code).name : "offen";
        return fmtWhen(g) + " " + PHASE_LABEL[g.phase] + " (" + hn + " – " + an + ")";
      });
  }

  // ------------------------------------------------------------ Party 🎉
  function partySection(st) {
    const wrap = el("div", null);
    const btnWrap = el("div", "party-btn-wrap");
    const btn = el("button", "party-btn", "🎉 Und wenn die Nati verliert? → Wo steigt die grösste Party?");
    btnWrap.appendChild(btn);
    wrap.appendChild(btnWrap);
    const panel = el("div", "party-panel"); panel.hidden = true;
    wrap.appendChild(panel);
    btn.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      if (!panel.hidden && !panel.dataset.filled) {
        renderParty(panel, st);
        panel.dataset.filled = "1";
        panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    return wrap;
  }
  function partyAnalysis(st) {
    const k = st.k; const now = Date.now();
    const phaseW = { r32: 2, r16: 2.5, qf: 3, sf: 4.5, third: 3, final: 6 };
    const scored = [];
    store().data.knockout.forEach(g => {
      if (store().knockoutResult(g.game).result) return;
      if (kickoffUTC(g) <= now) return;
      const h = sideCand(g, "home", k), a = sideCand(g, "away", k);
      const codesH = h.code ? [h.code] : (h.codes || []);
      const codesA = a.code ? [a.code] : (a.codes || []);
      if (codesH.includes("SUI") || codesA.includes("SUI")) return; // eigene Spiele zählen nicht als Trostparty
      const fp = arr => arr.length ? Math.max(...arr.map(c => FAN_POWER[c] || 5)) : 5;
      const info = CITY_INFO[g.venue] || { vibe: 5, party: "" };
      const score = (fp(codesH) + fp(codesA)) / 2 * (phaseW[g.phase] || 2) * (info.vibe / 10);
      scored.push({ g, score, codesH, codesA, info });
    });
    scored.sort((x, y) => y.score - x.score);
    return scored;
  }
  function renderParty(panel, st) {
    const list = partyAnalysis(st);
    if (!list.length) { panel.appendChild(el("p", "muted", "Keine kommenden Spiele mehr — die WM ist durch. Party trotzdem. 🎊")); return; }
    // Abflugort = wo du beim (hypothetischen) Ausscheiden waerst: Ort des naechsten Nati-Spiels
    const partyBase = st.next ? stadium(st.next.g).airport : baseAirport(st);
    const top = list[0]; const s = stadium(top.g);
    const topCard = el("div", "card party-top");
    topCard.innerHTML =
      "<div style='display:flex;gap:1rem;align-items:center;flex-wrap:wrap'>" +
        "<span class='party-rank'>🥇</span>" +
        "<div style='flex:1;min-width:220px'>" +
          "<div class='party-city'>" + esc(s.metro) + "</div>" +
          "<div class='muted small'>" + fmtWhen(top.g) + " · " + PHASE_LABEL[top.g.phase] + " · " + esc(s.name) + "</div>" +
          "<div style='margin-top:.4rem'>" + candText(top.codesH, 3) + " <b>vs</b> " + candText(top.codesA, 3) + "</div>" +
          "<p class='party-why'>🎊 " + esc(top.info.party || "") + "</p>" +
        "</div>" +
        "<a class='btn gold' target='_blank' rel='noopener' href='" + flightLink(partyBase, s.airport, nextDay(top.g.date > store().todayStr() ? store().todayStr() : top.g.date)) + "'>Flug " + partyBase + " → " + s.airport + "</a>" +
      "</div>";
    panel.appendChild(topCard);
    const grid = el("div", "party-grid");
    list.slice(1, 4).forEach((p, i) => {
      const ss = stadium(p.g);
      const c = el("div", "card");
      c.innerHTML = "<div class='pb-head'><h4>" + ["🥈", "🥉", "4."][i] + " " + esc(ss.metro) + "</h4><span class='chip'>" + fmtWhen(p.g) + " · " + PHASE_LABEL[p.g.phase] + "</span></div>" +
        "<div class='small'>" + candText(p.codesH, 2) + " <b>vs</b> " + candText(p.codesA, 2) + "</div>" +
        "<p class='party-why'>" + esc((p.info && p.info.party) || "") + "</p>";
      grid.appendChild(c);
    });
    panel.appendChild(grid);
  }

  // ------------------------------------------------------------ Plan B 🌴
  function planB(st) {
    const wrap = el("div", null);
    const title = st.eliminated
      ? "🧭 <span>Plan B — <span class='em'>aktiv</span></span> <span class='sub'>die Nati ist raus: hier läuft die WM weiter (+ Costa Rica)</span>"
      : "🧭 <span>Plan B</span> <span class='sub'>aktiviert sich automatisch, falls die Nati ausscheidet — Vorschau</span>";
    wrap.appendChild(el("div", "section-title", title));

    const base = baseAirport(st);
    const grid = el("div", "planb-grid");

    // Costa Rica immer zuoberst
    const legCR = estLeg(base, "SJO");
    const cr = el("div", "card planb-card cr");
    cr.innerHTML = "<div class='pb-head'><h4>🌴 Costa Rica — Strand-Reset</h4><span class='chip green'>Immer eine gute Idee</span></div>" +
      "<p class='small muted'>Pura Vida statt Penalty-Frust: Vulkane, Faultiere, Pazifik. Der geplante Abschluss deiner Reise — einfach früher.</p>" +
      "<p class='pb-flight'>✈ " + base + " → SJO · " + legCR.dur + " · " + esc(legCR.stops) + " · <b>" + esc(legCR.price) + "</b></p>";
    cr.appendChild(Object.assign(el("a", "btn sm gold", "Flug nach San José"), { href: flightLink(base, "SJO", nextDay(store().todayStr())), target: "_blank", rel: "noopener" }));
    grid.appendChild(cr);

    // Kommende Spiele nach Stadt gruppiert
    const k = st.k; const now = Date.now();
    const byVenue = {};
    store().data.knockout.forEach(g => {
      if (store().knockoutResult(g.game).result || kickoffUTC(g) <= now) return;
      const h = sideCand(g, "home", k), a = sideCand(g, "away", k);
      if ((h.code === "SUI" || a.code === "SUI") && !st.eliminated) return; // eigene Spiele stehen oben
      (byVenue[g.venue] = byVenue[g.venue] || []).push(g);
    });
    Object.keys(byVenue)
      .sort((x, y) => kickoffUTC(byVenue[x][0]) - kickoffUTC(byVenue[y][0]))
      .forEach(vid => {
        const s = store().stadiumById(vid);
        const leg = estLeg(base, s.airport);
        const c = el("div", "card planb-card");
        const head = el("div", "pb-head");
        head.appendChild(el("h4", null, esc(s.metro)));
        head.appendChild(el("span", "chip", "✈ ab " + base + " · " + esc(leg.price)));
        c.appendChild(head);
        const ms = el("div", "pb-matches");
        byVenue[vid].forEach(g => {
          const h = sideCand(g, "home", k), a = sideCand(g, "away", k);
          const hn = h.code ? flag(h.code) + " " + team(h.code).name : "offen";
          const an = a.code ? flag(a.code) + " " + team(a.code).name : "offen";
          ms.appendChild(el("div", "pb-match", "<span class='d'>" + fmtWhen(g) + " " + g.timeLocal + "</span><span>" + PHASE_LABEL[g.phase] + ": " + hn + " – " + an + "</span>"));
        });
        c.appendChild(ms);
        const info = CITY_INFO[vid];
        if (info) c.appendChild(el("p", "pb-flight", "◆ " + esc(info.tips[0])));
        c.appendChild(Object.assign(el("a", "btn sm ghost", "Flug prüfen"), { href: flightLink(base, s.airport, nextDay(store().todayStr())), target: "_blank", rel: "noopener" }));
        grid.appendChild(c);
      });

    wrap.appendChild(grid);
    return wrap;
  }

  // =====================================================================
  // VIEW: TURNIERBAUM
  // =====================================================================
  function renderBracket() {
    const v = $("#view-bracket"); v.innerHTML = "";
    const k = eng().resolveKnockout();
    v.appendChild(el("div", "section-title", "🏆 <span>Turnierbaum</span> <span class='sub'>aktualisiert sich mit jedem Resultat · 🇨🇭 rot markiert</span>"));
    const wrapScroll = el("div", "bracket-wrap");
    const bracket = el("div", "bracket");
    [["r32", "Sechzehntel"], ["r16", "Achtelfinale"], ["qf", "Viertelfinale"], ["sf", "Halbfinale"], ["final", "Finale & Platz 3"]].forEach(([pid, label]) => {
      const col = el("div", "bk-col");
      col.appendChild(el("h3", null, label));
      const games = el("div", "bk-games");
      let list = store().data.knockout.filter(g => g.phase === pid);
      if (pid === "final") list = store().data.knockout.filter(g => g.phase === "final" || g.phase === "third");
      list.forEach(g => games.appendChild(bracketGame(g, k)));
      col.appendChild(games);
      bracket.appendChild(col);
    });
    wrapScroll.appendChild(bracket);
    v.appendChild(wrapScroll);
  }
  function bracketGame(g, k) {
    const s = stadium(g);
    const h = sideCand(g, "home", k), a = sideCand(g, "away", k);
    const r = store().knockoutResult(g.game);
    const isSui = h.code === "SUI" || a.code === "SUI";
    const card = el("div", "bk-game" + (isSui ? " sui" : "") + (r.result ? " done" : ""));
    card.appendChild(el("div", "bk-meta", "<span>" + fmtWhen(g) + " · " + esc(s.metro) + "</span><span>#" + g.game + (g.phase === "third" ? " · Platz 3" : "") + "</span>"));

    const winCode = k.winners[g.game] ? k.winners[g.game].code : null;
    [["home", h], ["away", a]].forEach(([side, cnd], i) => {
      if (cnd.code) {
        const row = el("div", "bk-team" + (cnd.code === "SUI" ? " suiT" : "") +
          (r.result && winCode ? (winCode === cnd.code ? " win" : " lose") : ""));
        row.innerHTML = "<span class='fl'>" + flag(cnd.code) + "</span><span class='nm'>" + esc(team(cnd.code).name) + "</span>" +
          "<span class='sc'>" + (r.result ? r.result[i] : "–") + "</span>";
        card.appendChild(row);
      } else {
        card.appendChild(el("div", "bk-team", "<span class='fl'>❓</span><span class='nm bk-cand'>" + cnd.html + "</span>"));
      }
    });
    if (r.pens) card.appendChild(el("div", "bk-pens", "n.V. · Penaltys " + r.pens[0] + ":" + r.pens[1]));
    else if (r.aet) card.appendChild(el("div", "bk-pens", "nach Verlängerung"));

    // Manuelle Eingabe nur wenn beide Teams definitiv & noch kein Resultat
    if (!r.result && h.code && a.code) card.appendChild(bracketEditor(g));
    return card;
  }
  function bracketEditor(g) {
    const wrap = el("div", "bk-editor");
    const ih = el("input"); ih.type = "number"; ih.min = 0; ih.placeholder = "H";
    const ia = el("input"); ia.type = "number"; ia.min = 0; ia.placeholder = "A";
    const ph = el("input"); ph.type = "number"; ph.min = 0; ph.placeholder = "pH"; ph.title = "Penaltys Heim (bei Unentschieden)";
    const pa = el("input"); pa.type = "number"; pa.min = 0; pa.placeholder = "pA"; pa.title = "Penaltys Gast";
    const save = el("button", "btn sm ghost", "✓");
    save.addEventListener("click", () => {
      if (ih.value === "" || ia.value === "") return;
      const res = [+ih.value, +ia.value];
      let pens = null;
      if (res[0] === res[1]) {
        if (ph.value === "" || pa.value === "" || +ph.value === +pa.value) { toast("Unentschieden: bitte Penaltys (pH/pA) angeben", true); return; }
        pens = [+ph.value, +pa.value];
      }
      store().setKnockoutResult(g.game, res, "manuell", pens);
      renderAll(); toast("Resultat gespeichert — Bracket & Trip aktualisiert");
    });
    wrap.append(ih, el("span", "x", ":"), ia, ph, el("span", "x", ":"), pa, save);
    return wrap;
  }

  // =====================================================================
  // VIEW: KARTE (nur kommende Spiele + Nati-Route)
  // =====================================================================
  function initMap() {
    if (state.mapInit || typeof L === "undefined") return;
    state.mapInit = true;
    state.map = L.map("map", { scrollWheelZoom: true, zoomControl: true }).setView([38, -96], 4);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18, attribution: "&copy; OpenStreetMap &copy; CARTO", subdomains: "abcd"
    }).addTo(state.map);
    renderMapLayers();
  }
  let mapLayers = [];
  function renderMapLayers() {
    if (!state.map) return;
    mapLayers.forEach(l => state.map.removeLayer(l)); mapLayers = [];
    const k = eng().resolveKnockout();
    const now = Date.now();
    const st = swissStatus();

    // kommende Spiele je Stadion
    const byVenue = {};
    store().data.knockout.forEach(g => {
      if (store().knockoutResult(g.game).result || kickoffUTC(g) <= now) return;
      (byVenue[g.venue] = byVenue[g.venue] || []).push(g);
    });

    const bounds = [];
    Object.keys(byVenue).forEach(vid => {
      const s = store().stadiumById(vid);
      const games = byVenue[vid];
      const suiHere = games.some(g => {
        const r = k.resolved[g.game];
        return r.home.code === "SUI" || r.away.code === "SUI";
      });
      const icon = L.divIcon({
        className: "", iconSize: [0, 0],
        html: "<div class='pin" + (suiHere ? " sui" : "") + "'>" + esc(s.metro) + " <span class='n'>" + games.length + "</span></div>"
      });
      const mk = L.marker([s.lat, s.lng], { icon }).addTo(state.map);
      let pop = "<b>" + esc(s.name) + "</b><div class='muted' style='font-size:11px;margin-bottom:6px'>" + esc(s.metro) + " · ✈ " + s.airport + "</div>";
      games.sort((x, y) => kickoffUTC(x) - kickoffUTC(y)).forEach(g => {
        const h = sideCand(g, "home", k), a = sideCand(g, "away", k);
        const hn = h.code ? flag(h.code) + " " + team(h.code).name : "offen";
        const an = a.code ? flag(a.code) + " " + team(a.code).name : "offen";
        pop += "<div class='pop-match'><span class='d'>" + fmtWhen(g) + " " + g.timeLocal + "</span><span>" + PHASE_LABEL[g.phase] + ": " + hn + " – " + an + "</span></div>";
      });
      mk.bindPopup(pop, { maxWidth: 340 });
      mapLayers.push(mk);
      bounds.push([s.lat, s.lng]);
    });

    // Nati-Route (kommend)
    if (!st.eliminated) {
      const chain = st.next ? [st.next.g].concat(st.path) : [];
      const pts = chain.map(g => { const s = stadium(g); return [s.lat, s.lng]; });
      if (pts.length > 1) {
        const line = L.polyline(pts, { color: "#ff3b3b", weight: 3, opacity: .85, className: "sui-route" }).addTo(state.map);
        mapLayers.push(line);
      }
    }
    if (bounds.length) state.map.fitBounds(bounds, { padding: [60, 60] });
  }

  // =====================================================================
  // Navigation, Merge, Toast, Init
  // =====================================================================
  function setView(v) {
    state.view = v;
    $$(".nav-btn").forEach(b => b.classList.toggle("active", b.dataset.view === v));
    $$(".view").forEach(s => s.hidden = (s.id !== "view-" + v));
    if (v === "map") { initMap(); setTimeout(() => { state.map && state.map.invalidateSize(); renderMapLayers(); }, 60); }
  }
  function renderAll() {
    renderTrip();
    renderBracket();
    if (state.mapInit) renderMapLayers();
  }
  async function runMerge() {
    const btn = $("#mergeBtn"); btn.disabled = true; const old = btn.innerHTML;
    try {
      const sum = await store().mergeFromWikipedia(msg => { btn.textContent = "↻ " + msg; });
      renderAll();
      toast(sum.updated + " neue Resultate übernommen" + (sum.errors.length ? " · " + sum.errors.length + " Quellen nicht erreichbar" : "") + " — alles aktualisiert.");
    } catch (e) { toast("Aktualisierung fehlgeschlagen: " + e.message, true); }
    finally { btn.disabled = false; btn.innerHTML = old; }
  }
  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    t.classList.toggle("err", !!isErr);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
  }

  async function init() {
    await store().load();
    $("#asOfLine").textContent = "WM 2026 · Stand " + store().data._readme.seedMeta.asOf + " · Daten: Wikipedia/FIFA";
    $$(".nav-btn").forEach(b => b.addEventListener("click", () => setView(b.dataset.view)));
    $("#mergeBtn").addEventListener("click", runMerge);
    renderAll();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
