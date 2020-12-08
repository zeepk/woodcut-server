const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TopTenList = require('../models/TopTenList');
const fetch = require('node-fetch');
const proxyurl = 'https://api.allorigins.win/get?url=';
const { DateTime } = require('luxon');
const request = require('request');

// check user against offical runescape hiscores
const apiCheck = async (username) => {
	console.log(`Checking RuneScape API for ${username}`);
	const data = await fetch(
		`${proxyurl}https://secure.runescape.com/m=hiscore/index_lite.ws?player=${username}`
	)
		.then((res) => res.json())
		.then((res) => {
			console.log(`Finished checking RuneScape API for ${username}`);

			return res.contents.split('\n').map((record) => record.split(','));
		});
	return data;
};

// check user against offical runescape hiscores
const activityCheck = async (username) => {
	try {
		const data = await fetch(
			`https://apps.runescape.com/runemetrics/profile/profile?user=${username}&activities=20`
		)
			.then((res) => res.json())
			.then((res) => {
				if (res.error) {
					console.log('ERROR in profile');
				}
				return res.activities || null;
			});
		return data;
	} catch (error) {
		return null;
	}
};

// get all records for all users
router.get('/', async (req, res) => {
	try {
		const users = await User.find();
		res.json(users);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get most recent top ten list
router.get('/topten', async (req, res) => {
	try {
		const topTen = await TopTenList.find().sort({ createdDate: -1 }).limit(1);
		res.json(topTen[0]);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get all top ten lists
router.get('/alltopten', async (req, res) => {
	try {
		const topTen = await TopTenList.find();
		res.json(
			// topTen.sort()
			topTen.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate))
		);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get details for player (clan name, title)
router.get('/details/:username', async (req, res) => {
	request(
		`https://secure.runescape.com/m=website-data/playerDetails.ws?names=%5B%22${req.params.username}%22%5D&callback=jQuery000000000000000_0000000000&_=0`,
		{ json: false },
		(err, response, body) => {
			if (err) {
				return console.log(err);
			}
			const jsonResponse = response.body
				.split('(')[1]
				.split(')')[0]
				.replace(/\\/g, '');
			res.json(JSON.parse(jsonResponse));
		}
	);
});

// get current number of online players
router.get('/playercount', async (req, res) => {
	request(
		`http://www.runescape.com/player_count.js?varname=iPlayerCount&callback=jQuery000000000000000_0000000000&_=0`,
		{ json: false },
		(err, response, body) => {
			if (err) {
				return console.log(err);
			}
			res.json({ players: +response.body.split('(')[1].split(')')[0] });
		}
	);
});

// updates the top ten lists with a new entry
router.put('/updatetopten', async (req, res) => {
	let updatedUsers = [];
	try {
		// (async function () {
		const users = await User.find();
		// updating all users, this might make it slower idk
		const endDateString = new Date();
		const endDate = DateTime.fromISO(endDateString.toISOString());
		const startDate = endDate.startOf('week');
		console.log(startDate.toLocaleString(DateTime.DATETIME_MED));
		console.log(new Date(startDate).toDateString());
		const userPromises = users.map(async (user, index) => {
			const data = await apiCheck(user.username.split(' ').join('+'));
			// getting the date for the start of the week
			// grab the record for the week start date, or the oldest record if the user is < 1 week old
			const weekRecord =
				user.statRecords.find(
					(record) =>
						new Date(record.date).toDateString() ===
						new Date(startDate).toDateString()
				) || user.statRecords[user.statRecords.length - 1];
			// same thing for the start of the month
			const monthRecord =
				user.statRecords.find(
					(record) =>
						new Date(record.date).toDateString() ===
						new Date(startDate.startOf('month')).toDateString()
				) || user.statRecords[user.statRecords.length - 1];
			// and the start of the year
			const yearRecord =
				user.statRecords.find(
					(record) =>
						new Date(record.date).toDateString() ===
						new Date(startDate.startOf('year')).toDateString()
				) || user.statRecords[user.statRecords.length - 1];
			// now go through and add all the deltas to the array of stats
			for (var i = 0; i < data.length; i++) {
				// get stat
				const stat = user.statRecords[0].stats[i];
				if (!stat) {
					return null;
				}
				// update day
				stat[stat.length - 4] =
					+data[i][data[i].length - 1] - +stat[stat.length - 5];
				// update week
				stat[stat.length - 3] =
					+data[i][data[i].length - 1] -
					+weekRecord.stats[i][weekRecord.stats[i].length - 5];
				// update month
				stat[stat.length - 2] =
					+data[i][data[i].length - 1] -
					+monthRecord.stats[i][monthRecord.stats[i].length - 5];
				// update year
				stat[stat.length - 1] =
					+data[i][data[i].length - 1] -
					+yearRecord.stats[i][yearRecord.stats[i].length - 5];
			}
			user.statRecords[0].date = new Date();
			user.markModified('statRecords');
			const newUser = await user.save();
			console.log(user.username);
			return newUser;
		});
		Promise.all(userPromises)
			.then(async () => {
				updatedUsers = await User.find();
			})
			.then(async () => {
				const day = updatedUsers
					.sort(
						(a, b) =>
							b.statRecords[0].stats[0][3] - a.statRecords[0].stats[0][3]
					)
					.map((user) => {
						return {
							username: user.username,
							rsn: user.rsn,
							xpgain: user.statRecords[0].stats[0][3],
						};
					})
					.slice(0, 10);
				const week = updatedUsers
					.sort(
						(a, b) =>
							b.statRecords[0].stats[0][4] - a.statRecords[0].stats[0][4]
					)
					.map((user) => {
						return {
							username: user.username,
							rsn: user.rsn,
							xpgain: user.statRecords[0].stats[0][4],
						};
					})
					.slice(0, 10);
				const month = updatedUsers
					.sort(
						(a, b) =>
							b.statRecords[0].stats[0][5] - a.statRecords[0].stats[0][5]
					)
					.map((user) => {
						return {
							username: user.username,
							rsn: user.rsn,
							xpgain: user.statRecords[0].stats[0][5],
						};
					})
					.slice(0, 10);
				const year = updatedUsers
					.sort(
						(a, b) =>
							b.statRecords[0].stats[0][6] - a.statRecords[0].stats[0][6]
					)
					.map((user) => {
						return {
							username: user.username,
							rsn: user.rsn,
							xpgain: user.statRecords[0].stats[0][6],
						};
					})
					.slice(0, 10);
				console.log('Done updating everyone for the top ten! Returning...');
				const topTenList = new TopTenList({
					day,
					week,
					month,
					year,
				});
				try {
					const newTopTenList = await topTenList.save();
				} catch (err) {
					console.log(err);
				}
				res.json({
					day,
					week,
					month,
					year,
				});
			});
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get all records for one user
router.get('/:username', getUser, (req, res) => {
	res.json(res.user);
});

// get user's gains over the last 7 days
router.get('/weekstart/:username', getUser, async (req, res) => {
	const endDateString = new Date();
	const endDate = DateTime.fromISO(endDateString.toISOString());
	const startDate = endDate.startOf('week');
	console.log(startDate.toLocaleString(DateTime.DATETIME_MED));
	console.log(new Date(startDate).toDateString());
	const startRecord = res.user[0].statRecords.find(
		(record) =>
			new Date(record.date).toDateString() ===
			new Date(startDate).toDateString()
	);
	res.json(startRecord);
});

// get start and end records for user
router.get('/dates/:username', getUser, (req, res) => {
	const startDateString = new Date(req.body.startDate).toDateString();
	const endDateString = new Date(req.body.endDate).toDateString();

	const startRecord = res.user[0].statRecords.find(
		(record) => new Date(record.date).toDateString() === startDateString
	);
	const endRecord = res.user[0].statRecords.find(
		(record) => new Date(record.date).toDateString() === endDateString
	);
	const records =
		startRecord && endRecord
			? {
					startRecord,
					endRecord,
			  }
			: {
					error: 'Unable to find records for specified dates.',
			  };
	res.json(records);
});

// get xp gain between two date ranges
router.get('/daterangegain/:username', getUser, (req, res) => {
	if (!res.user[0]) {
		res.json({
			error: 'Unable to find user.',
		});
		return;
	}
	const startDate = new Date(req.query.startDate);
	const endDate = new Date(req.query.endDate);
	if (endDate <= startDate) {
		res.json({ error: 'Start date is not before end date.' });
	}
	const startRecord = res.user[0].statRecords.find(
		(record) =>
			new Date(record.date).toDateString() === startDate.toDateString()
	);
	const endRecord = res.user[0].statRecords.find(
		(record) => new Date(record.date).toDateString() === endDate.toDateString()
	);
	if (startRecord && endRecord) {
		const rangeGains = [];
		for (var i = 0; i <= 28; i++) {
			rangeGains.push({
				id: i,
				gain: +endRecord.stats[i][2] - +startRecord.stats[i][2],
			});
		}
		res.json({
			rangeGains,
			startRecord,
			endRecord,
		});
	} else {
		res.json({
			error: 'Unable to find records for specified dates.',
			startDate,
			endDate,
		});
	}
});

// get all records for user in date range
router.get('/daterange/:username', getUser, (req, res) => {
	const startDate = new Date(req.query.startDate);
	const endDate = new Date(req.query.endDate);
	endDate.setDate(endDate.getDate() + 1);

	const recordsInRange = res.user[0].statRecords
		.filter(
			(record) =>
				new Date(record.date) <= endDate && new Date(record.date) >= startDate
		)
		.reverse();
	const records =
		recordsInRange.length > 0
			? {
					recordsInRange,
			  }
			: {
					error: 'Unable to find records for specified dates.',
					startDate,
					endDate,
			  };
	res.json(records);
});

// update xp gain for one user
router.put('/delta/:username', getUser, async (req, res) => {
	res.header('Access-Control-Allow-Origin', '*');
	const data = await apiCheck(req.body.username.split(' ').join('+'));
	const activities = await activityCheck(
		req.body.username.split(' ').join('+')
	);
	if (!res.user[0]) {
		console.log('user not found...');
		if (data.length > 5) {
			for (const i in data) {
				data[i].push(0);
			}
			const user = new User({
				username: req.body.username.split(' ').join('+'),
				rsn: req.body.username,
				lastUpdated: Date.now(),
				statRecords: [
					{
						stats: data,
					},
				],
			});
			try {
				const newUser = await user.save();
				console.log('User created successfully.');
				res.status(200).json(newUser);
			} catch (err) {
				res
					.status(400)
					.json({ message: 'User not found, unable to create.', data: data });
			}
			return;
		} else {
			res
				.status(400)
				.json({ message: 'user not found in hiscores', data: data });
		}
		return;
	}
	// getting the date for the start of the week
	const endDateString = new Date();
	const endDate = DateTime.fromISO(endDateString.toISOString());
	const startDate = endDate.startOf('week');
	console.log(startDate.toLocaleString(DateTime.DATETIME_MED));
	console.log(new Date(startDate).toDateString());
	// grab the record for the week start date, or the oldest record if the user is < 1 week old
	const weekRecord =
		res.user[0].statRecords.find(
			(record) =>
				new Date(record.date).toDateString() ===
				new Date(startDate).toDateString()
		) || res.user[0].statRecords[res.user[0].statRecords.length - 1];
	// same thing for the start of the month
	const monthRecord =
		res.user[0].statRecords.find(
			(record) =>
				new Date(record.date).toDateString() ===
				new Date(startDate.startOf('month')).toDateString()
		) || res.user[0].statRecords[res.user[0].statRecords.length - 1];
	// and the start of the year
	const yearRecord =
		res.user[0].statRecords.find(
			(record) =>
				new Date(record.date).toDateString() ===
				new Date(startDate.startOf('year')).toDateString()
		) || res.user[0].statRecords[res.user[0].statRecords.length - 1];
	// now go through and add all the deltas to the array of stats
	for (var i = 0; i < data.length; i++) {
		// get stat
		const stat = res.user[0].statRecords[0].stats[i];
		// if the user doesn't have spots for week, month, etc, add them here
		if (stat.length < 6) {
			stat.push(0);
			stat.push(0);
			stat.push(0);
		}
		if (weekRecord.stats[i].length < 6) {
			weekRecord.stats[i].push(0);
			weekRecord.stats[i].push(0);
			weekRecord.stats[i].push(0);
		}
		if (monthRecord.stats[i].length < 6) {
			monthRecord.stats[i].push(0);
			monthRecord.stats[i].push(0);
			monthRecord.stats[i].push(0);
		}
		if (yearRecord.stats[i].length < 6) {
			yearRecord.stats[i].push(0);
			yearRecord.stats[i].push(0);
			yearRecord.stats[i].push(0);
		}
		// console.log(weekRecord.stats[i]);
		// console.log(+data[i][data[i].length - 1]);
		// console.log(+weekRecord.stats[i][weekRecord.stats[i].length - 2]);
		// update day
		stat[stat.length - 4] =
			+data[i][data[i].length - 1] - +stat[stat.length - 5];
		// update week
		stat[stat.length - 3] =
			+data[i][data[i].length - 1] -
			+weekRecord.stats[i][weekRecord.stats[i].length - 5];
		// update month
		stat[stat.length - 2] =
			+data[i][data[i].length - 1] -
			+monthRecord.stats[i][monthRecord.stats[i].length - 5];
		// update year
		stat[stat.length - 1] =
			+data[i][data[i].length - 1] -
			+yearRecord.stats[i][yearRecord.stats[i].length - 5];
	}
	res.user[0].statRecords[0].date = new Date();
	console.log('Updating deltas');

	res.user[0].markModified('statRecords');
	try {
		const updatedUser = await res.user[0].save();
		res.json(updatedUser);
	} catch (err) {
		console.log('Error saving in /delta API endpoint');
		res.status(400).json({ message: err.message });
	}
});

// update xp gain for all users
router.put('/massupdate', getUser, async (req, res) => {
	// const users = User.find({});
	const usersUpdated = [];
	User.find({}, function (err, users) {
		for (const user in users) {
			(async function () {
				const data = await apiCheck(users[user].username.split(' ').join('+'));
				for (var i = 0; i < data.length; i++) {
					const stat = users[user].statRecords[0].stats[i];
					stat[stat.length - 1] =
						+data[i][data[i].length - 1] - +stat[stat.length - 2];
				}
				users[user].statRecords[0].date = new Date();
				for (const i in data) {
					data[i].push(0);
					data[i].push(0);
					data[i].push(0);
					data[i].push(0);
				}
				console.log(users[user].lastUpdated.getHours());
				users[user].statRecords.unshift({ stats: data });
				console.log('New day addition for user: ' + users[user].username);
				// }
				users[user].lastUpdated = new Date();
				usersUpdated.push('users[user].username');
				users[user].markModified('statRecords');
				const updatedUser = await users[user].save();
			})();
		}
	});
	res
		.status(200)
		.json({ message: 'Wow haha nice', users_updated: usersUpdated });
});

// update one user - NOT IN USE
router.patch('/:username', getUser, async (req, res) => {
	// if (req.body.username != null) {
	// 	res.user.username = req.body.username;
	// }
	const data = await apiCheck(req.body.username.split(' ').join('+'));
	for (const i in data) {
		data[i].push(0);
	}
	if (res.user[0].lastUpdated.toDateString() === new Date().toDateString()) {
		res.user[0].statRecords[0].stats = data;
		res.user[0].statRecords[0].date = new Date();
		console.log('Same day update');
	} else {
		res.user[0].statRecords.unshift({ stats: data });
		console.log('New day addition');
	}
	res.user[0].lastUpdated = new Date();
	try {
		const updatedUser = await res.user[0].save();
		res.json(updatedUser);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

// delete one user
// router.delete('/:id', getUser, async (req, res) => {
// 	try {
// 		await res.user.remove();
// 		res.json({ message: 'Deleted User' });
// 	} catch (err) {
// 		res.status(500).json({ message: err.message });
// 	}
// });

// initialize a user
router.post('/init', async (req, res) => {
	const data = await apiCheck(req.body.username.split(' ').join('+'));
	for (const i in data) {
		data[i].push(0);
	}
	const user = new User({
		username: req.body.username.split(' ').join('+'),
		rsn: req.body.username,
		lastUpdated: Date.now(),
		statRecords: [
			{
				stats: data,
			},
		],
	});
	try {
		const newUser = await user.save();
		res.status(201).json(newUser);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

async function getUser(req, res, next) {
	console.log(req.params.username);
	let user;
	try {
		user = await User.find({ username: req.params.username });
		if (user == null) {
			return res.status(404).json({ message: 'Cannot find user' });
		}
	} catch (err) {
		return res.status(500).json({ message: err.message });
	}

	res.user = user;
	next();
}

module.exports = router;
