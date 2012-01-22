var request = require('request');
var xml2js = require('xml2js');
var querystring = require('querystring');
var util = require('util');

var mbBaseURI = 'http://musicbrainz.org/ws/2/';
var mb = exports;

var Resource = function (mbid) {
	this.id = mbid;
};
Resource.prototype.load = function (callback) {
	if (this._loaded) {
		if (typeof callback == 'function') callback();
		return;
	};

	var self = this;
	this._lookup(this.id, function (error, release) {
		for (i in self) {
			self[i] = release[i];
		}

		if (typeof callback == 'function') callback();
	});
};

var Disc = function (discId) {
	this.id = discId;
	this.releases = [];
};

var Release = function (mbid) {
	Resource.call(this);

	this._lookup = mb.lookupRelease;
	this._loaded = false;
	this.id = mbid;
	this.title = null; 
	this.status = null; 
	this.packaging = null;
	this.quality = null;
	this.language = null;
	this.script = null;
	this.date = null;
	this.country = null;
	this.barcode = null;
	this.asin = null;
	this.mediums = [];
	this.releaseGroups = [];
	this.labelInfo = [];
};
util.inherits(Release, Resource);
Release.prototype.loadxxx = function (callback) {
	var self = this;
	if (self._loaded) return;

	mb.lookupRelease(self.id, function (error, release) {
		for (i in self) {
			self[i] = release[i];
		}

		if (typeof callback == 'function') callback();
	});
};

var Medium = function () {
	this.title = null;
	this.position = null;
	this.format = null;
	this.discs = [];
	this.tracks = [];
};

var Track = function () {
	this.position = null; 
	this.length = null;
	this.recording = null;
};

var Recording = function (mbid) {
	Resource.call(this);

	this._lookup = mb.lookupRecording;
	this._loaded = false;
	this.id = mbid;
	this.title = null;
	this.length = null;
	this.artist = null;
	this.producer = null;
	this.vocal = null;
	this.performance = null;
};
util.inherits(Recording, Resource);

var ReleaseGroup = function (mbid) {
	Resource.call(this);

	this._lookup = mb.lookupReleaseGroup;
	this._loaded = false;
	this.id = mbid;
	this.type = null;
	this.title = null;
	this.firstReleaseDate = null;
	this.releases = [];
};
util.inherits(ReleaseGroup, Resource);

var Artist = function (mbid) {
	Resource.call(this);

	this._lookup = mb.lookupArtist;
	this._loaded = false;
	this.id = mbid;
	this.type = null;
	this.name = null;
	this.sortName = null;
	this.lifeSpan = {
		'begin' : null, 
		'end' : null
	};
};
util.inherits(Artist, Resource);

var LabelInfo = function () {
	this.catalogNumber = null;
	this.label = null;
};

var Label = function (mbid) {
	Resource.call(this);

	this._lookup = mb.lookupLabel;
	this._loaded = false;
	this.id = mbid;
	this.name = null;
	this.sortName = null;
	this.labelCode = null;
	this.country = null;
	this.lifeSpan = {
		'begin' : null, 
		'end' : null
	};
	this.releases = [];
};
util.inherits(Label, Resource);

var Work = function (mbid) {
	Resource.call(this);

	this._lookup = mb.lookupWork;
	this._loaded = false;
	this.id = mbid;
	this.type = null;
	this.title = null;
};
util.inherits(Label, Resource);

var Error = function (data) {
	this.message = null;
	if (typeof data.text !== 'undefined') {
		if (!data.text.length) data.text = [data.text];
		this.message = data.text.join("\n");
	}
	this.statusCode = null;
}

mb.lookup = function (resource, mbid, inc, callback) {
	var uri = mbBaseURI + resource + '/' + mbid;
	if (inc) uri += '?inc=' + inc.join('+');

	request({
		'method' : 'GET', 
		'uri' : uri

	}, function (error, response, body) {
		var parser = new xml2js.Parser();

		if (!error && response.statusCode == 200) {
			parser.addListener('end', function(result) {
				if (typeof callback == 'function') callback(false, result);
			});
			parser.parseString(body);

		} else {
			parser.addListener('end', function(result) {
				if (typeof callback == 'function') {
					var err = new Error(result);
					err.statusCode = response.statusCode;
					callback(err, null);
				}
			});
			parser.parseString(body);
		}
	});
};

