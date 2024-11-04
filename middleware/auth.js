import dotenv from 'dotenv';

dotenv.config();
// middleware/auth.js
import { OAuth2Client } from 'google-auth-library';
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const client = new OAuth2Client(CLIENT_ID);

async function verifyToken(token, expectedEmail) {
  try {
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: CLIENT_ID, // Votre ID client Google
    });
    const payload = ticket.getPayload();

    if (payload.email === expectedEmail) {
      return payload; // Contient les informations de l'utilisateur
    } else {
      throw new Error('Email does not match');
    }
  } catch (error) {
    console.error('Error verifying token:', error);

    // Vérifier si l'erreur est due à l'expiration du jeton
    if (error.message && error.message.includes('Token used too late')) {
      
      throw new Error('Token expired');
    }

    return null;
  }
}

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const email = req.get('X-Email-Creator');

  const token = authHeader && authHeader.split(' ')[1];

  if (token == null) return res.sendStatus(401); // Si pas de jeton

  try {
    const user = await verifyToken(token,email);
    if (user) {
      req.user = user; // Ajoutez les informations décodées à la requête
      next();
    } else {
      res.status(401).json({ message: 'Invalid token' }); // Si le jeton est invalide
    }
  } catch (error) {
    // Gérer les cas où l'erreur est due à l'expiration du jeton
    if (error.message === 'Token expired') {
      res.status(401).json({ message: 'Token expired' });
    } else {
      res.status(401).json({ message: 'Error verifying token' });
    }
  }
};

export default authenticateToken;
