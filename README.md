MusicBrainz API for node.js
===========================

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


[node]: http://nodejs.org/
[mb]: http://musicbrainz.org/
[mbwsv2]: http://musicbrainz.org/doc/XML_Web_Service/Version_2
[contribute]: https://github.com/maxkueng/node-musicbrainz/wiki/Contribute
