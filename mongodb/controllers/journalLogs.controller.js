import AuditsLog from '../models/auditslog.js';
import User from '../models/user.js';


async function additionalAuditsLogInfo(auditsLog) {
    try {
        const user = await User.findOne({ email: auditsLog.userMail });
        if (user) {
            auditsLog.userName = user.name; // Ajouter le nom de l'utilisateur à l'audit
            auditsLog.userAvatar = user.avatar; // Ajouter l'avatar de l'utilisateur à l'audit
        }
    } catch (error) {
        console.error(`Error fetching additional audit info: ${error.message}`);
        throw new Error('Could not fetch additional audit information.');
    }
}

const getAllAuditsLogs = async (req, res) => {
    try {
        let { _start, _end, _sort, _order = "desc", userMail_like = '', action_like = '', userName_like = '' } = req.query;

        let query = {};

        // Build query based on user input
        if (userMail_like) {
            query.userMail = { $regex: userMail_like, $options: 'i' };
        }

        if (action_like) {
            query.action = { $regex: action_like, $options: 'i' };
        }


        if (userName_like) {
            const users = await User.find({ name: { $regex: userName_like, $options: 'i' } });
            const userEmails = users.map(user => user.email);
            query.userMail = { $in: userEmails };
        }

        const sort = {};
        if (_sort && _order) {
            sort[_sort] = _order === 'desc' ? -1 : 1;
        } else {
            sort.createdAt = -1; // Default sort by creation date
        }

        const count = await AuditsLog.countDocuments(query);

        const auditslogs = await AuditsLog.find(query)
            .sort(sort)
            .skip(Number(_start))
            .limit(Number(_end))
            .lean();

        // Enhance auditslogs with user information and document title
        await Promise.all(auditslogs.map(auditslog => additionalAuditsLogInfo(auditslog)));

        res.header('x-total-count', count);
        res.header('Access-Control-Expose-Headers', 'x-total-count');
        res.status(200).json(auditslogs);
    } catch (error) {
        console.error(`Error fetching auditslogs: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};


const getAuditsLogByID = async (req, res) => {
    const { id } = req.params;

    try {
        const auditslog = await AuditsLog.findById(id).lean();
        if (!auditslog) {
            return res.status(404).json({ message: 'AuditsLog not found' });
        }

        // Attendre que les informations supplémentaires soient ajoutées
        await additionalAuditsLogInfo(auditslog);

        // Retourner l'auditslog enrichi avec les nouvelles informations
        res.status(200).json(auditslog);
    } catch (error) {
        console.error(`Error fetching auditslog by ID: ${error.message}`);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};



export {
    getAllAuditsLogs,
    getAuditsLogByID
}