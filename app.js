/* ─────────────────────────────────────────────
   AquaPredict — Hydrogeological Prediction Engine
   Parametric model based on published field studies
   and hydrogeological principles.
───────────────────────────────────────────── */

// ── Slider live updates ──────────────────────
const SLIDERS = [
  { id: 'rainfall',   out: 'rainfallVal',   fmt: v => v + ' mm' },
  { id: 'elevation',  out: 'elevationVal',  fmt: v => v + ' m' },
  { id: 'bedrock',    out: 'bedrockVal',    fmt: v => v + ' m' },
  { id: 'population', out: 'populationVal', fmt: v => parseInt(v).toLocaleString() },
];
SLIDERS.forEach(({ id, out, fmt }) => {
  const el = document.getElementById(id);
  const op = document.getElementById(out);
  if (!el || !op) return;
  el.addEventListener('input', () => { op.textContent = fmt(el.value); });
});

// ── Hydrogeological Parameter Tables ────────
// Base depth = typical water table depth in meters for that lithology
// Recharge   = relative recharge potential 0–100
// Prod       = aquifer productivity 0–100
const GEOLOGY = {
  alluvial:    { base: 3,  recharge: 75, prod: 85, label: 'Alluvial / Unconsolidated' },
  sandstone:   { base: 8,  recharge: 65, prod: 70, label: 'Sandstone' },
  limestone:   { base: 12, recharge: 60, prod: 80, label: 'Limestone / Karst' },
  basalt:      { base: 15, recharge: 40, prod: 55, label: 'Fractured Basalt' },
  granite:     { base: 22, recharge: 25, prod: 30, label: 'Granite / Hard Rock' },
  clay:        { base: 2,  recharge: 15, prod: 20, label: 'Clay (confining)' },
  laterite:    { base: 10, recharge: 50, prod: 45, label: 'Laterite' },
  shale:       { base: 18, recharge: 15, prod: 20, label: 'Shale' },
};

// Confinement multiplier on depth + productivity adjustment
const CONFINEMENT = {
  unconfined:   { m: 1.00, label: 'Water Table Aquifer (Unconfined)' },
  semiconfined: { m: 0.85, label: 'Semi-Confined Aquifer' },
  confined:     { m: 0.70, label: 'Confined Artesian Aquifer' },
};

// Land use: depth multiplier + recharge delta
const LANDUSE = {
  forest:          { m: 0.65, recharge: +18, label: 'Dense Forest / Wetland' },
  agriculture_irr: { m: 1.20, recharge: +5,  label: 'Irrigated Agriculture' },
  agriculture_rain:{ m: 1.00, recharge: +3,  label: 'Rainfed Agriculture' },
  urban_dense:     { m: 1.55, recharge: -22, label: 'Dense Urban' },
  urban_mixed:     { m: 1.25, recharge: -12, label: 'Mixed Urban/Suburban' },
  industrial:      { m: 1.40, recharge: -18, label: 'Industrial Zone' },
  wasteland:       { m: 1.10, recharge: -5,  label: 'Wasteland / Scrub' },
};

// Season multiplier on depth + trend description
const SEASON = {
  monsoon:      { m: 0.55, trend: 'Rising — peak recharge period (post-rain replenishment)' },
  post_monsoon: { m: 0.75, trend: 'Stabilizing — post-recharge plateau expected' },
  dry:          { m: 1.60, trend: 'Declining — discharge exceeds natural recharge' },
  pre_monsoon:  { m: 1.82, trend: 'At seasonal low — critical dry stress period' },
  coastal_high: { m: 0.60, trend: 'Elevated by tidal backwater pressure (high tide)' },
  coastal_low:  { m: 1.10, trend: 'Reduced — seaward hydraulic gradient dominant' },
};

// Climate zone multiplier
const CLIMATE = {
  humid_tropical: { m: 0.70 },
  semi_arid:      { m: 1.40 },
  arid:           { m: 2.20 },
  mediterranean:  { m: 1.10 },
  temperate:      { m: 0.90 },
  continental:    { m: 1.20 },
};

// Soil permeability multiplier
const PERMEABILITY = {
  high:     { m: 0.70, prodDelta: +15, label: 'High — rapid infiltration' },
  moderate: { m: 1.00, prodDelta:  0,  label: 'Moderate — typical recharge rate' },
  low:      { m: 1.40, prodDelta: -18, label: 'Low — restricted percolation' },
  very_low: { m: 1.90, prodDelta: -30, label: 'Very Low — surface runoff dominant' },
};