mb.lookupDiscId = function (discId, callback) {
	mb.lookup('discid', discId, null, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var disc = new Disc(data.disc['@'].id);
		disc.sectors = data.disc.sectors;

		var releases = data.disc['release-list'].release;
		if (data.disc['release-list']['@'].count <= 1) releases = [releases];

		for (var i = 0; i < releases.length; i++) {
			var release = new Release(releases[i]['@'].id);
			release.title = releases[i].title;
			release.status = releases[i].status;
			release.packaging = releases[i].packaging;
			release.quality = releases[i].quality;
			release.language = releases[i]['text-representation'].language;
			release.script = releases[i]['text-representation'].script;
			release.date = releases[i].date;
			release.country = releases[i].country;
			release.barcode = releases[i].barcode;
			release.asin = releases[i].asin;

			var mediums = releases[i]['medium-list'].medium;
			if (releases[i]['medium-list']['@'].count <= 1) mediums = [mediums];

			for (var ii = 0; ii < mediums.length; ii++) {
				var medium = new Medium();
				medium.title = mediums[ii].title;
				medium.position = mediums[ii].position;
				medium.format = mediums[ii].format;

				var discs = mediums[ii]['disc-list'].disc;
				if (mediums[ii]['disc-list']['@'].count <= 1) discs = [discs];

				for (var iii = 0; iii < discs.length; iii++) {
					var d = new Disc(discs[iii]['@'].id);
					d.sectors = discs[iii].sectors;

					medium.discs.push(disc);
				}

				release.mediums.push(medium);
			}

			disc.releases.push(release);
		}

		if (typeof callback == 'function') callback(false, disc);
	});

};


mb.lookupRelease = function (mbid, callback) {
	mb.lookup('release', mbid, ['labels', 'release-groups', 'recordings'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var release = new Release(data.release['@'].id);
		release.title = data.release.title;
		release.status = data.release.status;
		release.packaging = data.release.packaging;
		release.quality = data.release.quality;
		release.language = data.release['text-representation'].language;
		release.script = data.release['text-representation'].script;
		release.date = data.release.date;
		release.country = data.release.country;
		release.barcode = data.release.barcode;
		release.asin = data.release.asin;

		if (typeof data.release['release-group'] !== 'undefined') {
			var releaseGroups = data.release['release-group'];
			if (typeof releaseGroups.length == 'undefined') releaseGroups = [releaseGroups];

			for (var i = 0; i < releaseGroups.length; i++) {
				var releaseGroup = new ReleaseGroup(releaseGroups[i]['@'].id);
				releaseGroup.type = releaseGroups[i]['@'].type;
				releaseGroup.title = releaseGroups[i].title;
				releaseGroup.firstReleaseDate = releaseGroups[i]['first-release-date'];

				release.releaseGroups.push(releaseGroup);
			}
		}

		if (typeof data.release['medium-list'] !== 'undefined') {
			var mediums = data.release['medium-list'].medium;
			if (data.release['medium-list']['@'].count <= 1) mediums = [mediums];

			for (var i = 0; i < mediums.length; i++) {
				var medium = new Medium();
				medium.title = mediums[i].title;
				medium.position = mediums[i].position;
				medium.format = mediums[i].format;

				if (typeof mediums[i]['track-list'] !== 'undefined') {
					var tracks = mediums[i]['track-list'].track;
					if (mediums[i]['track-list']['@'].count <= 1) tracks = [tracks];

					for (var ii = 0; ii < tracks.length; ii++) {
						var track = new Track();
						track.position = tracks[ii].position;
						track.length = tracks[ii].length;

						if (typeof tracks[ii].recording !== 'undefined') {
							var recording = new Recording(tracks[ii].recording['@'].id);
							recording.title = tracks[ii].recording.title;
							recording.length = tracks[ii].recording.length;

							track.recording = recording;
						}

						medium.tracks.push(track);

					}
				}

				release.mediums.push(medium);
			}
		}

		if (typeof data.release['label-info-list'] !== 'undefined') {
			var labelInfos = data.release['label-info-list']['label-info'];
			if (data.release['label-info-list']['@'].count <= 1) labelInfos = [labelInfos];

			for (var i = 0; i < labelInfos.length; i++) {
				var labelInfo = new LabelInfo();
				labelInfo.catalogNumber = labelInfos[i]['catalog-number'];

				if (typeof labelInfos[i].label !== 'undefined') {
					var label = new Label(labelInfos[i].label['@'].id);
					label.name = labelInfos[i].label.name;
					label.sortName = labelInfos[i].label['sort-name'];
					label.labelCode = labelInfos[i].label['label-code'];

					labelInfo.label = label;
				}

				release.labelInfo.push(labelInfo);
			}
		}

		release._loaded = true;

		if (typeof callback == 'function') callback(false, release);
	});
};

mb.lookupReleaseGroup = function (mbid, callback) {
	mb.lookup('release-group', mbid, ['artists', 'releases'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var releaseGroup = new ReleaseGroup(data['release-group']['@'].id);
		releaseGroup.type = data['release-group']['@'].type;
		releaseGroup.title = data['release-group'].title;
		releaseGroup.firstReleaseDate = data['release-group']['first-release-date'];

		if (typeof data['release-group']['artist-credit'] !== 'undefined') {
			if (typeof data['release-group']['artist-credit']['name-credit'] !== 'undefined') {
				var artistData = data['release-group']['artist-credit']['name-credit'].artist;
				var artist = new Artist(artistData['@'].id);
				artist.name = artistData.name;
				artist.sortName = artistData['sort-name'];

				releaseGroup.artist = artist;
			}
		}

		if (typeof data['release-group']['release-list'] !== 'undefined') {
			var releases = data['release-group']['release-list'].release;
			if (data['release-group']['release-list']['@'].count <= 1) releases = [releases];

			for (var i = 0; i < releases.length; i++) {
				var release = new Release(releases[i]['@'].id);
				release.title = releases[i].title;
				release.status = releases[i].status;
				release.quality = releases[i].quality;
				release.script = releases[i]['text-representation'].script;
				release.language = releases[i]['text-representation'].language;
				release.date = releases[i].date;
				release.country = releases[i].country;
				release.barcode = releases[i].barcode;

				releaseGroup.releases.push(release);
			}

		}

		releaseGroup._loaded = true;

		if (typeof callback == 'function') callback(false, releaseGroup);
	});
};

