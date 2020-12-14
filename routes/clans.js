const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityChecks = require('../constants');
const fetch = require('node-fetch');

const ClanActivityChecks = [
	'XP in',
	' pet',
	'levels',
	'level 99',
	'max cape',
	'completionist',
	'found',
];

// check clan against offical runescape api
const apiCheck = async (clanName) => {
	console.log(`Checking clan API for ${clanName}`);
	const clanNameCSV = await fetch(
		`http://services.runescape.com/m=clan-hiscores/members_lite.ws?clanName=${clanName}`
	)
		.then((res) => res.text())
		.then((res) => {
			const members = res
				.split('\n')
				.slice(1, -1)
				.map((memberInfo) => {
					const infoArray = memberInfo.split(',');
					return {
						username: infoArray[0].replace(/\uFFFD/g, ' '),
						rank: infoArray[1],
						clanXp: +infoArray[2],
						kills: +infoArray[3],
					};
				});
			return members;
		});

	return clanNameCSV;
};

// get list of clan members with username, clan rank, clan xp, kills
router.get('/members', async (req, res) => {
	try {
		const clanMemberApiData = await apiCheck(
			req.query.name
			// req.body.clanName.split(' ').join('+')
		);
		const clanMemberNames = clanMemberApiData.map((member) =>
			member.username.toLowerCase().split(' ').join('+')
		);
		const names = clanMemberNames.map((name) => {
			return {
				name,
			};
		});
		const memberCount = clanMemberNames.length;
		const users = await User.find(
			{ username: { $in: clanMemberNames } },
			{ statRecords: { $slice: 1 } }
		);
		const members = users.map((user) => {
			const userClanDetails = clanMemberApiData.find(
				(clannie) =>
					clannie.username.toLowerCase().split(' ').join('+') === user.username
			);
			if (!userClanDetails) {
				return;
			}
			return {
				username: user.username,
				clanRank: userClanDetails.rank,
				clanXp: userClanDetails.clanXp,
				totalLevel: +user.statRecords[0].stats[0][1] || 0,
				totalXp: +user.statRecords[0].stats[0][2] || 0,
				dayGain: user.statRecords[0].stats[0][3] || 0,
				runeScore: +user.statRecords[0].stats[53][1] || 0,
			};
		});
		res.json({
			memberCount,
			members: members.sort((a, b) => b.dayGain - a.dayGain).slice(0, 10),
			names,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// used to make sure all clan members are being tracked
router.get('/update', async (req, res) => {
	try {
		let newMemberCount = 0;
		const clanMemberApiData = await apiCheck(
			req.body.clanName.split(' ').join('+')
		);
		const clanMemberNames = clanMemberApiData.map((member) =>
			member.username.toLowerCase().split(' ').join('+')
		);
		const users = await clanMemberNames.map(async (name) => {
			const userRecord = await User.find({ username: name });
			if (!userRecord) {
				newMemberCount++;
			}
			return userRecord;
		});
		res.json({
			newMemberCount,
			users,
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get list of recent activities from users in the clan
router.get('/activities', async (req, res) => {
	try {
		const clanMemberApiData = await apiCheck(req.query.name);
		const clanMemberNames = clanMemberApiData.map((member) =>
			member.username.toLowerCase().split(' ').join('+')
		);
		const activities = await Activity.find({
			username: { $in: clanMemberNames },
		});
		res.json(
			activities
				.sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))
				.filter((activity) =>
					ClanActivityChecks.some(
						(keyword) =>
							activity.title.includes(keyword) ||
							activity.details.includes(keyword)
					)
				)
				.slice(0, 100)
				.map((activity) => {
					activity.title = activity.title.replace('I found', 'Found');
					return activity;
				})
		);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

module.exports = router;
