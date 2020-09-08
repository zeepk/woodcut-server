const fetch = require('node-fetch');
const User = require('../models/User');
const proxyurl = 'https://api.allorigins.win/get?url=';

const initializeUser = () => {
	fetch(
		`${proxyurl}https://secure.runescape.com/m=hiscore/index_lite.ws?player=${'zee+pk'}`
	)
		.then((res) => res.json())
		.then((res) => {
			console.log(res.contents.split('\n').map((record) => record.split(',')));
		})
		.catch((err) => console.log(err))
		.finally(() => {
			console.log('Finished initializing user...');
		});
	const user = new User({
		username: 'test',
		rsn: 'testinf',
		// username: req.body.username.split(' ').join('+'),
		// rsn: req.body.username,
		lastUpdated: Date.now(),
		statRecords: [
			{
				stats: ['nice'],
				// stats: res.contents.split('\n').map((record) => record.split(',')),
			},
		],
	});
	const newUser = user.save();
	console.log(newUser);
	// try {
	// } catch (err) {
	// 	console.log(err);
	// }
};

initializeUser();
