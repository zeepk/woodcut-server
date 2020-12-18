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
	memberCount: {
		type: Number,
		required: true,
		default: 0,
	},
	averageMemberXP: {
		type: Number,
		required: true,
		default: 0,
	},
	averageMemberTotalLevel: {
		type: Number,
		required: true,
		default: 0,
	},
	averageMemberRunescore: {
		type: Number,
		required: true,
		default: 0,
	},
	members: [
		{
			username: {
				type: String,
				required: false,
			},
			rank: {
				type: String,
				required: false,
			},
			clanXp: {
				type: Number,
				required: false,
			},
			totalLevel: {
				type: Number,
				required: false,
			},
			totalXp: {
				type: Number,
				required: false,
			},
			dayGain: {
				type: Number,
				required: false,
			},
			weekGain: {
				type: Number,
				required: false,
			},
			monthGain: {
				type: Number,
				required: false,
			},
			yearGain: {
				type: Number,
				required: false,
			},
			runeScore: {
				type: Number,
				required: false,
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
			clanDayGain: {
				type: Number,
				required: true,
				default: 0,
			},
			clanWeekGain: {
				type: Number,
				required: true,
				default: 0,
			},
			clanMonthGain: {
				type: Number,
				required: true,
				default: 0,
			},
			clanYearGain: {
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
