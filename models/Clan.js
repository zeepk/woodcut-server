const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const clanSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	lastUpdated: {
		type: Date,
		required: true,
		default: Date.now,
	},
	// get with call to CSV file
	memberCount: {
		type: Number,
		required: true,
		default: 0,
	},
	members: [
		{
			username: {
				type: String,
				required: true,
			},
			clanRank: {
				type: String,
				required: true,
			},
			clanXp: {
				type: Number,
				required: true,
			},
			totalLevel: {
				type: Number,
				required: true,
			},
			totalXp: {
				type: Number,
				required: true,
			},
			dayGain: {
				type: Number,
				required: true,
			},
			runeScore: {
				type: Number,
				required: true,
			},
		},
	],
	// add xp record every 10 minutes
	xpRecords: [
		{
			totalClanXP: {
				type: Number,
				required: true,
				default: 0,
			},
			date: {
				type: Date,
				required: true,
				default: Date.now,
			},
		},
	],
});

module.exports = mongoose.model('Clan', clanSchema);