mb.lookupRecording = function (mbid, callback) {
	mb.lookup('recording', mbid, ['artists', 'work-rels', 'artist-rels'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var recording = new Recording(data.recording['@'].id);
		recording.title = data.recording.title;
		recording.length = data.recording.length;

		if (typeof data.recording['artist-credit'] !== 'undefined') {
			if (typeof data.recording['artist-credit']['name-credit'] !== 'undefined') {
				if (typeof data.recording['artist-credit']['name-credit'].artist !== 'undefined') {
					var nameCredit = data.recording['artist-credit']['name-credit'].artist;
					var artist = new Artist(nameCredit['@'].id);
					artist.name = nameCredit.name;
					artist.sortName = nameCredit.sortName;

					recording.artist = artist;
				}

				if (typeof data.recording['relation-list'] !== 'undefined') {
					var relationList = data.recording['relation-list'];
					if (typeof relationList.length === 'undefined') relationList = [relationList];

					for (var i = 0; i < relationList.length; i++) {
						switch (relationList[i]['@']['target-type']) {
							case 'artist': {
								var relations = relationList[i].relation;
								if (typeof relations.length === 'undefined') relations = [relations];

								for (var ii = 0; ii < relations.length; ii++) {
									var artist = new Artist(relations[ii].artist['@'].id);
									artist.name = relations[ii].artist.name;
									artist.sortName = relations[ii].artist['sort-name'];

									recording[relations[ii]['@'].type] = artist;
								}
								break;
							}

							case 'work': {
								var relations = relationList[i].relation;
								if (typeof relations.length === 'undefined') relations = [relations];

								for (var ii = 0; ii < relations.length; ii++) {
									var work = new Work(relations[ii].work['@'].id);
									work.title = relations[ii].work.title;

									recording[relations[ii]['@'].type] = work;
								}
								break;
							}
						}
					}
				}
			}
		}

		recording._loaded = true;

		if (typeof callback == 'function') callback(false, recording);
	});
};

mb.lookupArtist = function (mbid, callback) {
	mb.lookup('artist', mbid, null, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var artist = new Artist(data.artist['@'].id);
		artist.type = data.artist['@'].type;
		artist.name = data.artist.name;
		artist.sortName = data.artist['sort-name'];
		artist.country = data.artist.country;
		if (typeof data.artist['life-span'] !== 'undefined') {
			artist.lifeSpan.begin = data.artist['life-span'].begin;
			artist.lifeSpan.end = data.artist['life-span'].end;
		}

		artist._loaded = true;

		if (typeof callback == 'function') callback(false, artist);
	});
};

mb.lookupLabel = function (mbid, callback) {
	mb.lookup('label', mbid, ['releases'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var label = new Label(data.label['@'].id);
		label.type = data.label['@'].type;
		label.name = data.label.name;
		label.sortName = data.label['sort-name'];
		label.country = data.label.country;
		label.labelCode = data.label['label-code'];
		if (typeof data.label['life-span'] !== 'undefined') {
			label.lifeSpan.begin = data.label['life-span'].begin;
			label.lifeSpan.end = data.label['life-span'].end;
		}

		if (typeof data.label['release-list'] !== 'undefined') {
			var releases = data.label['release-list'].release;
			if (data.label['release-list']['@'].count <= 1) releases = [releases];

			for (var i = 0; i < releases.length; i++) {
				var release = new Release(releases[i]['@'].id);
				release.title = releases[i].title;
				release.status = releases[i].status;
				release.quality = releases[i].quality;
				release.script = releases[i]['text-representation'].script;
				release.language = releases[i]['text-representation'].language;
				release.date = releases[i].date;
				release.country = releases[i].country;
				release.barcode = releases[i].barcode;

				label.releases.push(release);
			}

		}

		label._loaded = true;

		if (typeof callback == 'function') callback(false, label);
	});
};

mb.lookupWork = function (mbid, callback) {
	mb.lookup('work', mbid, null, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var work = new Work(data.work['@'].id);
		work.type = data.work['@'].type;
		work.title = data.work.title;

		work._loaded = true;

		if (typeof callback == 'function') callback(false, work);
	});
};

mb.Release = Release;
mb.ReleaseGroup = ReleaseGroup;
mb.Recording = Recording;
mb.Artist = Artist;
mb.Label = Label;
mb.Work = Work;
