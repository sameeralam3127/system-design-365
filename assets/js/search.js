/**
 * sd365 search engine — full-text search with no service and no dependencies.
 *
 * How it works, in the order the query travels:
 *
 *  1. INDEXING (once, on first open)
 *     Every page is split into scoring units — one per heading section, so a
 *     hit resolves to `#anchor` instead of the top of a long document. Each
 *     unit's text is tokenised, light-stemmed, and pushed into an inverted
 *     index (token -> postings) so a query touches only the documents that
 *     actually contain its terms, never all of them.
 *
 *  2. QUERY EXPANSION
 *     Terms are normalised and stemmed the same way as the index, then
 *     expanded three ways, each with a confidence multiplier:
 *       exact token (1.0) > prefix, for as-you-type (0.65) > one-edit
 *       typo including adjacent transpositions (0.35)
 *     Domain synonyms ("db" -> "database", "lb" -> "load balancer") are
 *     expanded too, so vocabulary mismatch doesn't cost a result.
 *
 *  3. RANKING — BM25F
 *     Okapi BM25 with per-field weights: term frequency saturates (k1) so
 *     repetition stops paying, and length normalisation (b) stops long
 *     sections from dominating short precise ones. IDF is computed over
 *     units, so a term appearing everywhere contributes little.
 *
 *  4. BONUSES
 *     Exact phrase presence, whole-title match, and heading matches are
 *     boosted; pages that aren't written yet are demoted so they never
 *     outrank real content.
 *
 * Complexity is O(postings for the query terms), not O(corpus), and a query
 * over this corpus resolves in well under a millisecond.
 */