// Nearby natural features: depth multiplier + recharge delta
const NATURAL = {
  river_proximate: { m: 0.70, recharge: +22, label: 'River / Stream (< 1 km)' },
  lake:            { m: 0.75, recharge: +16, label: 'Lake / Reservoir' },
  wetland:         { m: 0.60, recharge: +20, label: 'Wetland / Floodplain' },
  mountain:        { m: 0.85, recharge: +12, label: 'Hill / Mountain recharge zone' },
  coastal:         { m: 0.90, recharge:  -5, label: 'Coastal / Estuarine' },
  none:            { m: 1.00, recharge:   0, label: 'No significant feature' },
};

// Extraction level: depth multiplier + sustainability penalty
const EXTRACTION = {
  none:     { m: 0.85, sust:  0, label: 'None / Minimal' },
  domestic: { m: 1.00, sust:  5, label: 'Domestic Use' },
  moderate: { m: 1.30, sust: 20, label: 'Moderate (Agriculture)' },
  heavy:    { m: 1.70, sust: 42, label: 'Heavy (Industrial/Multi-use)' },
  over:     { m: 2.20, sust: 68, label: 'Over-extraction (Stressed)' },
};

// ── Core Prediction Engine ───────────────────
function predict(inputs) {
  const G   = GEOLOGY[inputs.geology];
  const CON = CONFINEMENT[inputs.confinement];
  const LU  = LANDUSE[inputs.landuse];
  const SEA = SEASON[inputs.season];
  const CLI = CLIMATE[inputs.climate];
  const PER = PERMEABILITY[inputs.permeability];
  const NAT = NATURAL[inputs.natural];
  const EXT = EXTRACTION[inputs.extraction];

  // ── Depth to Water Table (m) ──
  let depth = G.base;

  // Rainfall inverse scaling: more rain → shallower table
  // Using WHO/USGS observed relationship
  const rfFactor = Math.max(0.35, Math.min(2.2, 1600 / Math.max(inputs.rainfall, 50)));
  depth *= rfFactor;

  // Apply all multipliers
  depth *= CON.m;
  depth *= LU.m;
  depth *= SEA.m;
  depth *= CLI.m;
  depth *= PER.m;
  depth *= NAT.m;
  depth *= EXT.m;

  // Elevation effect: higher terrain → deeper water table
  depth += inputs.elevation * 0.011;

  // Bedrock cap: water table cannot exceed bedrock depth
  depth = Math.min(depth, inputs.bedrock * 0.90);

  // Physical minimum
  depth = Math.max(depth, 0.3);

  // ── Recharge Potential (0–100) ──
  let recharge = G.recharge;
  recharge += LU.recharge;
  recharge += NAT.recharge;
  recharge -= inputs.population / 380;  // dense population draws more

  // Rainfall bonus (scaled log)
  const rfBonus = Math.max(-10, Math.min(28, (inputs.rainfall - 400) / 50));
  recharge = Math.min(95, Math.max(5, recharge + rfBonus));

  // Permeability adjustment
  recharge = Math.min(95, Math.max(5, recharge + PER.prodDelta * 0.5));

  // ── Aquifer Productivity (0–100) ──
  let prod = G.prod;
  prod *= CON.m;
  prod = Math.min(95, Math.max(5, prod + PER.prodDelta));

  // ── Sustainability Index (0–100) ──
  let sust = recharge - EXT.sust;
  sust -= inputs.population / 480;
  sust = Math.min(90, Math.max(3, sust));

  // ── Confidence level ──
  let confidence, confClass;
  if (depth < 2) {
    confidence = 'High confidence  ±0.3 m';
    confClass  = 'conf-high';
  } else if (depth < 10) {
    confidence = 'Moderate confidence  ±1.5 m';
    confClass  = 'conf-mid';
  } else {
    confidence = 'Indicative estimate  ±3 m';
    confClass  = 'conf-low';
  }

  // ── Factor contributions (for bar chart) ──
  const factors = [
    { name: 'Rainfall / Climate', val: Math.round(Math.min(95, inputs.rainfall / 28)), color: '#3b82f6' },
    { name: 'Geology & Lithology', val: G.recharge, color: '#8b5cf6' },
    { name: 'Land Use Impact',  val: Math.max(5, Math.round(65 - EXT.sust)), color: '#10b981' },
    { name: 'Seasonal Cycle',   val: Math.round((2.0 - SEA.m) * 55), color: '#f59e0b' },
    { name: 'Soil Permeability',val: permeabilityScore(inputs.permeability), color: '#06b6d4' },
    { name: 'Nearby Features',  val: Math.max(10, Math.round(50 + NAT.recharge)), color: '#ec4899' },
  ];

  // ── Recommendations ──
  const recs = buildRecommendations(inputs, { depth, recharge, prod, sust });

  return { depth, recharge, prod, sust, confidence, confClass, factors, recs,
           trend: SEA.trend, aquiferType: CON.label,
           rechargeLabel: rechargeLabel(recharge),
           riskLabel: riskLabel(sust) };
}

