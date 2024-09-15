import path from 'path';
import { fileURLToPath } from 'url';
import maxmind from 'maxmind';

// Convertir `import.meta.url` en chemin de fichier
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Charger les bases de données MaxMind de manière asynchrone
const geoipCountryPromise = maxmind.open(path.resolve(__dirname, '../data/GeoLite2-Country.mmdb'));
const geoipCityPromise = maxmind.open(path.resolve(__dirname, '../data/GeoLite2-City.mmdb'));

export const geoipMiddleware = async (req, res, next) => {
  try {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    //Get the Country informations
    const geoipCountry = await geoipCountryPromise;
    const geoipCity = await geoipCityPromise;

    //Get the Cityt informations
    const countryInfo = geoipCountry.get(ip);
    const cityInfo = geoipCity.get(ip);

    // put info on the request
    req.geo = {
      country: countryInfo,
      city: cityInfo,
    };

    next();
  } catch (err) {
    console.error('Erreur lors de l’utilisation de MaxMind :', err);
    res.status(500).send('Erreur du serveur lors de la récupération des informations géographiques.');
  }
};
