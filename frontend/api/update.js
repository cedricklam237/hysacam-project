const https = require('https');

const FIREBASE_URL = 'hysacam-bacs-default-rtdb.europe-west1.firebasedatabase.app';

module.exports = async (req, res) => {

  // Autoriser les requêtes depuis n'importe où
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'GET') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  // Récupérer le niveau envoyé par l'Arduino
  const niveau = parseInt(req.query.niveau);

  if (isNaN(niveau) || niveau < 0 || niveau > 100) {
    return res.status(400).json({ erreur: 'Niveau invalide. Doit être entre 0 et 100.' });
  }

  // Calculer l'état
  const etat = niveau >= 71 ? 'ROUGE'
             : niveau >= 41 ? 'ORANGE'
             : 'VERT';

  // Données à envoyer
  const data = JSON.stringify({
    niveau:       niveau,
    etat:         etat,
    derniere_maj: new Date().toISOString()
  });

  // Envoyer à Firebase via requête HTTPS
  const options = {
    hostname: FIREBASE_URL,
    path:     '/bac.json',
    method:   'PATCH',
    headers:  {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve) => {
    const requete = https.request(options, (reponse) => {
      let body = '';
      reponse.on('data', chunk => body += chunk);
      reponse.on('end', () => {
        res.status(200).json({
          succes:  true,
          niveau:  niveau,
          etat:    etat,
          message: 'Données mises à jour avec succès'
        });
        resolve();
      });
    });

    requete.on('error', (erreur) => {
      res.status(500).json({ erreur: 'Erreur serveur : ' + erreur.message });
      resolve();
    });

    requete.write(data);
    requete.end();
  });
};