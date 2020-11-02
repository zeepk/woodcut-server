const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
	_id: Schema.Types.ObjectId,
	username: {
		type: String,
		required: true,
	},
	rsn: {
		type: String,
		required: true,
	},
	createdDate: {
		type: Date,
		required: true,
		default: Date.now,
	},
	lastUpdated: {
		type: Date,
		required: false,
	},
	statRecords: [
		{
			date: {
				type: Date,
				required: true,
				default: Date.now,
			},
			weekStart: {
				type: Boolean,
				required: true,
				default: new Date().getDay() === 1,
			},
			monthStart: {
				type: Boolean,
				required: true,
				default: new Date().getDate() === 1,
			},
			yearStart: {
				type: Boolean,
				required: true,
				default: new Date().getDate() === 1 && new Date().getMonth() === 0,
			},
			stats: {
				type: Array,
				required: true,
				default: [],
			},
		},
	],
	activities: [{ type: Schema.Types.ObjectId, ref: 'Activity' }],
});

module.exports = mongoose.model('User', userSchema);
