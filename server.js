const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const express = require('express');
const app = express();
const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));
app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');

	res.header(
		'Access-Control-Allow-Headers',
		'Origin, X-Requested-With, Content-Type, Accept'
	);

	next();
});
app.use(express.json());

const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

app.listen(process.env.PORT || 8000, () =>
	console.log('Server started on port 8000')
);
