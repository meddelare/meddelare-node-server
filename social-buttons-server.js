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


// Use CORS domain whitelisting.
// Requires that Cloudflare (or other CDNs) let the right headers pass to and from the browser.
function getWhitelist(){
  var whitelist = [];

  if(process.env.DOMAIN_WHITELIST) {
    whitelist = process.env.DOMAIN_WHITELIST.split(",");
  }

  return whitelist;
}

var whitelist = getWhitelist();

if(whitelist.length === 0){
  console.warn("The CORS domain whitelist is empty. This might lead to problems when requests arrive originate from domains other than the one the server is running on.")
}

var corsOptions = {
  origin: function (origin, cb) {
    cb(null, whitelist.indexOf(origin) !== -1);
  }
};

app.use(cors(corsOptions));

app.options('*', cors(corsOptions));



app.use("/", socialButtonsServer());

app.listen(PORT, function () {
  console.log('Listening on ' + PORT);
});
