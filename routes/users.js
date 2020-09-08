const express = require('express');
const router = express.Router();
const User = require('../models/User');
const fetch = require('node-fetch');
const proxyurl = 'https://api.allorigins.win/get?url=';

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

// Getting One
router.get('/:username', getUser, (req, res) => {
	res.json(res.user);
});

// // Creating one
// router.post('/', async (req, res) => {
// 	const user = new User({
// 		username: req.body.username.split(' ').join('+'),
// 		rsn: req.body.username,
// 	});
// 	try {
// 		const newUser = await user.save();
// 		res.status(201).json(newUser);
// 	} catch (err) {
// 		res.status(400).json({ message: err.message });
// 	}
// });

// Updates the xp gain
router.patch('/delta/:username', getUser, async (req, res) => {
	const data = await apiCheck(req.body.username.split(' ').join('+'));
	if (res.user[0].lastUpdated.toDateString() === new Date().toDateString()) {
		for (var i = 0; i < data.length; i++) {
			console.log(data[i]);
			const stat = res.user[0].statRecords[0].stats[i];
			stat[stat.length - 1] =
				+data[i][data[i].length - 1] - +stat[stat.length - 2];
		}

		console.log('Updating deltas');
	} else {
		console.log(
			'Most recent record is not from today. Data needs to be updated.'
		);
	}
	try {
		const updatedUser = await res.user[0].save();
		res.json(updatedUser);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
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
