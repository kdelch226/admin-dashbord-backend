import express from 'express';
import {
    getAllProjects,
    getProjectByID,
    creatProjects,
    updatedProjects,
    deleteProject,
    removeClientFromProject,
    removeEmployeFromProject,
    getProjectStatistics
} from '../controllers/projects.controller.js';

const router = express.Router();

router.route('/statistics')
    .get(getProjectStatistics);
    
router.route('/')
    .get(getAllProjects)
    .post(creatProjects);

router.route('/:id')
    .get(getProjectByID)
    .patch(updatedProjects)
    .put(updatedProjects)
    .delete(deleteProject);


router.route('/:ProjectId/removeclient/:id')
    .delete(removeClientFromProject);

router.route('/:ProjectId/removeemploye/:id')
    .delete(removeEmployeFromProject);



export default router;
