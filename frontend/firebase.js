const firebaseConfig = {
  apiKey:            "AIzaSyDDFqfJG0j6m6EC0CAekmQ8Ur2iCa5eX6U",
  authDomain:        "hysacam-bacs.firebaseapp.com",
  databaseURL:       "https://hysacam-bacs-default-rtdb.europe-west1.firebasedatabase.app",
  projectId:         "hysacam-bacs",
  storageBucket:     "hysacam-bacs.firebasestorage.app",
  messagingSenderId: "261047902288",
  appId:             "1:261047902288:web:7c2796827e1934bf3d3155",
  measurementId:     "G-2GWTX874E8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

function ecouterBac(callback) {
  db.ref('bac').on('value', snapshot => {
    const data = snapshot.val();
    callback(data); // data peut être null si rien n'est encore envoyé
  });
}

function mettreAJourBac(lat, lng, niveau) {
  const etat = niveau >= 71 ? 'ROUGE' : niveau >= 41 ? 'ORANGE' : 'VERT';
  db.ref('bac').set({
    id:           'BAC-01',
    nom:          'Bac de démonstration',
    lat:          lat,
    lng:          lng,
    niveau:       niveau,
    etat:         etat,
    derniere_maj: new Date().toISOString()
  });
}