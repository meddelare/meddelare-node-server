var cors = require('cors');
var express = require('express');

var PORT = process.env.PORT || 5000;

var socialButtonsServer = require('./lib/social-buttons-server-middleware.js');

var app = express();

var morgan = require("morgan");

var expressLogger = morgan("combined", {
    skip: function(req, res) {
        return res.statusCode < 400;
    }
});

app.use(expressLogger);

var whitelist = [
  'http://localhost:4000',
  'https://localhost:4000',
  'http://meddelare.com',
  'https://meddelare.github.io',
  'https://meddelare-node-server.herokuapp.com',
  'https://d12cncu17l9pr5.cloudfront.net',
];

var corsOptions = {
  origin: function (origin, cb) {
    cb(null, whitelist.indexOf(origin) !== -1);
  }
};

// Block all hosts not in the whitelist
//app.use(function (req, res, next) {
//  if (whitelist.indexOf(req.headers.origin) === -1) {
//    return res.send({ blocked: true });
//  }
//
//  next();
//});

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));

app.use("/", socialButtonsServer());

app.listen(PORT, function () {
  console.log('Listening on ' + PORT);
});
