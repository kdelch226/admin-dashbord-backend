import Audit from '../models/audit.js';
import User from '../models/user.js';
import Task from '../models/task.js';
import Service from '../models/service.js';
import Project from '../models/project.js';
import Payment from '../models/payment.js';
import Expense from '../models/expense.js';
import Event from '../models/event.js';
import Employe from '../models/employe.js';
import Client from '../models/client.js';
import Objective from '../models/ojective.js';

async function findDocumentByType(documentType, documentId) {
    let document;
    let documentInfo;
    const documentTypeLowerCase = documentType.toLocaleLowerCase()

    switch (documentTypeLowerCase) {
        case 'user':
            document = await User.findById(documentId);
            break;
        case 'task':
            document = await Task.findById(documentId);
            break;
        case 'service':
            document = await Service.findById(documentId);
            break;
        case 'projet':
            document = await Project.findById(documentId);
            break;
        case 'project':
            document = await Project.findById(documentId);
            break;
        case 'payment':
            document = await Payment.findById(documentId);
            break;
        case 'expense':
            document = await Expense.findById(documentId);
            break;
        case 'event':
            document = await Event.findById(documentId);
            break;
        case 'employe':
            document = await Employe.findById(documentId);
            break;
        case 'employee':
            document = await Employe.findById(documentId);
            break;
        case 'client':
            document = await Objective.findById(documentId);
            break;
        case 'objective':
            document = await Client.findById(documentId);
            break;
        default:
            return 'Invalid document type';
    }

    if (document) {
        documentInfo = document.title || document.name; // Utilise le title s'il existe, sinon utilise le name

        return documentInfo; // Retourne le titre ou le nom
    } else {
        documentInfo = 'no document'
        return documentInfo;
    };
}

async function additionalAuditInfo(audit) {
    try {
        const user = await User.findOne({ email: audit.changedBy });
        if (user) {
            audit.user = user.name; // Ajouter le nom de l'utilisateur à l'audit
            audit.userAvatar = user.avatar; // Ajouter l'avatar de l'utilisateur à l'audit
        }

        const documentTitle = await findDocumentByType(audit.documentType, audit.documentId);
        audit.documentTitle = documentTitle; // Ajouter le titre du document à l'audit
    } catch (error) {
        throw new Error('Could not fetch additional audit information.');
    }
}


const getAllAudits = async (req, res) => {
    try {
        let { _start, _end, _sort, _order = "desc", userEmail_like = '', action_like = '', documentType, userName_like = '' } = req.query;

        let query = {};

        // Build query based on user input
        if (userEmail_like) {
            query.changedBy = { $regex: userEmail_like, $options: 'i' };
        }

        if (action_like) {
            query.action = { $regex: action_like, $options: 'i' };
        }

        if (documentType) {
            query.documentType = { $regex: documentType, $options: 'i' };
        }

        if (userName_like) {
            const users = await User.find({ name: { $regex: userName_like, $options: 'i' } });
            const userEmails = users.map(user => user.email);
            query.changedBy = { $in: userEmails };
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort.createdAt = -1; // Default sort by creation date
        }

        const count = await Audit.countDocuments(query);

        const audits = await Audit.find(query)
            .sort(sort)
            .skip(Number(_start))
            .limit(Number(_end))
            .lean();

        // Enhance audits with user information and document title
        await Promise.all(audits.map(audit => additionalAuditInfo(audit)));

        res.header('x-total-count', count);
        res.header('Access-Control-Expose-Headers', 'x-total-count');
        res.status(200).json(audits);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getAuditByID = async (req, res) => {
    const { id } = req.params;

    try {
        const audit = await Audit.findById(id).lean();
        if (!audit) {
            return res.status(404).json({ message: 'Audit not found' });
        }

        // Attendre que les informations supplémentaires soient ajoutées
        await additionalAuditInfo(audit);

        // Retourner l'audit enrichi avec les nouvelles informations
        res.status(200).json(audit);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



export {
    getAllAudits,
    getAuditByID
}