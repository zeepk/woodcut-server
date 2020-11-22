const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityChecks = require('../constants');
const fetch = require('node-fetch');
const proxyurl = 'https://api.allorigins.win/get?url=';

// check user against offical runescape hiscores
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
						xp: +infoArray[2],
						kills: +infoArray[3],
					};
				});
			return members;
		});

	return clanNameCSV;
};

// return various clan information
router.get('/members', async (req, res) => {
	try {
		const clanMembers = await apiCheck(req.body.clanName.split(' ').join('+'));
		res.json(clanMembers);
	} catch (err) {
		res.status(500).json({ message: err.message });
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
