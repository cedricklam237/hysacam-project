function distanceEntrePoints(pointA, pointB) {
  const R    = 6371; // rayon de la Terre en km
  const dLat = (pointB.lat - pointA.lat) * Math.PI / 180;
  const dLng = (pointB.lng - pointA.lng) * Math.PI / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pointA.lat * Math.PI / 180) *
    Math.cos(pointB.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance en km
}

/**
 * Algorithme du Plus Proche Voisin
 * Trouve l'ordre de visite le plus court
 * pour passer par tous les bacs urgents
 * et revenir au dépôt de départ
 *
 * @param {Object} depot  - point de départ { lat, lng }
 * @param {Array}  bacs   - liste des bacs urgents
 * @returns {Array}       - bacs dans l'ordre optimal de visite
 */
function plusProcheVoisin(depot, bacs) {
  const restants = [...bacs];
  const ordre    = [];
  let   courant  = { lat: depot.lat, lng: depot.lng };

  while (restants.length > 0) {
    let plusProche  = null;
    let distMin     = Infinity;
    let indexProche = -1;

    // Trouver le bac le plus proche du point actuel
    restants.forEach((bac, index) => {
      const dist = distanceEntrePoints(courant, bac);
      if (dist < distMin) {
        distMin     = dist;
        plusProche  = bac;
        indexProche = index;
      }
    });

    // Ajouter le bac le plus proche à l'ordre
    ordre.push(plusProche);
    courant = { lat: plusProche.lat, lng: plusProche.lng };
    restants.splice(indexProche, 1);
  }

  return ordre;
}

/**
 * Calcule la distance totale d'un itinéraire
 * en incluant le retour au dépôt
 *
 * @param {Object} depot  - point de départ
 * @param {Array}  ordre  - bacs dans l'ordre de visite
 * @returns {number}      - distance totale en km
 */
function distanceTotale(depot, ordre) {
  if (ordre.length === 0) return 0;

  let total  = 0;
  let courant = depot;

  ordre.forEach(bac => {
    total  += distanceEntrePoints(courant, bac);
    courant = bac;
  });

  // Retour au dépôt
  total += distanceEntrePoints(courant, depot);

  return Math.round(total * 10) / 10;
}