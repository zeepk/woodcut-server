const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	rsn: {
		type: String,
		required: true,
	},
	createdDate: {
		type: Date,
		required: true,
		default: Date.now,
	},
});

module.exports = mongoose.model('User', userSchema);
