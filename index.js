// First we have to use dotenv config file to be...
// ...accessible by all the other files
require('dotenv').config({ path: './config.env' });

const express = require('express');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/error');

// Connect to DB
connectDB();

const app = express();

app.use(express.json());

app.use('/api/auth', require('./routes/auth'));

app.use('/api/private', require('./routes/private'));

// Error handler must be the last middleware used
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ---------------| ${PORT} |--`);
});

process.on('unhandledRejection', (error, promise) => {
  console.log(`LOGGED ERROR: ${error}`);
  server.close(() => process.exit(1));
});
