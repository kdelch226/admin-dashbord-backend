import mongoose from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import softDelete from '../plugin/softDelete.js';


const paymentSchema = mongoose.Schema({
    amount: { type: Number, required: true }, // Montant payé
    date: { type: Date, default: Date.now }, // Date du paiement
    type: { type: String, enum: ['Initial', 'Milestone', 'Final'], required: true }, // Type de paiement
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true }, // Référence au client
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true }, // Référence au projet
}, {
    timestamps: true
});

paymentSchema.plugin(uniqueValidator);
paymentSchema.plugin(softDelete);

export default mongoose.model('Payment', paymentSchema);
