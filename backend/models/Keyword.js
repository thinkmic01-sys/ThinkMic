const mongoose = require('mongoose');

// Admin-curated topic tags, organized as Main Topic -> Sub Topic (optional) -> Keyword.
// Each document is one leaf-level Keyword; mainTopic/subTopic are just its place in the
// hierarchy, used to group and cascade-filter on both the admin (KeywordsManagement.jsx)
// and user-facing (MyLearningList.jsx, CreateSeminar.jsx, NearbySeminars.jsx) sides.
// `text` (the leaf keyword itself) is what actually gets followed/matched/tagged
// everywhere downstream - kept globally unique so the existing plain-string matching in
// seminarsController.notifyKeywordFollowers (seminar.category === keyword.text) still
// works unambiguously without needing mainTopic/subTopic context.
const KeywordSchema = new mongoose.Schema({
    mainTopic: {
        type: String,
        required: true,
        trim: true
    },
    subTopic: {
        type: String,
        trim: true,
        default: ''
    },
    text: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Keyword', KeywordSchema);
