var express = require("express"),

    PORT = process.env.PORT || 5000,

    cors = require("cors"),

    SocialButtonsServerMiddleware = require("./lib/social-buttons-server-middleware.js"),
    socialButtonsServerMiddleware = new SocialButtonsServerMiddleware(),

    morgan = require("morgan"),
    expressLogger = morgan("combined", {
        skip: function(req, res) {
            return res.statusCode < 400;
        }
    }),

    // Use CORS domain whitelisting.
    // Requires that Cloudflare (or other CDNs) let the right headers pass to and from the browser.
    getWhitelist = function() {
        var whitelist = [];

        if (process.env.DOMAIN_WHITELIST) {
            whitelist = process.env.DOMAIN_WHITELIST.split(",");
        }

        return whitelist;
    },
    whitelist = getWhitelist(),
    corsOptions = {
        origin: function(origin, cb) {
            cb(null, whitelist.indexOf(origin) !== -1);
        }
    },

    app = express();

app.use(expressLogger);


if (whitelist.length === 0) {
    console.warn("The CORS domain whitelist is empty. This might lead to problems when requests arrive originate from domains other than the one the server is running on.")
}

app.use(cors(corsOptions));

app.options("*", cors(corsOptions));



app.use("/", socialButtonsServerMiddleware.getRouter());

app.listen(PORT, function() {
    console.log("Listening on " + PORT);
});