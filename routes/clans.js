const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Clan = require('../models/Clan');
const Activity = require('../models/Activity');
const fetch = require('node-fetch');
const proxyurl = 'https://api.allorigins.win/get?url=';
const { DateTime } = require('luxon');

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
	console.log(`Getting clan member list for ${clanName}`);
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

// check user against offical runescape hiscores
const userAPICheck = async (username) => {
	console.log(`Checking RuneScape API for ${username}`);
	const data = await fetch(
		`${proxyurl}https://secure.runescape.com/m=hiscore/index_lite.ws?player=${username}`
	)
		.then((res) => res.json())
		.then((res) => {
			return res.contents.split('\n').map((record) => record.split(','));
		});
	return data;
};

// make sure all users are in the db
const updateUsers = async (clanMembers) => {
	console.log(`Updating ${clanMembers.length} members...`);
	Promise.all(
		clanMembers.map(async (member) => {
			const user = await User.findOne({
				username: member.username.toLowerCase().split(' ').join('+'),
			});
			if (!user) {
				const data = await userAPICheck(
					member.username.toLowerCase().split(' ').join('+')
				);
				if (data.length < 5) {
					return;
				}
				for (const i in data) {
					data[i].push(0);
					data[i].push(0);
					data[i].push(0);
					data[i].push(0);
				}
				const user = new User({
					username: member.username.toLowerCase().split(' ').join('+'),
					rsn: member.username,
					lastUpdated: Date.now(),
					statRecords: [
						{
							stats: data,
						},
					],
				});
				try {
					await user.save();
					console.log(`New member: ${member.username}`);
				} catch (err) {
					console.log(err.message);
				}
			}
		})
	);
};

// goes through and updates the stats of each clan
router.put('/updateclans', async (req, res) => {
	try {
		const clans = await Clan.find();

		Promise.all(
			clans.map(async (clan) => {
				const clanMemberApiData = await apiCheck(clan.name);
				await updateUsers(clanMemberApiData);

				let totalClanXP = 0;
				let totalClanTotalLevels = 0;
				let totalClanRunescore = 0;

				let totalClanXPActiveMembers = 0;
				let totalClanTotalLevelsActiveMembers = 0;
				let totalClanRunescoreActiveMembers = 0;

				const updatedClanMembers = Promise.all(
					clanMemberApiData.map(async (member) => {
						try {
							const user = await User.findOne({
								username: member.username.toLowerCase().split(' ').join('+'),
							});
							member.totalLevel = +user.statRecords[0].stats[0][1] || 0;
							member.totalXp = +user.statRecords[0].stats[0][2] || 0;
							member.dayGain = user.statRecords[0].stats[0][3] || 0;
							member.weekGain = user.statRecords[0].stats[0][4] || 0;
							member.monthGain = user.statRecords[0].stats[0][5] || 0;
							member.yearGain = user.statRecords[0].stats[0][6] || 0;
							member.runeScore = +user.statRecords[0].stats[53][1] || 0;
							member.runeScore = member.runeScore < 0 ? 0 : member.runeScore;

							totalClanXP += member.totalXp;
							totalClanTotalLevels += member.totalLevel;
							totalClanRunescore += member.runeScore;

							member.totalXp > 0 && totalClanXPActiveMembers++;
							member.totalLevel > 0 && totalClanTotalLevelsActiveMembers++;
							member.runeScore > 0 && totalClanRunescoreActiveMembers++;

							// if (member.username.includes('zee')) {
							// 	console.log(user.statRecords[0].stats);
							// 	console.log(member);
							// }
						} catch (error) {
							member.totalLevel = 0;
							member.totalXp = 0;
							member.dayGain = 0;
							member.weekGain = 0;
							member.monthGain = 0;
							member.yearGain = 0;
							member.runeScore = 0;
							member.runeScore = 0;
							return member;
						}
						return Promise.resolve(member);
					})
				);
				updatedClanMembers.then(async (data) => {
					const clanXPRecord = {
						totalClanXP,
						clanDayGain: data
							.map((member) => member.dayGain || 0)
							.reduce((a, b) => a + b, 0),
						clanWeekGain: data
							.map((member) => member.weekGain || 0)
							.reduce((a, b) => a + b, 0),
						clanMonthGain: data
							.map((member) => member.monthGain || 0)
							.reduce((a, b) => a + b, 0),
						clanYearGain: data
							.map((member) => member.yearGain || 0)
							.reduce((a, b) => a + b, 0),
						date: new Date(),
					};

					clan.xpRecords[0] = clanXPRecord;
					clan.markModified('xpRecords');

					clan.members = data;
					clan.markModified('members');

					clan.memberCount = data.length;
					clan.averageMemberXP = Math.round(
						totalClanXP / totalClanXPActiveMembers
					);
					clan.averageMemberTotalLevel = Math.round(
						totalClanTotalLevels / totalClanTotalLevelsActiveMembers
					);
					clan.averageMemberRunescore = Math.round(
						totalClanRunescore / totalClanRunescoreActiveMembers
					);

					try {
						await clan.save();
					} catch (err) {
						console.log(err.message);
					}
				});
				return updatedClanMembers;
			})
		).then(() => {
			res.json({ message: 'Success', clans });
		});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

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

// returns info for clan, or creates it in db if not found
router.get('/', async (req, res) => {
	try {
		let wasCreated = false;
		const name = req.query.name;

		// get clan from our database
		const clan = await Clan.find({ name: name });

		if (clan.length === 0) {
			// clan was not found, need to create
			// get API data, if there is none, clan does not exist
			clanMemberApiData = await apiCheck(name);
			if (clanMemberApiData.length === 0) {
				res
					.status(500)
					.json({ message: 'Clan does not exist in Runescape API data' });
			}

			wasCreated = true;
			const newClan = new Clan({
				name,
				lastUpdated: Date.now(),
				memberCount: clanMemberApiData.length,
			});
			try {
				const newClanResponse = await newClan.save();
				res.status(201).json({ wasCreated, clan: newClanResponse });
			} catch (err) {
				res.status(400).json({ message: err.message });
			}
		}
		res.json({
			wasCreated,
			clan: clan[0],
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