(function (global) {
  "use strict";

  // BM25 parameters. k1 controls how fast term-frequency saturates; b is how
  // strongly length is normalised. These are the usual well-behaved defaults.
  var K1 = 1.4;
  var B = 0.72;

  // Field weights (BM25F). A term in a title says far more about relevance
  // than the same term buried in prose.
  var FIELD_W = { title: 9, tags: 6, heading: 4.5, body: 1 };
  var FIELDS = ["title", "tags", "heading", "body"];

  var QUALITY = { exact: 1, prefix: 0.65, fuzzy: 0.35 };
  var MAX_RESULTS = 20;
  var MAX_EXPANSIONS = 12; // cap prefix/fuzzy fan-out per term

  // Domain vocabulary: how people search vs how the notes are written.
  var SYNONYMS = {
    db: ["database"], dbs: ["database"],
    lb: ["load", "balancer"], k8s: ["kubernetes"], cdn: ["cache", "edge"],
    ratelimit: ["rate", "limiter"], ratelimiter: ["rate", "limiter"],
    ha: ["availability"], sla: ["availability"], qps: ["throughput"],
    rps: ["throughput"], pubsub: ["queue", "messaging"], mq: ["queue"],
    sql: ["relational"], nosql: ["cassandra", "dynamodb"],
    ws: ["websocket"], websockets: ["websocket"],
    auth: ["authentication"], authz: ["authorization"],
    idempotency: ["idempotent"], shard: ["sharding", "partition"],
    partitioning: ["partition", "sharding"], eventual: ["consistency"],
  };

  var STOP = { a: 1, an: 1, and: 1, are: 1, as: 1, at: 1, be: 1, by: 1, for: 1,
    from: 1, how: 1, in: 1, is: 1, it: 1, of: 1, on: 1, or: 1, that: 1, the: 1,
    to: 1, was: 1, what: 1, with: 1 };

  function norm(s) {
    return String(s == null ? "" : s).toLowerCase();
  }

  /** Split text into raw tokens. Keeps +, #, and . so "c++" and ".pyc" survive. */
  function tokenize(text) {
    return norm(text).split(/[^a-z0-9+#.]+/).filter(Boolean);
  }

  /**
   * Conservative suffix stripper. Correctness as English morphology matters
   * less than applying the exact same transform to index and query, which is
   * what makes "sharding" find "shard". Guarded so short words are left be.
   */
  function stem(w) {
    if (w.length < 5) return w;
    var out = w;
    if (/ies$/.test(out)) out = out.slice(0, -3) + "y";
    else if (/(sses|shes|ches|xes)$/.test(out)) out = out.slice(0, -2);
    else if (/[^s]s$/.test(out)) out = out.slice(0, -1);
    if (out.length > 5) {
      if (/ing$/.test(out)) out = out.slice(0, -3);
      else if (/edly$|ingly$/.test(out)) out = out.replace(/(edly|ingly)$/, "");
      else if (/ed$/.test(out)) out = out.slice(0, -2);
      else if (/ly$/.test(out)) out = out.slice(0, -2);
    }
    return out.length >= 3 ? out : w;
  }

  /**
   * One edit apart: insertion, deletion, substitution, or a swap of adjacent
   * characters. Transpositions matter — "reids" for "redis" is one of the
   * most common typing slips, and plain edit distance calls it two edits.
   */
  function withinOneEdit(a, b) {
    if (a === b) return true;
    var la = a.length, lb = b.length;
    if (Math.abs(la - lb) > 1) return false;

    if (la === lb) {
      var d = [];
      for (var i = 0; i < la; i++) {
        if (a[i] !== b[i]) { d.push(i); if (d.length > 2) return false; }
      }
      if (d.length <= 1) return true;
      return d[1] === d[0] + 1 && a[d[0]] === b[d[1]] && a[d[1]] === b[d[0]];
    }

    var shortS = la < lb ? a : b, longS = la < lb ? b : a;
    var si = 0, li = 0, skipped = false;
    while (si < shortS.length && li < longS.length) {
      if (shortS[si] === longS[li]) { si++; li++; continue; }
      if (skipped) return false;
      skipped = true;
      li++;
    }
    return true;
  }

  /* ------------------------------------------------------------------
     Index construction
     ------------------------------------------------------------------ */

  /**
   * @param {Array} docs records emitted by the search-index plugin
   * @returns index consumed by search()
   */
  function prepare(docs) {
    var units = [];        // one per heading section (or one per page)
    var unitsByDoc = [];   // docId -> [unitId]
    // Two scopes, deliberately kept apart. Page fields (title, tags) describe
    // the whole document, so they must lift the page without influencing
    // *which* section is the best answer — otherwise a tag present in every
    // section decides the anchor, and the shortest section always wins.
    var invDoc = {};       // stem -> [{d: docId, f, tf}]
    var invUnit = {};      // stem -> [{u: unitId, f, tf}]
    var totalLen = 0;

    docs.forEach(function (d, docId) {
      d._t = norm(d.t);
      d._g = norm((d.g || []).join(" "));
      unitsByDoc[docId] = [];

      add(invDoc, "d", docId, 0, tokenize(d.t).map(stem));
      add(invDoc, "d", docId, 1, tokenize((d.g || []).join(" ")).map(stem));

      var parts = (d.h && d.h.length)
        ? d.h.map(function (s) { return { heading: s.t, anchor: s.a, text: s.x }; })
        : [{ heading: null, anchor: null, text: d.x || "" }];

      parts.forEach(function (part) {
        var headTokens = part.heading ? tokenize(part.heading).map(stem) : [];
        var bodyTokens = tokenize(part.text).map(stem);

        units.push({
          docId: docId,
          section: part.heading ? { t: part.heading, a: part.anchor, x: part.text } : null,
          _text: norm((part.heading || "") + " " + part.text), // phrase checks
          len: bodyTokens.length + headTokens.length,
        });
        var unitId = units.length - 1;
        unitsByDoc[docId].push(unitId);
        totalLen += units[unitId].len;

        add(invUnit, "u", unitId, 2, headTokens);
        add(invUnit, "u", unitId, 3, bodyTokens);
      });
    });

    function add(target, key, id, fieldIdx, tokens) {
      if (!tokens.length) return;
      var counts = {};
      for (var i = 0; i < tokens.length; i++) counts[tokens[i]] = (counts[tokens[i]] || 0) + 1;
      for (var tok in counts) {
        var posting = { f: fieldIdx, tf: counts[tok] };
        posting[key] = id;
        (target[tok] || (target[tok] = [])).push(posting);
      }
    }

    // Sorted vocabulary powers prefix scans and fuzzy candidate generation.
    var vocabSet = {};
    Object.keys(invDoc).forEach(function (t) { vocabSet[t] = 1; });
    Object.keys(invUnit).forEach(function (t) { vocabSet[t] = 1; });
    var vocab = Object.keys(vocabSet).sort();

    // Document frequency over units, for IDF.
    var df = {};
    vocab.forEach(function (tok) {
      var seen = {}, n = 0;
      (invUnit[tok] || []).forEach(function (p) { if (!seen[p.u]) { seen[p.u] = 1; n++; } });
      (invDoc[tok] || []).forEach(function (p) {
        (unitsByDoc[p.d] || []).forEach(function (u) { if (!seen[u]) { seen[u] = 1; n++; } });
      });
      df[tok] = n;
    });

    return {
      docs: docs,
      units: units,
      unitsByDoc: unitsByDoc,
      invDoc: invDoc,
      invUnit: invUnit,
      vocab: vocab,
      df: df,
      N: units.length || 1,
      avgLen: units.length ? totalLen / units.length : 1,
    };
  }

  /* ------------------------------------------------------------------
     Query expansion
     ------------------------------------------------------------------ */

  /** Binary search for the first vocabulary entry >= target. */
  function lowerBound(vocab, target) {
    var lo = 0, hi = vocab.length;
    while (lo < hi) {
      var mid = (lo + hi) >> 1;
      if (vocab[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  /**
   * Map one query term onto indexed tokens: itself, tokens it prefixes, and
   * tokens a single typo away. Each variant carries a confidence.
   */
  function expand(index, term) {
    var out = [];
    var seen = {};
    function push(tok, quality) {
      if (seen[tok] === undefined || seen[tok] < quality) {
        seen[tok] = quality;
      }
    }

    var known = index.invUnit[term] || index.invDoc[term];
    if (known) push(term, QUALITY.exact);

    // Prefix: contiguous run in the sorted vocabulary.
    if (term.length >= 2) {
      var i = lowerBound(index.vocab, term);
      var added = 0;
      while (i < index.vocab.length && index.vocab[i].indexOf(term) === 0 && added < MAX_EXPANSIONS) {
        if (index.vocab[i] !== term) { push(index.vocab[i], QUALITY.prefix); added++; }
        i++;
      }
    }

    // Typo tolerance, only when the term isn't already a known token — a
    // correctly spelled query should never be diluted by near-misses.
    if (!known && term.length >= 4) {
      var fuzzed = 0;
      for (var v = 0; v < index.vocab.length && fuzzed < MAX_EXPANSIONS; v++) {
        var tok = index.vocab[v];
        if (Math.abs(tok.length - term.length) > 1) continue;
        if (withinOneEdit(term, tok)) { push(tok, QUALITY.fuzzy); fuzzed++; }
      }
    }

    for (var tok2 in seen) out.push({ token: tok2, quality: seen[tok2] });
    return out;
  }

  /** Normalise, drop stopwords, stem, and apply the synonym dictionary. */
  function queryTerms(query) {
    var raw = tokenize(query);
    var kept = raw.filter(function (t) { return !STOP[t] || raw.length === 1; });
    var groups = [];
    kept.forEach(function (t) {
      var variants = [stem(t)];
      var syn = SYNONYMS[t];
      if (syn) syn.forEach(function (s) { variants.push(stem(s)); });
      groups.push({ raw: t, variants: variants });
    });
    return groups;
  }

  /* ------------------------------------------------------------------
     Ranking
     ------------------------------------------------------------------ */

  function idf(index, token) {
    var n = index.df[token] || 0;
    // Standard BM25 idf with the +1 guard so common terms stay non-negative.
    return Math.log(1 + (index.N - n + 0.5) / (n + 0.5));
  }

  function search(index, query, filter) {
    var q = norm(query).trim();
    var groups = queryTerms(q);
    var docs = index.docs;

    var allowed = null;
    if (filter) {
      allowed = {};
      docs.forEach(function (d, i) { if (d.s === filter) allowed[i] = 1; });
    }

    // Empty query: a browsable sample of real content.
    if (!groups.length) {
      var sample = [];
      for (var i = 0; i < docs.length && sample.length < 12; i++) {
        if (docs[i].p) continue;
        if (allowed && !allowed[i]) continue;
        sample.push({ doc: docs[i], section: null, score: 0, url: docs[i].u });
      }
      return sample;
    }

    // Score each query group independently in both scopes. Variants of a
    // term compete for the best contribution rather than stacking, so an
    // exact hit isn't beaten by three fuzzy ones.
    var docPart = [];   // gi -> { docId: score }
    var unitPart = [];  // gi -> { unitId: score }

    groups.forEach(function (group, gi) {
      var perDoc = {}, perUnit = {};

      group.variants.forEach(function (variant) {
        expand(index, variant).forEach(function (exp) {
          var termIdf = idf(index, exp.token);

          var dp = index.invDoc[exp.token];
          for (var i = 0; dp && i < dp.length; i++) {
            if (allowed && !allowed[dp[i].d]) continue;
            // Page fields aren't length-normalised: a title is a title.
            var dScore = termIdf * dp[i].tf * FIELD_W[FIELDS[dp[i].f]] * exp.quality;
            if (!(perDoc[dp[i].d] > dScore)) perDoc[dp[i].d] = dScore;
          }

          var up = index.invUnit[exp.token];
          for (var k = 0; up && k < up.length; k++) {
            var unit = index.units[up[k].u];
            if (allowed && !allowed[unit.docId]) continue;
            var weighted = up[k].tf * FIELD_W[FIELDS[up[k].f]];
            var normLen = 1 - B + B * (unit.len / index.avgLen);
            var uScore = termIdf * (weighted * (K1 + 1)) / (weighted + K1 * normLen) * exp.quality;
            if (!(perUnit[up[k].u] > uScore)) perUnit[up[k].u] = uScore;
          }
        });
      });

      docPart[gi] = perDoc;
      unitPart[gi] = perUnit;
    });

    // A document qualifies when every query group matched it somewhere —
    // in its page fields or in at least one of its sections.
    var candidates = {};
    groups.forEach(function (g, gi) {
      for (var d in docPart[gi]) candidates[d] = 1;
      for (var u in unitPart[gi]) candidates[index.units[u].docId] = 1;
    });

    var results = [];
    for (var docIdStr in candidates) {
      var docId = Number(docIdStr);
      var doc = docs[docId];
      var myUnits = index.unitsByDoc[docId] || [];

      var pageScore = 0;
      var complete = true;
      for (var gi = 0; gi < groups.length; gi++) {
        var viaPage = docPart[gi][docId];
        var viaUnit = false;
        for (var m = 0; m < myUnits.length; m++) {
          if (unitPart[gi][myUnits[m]] !== undefined) { viaUnit = true; break; }
        }
        if (viaPage === undefined && !viaUnit) { complete = false; break; }
        if (viaPage !== undefined) pageScore += viaPage;
      }
      if (!complete) continue;

      // Pick the section that answers the most of the query. Only section
      // scopes vote, so page-wide tags can't decide the anchor.
      var bestUnit = null, bestUnitScore = 0;
      for (var n = 0; n < myUnits.length; n++) {
        var uid = myUnits[n], sum = 0;
        for (var gj = 0; gj < groups.length; gj++) {
          sum += unitPart[gj][uid] || 0;
        }
        if (sum > bestUnitScore) { bestUnitScore = sum; bestUnit = index.units[uid]; }
      }

      var score = pageScore + bestUnitScore;
      var section = bestUnit ? bestUnit.section : null;
      var entry = { unit: bestUnit || index.units[myUnits[0]] };

      // Exact phrase in the section is strong evidence of intent.
      if (q.indexOf(" ") > 0 && entry.unit && entry.unit._text.indexOf(q) >= 0) score *= 1.35;

      // The query is essentially the page's name: link to the page itself.
      if (doc._t === q) { score += 40; section = null; }
      else if (doc._t.indexOf(q) === 0) { score += 16; section = null; }
      else if (q.indexOf(" ") > 0 && doc._t.indexOf(q) >= 0) score += 8;

      if (doc.p) score *= 0.4; // not written yet

      results.push({
        doc: doc,
        section: section,
        score: score,
        url: doc.u + (section ? "#" + section.a : ""),
      });
    }

    results.sort(function (a, b) {
      return b.score - a.score || a.doc.t.localeCompare(b.doc.t);
    });
    return results.slice(0, MAX_RESULTS);
  }

  /** Plain terms, for highlighting in the UI. */
  function terms(query) {
    var raw = tokenize(query);
    return raw.filter(function (t) { return !STOP[t] || raw.length === 1; });
  }

  /** Text around the first matching term, for the result snippet. */
  function snippet(hit, qTerms) {
    var text = (hit.section ? hit.section.x : hit.doc.x) || "";
    if (!text) return "";
    var low = norm(text), at = -1;
    for (var i = 0; i < qTerms.length; i++) {
      at = low.indexOf(qTerms[i]);
      if (at >= 0) break;
    }
    if (at < 0) return text.slice(0, 130) + (text.length > 130 ? "…" : "");
    var start = Math.max(0, at - 55);
    if (start > 0) {
      var sp = text.indexOf(" ", start);
      if (sp > 0 && sp < start + 15) start = sp + 1;
    }
    return (start > 0 ? "… " : "") + text.slice(start, start + 160).trim() + "…";
  }

  global.SD365Search = {
    prepare: prepare,
    search: search,
    snippet: snippet,
    terms: terms,
    // Exposed for testing.
    _internals: { stem: stem, withinOneEdit: withinOneEdit, tokenize: tokenize },
  };
})(window);
