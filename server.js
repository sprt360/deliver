const express = require('express');
const connectDB = require('./config/db');

const path = require('path');
const cors = require('cors');

const app = express();
const port = process.env.PORT || '5000';

// Connect to database

// Init Middleware
app.use(express.json({ extended: false }));
var allowedOrigins = [
  'http://localhost:3000',
  'https://dubsports.to',
  'https://bitmovin.com',
  'https://sports24.club',
  'https://vip.sports24.club',
  'https://sports24.stream',
  'https://sports24.icu',
  'https://morningstreams.com',
];
app.use(
  cors({
    origin: function (origin, callback) {
      // allow requests with no origin
      // (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        var msg =
          'The CORS policy for this site does not ' +
          'allow access from the specified Origin.';
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
  })
);

connectDB();

// Define routes
app.use('/api/auth', require('./routes/api/auth'));
app.use('/api/users', require('./routes/api/users'));
app.use('/api/premium', require('./routes/api/premium'));
app.use('/api/admin', require('./routes/api/admin'));
app.use('/api/payments', require('./routes/api/payments'));

// Serve static assets in Heroku
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('client/build'));
  app.get('*', (req, res) => {
    res.sendfile(path.resolve(__dirname, 'client', 'build', 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Running server on port ${port}`);
});
