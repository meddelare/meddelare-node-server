"use strict";

var express = require("express"),

    SocialButtonsCounts = require("./social-buttons-counts.js"),

    extend = require("extend"),

    // TODO: use a package/library instead?
    copyDeep = function() {
        var args = Array.prototype.slice.call(arguments, 0);

        return extend.apply(null, [true, {}].concat(args));
    };



function SocialButtonsServerMiddleware(options) {
    options = options || {};
    this._options = copyDeep(SocialButtonsServerMiddleware._defaultOptions, options);

    // Set logger separately instead of relying on the deep copy.
    this._options.logger = this._options.logger || options.logger || console;

    this._router = express.Router(this._options.routerOptions);

    this._router.get("/", this._cacheControl.bind(this));
    this._router.get("/", this._getCount.bind(this));
    this._router.use(SocialButtonsServerMiddleware._forbidden);

    this._SocialButtonsCounts = new SocialButtonsCounts({
        logger: this._options.logger,
    });

    return this;
}

SocialButtonsServerMiddleware.prototype._cacheControl = function(req, res, next) {
    // Setup caching headers (works well with cloudfront)
    res.set("Cache-Control", "max-age=" + this._options.CACHE_TIME);

    next();
};



SocialButtonsServerMiddleware.prototype._getCount = function(req, res, next) {
    var self = this,
        url,
        networks,
        nonExistantNetworks;

    // Check to see if any networks were specified in the query.
    if (!req.query.networks) {
        SocialButtonsServerMiddleware._inputErrorAndDie(req, res, next, "You have to specify which networks you want stats for (networks=facebook,twitter,googleplus)");
        return;
    } else {
        networks = req.query.networks.split(",");

        nonExistantNetworks = self._SocialButtonsCounts.getInvalidNetworks(networks);

        // Stop if any unknown networks have been requested.
        if (nonExistantNetworks.length > 0) {
            SocialButtonsServerMiddleware._inputErrorAndDie(req, res, next, "Unknown network(s) specified: '" + nonExistantNetworks.join("', '") + "'");
        }
    }

    // Check to see if a url was specified in the query, else attempt to use the refer(r)er url.
    if (req.query.url) {
        url = req.query.url;
    } else {
        url = req.header("Referer");

        if (!url) {
            SocialButtonsServerMiddleware._inputErrorAndDie(req, res, next, "You asked for the referring urls stats but there is no referring url, specify one manually (&url=https://example.com/)");
            return;
        }
    }

    self._SocialButtonsCounts.retrieveCounts(url, networks)
        .then(function(results) {
            res.jsonp(results);
            res.end();
        })
        .catch(function(err) {
            self._options.logger.error("self._getCount", "catch", "this._SocialButtonsCounts.retrieveCounts", err);

            SocialButtonsServerMiddleware._serverErrorAndDie(req, res, next, "There was an unknown error.");
        });
};

SocialButtonsServerMiddleware.prototype.getRouter = function() {
    return this._router;
};



SocialButtonsServerMiddleware._defaultOptions = {
    // How many minutes should HTTP requests' results be cached.
    CACHE_TIME: process.env.CACHE_TIME || 4 * 60,

    routerOptions: {
        caseSensitive: true,
        strict: true,
    },
};

SocialButtonsServerMiddleware._errorAndDie = function(req, res, next, httpStatus, msg) {
    res.status(httpStatus);

    res.jsonp({
        error: msg,
    });

    res.end();
};

SocialButtonsServerMiddleware._inputErrorAndDie = function(req, res, next, msg) {
    SocialButtonsServerMiddleware._errorAndDie(req, res, next, 422, msg);
};

SocialButtonsServerMiddleware._serverErrorAndDie = function(req, res, next, msg) {
    SocialButtonsServerMiddleware._errorAndDie(req, res, next, 500, msg);
};

SocialButtonsServerMiddleware._forbiddenErrorAndDie = function(req, res, next, msg) {
    SocialButtonsServerMiddleware._errorAndDie(req, res, next, 403, msg);
};

SocialButtonsServerMiddleware._forbidden = function(req, res, next) {
    SocialButtonsServerMiddleware._forbiddenErrorAndDie(req, res, next, "Forbidden");
};



module.exports = SocialButtonsServerMiddleware;