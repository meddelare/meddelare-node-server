var express = require("express");
var Promise = require("bluebird");
var request = require("request");
var cache = require("memory-cache");

// Cache results in memory -- but keep good and bad (error thrown) results for different periods of time.
var LOCAL_CACHE_TIME_GOOD_RESULT = 4 * 60 * 1000,
    LOCAL_CACHE_TIME_BAD_RESULT = 1 * 60 * 1000;

// Return this count if none was found or an error was thrown.
var DEFAULT_UNKNOWN_COUNT = -1;


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
            if (err) {
                return callback(err);
            }

            if (!body || typeof body.count !== "number") {
                return callback(new Error("No well-formed body in response."));
            }

            var count = body.count;

            callback(null, count);
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
            if (err) {
                return callback(err);
            }

            if (!body || !Array.isArray(body.data) || body.data.length == 0 || typeof body.data[0].total_count !== "number") {
                return callback(new Error("No well-formed body in response."));
            }

            var count = body.data[0].total_count;

            callback(null, count);
        });
    },
    googleplus: function(url, callback) {
        // This is a hacky method found on the internet because google doesn"t have
        // an API for google plus counts
        var apiUrl = "https://plusone.google.com/_/+1/fastbutton?url=" + url;

        request.get(apiUrl, function(err, res, body) {
            if (err) {
                return callback(err);
            }

            if (!body) {
                return callback(new Error("No body in response."));
            }

            var result = /,ld:\[,\[\d+,(\d+),/.exec(body);

            if (!result) {
                return callback(new Error("No well-formed body in response."));
            }

            var count = parseInt(result[1], 10);

            if (isNaN(count)) {
                return callback(new Error("No well-formed body in response."));
            }

            callback(null, count);
        });
    }
};

function sortObjectByKeys(unsorted) {
    var sorted = {},
        keys = Object.keys(unsorted);

    keys.sort();

    keys.forEach(function(key) {
        sorted[key] = unsorted[key];
    });

    return sorted;
}

function retrieveCount(url, network) {
    if (typeof networkCallbacks[network] === "undefined") {
        throw new Error("Unknown network");
    }

    return Promise.promisify(networkCallbacks[network])(url)
        .catch(function(err) {
            console.error("Could not fetch count", network, url, err);

            throw err;
        });
}

function createCacheKey(url, network) {
    return network + " '" + url + "'";
}

function getCachedOrRetrieveCount(url, network) {
    var cacheKey = createCacheKey(url, network);

    return Promise.resolve(cache.get(cacheKey))
        .then(function(cachedResult) {
            if (typeof cachedResult !== "undefined" && cachedResult !== null) {
                console.log(cacheKey, "from cache", cachedResult);

                return cachedResult;
            }

            return retrieveCount(url, network)
                .tap(function(uncachedResult) {
                    console.log(cacheKey, "fetched good result", uncachedResult);

                    cache.put(cacheKey, uncachedResult, LOCAL_CACHE_TIME_GOOD_RESULT);
                })
                .catch(function(err) {
                    console.error(cacheKey, "fetched bad result", err);

                    cache.put(cacheKey, DEFAULT_UNKNOWN_COUNT, LOCAL_CACHE_TIME_BAD_RESULT);

                    return DEFAULT_UNKNOWN_COUNT;
                });
        });
}

function retrieveCounts(url, networks) {
    // Create an object of callbacks for each of the requested networks It is
    // then passed to the Promise library to executed in parallel All results will
    // be returned as a single object by the promise.
    var networksToRequest = {};

    networks.forEach(function(network) {
        networksToRequest[network] = getCachedOrRetrieveCount(url, network);
    });

    return Promise.props(networksToRequest)
        .then(sortObjectByKeys);
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

function serverErrorAndDie(req, res, next, msg) {
    errorAndDie(req, res, next, 500, msg);
}

function forbiddenErrorAndDie(req, res, next, msg) {
    errorAndDie(req, res, next, 403, msg);
}

function getCount(req, res, next) {
    var url,
        networks,
        nonExistantNetworks;

    // Check to see if any networks were specified in the query
    if (!req.query.networks) {
        inputErrorAndDie(req, res, next, "You have to specify which networks you want stats for (networks=facebook,twitter,googleplus)");
        return;
    } else {
        networks = req.query.networks.split(",");

        nonExistantNetworks = networks.filter(function(network) {
            return (typeof networkCallbacks[network] === "undefined");
        });

        if (nonExistantNetworks.length > 0) {
            inputErrorAndDie(req, res, next, "Unknown network(s) specified: " + nonExistantNetworks.join());
        }
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

    retrieveCounts(url, networks)
        .then(function(results) {
            res.jsonp(results);
            res.end();
        })
        .catch(function(err) {
            console.error("getCount", "catch", "retrieveCounts", err);

            serverErrorAndDie(req, res, next, "There was an unknown error.");
        });
}

function forbidden(req, res, next) {
    forbiddenErrorAndDie(req, res, next, "Forbidden");
}

function router() {
    var routerOptions = {
            caseSensitive: true,
            strict: true,
        },
        socialButtonsServerRouter = express.Router(routerOptions);

    socialButtonsServerRouter.get("/", cacheControl);
    socialButtonsServerRouter.get("/", getCount);
    socialButtonsServerRouter.use(forbidden);

    return socialButtonsServerRouter;
}

// Perhaps it's futile to try and clean up before/exit, but one can try.
process
    .once("beforeExit", function() {
        cache.clear();
    })
    .once("exit", function() {
        cache.clear();
    });

module.exports = router;