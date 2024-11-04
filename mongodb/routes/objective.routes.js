import { Router } from 'express';
import { getCurrentObjective, getAllObjectives, createObjective, updateObjective, deleteObjective, getObjectiveById } from '../controllers/objective.controller.js';

const router = Router();

// Route pour l'objectif actuel, avec un type spécifique
router.get('/current', getCurrentObjective);
router.get('/current/:type', getCurrentObjective);

// Route pour obtenir tous les objectifs
router.get('/', getAllObjectives);

// Route pour créer un nouvel objectif
router.post('/', createObjective);

// Route pour mettre à jour un objectif par ID
router.put('/:id', (req, res, next) => {
    const { id } = req.params;
    if (id === 'current') {
        // Si le paramètre est "current", cette requête devrait être traitée par la route précédente.
        return res.status(400).json({ error: 'Invalid request. Use /current/:type for current objectives.' });
    }
    updateObjective(req, res, next);
});

// Route pour supprimer un objectif par ID
router.delete('/:id', (req, res, next) => {
    const { id } = req.params;
    if (id === 'current') {
        return res.status(400).json({ error: 'Invalid request. Use /current/:type for current objectives.' });
    }
    deleteObjective(req, res, next);
});

// Route pour obtenir un objectif par ID
router.get('/:id', (req, res, next) => {
    const { id } = req.params;
    if (id === 'current') {
        return res.status(400).json({ error: 'Invalid request. Use /current/:type for current objectives.' });
    }
    getObjectiveById(req, res, next);
});

export default router;
