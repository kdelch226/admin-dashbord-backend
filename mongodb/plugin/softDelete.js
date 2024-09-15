// softDeletePlugin.js
export default function softDeletePlugin(schema) {
    // Add 'deleted' and 'deletedAt' fields to the schema
    schema.add({
        deleted: { type: Boolean, default: false },
        deletedAt: { type: Date }
    });

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
    schema.pre('find', function() {
        this.where({ deleted: false });
    });

    schema.pre('findOne', function() {
        this.where({ deleted: false });
    });

    schema.pre('findOneAndUpdate', function() {
        this.where({ deleted: false });
    });

    schema.pre('findById', function() {
        this.where({ deleted: false });
    });

    schema.pre('findByIdAndUpdate', function() {
        this.where({ deleted: false });
    });
};
