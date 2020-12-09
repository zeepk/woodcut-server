const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const ActivityChecks = require('../constants');
const fetch = require('node-fetch');
const proxyurl = 'https://api.allorigins.win/get?url=';

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

// get all activities for all users, recent first
router.get('/activities', async (req, res) => {
	try {
		const activities = await Activity.find();
		res.json(
			activities.sort(
				(a, b) => new Date(b.activityDate) - new Date(a.activityDate)
			)
		);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get all activities for all users, recent first
router.get('/recentactivities', async (req, res) => {
	try {
		const activities = await Activity.find();
		// ActivityChecks;
		res.json(
			activities
				.sort((a, b) => new Date(b.activityDate) - new Date(a.activityDate))
				.filter((activity) =>
					ActivityChecks.some(
						(keyword) =>
							activity.title.includes(keyword) ||
							activity.details.includes(keyword)
					)
				)
				.slice(0, 100)
		);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// get all activities for one specific users, recent first
router.get('/recentactivities/:username', async (req, res) => {
	try {
		const activities = await Activity.find({ username: req.params.username });
		// ActivityChecks;
		res.json(
			activities.length > 0
				? activities.sort(
						(a, b) => new Date(b.activityDate) - new Date(a.activityDate)
				  )
				: { error: 'No activities available' }
		);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

// update activities gain for all users
router.put('/massactivitiesupdate', getUser, async (req, res) => {
	const activities = await Activity.find();
	console.log(activities.length);
	let amountUpdated = 0;
	User.find({}, function (err, users) {
		for (const user in users) {
			(async function () {
				const data = await activityCheck(
					users[user].username.split(' ').join('+')
				);
				for (const i in data) {
					if (
						!activities.some(
							(existingActivity) =>
								existingActivity.title === data[i].text &&
								new Date(existingActivity.activityDate).toString() ===
									new Date(data[i].date).toString()
						)
					) {
						console.log(data[i].text);
						amountUpdated++;
						const activity = new Activity({
							username: users[user].username,
							rsn: users[user].rsn,
							title: data[i].text,
							details: data[i].details,
							activityDate: new Date(data[i].date),
						});
						users[user].markModified('activities');
						const updatedUser = await users[user].save();
						try {
							const newActivity = await activity.save();
						} catch (err) {
							console.log(err);
						}
					}
				}
			})();
		}
	});
	console.log(`Finished updating activities.`);
	res.status(200).json({
		message: `Updated ${amountUpdated} activites!`,
		users_updated: amountUpdated,
	});
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
