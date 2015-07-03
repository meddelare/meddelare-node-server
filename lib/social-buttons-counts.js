"use strict";

var Promise = require("bluebird"),
    request = require("request"),

    // The memory-cache is per-process and returns pointers, not copies.
    // Using process-scoped keys with a SocialButtonsCounts "namespace", so multiple SocialButtonsCounts instances share cache.
    // Using cache.clear() will clear all caches, even in other parts of the application. Be careful!
    cache = require("memory-cache"),

    extend = require("extend"),

    // TODO: use a package/library instead?
    copyDeep = function() {
        var args = Array.prototype.slice.call(arguments, 0);

        return extend.apply(null, [true, {}].concat(args));
    },

    // TODO: use a package/library instead?
    sortObjectByKeys = function(unsorted) {
        var sorted = {},
            keys = Object.keys(unsorted);

        keys.sort();

        keys.forEach(function(key) {
            sorted[key] = unsorted[key];
        });

        return sorted;
    };



function SocialButtonsCounts(options) {
    // TODO: better configuration.
    this._options = copyDeep(SocialButtonsCounts._defaultOptions, options);

    // Perhaps it's futile to try and clean up before/exit, but one can try.
    process
        .once("beforeExit", function() {
            cache.clear();
        })
        .once("exit", function() {
            cache.clear();
        });

    return this;
}

SocialButtonsCounts.prototype._networkCallbacks = {
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

SocialButtonsCounts.prototype.isValidNetwork = function(network) {
    return Object.prototype.hasOwnProperty.call(this._networkCallbacks, network);
};

SocialButtonsCounts.prototype.getInvalidNetworks = function(networks) {
    return networks.filter(function(network) {
        return !this.isValidNetwork(network);
    }, this);
};

SocialButtonsCounts.prototype.retrieveUncachedCount = function(url, network) {
    if (!this.isValidNetwork(network)) {
        throw new Error("Unknown network: " + network);
    }

    var self = this;

    return Promise.promisify(self._networkCallbacks[network])(url)
        .catch(function(err) {
            self._options.logger.error("Could not fetch count", network, url, err);

            throw err;
        });
};

SocialButtonsCounts.prototype.getCachedOrRetrieveCount = function(url, network) {
    var self = this,
        cacheKey = SocialButtonsCounts._createCacheKey(url, network);

    return Promise.resolve(cache.get(cacheKey))
        .then(function(cachedResult) {
            if (typeof cachedResult !== "undefined" && cachedResult !== null) {
                self._options.logger.info(cacheKey, "from cache", cachedResult);

                return cachedResult;
            }

            // If the lookup yielded no result, kick off a request and put it in the cache for now.
            // This way the .resolve(cache) call above makes sure multiple requests count requests
            // for the same network/url cannot be sent at the same time.
            var retrieveCountPromise = self.retrieveUncachedCount(url, network)
                .tap(function(uncachedResult) {
                    self._options.logger.info(cacheKey, "fetched good result", uncachedResult);

                    cache.put(cacheKey, uncachedResult, self._options.LOCAL_CACHE_TIME_GOOD_RESULT);
                })
                .catch(function(err) {
                    self._options.logger.error(cacheKey, "fetched bad result", err);

                    cache.put(cacheKey, self._options.DEFAULT_UNKNOWN_COUNT, self._options.LOCAL_CACHE_TIME_BAD_RESULT);

                    return self._options.DEFAULT_UNKNOWN_COUNT;
                });

            // Setting a cache timeout just in case, even though it can lead to parallel requests.
            cache.put(cacheKey, retrieveCountPromise, self._options.LOCAL_CACHE_TIME_TIMEOUT_RESULT);

            return retrieveCountPromise;
        });
};

SocialButtonsCounts.prototype.retrieveCounts = function(url, networks) {
    // Create an object of callbacks for each of the requested networks It is
    // then passed to the Promise library to executed in parallel All results will
    // be returned as a single object by the promise.
    var networksToRequest = {};

    networks.forEach(function(network) {
        networksToRequest[network] = this.getCachedOrRetrieveCount(url, network);
    }, this);

    return Promise.props(networksToRequest)
        .then(sortObjectByKeys);
};



SocialButtonsCounts._createCacheKey = function(url, network) {
    return "SocialButtonsCounts " + network + " '" + url + "'";
};



SocialButtonsCounts._defaultOptions = {
    logger: console,

    // Cache results in memory -- but keep good and bad (error thrown) results for different periods of time.
    LOCAL_CACHE_TIME_GOOD_RESULT: 4 * 60 * 1000,
    LOCAL_CACHE_TIME_BAD_RESULT: 1 * 60 * 1000,
    LOCAL_CACHE_TIME_TIMEOUT_RESULT: 10 * 1000,

    // Return this count if none was found or an error was thrown.
    DEFAULT_UNKNOWN_COUNT: -1,
};

module.exports = SocialButtonsCounts;