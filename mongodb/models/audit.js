import mongoose from 'mongoose'

const AuditSchema = new mongoose.Schema({
    action: { type: String, required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    documentType: { type: String, required: true },
    changedBy: { type: String, required: true },
    changes: { type: Object }, // Store the changes made in a key-value format
},{
    timestamps:true
});

export default mongoose.model('Audit', AuditSchema);
