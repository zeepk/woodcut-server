const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const topTenListSchema = new mongoose.Schema({
	day: [
		{
			rsn: String,
			username: String,
			xpgain: String,
		},
	],
	week: [
		{
			rsn: String,
			username: String,
			xpgain: String,
		},
	],
	month: [
		{
			rsn: String,
			username: String,
			xpgain: String,
		},
	],
	year: [
		{
			rsn: String,
			username: String,
			xpgain: String,
		},
	],
	createdDate: {
		type: Date,
		required: true,
		default: Date.now,
	},
});

module.exports = mongoose.model('TopTenList', topTenListSchema);
