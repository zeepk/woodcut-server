const dotenv = require('dotenv');
dotenv.config({ path: './config/config.env' });

const express = require('express');
const app = express();
const mongoose = require('mongoose');
var cors = require('cors');
app.use(cors());
mongoose.connect(process.env.DATABASE_URL, { useNewUrlParser: true });
const db = mongoose.connection;
db.on('error', (error) => console.error(error));
db.once('open', () => console.log('Connected to Database'));
app.use(express.json());

const usersRouter = require('./routes/users');
app.use('/users', usersRouter);

app.listen(process.env.PORT || 8000, () =>
	console.log('Server started on port 8000')
);
