MusicBrainz API for node.js
===========================

This is a MusicBrainz API v2 client written in JavaScript for [node.js][node].

It's a work in progress. Currently only supports lookups with an MBID or DiscId. No searches and such.

Supported resources
-------------------

 - DiscId
 - Artist (recordings, releases, release-groups, works)
 - Label (releases)
 - Recording (artists, releases)
 - Release (artists, labels, recordings, release-groups)
 - Release Group (artists, releases)
 - Work

Examples
--------

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
release.load(function () {
	console.log(release);
});
```
