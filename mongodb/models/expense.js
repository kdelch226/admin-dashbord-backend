import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';


const expenseSchema = mongoose.Schema({
    title: { type: String, required: true },
    amount: { type: Number, required: true }, // Montant de la dépense
    date: { type: Date, default: Date.now }, // Date de la dépense
    description: { type: String }, // Description de la dépense
    transactionMethod: {
        type: String, required: true, enum: [
            'Credit card',
            'Debit card',
            'Bank transfer',
            'PayPal',
            'Orange',
            'Check',
            'Cryptocurrency',
            'Cash'
        ]
    },
    category: { type: String, required: true }, // Catégorie de la dépense
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }, // Référence au project (optionnel)
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // Référence à l'événement (optionnel)
    task: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },// Optionnel
    employe: { type: mongoose.Schema.Types.ObjectId, ref: 'Employe' },
    recurrence: {
        type: {
            frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true },
            endDate: { type: Date }, // Date de fin de la récurrence
            occurrences: { type: Number }, // Nombre d'occurrences restantes
            isCancelled: { type: Boolean, default: false }
        }
    },
    status: {
        type: String,
        enum: ['pending', 'rejected', 'completed'], // Énumération des statuts possibles
        default: 'pending' // Valeur par défaut
    }
}, {
    timestamps: true
});

expenseSchema.plugin(uniqueValidator);
expenseSchema.plugin(softDelete);

export default mongoose.model('Expense', expenseSchema);
