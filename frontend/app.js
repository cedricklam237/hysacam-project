const depots = [
  { id: 'd1', nom: 'Dépôt Akwa',     lat: 4.0511, lng: 9.7085 },
  { id: 'd2', nom: 'Dépôt Bonabéri', lat: 4.0650, lng: 9.6700 },
  { id: 'd3', nom: 'Dépôt Deido',    lat: 4.0700, lng: 9.7200 },
  { id: 'd4', nom: 'Dépôt pk10',    lat: 4.0550, lng: 9.7850 },
  { id: 'd5', nom: 'Dépôt bassa',    lat: 4.0611918, lng: 9.6870461 },
];

function getEtat(niveau) {
  if (niveau === null || niveau === undefined)
    return { label: 'EN ATTENTE DE DONNÉES', color: '#607d8b', cat: 'attente' };
  if (niveau >= 71) return { label: 'PLEIN — COLLECTE URGENTE',   color: '#f44336', cat: 'urgent' };
  if (niveau >= 41) return { label: 'BIENTÔT PLEIN — SURVEILLER', color: '#ff9800', cat: 'alerte' };
  return               { label: 'DISPONIBLE — PAS URGENT',        color: '#4caf50', cat: 'dispo'  };
}

// ===========================
// HORLOGE
// ===========================
function updateClock() {
  document.getElementById('clock').textContent = new Date().toLocaleTimeString('fr-FR');
}
setInterval(updateClock, 1000);
updateClock();

