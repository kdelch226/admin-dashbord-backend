import mongoose from 'mongoose';
import softDelete from '../plugin/softDelete.js';

const ObjectiveSchema = mongoose.Schema({
    title: { type: String },
    type: { type: String, required: true, enum: ['expense', 'payment'] },
    targetValue: { type: Number, required: true, },
    currentValue: { type: Number, default: 0, },
    startDate: { type: Date, required: true, },
    endDate: { type: Date, required: true, },
}, { timestamps: true });

ObjectiveSchema.plugin(softDelete);

export default mongoose.model('Objective', ObjectiveSchema);
