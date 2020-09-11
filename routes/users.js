const express = require('express');
const router = express.Router();
const User = require('../models/User');
const fetch = require('node-fetch');
const proxyurl = 'https://api.allorigins.win/get?url=';
const axios = require('axios');
const API_URL = process.env.API_URL;

const apiCheck = async (username) => {
	const data = await fetch(
		`${proxyurl}https://secure.runescape.com/m=hiscore/index_lite.ws?player=${username}`
	)
		.then((res) => res.json())
		.then((res) => {
			// console.log(res.contents.split('\n').map((record) => record.split(',')));
			return res.contents.split('\n').map((record) => record.split(','));
		});
	return data;
};
// Getting all
router.get('/', async (req, res) => {
	try {
		const users = await User.find();
		res.json(users);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Getting top 10 xp gain
router.get('/topten', async (req, res) => {
	try {
		(async function () {
			const users = await User.find();
			// updating all users, this might make it slower idk
			await (function () {
				for (const user in users) {
					(async function () {
						const data = await apiCheck(
							users[user].username.split(' ').join('+')
						);
						for (var i = 0; i < data.length; i++) {
							const stat = users[user].statRecords[0].stats[i];
							stat[stat.length - 1] =
								+data[i][data[i].length - 1] - +stat[stat.length - 2];
						}
						users[user].statRecords[0].date = new Date();
						users[user].markModified('statRecords');
						console.log(users[user].username);
						const newUser = await users[user].save();
					})();
				}
			})();
			// then sorting to find top ten
			const updatedUsers = await User.find();

			const topten = updatedUsers
				.sort(
					(a, b) => b.statRecords[0].stats[0][3] - a.statRecords[0].stats[0][3]
				)
				.map((user) => {
					return {
						username: user.username,
						rsn: user.rsn,
						xpgain: user.statRecords[0].stats[0][3],
					};
				})
				.slice(0, 10);
			res.json(topten);
		})();
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Getting One
router.get('/:username', getUser, (req, res) => {
	res.json(res.user);
});
// Getting Date Range
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
	// res.json(res.user[0]);
});

// Updates the xp gain
router.put('/delta/:username', getUser, async (req, res) => {
	res.header('Access-Control-Allow-Origin', '*');
	const data = await apiCheck(req.body.username.split(' ').join('+'));
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
				res.status(200).json({
					message: 'User not found, created successfully!',
					data: data,
				});
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
	if (res.user[0].lastUpdated.toDateString() === new Date().toDateString()) {
		for (var i = 0; i < data.length; i++) {
			const stat = res.user[0].statRecords[0].stats[i];
			stat[stat.length - 1] =
				+data[i][data[i].length - 1] - +stat[stat.length - 2];
		}
		res.user[0].statRecords[0].date = new Date();
		console.log('Updating deltas');
	} else {
		console.log(
			'Most recent record is not from today. Data needs to be updated.'
		);
	}
	res.user[0].markModified('statRecords');
	try {
		const updatedUser = await res.user[0].save();
		res.json(updatedUser);
	} catch (err) {
		console.log('Error saving in /delta API endpoint');
		res.status(400).json({ message: err.message });
	}
});

// Updates the xp gain of all users
router.put('/massupdate', getUser, async (req, res) => {
	// const users = User.find({});
	// console.log(users);
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
				}
				console.log(users[user].lastUpdated.getHours());
				// if (
				// 	users[user].lastUpdated.toDateString() === new Date().toDateString()
				// ) {
				// 	// same day, does not need to be updated
				// 	users[user].statRecords[0].stats = data;
				// 	users[user].statRecords[0].date = new Date();
				// 	console.log(
				// 		'Overwrote data in mass update, daily gains lost for user: ' +
				// 			users[user].username
				// 	);
				// } else {
				// new day, needs to be updated
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

// Updating One
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

// Deleting One
router.delete('/:id', getUser, async (req, res) => {
	try {
		await res.user.remove();
		res.json({ message: 'Deleted User' });
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// Initialize
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
