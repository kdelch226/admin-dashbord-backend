import mongoose from 'mongoose';

const AuditLogSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userMail:{type:String,required:true},
    action: { type: String, enum: ['login', 'logout'], required: true },
    ipAddress: { type: String },
    location: {
        country: { type: String },
        city: { type: String }
      },
}, {
    timestamps: true // Ajoute automatiquement createdAt et updatedAt
});

export default mongoose.model('AuditLog', AuditLogSchema);