function permeabilityScore(p) {
  return { high: 85, moderate: 60, low: 35, very_low: 12 }[p] || 50;
}

function rechargeLabel(r) {
  if (r > 70) return 'Good — >70% annual replenishment';
  if (r > 45) return 'Moderate — 40–70% annually';
  return 'Poor — <40% annually, vulnerability high';
}

function riskLabel(s) {
  if (s > 62) return 'Low — balanced extraction & recharge';
  if (s > 35) return 'Moderate — monitor seasonal fluctuations';
  return 'High — extraction stress detected';
}

function buildRecommendations(inputs, results) {
  const recs = [];

  if (inputs.extraction === 'over') {
    recs.push({ color: '#dc2626', text: 'Implement immediate groundwater rationing. Rotate pump schedules to allow aquifer partial recovery between extraction cycles.' });
  }
  if (results.recharge < 45) {
    recs.push({ color: '#d97706', text: 'Construct rainwater harvesting structures and percolation ponds to augment natural recharge. Target recharge zones in high-permeability areas.' });
  }
  if (inputs.landuse === 'urban_dense' || inputs.landuse === 'industrial') {
    recs.push({ color: '#d97706', text: 'Install permeable paving and urban recharge wells to offset impervious surface losses. Green corridors improve infiltration significantly.' });
  }
  if (results.depth > 15) {
    recs.push({ color: '#2563eb', text: 'Deep water table detected. Consider deeper bore wells (60–120 m range). Investigate confined artesian aquifers which may be more productive at this depth.' });
  }
  if (inputs.season === 'pre_monsoon' || inputs.season === 'dry') {
    recs.push({ color: '#2563eb', text: 'Seasonal low — restrict non-essential extraction. Pre-position water storage for the dry period and plan recharge campaigns ahead of monsoon.' });
  }
  if (inputs.geology === 'granite' || inputs.geology === 'basalt') {
    recs.push({ color: '#059669', text: 'Hard rock aquifer: target fracture zones and lineaments for borewell siting. Geophysical surveys (resistivity / seismic) significantly improve success rates.' });
  }
  if (inputs.natural === 'coastal') {
    recs.push({ color: '#dc2626', text: 'Coastal aquifer is vulnerable to saltwater intrusion if over-pumped. Maintain freshwater head above sea level. Monitor chloride concentrations monthly.' });
  }
  if (results.sust > 65 && results.depth < 8) {
    recs.push({ color: '#059669', text: 'Favourable conditions — sustainable yield appears achievable. Maintain current land-use practices and monitor quarterly to detect early stress signals.' });
  }
  if (recs.length === 0) {
    recs.push({ color: '#059669', text: 'Conditions appear stable. Continue routine quarterly monitoring of water table levels and quality. Update land-use assessment annually.' });
  }
  return recs;
}

// ── Animate gauge bar ────────────────────────
function animBar(id, pct) {
  setTimeout(() => {
    const el = document.getElementById(id);
    if (el) el.style.width = Math.round(pct) + '%';
  }, 120);
}