// ===========================
// INITIALISATION CARTE
// Centrée sur Douala
// ===========================
const map = L.map('map').setView([4.0560, 9.7100], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Légende
document.getElementById('map').insertAdjacentHTML('beforeend', `
  <div class="map-legend">
    <div class="map-legend-title">Carte de Douala — Temps réel</div>
    <div class="legend-row"><div class="legend-dot" style="background:#f44336;box-shadow:0 0 6px #f44336"></div> Bac plein — Collecte urgente</div>
    <div class="legend-row"><div class="legend-dot" style="background:#ff9800;box-shadow:0 0 6px #ff9800"></div> Bientôt plein — Surveiller</div>
    <div class="legend-row"><div class="legend-dot" style="background:#4caf50;box-shadow:0 0 6px #4caf50"></div> Disponible — Pas urgent</div>
    <div class="legend-row"><div class="legend-dot" style="background:#607d8b;box-shadow:0 0 6px #607d8b"></div> En attente de données</div>
    <div class="legend-row"><div class="legend-dot" style="background:#29b6f6;border-radius:3px;"></div> Dépôt HYSACAM</div>
    <div class="legend-row"><div class="legend-line" style="background:#ffeb3b;height:2px;border-top:2px dashed #ffeb3b;"></div> Itinéraire optimal</div>
  </div>
`);

// Boutons carte
document.getElementById('map').insertAdjacentHTML('beforeend', `
  <div class="map-btn-bar">
    <button class="map-btn secondary" onclick="clearRoute()">✕ Effacer</button>
    <button class="map-btn primary" onclick="generateRoute()">🗺 GÉNÉRER L'ITINÉRAIRE</button>
  </div>
`);

// ===========================
// DÉPÔTS SUR LA CARTE
// ===========================
depots.forEach(d => {
  const icon = L.divIcon({
    html: `<div style="background:#29b6f6;width:30px;height:30px;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 12px rgba(41,182,246,0.6);">🏭</div>`,
    className: '', iconSize: [30,30], iconAnchor: [15,15]
  });
  L.marker([d.lat, d.lng], { icon }).addTo(map)
    .bindPopup(`<div class="popup-title">🏭 ${d.nom}</div><div class="popup-row"><span>Type</span><span style="color:#29b6f6">Dépôt HYSACAM</span></div>`);
});

// ===========================
// VARIABLES GLOBALES
// ===========================
let bacMarker  = null;
let bacActuel  = null;
let routeLayer = null;
let numMarkers = [];

// ===========================
// AFFICHER LE BAC DEPUIS FIREBASE
// ===========================
function afficherBac(bac) {
  bacActuel = bac;

  // Si pas encore de données Arduino
  if (!bac || !bac.lat || !bac.lng) {
    document.getElementById('stat-total').textContent  = '1';
    document.getElementById('stat-urgent').textContent = '—';
    document.getElementById('stat-alerte').textContent = '—';
    document.getElementById('stat-dispo').textContent  = '—';
    afficherListeBacAttente();
    afficherDetailAttente();
    return;
  }

  const { label, color, cat } = getEtat(bac.niveau);

  // Stats
  document.getElementById('stat-total').textContent  = '1';
  document.getElementById('stat-urgent').textContent = cat === 'urgent' ? '1' : '0';
  document.getElementById('stat-alerte').textContent = cat === 'alerte' ? '1' : '0';
  document.getElementById('stat-dispo').textContent  = cat === 'dispo'  ? '1' : '0';

  // Supprimer l'ancien marqueur
  if (bacMarker) map.removeLayer(bacMarker);

  // Nouveau marqueur
  const icon = L.divIcon({
    html: `<div style="background:${color};width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 10px ${color}88;display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);font-size:9px;font-weight:700;color:#fff;font-family:monospace;">
        ${bac.niveau !== null && bac.niveau !== undefined ? bac.niveau+'%' : '?'}
      </span>
    </div>`,
    className: '', iconSize: [30,30], iconAnchor: [15,30]
  });

  bacMarker = L.marker([bac.lat, bac.lng], { icon }).addTo(map);
  bacMarker.bindPopup(`
    <div class="popup-title">${bac.id} — ${bac.nom}</div>
    <div class="popup-row"><span>Niveau</span><span style="color:${color};font-weight:700">${bac.niveau !== null && bac.niveau !== undefined ? bac.niveau+'%' : 'En attente...'}</span></div>
    <div class="popup-row"><span>État</span><span style="color:${color}">${label}</span></div>
    <div class="popup-row"><span>Mise à jour</span><span>${bac.derniere_maj ? new Date(bac.derniere_maj).toLocaleTimeString('fr-FR') : '—'}</span></div>
  `);

  map.setView([bac.lat, bac.lng], 15);

  // Liste et détail
  afficherListeBac(bac, color, label);
  afficherDetailBac(bac);
}

// Liste gauche — bac actif
function afficherListeBac(bac, color, label) {
  const bacList = document.getElementById('bacList');
  bacList.innerHTML = `
    <div class="bac-item active">
      <div class="bac-dot" style="background:${color};box-shadow:0 0 5px ${color}"></div>
      <div class="bac-info">
        <div class="bac-name">${bac.id} — ${bac.nom}</div>
        <div class="bac-loc">Douala</div>
      </div>
      <div class="bac-pct" style="color:${color};background:${color}22">
        ${bac.niveau !== null && bac.niveau !== undefined ? bac.niveau+'%' : '?'}
      </div>
    </div>
  `;
}

// Liste gauche — en attente
function afficherListeBacAttente() {
  document.getElementById('bacList').innerHTML = `
    <div class="bac-item active">
      <div class="bac-dot" style="background:#607d8b;box-shadow:0 0 5px #607d8b"></div>
      <div class="bac-info">
        <div class="bac-name">BAC-01 — Bac démo</div>
        <div class="bac-loc">Localisation non définie</div>
      </div>
      <div class="bac-pct" style="color:#607d8b;background:#607d8b22">—</div>
    </div>
  `;
}

// ===========================
// PANNEAU DROIT — DÉTAIL BAC
// ===========================
function afficherDetailBac(bac) {
  const { label, color } = getEtat(bac.niveau);
  document.getElementById('sel-id').textContent       = bac.id;
  document.getElementById('sel-name').textContent     = bac.nom;
  document.getElementById('sel-bar').style.width      = (bac.niveau || 0) + '%';
  document.getElementById('sel-bar').style.background = color;
  document.getElementById('sel-etat').textContent     = label;
  document.getElementById('sel-etat').style.color     = color;
  document.getElementById('sel-pct').textContent      = bac.niveau !== null && bac.niveau !== undefined ? bac.niveau + '%' : '—';
  document.getElementById('sel-pct').style.color      = color;

  // Commande du jour
  const cmdList = document.getElementById('cmdList');
  if (bac.niveau >= 71) {
    cmdList.innerHTML = `
      <div class="cmd-item">
        <div class="cmd-rank">1.</div>
        <div class="cmd-name">${bac.nom}</div>
        <div class="cmd-badge" style="background:#f4433633;color:#f44336">${bac.niveau}%</div>
      </div>
    `;
  } else {
    cmdList.innerHTML = `<div style="color:var(--muted);font-size:12px;padding:4px 0;">Aucune collecte urgente.</div>`;
  }
}

// Panneau droit — en attente
function afficherDetailAttente() {
  const color = '#607d8b';
  document.getElementById('sel-id').textContent       = 'BAC-01';
  document.getElementById('sel-name').textContent     = 'En attente de l\'Arduino...';
  document.getElementById('sel-bar').style.width      = '0%';
  document.getElementById('sel-bar').style.background = color;
  document.getElementById('sel-etat').textContent     = 'EN ATTENTE DE DONNÉES';
  document.getElementById('sel-etat').style.color     = color;
  document.getElementById('sel-pct').textContent      = '—';
  document.getElementById('sel-pct').style.color      = color;
  document.getElementById('cmdList').innerHTML        = `<div style="color:var(--muted);font-size:12px;padding:4px 0;">En attente de l'Arduino.</div>`;
  document.getElementById('histChart').innerHTML      = `<div style="color:var(--muted);font-size:11px;padding:4px 0;">Pas encore de données.</div>`;
  document.getElementById('routeStats').innerHTML     = 'En attente de données.';
}

// ===========================
// ÉCOUTER FIREBASE EN TEMPS RÉEL
// ===========================
ecouterBac(bac => {
  afficherBac(bac);
});

// ===========================
// ITINÉRAIRE
// ===========================
function generateRoute() {
  if (!bacActuel || !bacActuel.lat) {
    alert('Le bac n\'a pas encore de localisation !');
    return;
  }
  if (getEtat(bacActuel.niveau).cat !== 'urgent') {
    alert('Le bac n\'est pas encore plein, pas de collecte urgente !');
    return;
  }

  const depotId = document.getElementById('depotSelect').value;
  if (!depotId) { alert('Veuillez choisir un dépôt de départ !'); return; }

  clearRoute();

  const depot  = depots.find(d => d.id === depotId);
  const points = [
    [depot.lat, depot.lng],
    [bacActuel.lat, bacActuel.lng],
    [depot.lat, depot.lng]
  ];

  routeLayer = L.polyline(points, {
    color: '#ffeb3b', weight: 3, opacity: 0.9, dashArray: '10,6'
  }).addTo(map);

  map.fitBounds(routeLayer.getBounds(), { padding: [60, 60] });

  const dist = distanceTotale(depot, [bacActuel]);
  const min  = Math.round(dist / 30 * 60);

  document.getElementById('routeStats').innerHTML = `
    Bacs à vider : <span>1 bac</span><br>
    Distance totale : <span>~${dist} km</span><br>
    Durée estimée : <span>~${min} min</span><br>
    Départ : <span>${depot.nom}</span>
  `;
}

function clearRoute() {
  if (routeLayer) { map.removeLayer(routeLayer); routeLayer = null; }
  numMarkers.forEach(m => map.removeLayer(m));
  numMarkers = [];
  document.getElementById('routeStats').innerHTML = 'Générez un itinéraire pour voir les détails.';
}