import dotenv from 'dotenv';

dotenv.config();
// middleware/auth.js
import {OAuth2Client} from 'google-auth-library';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

async function verifyToken(token) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID,  // Votre ID client Google
    });
    const payload = ticket.getPayload();
    return payload; // Contient les informations de l'utilisateur
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Si pas de jeton

  const user = await verifyToken(token);
  if (user) {
    req.user = user; // Ajoutez les informations décodées à la requête
    next();
  } else {
    res.status(401).json({message:'Error verifying token'}); // Si le jeton est invalide
  }
};

export default authenticateToken;
