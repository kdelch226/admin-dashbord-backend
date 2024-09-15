import express from 'express';
import {
    getAllProjets,
    getProjetByID,
    creatProjets,
    updatedProjets,
    deleteProjet,
    removeClientFromProjet
} from '../controllers/projets.controller.js';

const router = express.Router();


router.route('/')
    .get(getAllProjets)
    .post(creatProjets);

router.route('/:id')
    .get(getProjetByID)
    .patch(updatedProjets)
    .put(updatedProjets)
    .delete(deleteProjet);

router.route('/:id/removeClient/:id')
    .delete(removeClientFromProjet);



export default router;
