// softDeletePlugin.js
export default function softDeletePlugin(schema) {
    // Add 'deleted' and 'deletedAt' fields to the schema
    if (!schema.path('deleted')) {
        schema.add({ deleted: { type: Boolean, default: false } });
    }

    if (!schema.path('deletedAt')) {
        schema.add({ deletedAt: { type: Date } });
    }

    // Method to perform a soft delete on a document
    schema.methods.softDelete = function () {
        this.deleted = true;
        this.deletedAt = new Date();
        return this.save();
    };

    // Static method to restore a logically deleted document
    schema.statics.restore = function (id) {
        return this.findByIdAndUpdate(id, { deleted: false, deletedAt: null }, { new: true });
    };

    // Middleware to exclude logically deleted documents from find queries
    schema.pre(['find', 'findOne', 'findById', 'findOneAndUpdate', 'countDocuments', 'aggregate'], function () {
        // Vérifier si 'this' a la méthode 'where'
        if (this.where) {
            this.where({ deleted: false });
        } else {
            // Si 'this' n'a pas 'where', il s'agit probablement d'une agrégation
            this.pipeline().unshift({ $match: { deleted: false } });
        }
    });
}
