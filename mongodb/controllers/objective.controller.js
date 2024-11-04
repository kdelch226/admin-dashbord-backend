import Objective from '../models/ojective.js';
import Audit from '../models/audit.js';
import Expense from '../models/expense.js';
import Payment from '../models/payment.js';
import updateAllRelevantObjectives from '../functions/updateAllRevelantObjectives.js';

const objectifCurentValue = async (type, startDate, endDate) => {
    type = type.toLocaleLowerCase();
    let currentValue = 0;
    if (type == 'expense') {
        const result = await Expense.aggregate([
            {
                $match: {
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        currentValue = result.length > 0 ? result[0].total : 0;


    } else if (type == 'payment') {
        const result = await Payment.aggregate([
            {
                $match: {
                    date: {
                        $gte: startDate,
                        $lte: endDate
                    },
                },
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' }
                }
            }
        ]);
        currentValue = result.length > 0 ? result[0].total : 0;

    }

    return currentValue
}

const getAllObjectives = async (req, res) => {
    try {
        const { _end, _order, _start, _sort, title_like = '', type_like = '', startDate_like = ''
        } = req.query;

        let query = {}
        if (title_like) {
            query.title = { $regex: title_like, $options: 'i' }
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort._id = 1;
        }

        const count = await Objective.countDocuments({ query })
        const Objectives = await Objective
            .find(query)
            .limit(_end)
            .skip(_start)
            .sort(sort);
        // Utilisation de Promise.all avec map pour attendre toutes les opérations async
        await Promise.all(
            Objectives.map(async (objective) => {
                const currentValue = await objectifCurentValue(objective.type, objective.startDate, objective.endDate);

                // Mettre à jour l'objectif directement dans la base de données
                await Objective.updateOne(
                    { _id: objective._id }, // Filtre pour sélectionner l'objectif par ID
                    { $set: { currentValue: currentValue } } // Mise à jour du champ `currentValue`
                );
            })
        );



        res.header('x-total-count', count)
        res.header('Acces-Control-Expose-Headers', 'x-total-count')

        res.status(200).json(Objectives)
    }
    catch (error) {
        res.status(500).json({ error })
    }
}

// Fonction pour créer un objectif
const createObjective = async (req, res) => {
    const { title, endDate, targetValue, type, startDate } = req.body;
    console.log('create objective ', req.body)

    try {
        if (endDate <= startDate) return res.status(404).json({ message: 'End Date must be grater thand Start Date' });

        const currentValue = await objectifCurentValue(type, startDate, endDate);

        const newObjective = new Objective({
            title,
            targetValue,
            startDate,
            type,
            endDate,
            currentValue: currentValue, // Valeur initiale
        });

        await newObjective.save();

        // Créer une entrée d'audit pour la création
        const auditLog = new Audit({
            action: 'create',
            documentId: newObjective._id,
            documentType: 'objective',
            changedBy: req.get('X-Email-Creator'), // Assurez-vous que cet en-tête est fourni
            changes: { title, type, targetValue, startDate, endDate },
        });

        await auditLog.save();

        res.status(201).json({ message: 'Objectif créé avec succès', objective: newObjective });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'objectif' });
    }
};

// Fonction pour mettre à jour un objectif
const updateObjective = async (req, res) => {
    const { id } = req.params;
    const updatedObjective = req.body;

    try {
        // Récupérer l'ancien objectif avant la mise à jour
        const originalObjective = await Objective.findById(id);
        if (!originalObjective) {
            return res.status(404).json({ message: 'Objectif non trouvé' });
        }

        if ((req.endDate && req.startDate) && (req.endDate <= req.startDate)) return res.status(404).json({ message: 'End Date must grater thand Start Date' });

        // Créer un objet pour suivre les changements
        const changes = {};
        Object.keys(updatedObjective).forEach((key) => {
            if (!originalObjective[key]) {
                changes[key] = { add: updatedObjective[key] };
            } else if (originalObjective[key] !== updatedObjective[key]) {
                changes[key] = {
                    before: originalObjective[key],
                    after: updatedObjective[key]
                };
            }
        });

        // Mettre à jour l'objectif
        const updatedData = await Objective.findByIdAndUpdate(
            id,
            { $set: updatedObjective },
            { new: true, runValidators: true }
        );

        if (!updatedData) {
            return res.status(404).json({ message: 'Objectif non trouvé' });
        }

        // Créer une entrée d'audit pour enregistrer les changements
        const auditLog = new Audit({
            action: 'update',
            documentId: updatedData._id,
            documentType: 'objective',
            changedBy: req.get('X-Email-Creator'), // Assurez-vous que cet en-tête est fourni
            changes,
        });

        await auditLog.save();

        res.status(200).json({ message: 'Objectif mis à jour avec succès', objective: updatedData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la mise à jour de l\'objectif' });
    }
};

// Fonction pour récupérer un objectif par ID
const getObjectiveById = async (req, res) => {
    const { id } = req.params;

    try {
        const objective = await Objective.findById(id);
        if (!objective) {
            return res.status(404).json({ message: 'Objectif non trouvé' });
        }

        res.status(200).json(objective);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la récupération de l\'objectif' });
    }
};

const getCurrentObjective = async (req, res) => {
    const { type = '' } = req.query || {};
    const today = new Date();
    const query = {
        startDate: { $lt: today },
        endDate: { $gte: today }
    };

    if (type) query.type = { $regex: type, $options: 'i' }

    try {
        const getCurrentObjective = await Objective.findOne(query)
        if (!getCurrentObjective) {
            return res.status(200).json({
                title: 'no Objective',
                type: 'undifined',
                targetValue: 0,
                currentValue: 0,
                startDate: 'undifined',
                endDate: 'undifined',
            });
        }

        res.status(200).json(getCurrentObjective);

    } catch (error) {
        console.log(error)
        res.status(500).json({ Error: 'internal Error' })
    }
}

// Fonction pour supprimer un objectif
const deleteObjective = async (req, res) => {
    const { id } = req.params;

    try {
        const objective = await Objective.findById(id);
        if (!objective) {
            return res.status(404).json({ message: 'Objectif non trouvé' });
        }

        await objective.softDelete(); // Utilisation du plugin soft delete

        // Créer une entrée d'audit pour la suppression
        const auditLog = new Audit({
            action: 'delete',
            documentId: id,
            documentType: 'objective',
            changedBy: req.get('X-Email-Creator'), // Assurez-vous que cet en-tête est fourni
            changes: { deleted: true },
        });

        await auditLog.save();

        res.status(200).json({ message: 'Objectif supprimé avec succès' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'objectif' });
    }
};

export {
    getCurrentObjective,
    getAllObjectives,
    createObjective,
    updateObjective,
    getObjectiveById,
    deleteObjective,
    objectifCurentValue
};
