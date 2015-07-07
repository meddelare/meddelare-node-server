# [Meddelare](http://meddelare.com/) Social Buttons Standalone Node.js Server [meddelare-node-server](https://github.com/meddelare/meddelare-node-server)


Install **custom social share counters** on your website with your **own hosted solution**, which only makes **a single API request** and loads **minimal or zero assets** to display the counters.

Check out [meddelare.com](http://meddelare.com/)!

[![A screenshot of the button example](https://cloud.githubusercontent.com/assets/1398544/8511166/5c92d0b2-230b-11e5-895a-d3b67da749b5.png)](http://meddelare.com/meddelare-examples)

View examples on [meddelare.com/meddelare-examples](http://meddelare.com/meddelare-examples).



## Standalone Node.js server

This is an open source and self-hosted alternative to sharing services such as AddThis and ShareThis. Because you run the proxy server yourself, you are also defending your users' privacy against the social networks' tracking. Users only opt in to their tracking once they decide to click a share button -- never implicitly just because they visited your page.

- If you want to use Meddelare in an existing Express server, check out [meddelare-node-expess](https://github.com/meddelare/meddelare-node-expess).
- If you want to use Meddelare from another server/service, check out [meddelare-node-counters](https://github.com/meddelare/meddelare-node-counters).



## Features

- **Completely customizable** user interface design -- use layout, logotypes, animations of your own choice.
- **A single API call** to get counts from multiple social networks, delivered as JSON or JSONP.
- **Calls social networks in parallel** from the server, making it (approximately) as fast to get the count from one as several at once.
- **No third party resources required** – you can host both the social buttons server and any resources yourself.
- **Blocks social networks' user tracking** by proxying calls until the user decides to click a share button.
- **Super-fast in-memory cache** keeps the most recent results per network and url.
- **Easy to deploy** and prepared for [content delivery network](https://en.wikipedia.org/wiki/Content_delivery_network) (CDN) proxies.


## Getting started

```bash
# Clone the repository
git clone https://github.com/meddelare/meddelare-node-server.git

cd meddelare-node-server

# Install dependencies
npm install

# Run the server
node app/server.js
```

- Test by accessing your local server on [http://localhost:5000/?networks=facebook,twitter,googleplus&url=http://meddelare.com](http://localhost:5000/?networks=facebook,twitter,googleplus&url=http://meddelare.com)
- You can optionally push to a Heroku app to automatically deploy.



## Response

See this [example API call](https://meddelare-node-server.herokuapp.com/?networks=facebook,twitter,googleplus&url=http://meddelare.com). The response is delivered as JSON, or JSONP if you specify a callback.

```json
{
  "facebook": 5281,
  "googleplus": 42,
  "twitter": 8719
}
```



## HTML Widgets

View examples on [meddelare.com/meddelare-examples](http://meddelare.com/meddelare-examples).

**We would love to feature your widget design!**  
Please submit your design in a pull request to [meddelare-examples](https://github.com/meddelare/meddelare-examples) and we will add it to our list.

You can do anything you want to display your share counts when using the API. Below is a very simple example showing the count per network -- see this [example API call with text](http://meddelare.com/meddelare-examples/examples/text/). Note that we are using a CloudFront distribution domain in the examples.

```html
<!DOCTYPE html>
<html>
  <body>
    <h3>Twitter</h3>
    <span id="twitter"></span>
    <h3>Facebook</h3>
    <span id="facebook"></span>
    <h3>Google Plus</h3>
    <span id="googleplus"></span>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js"></script>
    <script>
      $.ajax("https://d12cncu17l9pr5.cloudfront.net/?networks=facebook,twitter,googleplus&url=http://meddelare.com", {
        success: function (res, err) {
          $.each(res, function (network, value) {
            $("#" + network).text(value);
          });
        }
      });
    </script>
  </body>
</html>
```



## Options

Options are passed using query parameters in the url.


**Networks**  
Currently Twitter, Facebook and Google Plus are supported.

Use the `networks` query parameter to specify which ones you want to use as a comma-separated list (no spaces), for example `networks=facebook,twitter,googleplus` or `networks=facebook`.


**Url (optional)**  
Use the `url` parameter to specify the address which you want to retrieve the number of shares for, for example `url=http://meddelare.com`.

If you don't specify a `url` then the server will try to get the referring url's (HTTP `Referer` header) share count. This makes it easy to dynamically get the counts for the page currently open in the browser.


**Callback (optional)**  
Specify the `callback` parameter to have the results delivered as JSONP instead of plain JSON.



## Configuration

Configure the node.js server instance at launch time. Where you set the environment variable depends on your system, but examples below are using the command line.

**HTTP cache time**  
The environment variable `CACHE_TIME` can be used to set the time, in seconds, that the browser (or CDN) should cache results. Cached results vary on the request query string. To set the HTTP cache to ten minutes, use `CACHE_TIME=600 node app/server.js`.

Note that the in-memory cache is handled in an underlying layer and configured separately; this currently requires modifying the source code to pass the correct options.



**Cross-domain requests**  
The server has [cross-origin resource sharing](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing) (CORS) enabled for whitelisted domains, which need to be configured. Set the environment variable `DOMAIN_WHITELIST` to a list of comma-separated (no spaces) protocols+domains which are allowed to use your (private) meddelare-node-server instance.

This example whitelists domains Meddelare uses: `DOMAIN_WHITELIST='http://meddelare.com,https://meddelare.github.io,https://meddelare-node-server.herokuapp.com,https://d12cncu17l9pr5.cloudfront.net' node app/server.js`



## [Content delivery networks](https://en.wikipedia.org/wiki/Content_delivery_network) (CDN)

If you want to reduce your server load it would be wise to throw up a cache, such as CloudFront, in front.

In CloudFront, just make sure you to inherit cache control directives from the server, enable query string forwarding and whitelist `Origin` HTTP headers. Either use your CloudFront distribution domain to access the API server or `CNAME` it with a custom domain of your choice.



## Thanks

Many thanks goes out to [Taskforce](https://taskforce.is/) for their [social-buttons-server](https://github.com/tfrce/social-buttons-server) (released into the [Public Domain](https://github.com/tfrce/social-buttons-server/tree/faf1a41e5d2d44b7e6de460b9369f11437095af1)) -- especially the creator [@thomasdavis](https://github.com/thomasdavis) and contributor [@beaugunderson](https://github.com/beaugunderson). This software, [meddelare-node-server](https://github.com/meddelare/meddelare-node-server), is based on their work.



---

Copyright (c) 2015 Team Meddelare <http://meddelare.com/> All rights reserved.

When using [meddelare-node-server](https://github.com/meddelare/meddelare-node-server), comply to the [MIT license](http://opensource.org/licenses/MIT).
