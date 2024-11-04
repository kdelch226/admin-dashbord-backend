import { objectifCurentValue } from "../controllers/objective.controller.js";
import Objective from "../models/ojective.js";

const updateAllRelevantObjectives = async (transactionDate, transactionType) => {
    try {

        // Récupérer tous les objectifs de ce type et dont la période inclut la date de la transaction
        const objectives = await Objective.find({
            type: transactionType,
            startDate: { $lte: transactionDate },
            endDate: { $gte: transactionDate }
        });

        for (const objective of objectives) {
            const updatedCurrentValue = await objectifCurentValue(
                transactionType,
                objective.startDate,
                objective.endDate
            );

            // Mettre à jour l’objectif avec la nouvelle `currentValue`
            objective.currentValue = updatedCurrentValue;
            await objective.save();
        }
        return { message: 'Objectifs mis à jour avec succès.' };


        next();
    } catch (error) {
        console.error("Erreur dans le middleware de mise à jour des objectifs :", error);
        throw error;
    }
};

export default updateAllRelevantObjectives;