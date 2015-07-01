var express = require("express");
var Promise = require("bluebird");
var request = require("request");


// How many minutes should we cache the results for a given request
var CACHE_TIME = process.env.CACHE_TIME || 4 * 60;

function cacheControl(req, res, next) {
    // Setup caching headers (works well with cloudfront)
    res.set("Cache-Control", "max-age=" + CACHE_TIME);

    next();
}

var networkCallbacks = {
    twitter: function(url, callback) {
        // Twitter is nice and easy
        var apiUrl = "http://urls.api.twitter.com/1/urls/count.json?url=" + url;

        request.get({
            url: apiUrl,
            json: true
        }, function(err, res, body) {
            if (err || !body) {
                return callback(null, 0);
            }

            callback(null, body.count);
        });
    },
    facebook: function(url, callback) {
        // This query string gets the total number of likes, shares and comments to
        // create the final count
        var apiUrl = "https://graph.facebook.com/fql?q=SELECT%20url," +
            "%20normalized_url,%20share_count,%20like_count,%20comment_count," +
            "%20total_count,commentsbox_count,%20comments_fbid," +
            "%20click_count%20FROM%20link_stat%20WHERE%20url='" + url + "'";

        request.get({
            url: apiUrl,
            json: true
        }, function(err, res, body) {
            if (err || !body || !Array.isArray(body.data)) {
                return callback(null, 0);
            }

            var count = 0;

            if (body.data.length > 0) {
                count = body.data[0].total_count;
            }

            callback(null, count);
        });
    },
    googleplus: function(url, callback) {
        // This is a hacky method found on the internet because google doesn"t have
        // an API for google plus counts
        var apiUrl = "https://plusone.google.com/_/+1/fastbutton?url=" + url;

        request.get(apiUrl, function(err, res, body) {
            if (err || !body) {
                return callback(null, 0);
            }

            var result = /__SSR \= \{c\: (.*?)\.0/g.exec(body);
            var count = 0;

            if (result) {
                count = result[1] * 1;
            }

            callback(null, count);
        });
    }
};

function retrieveCount(url, networks) {
    // Create an object of callbacks for each of the requested networks It is
    // then passed to the Promise library to executed in parallel All results will
    // be returned as a single object by the promise.
    var networksToRequest = {};

    networks.forEach(function(network) {
        if (typeof networkCallbacks[network] !== "undefined") {
            networksToRequest[network] = Promise.promisify(networkCallbacks[network])(url);
        }
    });

    return Promise.props(networksToRequest);
}

function errorAndDie(req, res, next, httpStatus, msg) {
    res.status(httpStatus);

    res.jsonp({
        error: msg,
    });

    res.end();
}

function inputErrorAndDie(req, res, next, msg) {
    errorAndDie(req, res, next, 422, msg);
}

function inputErrorAndDie(req, res, next, msg) {
    errorAndDie(req, res, next, 500, msg);
}

function getCount(req, res, next) {
    var url,
        networks;

    // Check to see if any networks were specified in the query
    if (!req.query.networks) {
        inputErrorAndDie(req, res, next, "You have to specify which networks you want stats for (networks=facebook,twitter,googleplus)");
        return;
    } else {
        networks = req.query.networks.split(",");
    }

    // Check to see if a url was specified in the query else attempt to use the
    // referer url
    if (req.query.url) {
        url = req.query.url;
    } else {
        url = req.header("Referer");

        if (!url) {
            inputErrorAndDie(req, res, next, "You asked for the referring urls stats but there is no referring url, specify one manually (&url=https://example.com/)");
            return;
        }
    }

    retrieveCount(url, networks)
        .then(function(results) {
            res.jsonp(results);
            res.end();
        })
        .catch(function(err) {
            console.error("getCount", "catch", "retrieveCount", err);

            serverErrorAndDie(req, res, next, "There was an unknown error.");
        });
}

function router() {
    var routerOptions = {
            caseSensitive: true,
            strict: true,
        },
        socialButtonsServerRouter = express.Router(routerOptions);

    socialButtonsServerRouter.get("/", cacheControl);
    socialButtonsServerRouter.get("/", getCount);

    return socialButtonsServerRouter;
}

module.exports = router;