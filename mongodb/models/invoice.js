import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';

const invoiceSchema = mongoose.Schema({
    dateIssued: { type: Date, default: Date.now }, // Date d'émission de la facture
    dueDate: { type: Date }, // Date d'échéance pour le paiement
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' }, // Référence au client (pour les revenus)
    expense: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Expense' }], // Référence à la dépense (si facture de dépense)
    payment: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Payment' }], // Référence au paiement (si facture de revenu)
    status: { type: String, enum: ['paid', 'unpaid', 'partially-paid'], default: 'unpaid' },  // Statut de la facture
    amount: { type: Number, required: true }, // Montant total de la facture
    description: { type: String } // Description ou notes sur la facture
}, {
    timestamps: true
});

invoiceSchema.plugin(uniqueValidator);
invoiceSchema.plugin(softDelete);

export default mongoose.model('Invoice', invoiceSchema);
