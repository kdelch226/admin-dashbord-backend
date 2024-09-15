import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';


const expenseSchema = mongoose.Schema({
    amount: { type: Number, required: true }, // Montant de la dépense
    date: { type: Date, default: Date.now }, // Date de la dépense
    description: { type: String, required: true }, // Description de la dépense
    category: { type: String, enum: ['Salaires', 'Frais généraux', 'Matériel', 'Autre'], required: true }, // Catégorie de la dépense
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Référence au projet (optionnel)
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // Référence à l'événement (optionnel)
}, {
    timestamps: true
});

expenseSchema.plugin(uniqueValidator);
expenseSchema.plugin(softDelete);

export default mongoose.model('Expense', expenseSchema);
