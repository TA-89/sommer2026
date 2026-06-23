/* =========================================================================
   engine.js — Berechnungs-Engine
   - Gruppentabellen inkl. FIFA-Tiebreaker (Pkt, TD, Tore, Direktvergleich)
   - Ranking der Gruppendritten + offizielle Zuordnung (Matrix-Matching)
   - rekursive Auflösung der K.o.-Platzhalter (1X/2X/3<set>/Wnn/Lnn)
   Status je Auflösung: 'final' | 'projected' | 'open'
   ========================================================================= */
(function () {
  "use strict";
  const S = () => window.WC.store;

  // Eligible-Sets der 8 Drittplatzierten-Slots (aus offizieller Bracket-Struktur)
  const THIRD_SLOTS = {
    74: ["A","B","C","D","F"], 77: ["C","D","F","G","H"], 79: ["C","E","F","H","I"],
    80: ["E","H","I","J","K"], 81: ["B","E","F","I","J"], 82: ["A","E","H","I","J"],
    85: ["E","F","G","I","J"], 87: ["D","E","I","J","L"]
  };

  function blankRow(code) {
    return { code, played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 };
  }

  // ----------------------------------------------------- Gruppentabelle
  function groupTable(groupId) {
    const grp = S().data.groups[groupId];
    const rows = {};
    // Teams der Gruppe initialisieren
    S().data.teams.filter(t => t.group === groupId).forEach(t => rows[t.code] = blankRow(t.code));
    let played = 0;
    grp.matches.forEach(m => {
      const eff = S().effectiveGroupResult(m);
      if (!eff.result) return;
      played++;
      const [h, a] = eff.result;
      const rh = rows[m.home], ra = rows[m.away];
      if (!rh || !ra) return;
      rh.played++; ra.played++;
      rh.gf += h; rh.ga += a; ra.gf += a; ra.ga += h;
      if (h > a) { rh.w++; ra.l++; rh.pts += 3; }
      else if (h < a) { ra.w++; rh.l++; ra.pts += 3; }
      else { rh.d++; ra.d++; rh.pts += 1; ra.pts += 1; }
    });
    Object.values(rows).forEach(r => r.gd = r.gf - r.ga);

    const list = Object.values(rows);
    list.sort((x, y) => compareTeams(x, y, grp.matches));
    const complete = grp.matches.every(m => S().effectiveGroupResult(m).result);
    list.forEach((r, i) => { r.rank = i + 1; });
    return { rows: list, complete, played, anyPlayed: played > 0 };
  }

  // Tiebreaker: Pkt -> TD -> Tore -> Direktvergleich (Pkt/TD/Tore) -> Code (statt Losentscheid)
  function compareTeams(a, b, matches) {
    if (b.pts !== a.pts) return b.pts - a.pts;
    if (b.gd !== a.gd) return b.gd - a.gd;
    if (b.gf !== a.gf) return b.gf - a.gf;
    const h2h = headToHead([a.code, b.code], matches);
    const ha = h2h[a.code], hb = h2h[b.code];
    if (ha && hb) {
      if (hb.pts !== ha.pts) return hb.pts - ha.pts;
      if (hb.gd !== ha.gd) return hb.gd - ha.gd;
      if (hb.gf !== ha.gf) return hb.gf - ha.gf;
    }
    return a.code < b.code ? -1 : 1; // deterministischer Fallback (statt Fairplay/Los)
  }

  function headToHead(codes, matches) {
    const set = new Set(codes);
    const r = {}; codes.forEach(c => r[c] = blankRow(c));
    matches.forEach(m => {
      if (!set.has(m.home) || !set.has(m.away)) return;
      const eff = S().effectiveGroupResult(m);
      if (!eff.result) return;
      const [h, a] = eff.result;
      r[m.home].gf += h; r[m.home].ga += a; r[m.away].gf += a; r[m.away].ga += h;
      if (h > a) r[m.home].pts += 3; else if (h < a) r[m.away].pts += 3;
      else { r[m.home].pts++; r[m.away].pts++; }
    });
    Object.values(r).forEach(x => x.gd = x.gf - x.ga);
    return r;
  }

  // -------------------------------------- Gruppensieger / -zweiter (mit Status)
  function rankedTeam(groupId, rank) {
    const t = groupTable(groupId);
    const row = t.rows[rank - 1];
    if (!row) return { code: null, status: "open", label: rank + groupId };
    let status = t.complete ? "final" : (t.anyPlayed ? "projected" : "open");
    return { code: row.code, status, row, label: rank + groupId };
  }

  // -------------------------------------- Drittplatzierten-Ranking & Zuordnung
  function thirdPlaceRanking() {
    const thirds = [];
    S().GROUP_IDS.forEach(g => {
      const t = groupTable(g);
      const row = t.rows[2];
      if (row) thirds.push(Object.assign({ group: g, complete: t.complete }, row));
    });
    thirds.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      if (b.gd !== a.gd) return b.gd - a.gd;
      if (b.gf !== a.gf) return b.gf - a.gf;
      return a.group < b.group ? -1 : 1;
    });
    return thirds;
  }

  // Liefert {gameNumber: groupLetter} via Constraint-Matching der besten 8 Dritten
  // auf die Eligible-Sets. Status: 'final' wenn alle Gruppen fertig, sonst 'projected'/'open'.
  function thirdPlaceAssignment() {
    const allComplete = S().GROUP_IDS.every(g => groupTable(g).complete);
    const anyPlayed = S().GROUP_IDS.some(g => groupTable(g).anyPlayed);
    const ranking = thirdPlaceRanking();
    const qualifyingGroups = ranking.slice(0, 8).map(r => r.group);

    // bipartites Matching: jeder Slot bekommt genau eine qualifizierte Gruppe (eligible)
    const games = Object.keys(THIRD_SLOTS).map(Number);
    const assign = {};
    const usedGroups = new Set();
    function backtrack(i) {
      if (i === games.length) return true;
      const game = games[i];
      const opts = THIRD_SLOTS[game].filter(g => qualifyingGroups.indexOf(g) !== -1 && !usedGroups.has(g));
      for (const g of opts) {
        assign[game] = g; usedGroups.add(g);
        if (backtrack(i + 1)) return true;
        usedGroups.delete(g); delete assign[game];
      }
      return false;
    }
    const ok = (qualifyingGroups.length === 8) && backtrack(0);
    const status = !anyPlayed ? "open" : (allComplete && ok ? "final" : "projected");
    return { assign: ok ? assign : {}, qualifyingGroups, ranking, status, resolvable: ok };
  }

  // ----------------------------------------- K.o.-Auflösung (rekursiv, memoisiert)
  function resolveKnockout() {
    const data = S().data;
    const byGame = {}; data.knockout.forEach(k => byGame[k.game] = k);
    const tpa = thirdPlaceAssignment();
    const cache = {};

    function token(tok, game) {
      let m;
      if ((m = /^1([A-L])$/.exec(tok))) return rankedTeam(m[1], 1);
      if ((m = /^2([A-L])$/.exec(tok))) return rankedTeam(m[1], 2);
      if (/^3[A-L]+$/.test(tok)) {
        const grp = tpa.assign[game];
        if (!grp) return { code: null, status: tpa.status === "open" ? "open" : "projected", label: tok };
        const third = rankedTeam(grp, 3);
        return { code: third.code, status: worst(third.status, tpa.status), label: tok, viaGroup: grp };
      }
      if ((m = /^W(\d+)$/.exec(tok))) return winnerOf(+m[1], true);
      if ((m = /^L(\d+)$/.exec(tok))) return winnerOf(+m[1], false);
      return { code: null, status: "open", label: tok };
    }

    function winnerOf(game, wantWinner) {
      const key = (wantWinner ? "W" : "L") + game;
      if (cache[key]) return cache[key];
      cache[key] = { code: null, status: "open", label: (wantWinner ? "W" : "L") + game }; // Rekursionsschutz
      const k = byGame[game];
      if (!k) return cache[key];
      const home = token(k.home, game);
      const away = token(k.away, game);
      const r = S().knockoutResult(game).result;
      let out;
      if (r && home.code && away.code) {
        const homeWins = r[0] > r[1]; // (Elfmeter werden vereinfachend ignoriert)
        const pick = (homeWins === wantWinner) ? home : away;
        out = { code: pick.code, status: worst("final", home.status, away.status), label: pick.label };
      } else {
        out = { code: null, status: "open", label: (wantWinner ? "Sieger " : "Verlierer ") + game };
      }
      cache[key] = out;
      return out;
    }

    // Auflösung je K.o.-Spiel (home/away) + Sieger/Verlierer pro Spiel
    const resolved = {}, winners = {}, losers = {};
    data.knockout.forEach(k => {
      resolved[k.game] = { home: token(k.home, k.game), away: token(k.away, k.game) };
    });
    data.knockout.forEach(k => { winners[k.game] = winnerOf(k.game, true); losers[k.game] = winnerOf(k.game, false); });
    return { resolved, thirdPlace: tpa, winners, losers };
  }

  function worst() {
    const order = { final: 0, projected: 1, open: 2 };
    let w = "final";
    for (const a of arguments) if (order[a] > order[w]) w = a;
    return w;
  }

  // Bequeme Anzeige: token -> {code,name,status,label}
  function describe(res) {
    if (!res) return { text: "—", status: "open" };
    if (res.code) {
      const t = S().teamByCode(res.code);
      return { code: res.code, name: t.name, confed: t.confed, status: res.status,
               text: t.name + (res.status === "projected" ? " (provisorisch)" : "") };
    }
    return { code: null, status: res.status, text: res.label || "offen" };
  }

  window.WC = window.WC || {};
  window.WC.engine = {
    THIRD_SLOTS,
    groupTable,
    rankedTeam,
    thirdPlaceRanking,
    thirdPlaceAssignment,
    resolveKnockout,
    describe,
    worst
  };
})();
