(function () {
  "use strict";
  const data = window.HUANG_DEMO_DATA;
  if (!data) return;

  const NS = "http://www.w3.org/2000/svg";
  const accent = "#1f7a8c";
  const secondary = "#866f48";
  const muted = "#c9c3c6";

  function el(tag, attributes = {}, text = "") {
    const node = document.createElementNS(NS, tag);
    Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, value));
    if (text) node.textContent = text;
    return node;
  }

  function extent(values) {
    return [Math.min(...values), Math.max(...values)];
  }

  function normalize(value, values, reverse = false) {
    const [low, high] = extent(values);
    const scaled = high === low ? 1 : (value - low) / (high - low);
    return reverse ? 1 - scaled : scaled;
  }

  const kdInput = document.getElementById("kd-filter");
  const aucInput = document.getElementById("auc-filter");
  const enrichmentInput = document.getElementById("enrichment-filter");
  const replicateInput = document.getElementById("replicate-filter");
  const lensInput = document.getElementById("ranking-lens");
  const candidatePlot = document.getElementById("candidate-plot");
  const candidateTable = document.getElementById("candidate-table");
  const candidateReadout = document.getElementById("candidate-readout");

  const weights = {
    balanced: { affinity: 0.35, auc: 0.25, enrichment: 0.20, reproducibility: 0.10, structure: 0.10 },
    affinity: { affinity: 0.55, auc: 0.20, enrichment: 0.10, reproducibility: 0.10, structure: 0.05 },
    kinetics: { affinity: 0.25, auc: 0.50, enrichment: 0.10, reproducibility: 0.10, structure: 0.05 },
    screen: { affinity: 0.25, auc: 0.15, enrichment: 0.40, reproducibility: 0.10, structure: 0.10 }
  };

  function candidateScore(candidate, lens) {
    const w = weights[lens];
    const affinity = normalize(Math.log10(candidate.kd), data.binders.map(item => Math.log10(item.kd)), true);
    const auc = normalize(candidate.auc, data.binders.map(item => item.auc));
    const enrichment = normalize(candidate.enrichment, data.binders.map(item => item.enrichment));
    const reproducibility = normalize(candidate.replicates, data.binders.map(item => item.replicates));
    const iptm = candidate.iptm === null ? 0 : normalize(candidate.iptm, data.binders.map(item => item.iptm));
    const ddg = candidate.ddg === null ? 0 : normalize(candidate.ddg, data.binders.map(item => item.ddg), true);
    const structure = (iptm + ddg) / 2;
    return 100 * (w.affinity * affinity + w.auc * auc + w.enrichment * enrichment + w.reproducibility * reproducibility + w.structure * structure);
  }

  function drawCandidatePlot(shortlist) {
    candidatePlot.replaceChildren();
    const width = 700, height = 390, left = 62, right = 20, top = 24, bottom = 54;
    const plotW = width - left - right, plotH = height - top - bottom;
    const xMin = 1.5, xMax = 3.8, yMin = 13, yMax = 32;
    const x = value => left + (Math.log10(value) - xMin) / (xMax - xMin) * plotW;
    const y = value => top + (yMax - value) / (yMax - yMin) * plotH;
    const passIds = new Set(shortlist.map(item => item.id));

    [30, 100, 300, 1000, 3000].forEach(tick => {
      const px = x(tick);
      candidatePlot.appendChild(el("line", { x1:px, y1:top, x2:px, y2:top + plotH, class:"grid-line" }));
      candidatePlot.appendChild(el("text", { x:px, y:height - 31, "text-anchor":"middle", class:"tick-label" }, tick >= 1000 ? `${tick / 1000}k` : String(tick)));
    });
    [15, 20, 25, 30].forEach(tick => {
      const py = y(tick);
      candidatePlot.appendChild(el("line", { x1:left, y1:py, x2:left + plotW, y2:py, class:"grid-line" }));
      candidatePlot.appendChild(el("text", { x:left - 10, y:py + 4, "text-anchor":"end", class:"tick-label" }, String(tick)));
    });
    candidatePlot.appendChild(el("line", { x1:left, y1:top + plotH, x2:left + plotW, y2:top + plotH, class:"axis-line" }));
    candidatePlot.appendChild(el("line", { x1:left, y1:top, x2:left, y2:top + plotH, class:"axis-line" }));
    candidatePlot.appendChild(el("text", { x:left + plotW / 2, y:height - 8, "text-anchor":"middle", class:"axis-label" }, "Median Kd (nM, log scale) → weaker"));
    candidatePlot.appendChild(el("text", { x:14, y:top + plotH / 2, transform:`rotate(-90 14 ${top + plotH / 2})`, "text-anchor":"middle", class:"axis-label" }, "Dissociation AUC (s) → slower"));

    data.binders.forEach(candidate => {
      const passing = passIds.has(candidate.id);
      const circle = el("circle", {
        cx:x(candidate.kd), cy:y(candidate.auc), r:passing ? 6.2 : 4.2,
        fill:passing ? accent : muted, opacity:passing ? 1 : .72,
        tabindex:"0", role:"button", "aria-label":`${candidate.id}, Kd ${candidate.kd} nanomolar, AUC ${candidate.auc} seconds`
      });
      circle.addEventListener("click", () => selectSecForCandidate(candidate.id));
      circle.addEventListener("keydown", event => { if (event.key === "Enter" || event.key === " ") selectSecForCandidate(candidate.id); });
      circle.appendChild(el("title", {}, `${candidate.id}: ${candidate.kd.toFixed(0)} nM; AUC ${candidate.auc.toFixed(1)} s; enrichment ${candidate.enrichment.toFixed(2)}`));
      candidatePlot.appendChild(circle);
      if (passing) candidatePlot.appendChild(el("text", { x:x(candidate.kd) + 8, y:y(candidate.auc) - 7, class:"point-label" }, candidate.id));
    });
  }

  function updateCandidates() {
    const maxKd = Number(kdInput.value);
    const minAuc = Number(aucInput.value);
    const minEnrichment = Number(enrichmentInput.value);
    const minReplicates = Number(replicateInput.value);
    document.getElementById("kd-output").textContent = `${maxKd.toLocaleString()} nM`;
    document.getElementById("auc-output").textContent = `${minAuc} s`;
    document.getElementById("enrichment-output").textContent = minEnrichment.toFixed(2).replace(/0$/, "");
    document.getElementById("replicate-output").textContent = minReplicates;

    const shortlist = data.binders
      .filter(candidate => candidate.kd <= maxKd && candidate.auc >= minAuc && candidate.enrichment >= minEnrichment && candidate.replicates >= minReplicates)
      .map(candidate => ({ ...candidate, score: candidateScore(candidate, lensInput.value) }))
      .sort((a, b) => b.score - a.score);

    candidateTable.replaceChildren();
    shortlist.forEach((candidate, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `<td>${index + 1}</td><td><button class="candidate-button" type="button">${candidate.id}</button></td><td>${candidate.kd.toFixed(0)} nM</td><td>${candidate.auc.toFixed(1)} s</td><td>${candidate.enrichment.toFixed(2)}</td><td>${candidate.replicates}</td><td>${candidate.score.toFixed(0)}</td>`;
      row.querySelector("button").addEventListener("click", () => selectSecForCandidate(candidate.id));
      candidateTable.appendChild(row);
    });
    if (!shortlist.length) {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="7">No candidate passes every active cutoff.</td>`;
      candidateTable.appendChild(row);
    }

    const enriched = data.screen.filter(item => item.enrichment >= minEnrichment);
    const detected = enriched.filter(item => item.detected);
    document.getElementById("screen-confirmed").textContent = `${detected.length} / ${enriched.length}`;
    document.getElementById("shortlist-count").textContent = shortlist.length;
    document.getElementById("screen-note").textContent = `At the current enrichment gate, ${enriched.length} designs look strong by screen enrichment, but only ${detected.length} are in the harmonized detected-binder set. Quantitative in-vitro evidence changes the selection before expensive follow-up.`;
    const ids = shortlist.map(item => item.id).join(", ") || "none";
    candidateReadout.innerHTML = `<strong>${shortlist.length} candidates pass.</strong> Current order: ${ids}. The score only orders candidates that already pass every cutoff; it cannot rescue a failed evidence gate.`;
    drawCandidatePlot(shortlist);
  }

  [kdInput, aucInput, enrichmentInput, replicateInput].forEach(input => input.addEventListener("input", updateCandidates));
  lensInput.addEventListener("change", updateCandidates);

  const secPlot = document.getElementById("sec-plot");
  const secOptions = document.getElementById("sec-options");
  const secReadout = document.getElementById("sec-readout");
  const secButtons = new Map();

  function drawSec(profile) {
    secPlot.replaceChildren();
    const width = 700, height = 330, left = 58, right = 20, top = 18, bottom = 50;
    const plotW = width - left - right, plotH = height - top - bottom;
    const x = value => left + value / 19.2 * plotW;
    const y = value => top + (1 - value) * plotH;
    [0, 5, 10, 15].forEach(tick => {
      const px = x(tick);
      secPlot.appendChild(el("line", { x1:px, y1:top, x2:px, y2:top + plotH, class:"grid-line" }));
      secPlot.appendChild(el("text", { x:px, y:height - 27, "text-anchor":"middle", class:"tick-label" }, String(tick)));
    });
    [0, .25, .5, .75, 1].forEach(tick => {
      const py = y(tick);
      secPlot.appendChild(el("line", { x1:left, y1:py, x2:left + plotW, y2:py, class:"grid-line" }));
      secPlot.appendChild(el("text", { x:left - 9, y:py + 4, "text-anchor":"end", class:"tick-label" }, tick.toFixed(2).replace("0.", ".")));
    });
    const points = profile.points.map(point => `${x(point[0])},${y(point[1])}`).join(" ");
    secPlot.appendChild(el("polyline", { points, fill:"none", stroke:accent, "stroke-width":"2.4", "stroke-linejoin":"round" }));
    secPlot.appendChild(el("line", { x1:x(profile.peak), y1:top, x2:x(profile.peak), y2:top + plotH, stroke:secondary, "stroke-dasharray":"4 4" }));
    secPlot.appendChild(el("text", { x:left + plotW / 2, y:height - 6, "text-anchor":"middle", class:"axis-label" }, "Elution volume (reported x-axis units)"));
    secPlot.appendChild(el("text", { x:14, y:top + plotH / 2, transform:`rotate(-90 14 ${top + plotH / 2})`, "text-anchor":"middle", class:"axis-label" }, "Normalized signal"));
  }

  function selectSec(name) {
    const profile = data.sec.find(item => item.name === name);
    if (!profile) return;
    secButtons.forEach((button, key) => button.classList.toggle("active", key === name));
    drawSec(profile);
    secReadout.innerHTML = `<strong>${profile.name}</strong> peaks at ${profile.peak.toFixed(2)} on the reported x-axis. ${profile.prePeakFraction.toFixed(1)}% of positive integrated signal lies earlier than 0.8 units before the main peak; treat this as a trace-shape flag, not an aggregate call.`;
  }

  function selectSecForCandidate(identifier) {
    const name = `${identifier}-meGFP`;
    if (data.sec.some(item => item.name === name)) {
      selectSec(name);
      document.getElementById("a2").scrollIntoView({ behavior:"smooth" });
    }
  }

  data.sec.filter(item => item.name !== "meGFP").forEach(profile => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = profile.name.replace("-meGFP", "");
    button.addEventListener("click", () => selectSec(profile.name));
    secOptions.appendChild(button);
    secButtons.set(profile.name, button);
  });

  const displacementInput = document.getElementById("displacement-filter");
  const conformerPlot = document.getElementById("conformer-plot");
  const conformerReadout = document.getElementById("conformer-readout");

  function updateConformers() {
    const threshold = Number(displacementInput.value);
    document.getElementById("displacement-output").textContent = `${threshold.toFixed(2).replace(/0$/, "")} Å`;
    conformerPlot.replaceChildren();
    const width = 700, height = 330, left = 58, right = 20, top = 18, bottom = 50;
    const plotW = width - left - right, plotH = height - top - bottom;
    const residues = data.conformers.residues;
    const x = value => left + (value - 1) / 158 * plotW;
    const y = value => top + (10 - value) / 10 * plotH;
    [0, 2, 4, 6, 8, 10].forEach(tick => {
      const py = y(tick);
      conformerPlot.appendChild(el("line", { x1:left, y1:py, x2:left + plotW, y2:py, class:"grid-line" }));
      conformerPlot.appendChild(el("text", { x:left - 9, y:py + 4, "text-anchor":"end", class:"tick-label" }, String(tick)));
    });
    [1, 40, 80, 120, 159].forEach(tick => {
      const px = x(tick);
      conformerPlot.appendChild(el("text", { x:px, y:height - 27, "text-anchor":"middle", class:"tick-label" }, String(tick)));
    });
    conformerPlot.appendChild(el("line", { x1:left, y1:y(threshold), x2:left + plotW, y2:y(threshold), stroke:secondary, "stroke-dasharray":"4 4" }));
    const points = residues.map(item => `${x(item.residue)},${y(item.displacement)}`).join(" ");
    conformerPlot.appendChild(el("polyline", { points, fill:"none", stroke:accent, "stroke-width":"1.8" }));
    residues.filter(item => item.displacement >= threshold).forEach(item => conformerPlot.appendChild(el("circle", { cx:x(item.residue), cy:y(item.displacement), r:"2.8", fill:secondary })));
    conformerPlot.appendChild(el("text", { x:left + plotW / 2, y:height - 6, "text-anchor":"middle", class:"axis-label" }, "DHFR residue"));
    conformerPlot.appendChild(el("text", { x:14, y:top + plotH / 2, transform:`rotate(-90 14 ${top + plotH / 2})`, "text-anchor":"middle", class:"axis-label" }, "Aligned Cα displacement (Å)"));
    const flagged = residues.filter(item => item.displacement >= threshold);
    const topHits = [...flagged].sort((a, b) => b.displacement - a.displacement).slice(0, 7).map(item => `${item.chain}${item.residue} (${item.displacement.toFixed(2)} Å)`).join(", ");
    conformerReadout.innerHTML = `<strong>${flagged.length} of ${residues.length} positions exceed ${threshold.toFixed(2)} Å.</strong> Largest flagged shifts: ${topHits || "none"}.`;
  }

  displacementInput.addEventListener("input", updateConformers);
  updateCandidates();
  selectSec("s19382-meGFP");
  updateConformers();
}());
