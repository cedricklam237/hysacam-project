const admin = require('firebase-admin');

// Initialiser Firebase Admin (une seule fois)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    process.env.FIREBASE_PROJECT_ID,
      clientEmail:  process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:   process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });
}

const db = admin.database();

// ===========================
// HANDLER PRINCIPAL
// ===========================
module.exports = async (req, res) => {

  // Autoriser les requêtes depuis n'importe où
  // (nécessaire pour l'Arduino)
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Vérifier que c'est bien une requête GET
  if (req.method !== 'GET') {
    return res.status(405).json({ erreur: 'Méthode non autorisée' });
  }

  // Récupérer le niveau envoyé par l'Arduino
  const niveau = parseInt(req.query.niveau);

  // Vérifier que le niveau est valide
  if (isNaN(niveau) || niveau < 0 || niveau > 100) {
    return res.status(400).json({ erreur: 'Niveau invalide. Doit être entre 0 et 100.' });
  }

  // Calculer l'état selon le niveau
  const etat = niveau >= 71 ? 'ROUGE'
             : niveau >= 41 ? 'ORANGE'
             : 'VERT';

  // Données à envoyer dans Firebase
  const data = {
    niveau:       niveau,
    etat:         etat,
    derniere_maj: new Date().toISOString()
  };

  try {
    // Mettre à jour Firebase
    await db.ref('bac').update(data);

    // Répondre à l'Arduino que tout s'est bien passé
    return res.status(200).json({
      succes:  true,
      niveau:  niveau,
      etat:    etat,
      message: 'Données mises à jour avec succès'
    });

  } catch (erreur) {
    console.error('Erreur Firebase:', erreur);
    return res.status(500).json({ erreur: 'Erreur serveur : ' + erreur.message });
  }
};