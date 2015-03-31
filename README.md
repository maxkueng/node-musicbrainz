MusicBrainz API for node.js
===========================

[![Build Status](https://secure.travis-ci.org/maxkueng/node-musicbrainz.png?branch=master)](http://travis-ci.org/maxkueng/node-musicbrainz)

This is a [MusicBrainz][mb] [XML Web Service Version 2][mbwsv2] client written in JavaScript for [node.js][node].

It's a work in progress. Currently supports lookups with an MBID or DiscId, as well as searches for artist, release, or recording.

### Contribute

Want to help make node-musicbrainz better or fix a bug? Please read [How To Contribute][contribute] in the wiki.

Supported resources
-------------------

 - DiscId
 - Artist (recordings, releases, release-groups, works)
 - Label (releases)
 - Recording (artists, releases)
 - Release (artists, labels, recordings, release-groups)
 - Release Group (artists, releases)
 - Work

Lookup Examples
---------------

```javascript
var mb = require('musicbrainz');
```

Looking up a release with linked artists:

```javascript
mb.lookupRelease('283821f3-522a-45ca-a669-d74d0b4fb93a', ['artists'], function (error, release) {
	console.log(release);
});
```

The same but different:

```javascript
var Release = mb.Release;

var release = new Release('283821f3-522a-45ca-a669-d74d0b4fb93a');
release.load(['artists'], function () {
	console.log(release);
});
```

Search Examples
---------------

```javascript
mb.searchArtists('The White Stripes', {}, function(err, artists){
    console.log(artists);
});
mb.searchRecordings('Seven Nation Army', { artist: 'The White Stripes' }, function(err, recordings){
    console.log(recordings);
});
mb.searchReleases('Elephant', { country: 'US' }, function(err, releases){
    console.log(releases);
});
```

Configuration
-------------

If you run your own MusicBrainz server you can set a custom `baseURI`
and and rate limit options. In the following example the API endpoint is
"http://myMusicBrainzServer.org/ws/2/" and the rate limit allows 5
requests per 2 seconds.

```javascript
var mb = require('musicbrainz');
mb.configure({
    baseURI: 'http://myMusicBrainzServer.org/ws/2/',
    rateLimit: {
        requests: 5,
        interval: 2000
    }
});
```

Caching Lookups with Redis
--------------------------

```javascript
var mb = require('musicbrainz');
var redis = require('redis');

mb.lookupCache = function (uri, force, callback, lookup) {
	var key = 'lookup:' + uri;
	var r = redis.createClient();

	r.on('connect', function () {
		r.get(key, function (err, reply) {
			if (!err && reply) {
				callback(null, JSON.parse(reply));

			} else {
				lookup(function (err, resource) {
					callback(err, resource);

					if (err) { r.quit(); return; }

					r.set(key, JSON.stringify(resource), function (err, reply) {
						r.quit();
					});

				});
			}
		});
	});
};
```

Contributors
------------

 - Max Kueng (http://maxkueng.com/)
 - Alex Ehrnschwender (http://alexehrnschwender.com/)
 - Sam (https://github.com/samcday)
 - Marco Godoy (https://github.com/ghostnumber7)

License
-------

MIT License

Copyright (c) 2011 Max Kueng (http://maxkueng.com/)
 
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
 
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


[node]: http://nodejs.org/
[mb]: http://musicbrainz.org/
[mbwsv2]: http://musicbrainz.org/doc/XML_Web_Service/Version_2
[contribute]: https://github.com/maxkueng/node-musicbrainz/wiki/Contribute
