# [Meddelare](http://meddelare.com/) Social Buttons Server [meddelare-node-server](https://github.com/meddelare/meddelare-node-server)


Install social share counters on your website with your own hosted solution which only makes 1 API request and loads minimal or zero assets to display the counters.

This is an open source and self-hosted alternative to services such as AddThis and ShareThis. 

Because you run the middle man server your self, you are also defending your users privacy against the social networks. (Users only opt into the tracking once they decide to share and not just because they visited your page)

* [Example API Call](https://meddelare-node-server.herokuapp.com/?networks=facebook,twitter,googleplus&url=http://meddelare.com)
* [Example API Call with Buttons](https://meddelare.github.io/meddelare-examples/examples/button.html)
* [Example API Call with Text (fast)](https://meddelare.github.io/meddelare-examples/examples/text.html)


## Features
* Heroku enabled, create an app and deploy instantly
* Has cache control variable(default 4 mins) so you can throw CloudFront in front with ease which result in faster API calls and less chance of getting rate limited

## Getting started

1. Clone(or fork) the repository
2. Install dependencies `npm install`
3. Run the server `node social-buttons-server.js`
4. Access your stats at `http://localhost:5000/?networks=facebook,twitter,googleplus&url=http://meddelare.com`
5. __Optionally push to a heroku app to automatically deploy__

## Options

Options are passed through query parameters in the url

### Networks

Currently only Twitter, Facebook and Google Plus are supported

You use the `networks` query parameter to specify which ones you want to use as a comma-separated list e.g.

`networks=facebook,twitter,googleplus` or  `networks=facebook`

### Url

You use the `url` parameter to specify the address which you want to count the total number of shares for e.g. `url=http://1984day.com`

If you don't specify a `url` then the server will try to get the referring urls total share count. So if you make the API call on your homepage without the `url` parameter, the API server will return the numbe rof shares for your homepage url.

## CloudFront

You don't want to be hitting the social networks API's constantly so it would be wise to throw up a cache in front such as CloudFront.

In CloudFront just make sure you to inherit cache control directives from the server and enable query string forwarding.

Eithr use your CloudFront url to access the API server or cname it with a custom domain of your choice.

## Cross domain

The server as it is has CORS enabled which means any website can call the API SERVER. You can easily white list if this becomes a problem.

## HTML Widgets

**We would love to start collecting widgets that people design and want to share, please submit them in a pull request to [meddelare-examples](https://github.com/meddelare/meddelare-examples) and we will create a new section to list them**

You can do anything you want to display your share totals when using the API. There are the examples linked at the top of the README and some short code below. Notice that we are using a CloudFront distribution in the examples.

```html
<html>
	<head>
	</head>
	<body>
		<h3>Twitter</h3>
    <span id="twitter"></span>
    <h3>Facebook</h3>
    <span id="facebook"></span>
    <h3>Google Plus</h3>
    <span id="googleplus"></span>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min.js"></script>
  <script type="text/javascript">
    $.ajax('https://d12cncu17l9pr5.cloudfront.net/?networks=facebook,twitter,googleplus&url=http://meddelare.com', {
      success: function (res, err) {
        $.each(res, function(network, value){
          $('#'+network).text(value);
        })      
      }
    })
  </script>
	</body>
</html>
```



## Thanks

Many thanks goes out to [Taskforce](https://taskforce.is/) for their [social-buttons-server](https://github.com/tfrce/social-buttons-server) (released into the [Public Domain](https://github.com/tfrce/social-buttons-server/tree/faf1a41e5d2d44b7e6de460b9369f11437095af1)) -- especially the creator [@thomasdavis](https://github.com/thomasdavis) and contributor [@beaugunderson](https://github.com/beaugunderson). This software, [meddelare-node-server](https://github.com/meddelare/meddelare-node-server), is based on their work.



---

Copyright (c) 2015 Team Meddelare <http://meddelare.com/> All rights reserved.

When using [meddelare-node-server](https://github.com/meddelare/meddelare-node-server), comply to the [MIT license](http://opensource.org/licenses/MIT).
