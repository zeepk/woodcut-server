const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const activitySchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
	},
	rsn: {
		type: String,
		required: true,
	},
	title: {
		type: String,
		required: true,
	},
	details: {
		type: String,
		required: false,
	},
	activityDate: {
		type: Date,
		required: true,
	},
	createdDate: {
		type: Date,
		required: true,
		default: Date.now,
	},
});

module.exports = mongoose.model('Activity', activitySchema);
