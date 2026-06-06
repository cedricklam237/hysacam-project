let adminMap     = null;
let adminMarker  = null;
let adminOuvert  = false;

// Ouvrir / fermer le panneau
function toggleAdmin() {
  const overlay = document.getElementById('adminOverlay');
  adminOuvert = !adminOuvert;

  if (adminOuvert) {
    overlay.classList.add('visible');
    // Initialiser la mini carte admin si pas encore fait
    setTimeout(() => {
      if (!adminMap) initialiserAdminMap();
      else adminMap.invalidateSize();
    }, 100);
  } else {
    overlay.classList.remove('visible');
  }
}

// Fermer en cliquant sur l'overlay
function fermerAdmin(event) {
  if (event.target.id === 'adminOverlay') toggleAdmin();
}

// Initialiser la mini carte dans le panneau admin
function initialiserAdminMap() {
  adminMap = L.map('adminMap').setView([4.0560, 9.7100], 13);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
  }).addTo(adminMap);

  // Si le bac a déjà une position, l'afficher
  if (bacActuel && bacActuel.lat && bacActuel.lng) {
    placerMarkerAdmin(bacActuel.lat, bacActuel.lng);
    adminMap.setView([bacActuel.lat, bacActuel.lng], 15);
    document.getElementById('inputLat').value = bacActuel.lat;
    document.getElementById('inputLng').value = bacActuel.lng;
    document.getElementById('inputNom').value = bacActuel.nom || '';
  }

  // Clic sur la carte = placer le bac
  adminMap.on('click', function(e) {
    const lat = parseFloat(e.latlng.lat.toFixed(6));
    const lng = parseFloat(e.latlng.lng.toFixed(6));
    placerMarkerAdmin(lat, lng);
    document.getElementById('inputLat').value = lat;
    document.getElementById('inputLng').value = lng;
  });

  // Mettre à jour le marker quand on tape les coordonnées
  document.getElementById('inputLat').addEventListener('input', majMarkerDepuisInputs);
  document.getElementById('inputLng').addEventListener('input', majMarkerDepuisInputs);
}

// Placer le marker sur la mini carte admin
function placerMarkerAdmin(lat, lng) {
  if (adminMarker) adminMap.removeLayer(adminMarker);

  const icon = L.divIcon({
    html: `<div style="background:#4caf50;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 0 8px #4caf5088;"></div>`,
    className: '', iconSize: [24,24], iconAnchor: [12,24]
  });

  adminMarker = L.marker([lat, lng], { icon, draggable: true }).addTo(adminMap);

  // Drag du marker = mise à jour des inputs
  adminMarker.on('dragend', function(e) {
    const pos = e.target.getLatLng();
    document.getElementById('inputLat').value = parseFloat(pos.lat.toFixed(6));
    document.getElementById('inputLng').value = parseFloat(pos.lng.toFixed(6));
  });
}

// Mettre à jour le marker quand on tape dans les inputs
function majMarkerDepuisInputs() {
  const lat = parseFloat(document.getElementById('inputLat').value);
  const lng = parseFloat(document.getElementById('inputLng').value);
  if (!isNaN(lat) && !isNaN(lng)) {
    placerMarkerAdmin(lat, lng);
    adminMap.setView([lat, lng], 15);
  }
}

// Sauvegarder dans Firebase
function sauvegarderBac() {
  const lat    = parseFloat(document.getElementById('inputLat').value);
  const lng    = parseFloat(document.getElementById('inputLng').value);
  const nom    = document.getElementById('inputNom').value.trim();
  const niveau = document.getElementById('inputNiveau').value;

  const feedback = document.getElementById('adminFeedback');

  // Validation
  if (isNaN(lat) || isNaN(lng)) {
    afficherFeedback('❌ Veuillez indiquer une localisation valide.', 'error');
    return;
  }

  if (!nom) {
    afficherFeedback('❌ Veuillez entrer un nom pour le bac.', 'error');
    return;
  }

  // Construire l'objet à envoyer
  const niveauFinal = niveau !== '' ? parseInt(niveau) : null;
  const etat = niveauFinal === null ? 'ATTENTE'
    : niveauFinal >= 71 ? 'ROUGE'
    : niveauFinal >= 41 ? 'ORANGE' : 'VERT';

  const data = {
    id:           'BAC-01',
    nom:          nom,
    lat:          lat,
    lng:          lng,
    niveau:       niveauFinal,
    etat:         etat,
    derniere_maj: new Date().toISOString()
  };

  // Envoyer dans Firebase
  db.ref('bac').set(data)
    .then(() => {
      afficherFeedback('✅ Bac sauvegardé avec succès dans Firebase !', 'success');
      // Fermer le panneau après 2 secondes
      setTimeout(() => toggleAdmin(), 2000);
    })
    .catch(err => {
      afficherFeedback('❌ Erreur : ' + err.message, 'error');
    });
}

// Afficher un message de feedback
function afficherFeedback(message, type) {
  const el = document.getElementById('adminFeedback');
  el.textContent  = message;
  el.className    = 'admin-feedback ' + type;
  el.style.display = 'block';
  if (type === 'success') {
    setTimeout(() => { el.style.display = 'none'; }, 3000);
  }
}