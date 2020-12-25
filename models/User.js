const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new mongoose.Schema({
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
	isValid: {
		type: Boolean,
		required: true,
		default: true,
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
});

module.exports = mongoose.model('User', userSchema);
