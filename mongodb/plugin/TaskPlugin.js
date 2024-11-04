export default function TaskPlugin(schema) {

    // Middleware for save, update, and create actions
    schema.pre(['save', 'findOneAndUpdate', 'findByIdAndUpdate','create'], function (next) {
        const assignedEmployees = this.assignedEmployees || (this._update && this._update.assignedEmployees);
        const status = this.status || (this._update && this._update.status);

        // If there are assigned employees but status is 'unassigned'
        if (assignedEmployees && assignedEmployees.length > 0 && status === 'unassigned') {
            return next(new Error('A task cannot be "unassigned" if employees are assigned.'));
        }

        next(); // Continue with save/update if no issues
    });

    // Middleware to check before creating a new document
    schema.pre('save', function (next) {
        if ((!this.assignedEmployees || this.assignedEmployees.length === 0) && this.status !== 'unassigned') {
            this.status = 'unassigned'; // Set status to 'unassigned' if no employees
        }

        next();
    });

    schema.pre('findOneAndUpdate', function (next) {
        const assignedEmployees = this._update && this._update.assignedEmployees;
        if ((!assignedEmployees || assignedEmployees.length === 0) && this._update.status !== 'unassigned') {
            this._update.status = 'unassigned'; // Set status to 'unassigned' if no employees on update
        }

        next();
    });
}
