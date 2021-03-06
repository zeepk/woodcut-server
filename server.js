const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const express = require('express');
const app = express();
const mongoose = require('mongoose');
var cors = require('cors');
app.use(cors());
app.use(function (req, res, next) {
	res.header('Access-Control-Allow-Origin', '*');
	res.header('Access-Control-Allow-Credentials', true);
	res.header(
		'Access-Control-Allow-Methods',
		'GET,PUT,POST,PATCH,DELETE,OPTIONS'
	);
	res.header(
		'Access-Control-Allow-Headers',
		'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json'
	);
	next();
});
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));
app.use(express.json());

const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

const activitiesRouter = require('./routes/activities');
app.use('/activities', activitiesRouter);

const clansRouter = require('./routes/clans');
app.use('/clans', clansRouter);

const port = process.env.PORT || 8000;
app.listen(port, () => console.log(`Server started on port ${port}`));