// ── Render results into DOM ──────────────────
function renderResults(r) {
  const res = document.getElementById('results');
  res.classList.add('visible');
  res.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Depth colour
  const depthColor = r.depth < 3 ? '#059669' : r.depth < 10 ? '#d97706' : '#dc2626';

  // Confidence badge
  const confStyles = {
    'conf-high': 'background:#d1fae5;color:#065f46;border:1px solid #6ee7b7',
    'conf-mid':  'background:#fef3c7;color:#92400e;border:1px solid #fde68a',
    'conf-low':  'background:#fee2e2;color:#991b1b;border:1px solid #fca5a5',
  };
  const confBadge = document.getElementById('confBadge');
  confBadge.textContent = r.confidence;
  confBadge.style.cssText = confStyles[r.confClass];

  // Depth display
  const dn = document.getElementById('depthNum');
  dn.textContent = r.depth.toFixed(1);
  dn.style.color = depthColor;

  const caption = r.depth < 2  ? 'Shallow water table — readily accessible, high recharge sensitivity.'
                : r.depth < 6  ? 'Moderate depth — typical for most agricultural and residential use.'
                : r.depth < 15 ? 'Deep water table — may require mechanized extraction.'
                                : 'Very deep — specialized drilling required, confined aquifer possible.';
  document.getElementById('depthCaption').textContent = caption;

  // Depth bar (scaled 0–30m → 0–100%)
  const depthBarPct = Math.min(100, (r.depth / 30) * 100);
  setTimeout(() => {
    const dbf = document.getElementById('depthBarFill');
    dbf.style.width = depthBarPct + '%';
    dbf.style.background = depthColor;
  }, 100);

  // Cross-section
  const totalH = 220; // px total for soil + water + bedrock display
  const soilFrac = Math.min(0.70, Math.max(0.20, r.depth / (r.depth + 6)));
  const soilPx = Math.round(soilFrac * totalH);
  const waterPx = Math.round((1 - soilFrac) * totalH * 0.75);
  document.getElementById('csSoil').style.height  = soilPx + 'px';
  document.getElementById('csWater').style.height = waterPx + 'px';
  document.getElementById('csDepthLabel').textContent = r.depth.toFixed(1) + ' m';

  // Gauges
  animBar('gRecharge', r.recharge);
  animBar('gProd',     r.prod);
  animBar('gSust',     r.sust);
  document.getElementById('gRechargePct').textContent = Math.round(r.recharge) + '%';
  document.getElementById('gProdPct').textContent     = Math.round(r.prod) + '%';
  document.getElementById('gSustPct').textContent     = Math.round(r.sust) + '%';

  // Analysis cards
  document.getElementById('aTrend').textContent   = r.trend;
  document.getElementById('aType').textContent    = r.aquiferType;
  document.getElementById('aRecharge').textContent= r.rechargeLabel;
  document.getElementById('aRisk').textContent    = r.riskLabel;

  // Alert strip
  const strip = document.getElementById('alertStrip');
  const icon  = document.getElementById('alertIcon');
  const title = document.getElementById('alertTitle');
  const desc  = document.getElementById('alertDesc');

  if (r.sust > 62) {
    strip.className = 'alert-strip alert-ok';
    icon.textContent = '✓';
    title.textContent = 'Sustainable Conditions';
    desc.textContent  = 'Aquifer recharge appears to balance extraction at current rates. Good water availability is expected. Maintain monitoring protocols.';
  } else if (r.sust > 35) {
    strip.className = 'alert-strip alert-warn';
    icon.textContent = '!';
    title.textContent = 'Moderate Stress Detected';
    desc.textContent  = 'Extraction is approaching recharge limits. Dry-season levels may decline significantly. Consider demand management and rainwater augmentation.';
  } else {
    strip.className = 'alert-strip alert-crit';
    icon.textContent = '✗';
    title.textContent = 'Critical Overexploitation Risk';
    desc.textContent  = 'Severe imbalance between extraction and recharge detected. Risks include aquifer depletion, land subsidence, and saltwater intrusion in coastal zones. Immediate management intervention required.';
  }

  // Factor bars
  const fb = document.getElementById('factorBars');
  fb.innerHTML = r.factors.map(f => `
    <div class="factor-row">
      <div class="factor-name">${f.name}</div>
      <div class="factor-track">
        <div class="factor-fill" data-w="${f.val}" style="background:${f.color}"></div>
      </div>
      <div class="factor-pct">${f.val}%</div>
    </div>
  `).join('');
  setTimeout(() => {
    document.querySelectorAll('.factor-fill').forEach(el => {
      el.style.width = el.dataset.w + '%';
    });
  }, 200);

  // Recommendations
  const rp = document.getElementById('recsPanel');
  rp.innerHTML = `
    <div class="recs-title">Site-Specific Recommendations</div>
    ${r.recs.map(rec => `
      <div class="rec-item">
        <div class="rec-dot" style="background:${rec.color}"></div>
        <div class="rec-text">${rec.text}</div>
      </div>
    `).join('')}
  `;
}

// ── Main entry point ─────────────────────────
function runPrediction() {
  const inputs = {
    rainfall:    +document.getElementById('rainfall').value,
    elevation:   +document.getElementById('elevation').value,
    bedrock:     +document.getElementById('bedrock').value,
    population:  +document.getElementById('population').value,
    geology:     document.getElementById('geology').value,
    confinement: document.getElementById('confinement').value,
    landuse:     document.getElementById('landuse').value,
    season:      document.getElementById('season').value,
    climate:     document.getElementById('climate').value,
    permeability:document.getElementById('permeability').value,
    natural:     document.getElementById('natural').value,
    extraction:  document.getElementById('extraction').value,
  };

  const results = predict(inputs);
  renderResults(results);
}
