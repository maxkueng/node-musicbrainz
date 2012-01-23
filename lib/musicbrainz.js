var request = require('request');
var xml2js = require('xml2js');
var querystring = require('querystring');

var mbBaseURI = 'http://musicbrainz.org/ws/2/';
var mb = exports;

var ReleaseLinks = function () {
	var self = this;
	this.releases = [];

	this.loadReleaseLinks = function (data) {
		if (typeof data['release-list'] !== 'undefined') {
			var releases = data['release-list'].release;
			if (data['release-list']['@'].count <= 1) releases = [releases];

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

				self.releases.push(release);
			}
		}
	};

	this._readDataFunctions.push(this.loadReleaseLinks);

	return this;
};

var ReleaseGroupLinks = function () {
	var self = this;
	this.releaseGroups = [];

	this.loadReleaseGroupLinks = function (data) {
		var releaseGroups = [];
		if (typeof data['release-group'] !== 'undefined') {
			releaseGroups = data['release-group'];
			if (typeof releaseGroups.length === 'undefined') releaseGroups = [releaseGroups];

		} else if (typeof data['release-group-list'] !== 'undefined') {
			releaseGroups = data['release-group-list']['release-group'];
			if (data['release-group-list']['@'].count <= 1) releaseGroups = [releaseGroups];
		}

		for (var i = 0; i < releaseGroups.length; i++) {
			var releaseGroup = new ReleaseGroup(releaseGroups[i]['@'].id);
			releaseGroup.type = releaseGroups[i]['@'].type;
			releaseGroup.title = releaseGroups[i].title;
			releaseGroup.firstReleaseDate = releaseGroups[i]['first-release-date'];

			self.releaseGroups.push(releaseGroup);
		}
	};

	this._readDataFunctions.push(this.loadReleaseGroupLinks);

	return this;
};

var Resource = function (mbid) {
	this._loaded = false;
	this.id = mbid;

	this.load = function (callback) {
		if (this._loaded) {
			if (typeof callback == 'function') callback();
			return;
		};

		if (typeof this._lookup !== 'function') return;

		var self = this;
		this._lookup(this.id, function (error, resource) {
			if (error) console.log(error);
			for (i in self) {
				self[i] = resource[i];
			}

			if (typeof callback == 'function') callback();
		});
	};

	this._readDataFunctions = [];

	this.readData = function (data) {
		for (var i in this._readDataFunctions) {
			if (typeof this._readDataFunctions[i] === 'function') {
				this._readDataFunctions[i](data);
			}
		}
	};

	return this;
};

var Disc = function (discId) {
	this.id = discId;
	this.releases = [];
};

var Release = function (mbid) {
	Resource.call(this, mbid);
	ReleaseGroupLinks.call(this);

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
	this.labelInfo = [];

	this._lookup = mb.lookupRelease;
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
	Resource.call(this, mbid);
	ReleaseLinks.call(this);

	this.title = null;
	this.length = null;
	this.artist = null;
	this.producer = null;
	this.vocal = null;
	this.performance = null;

	this._lookup = mb.lookupRecording;
};

var ReleaseGroup = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinks.call(this);

	this.type = null;
	this.title = null;
	this.firstReleaseDate = null;

	this._lookup = mb.lookupReleaseGroup;
};

var Artist = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinks.call(this);
	ReleaseGroupLinks.call(this);

	this.type = null;
	this.name = null;
	this.sortName = null;
	this.lifeSpan = {
		'begin' : null, 
		'end' : null
	};

	this._lookup = mb.lookupArtist;
};

var LabelInfo = function () {
	this.catalogNumber = null;
	this.label = null;
};

var Label = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinks.call(this);

	this.name = null;
	this.sortName = null;
	this.labelCode = null;
	this.country = null;
	this.lifeSpan = {
		'begin' : null, 
		'end' : null
	};

	this._lookup = mb.lookupLabel;
};

var Work = function (mbid) {
	Resource.call(this, mbid);

	this.type = null;
	this.title = null;

	this._lookup = mb.lookupWork;
};

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

		data = data.release;

		var release = new Release(data['@'].id);
		release.title = data.title;
		release.status = data.status;
		release.packaging = data.packaging;
		release.quality = data.quality;
		release.language = data['text-representation'].language;
		release.script = data['text-representation'].script;
		release.date = data.date;
		release.country = data.country;
		release.barcode = data.barcode;
		release.asin = data.asin;

		release.readData(data);

		if (typeof data['medium-list'] !== 'undefined') {
			var mediums = data['medium-list'].medium;
			if (data['medium-list']['@'].count <= 1) mediums = [mediums];

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

		if (typeof data['label-info-list'] !== 'undefined') {
			var labelInfos = data['label-info-list']['label-info'];
			if (data['label-info-list']['@'].count <= 1) labelInfos = [labelInfos];

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

		data = data['release-group'];

		var releaseGroup = new ReleaseGroup(data['@'].id);
		releaseGroup.type = data['@'].type;
		releaseGroup.title = data.title;
		releaseGroup.firstReleaseDate = data['first-release-date'];

		if (typeof data['artist-credit'] !== 'undefined') {
			if (typeof data['artist-credit']['name-credit'] !== 'undefined') {
				var artistData = data['artist-credit']['name-credit'].artist;
				var artist = new Artist(artistData['@'].id);
				artist.name = artistData.name;
				artist.sortName = artistData['sort-name'];

				releaseGroup.artist = artist;
			}
		}

		releaseGroup.readData(data);

		releaseGroup._loaded = true;

		if (typeof callback == 'function') callback(false, releaseGroup);
	});
};

mb.lookupRecording = function (mbid, callback) {
	mb.lookup('recording', mbid, ['releases', 'artists', 'work-rels', 'artist-rels'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		data = data.recording;

		var recording = new Recording(data['@'].id);
		recording.title = data.title;
		recording.length = data.length;

		if (typeof data['artist-credit'] !== 'undefined') {
			if (typeof data['artist-credit']['name-credit'] !== 'undefined') {
				if (typeof data['artist-credit']['name-credit'].artist !== 'undefined') {
					var nameCredit = data['artist-credit']['name-credit'].artist;
					var artist = new Artist(nameCredit['@'].id);
					artist.name = nameCredit.name;
					artist.sortName = nameCredit.sortName;

					recording.artist = artist;
				}

				if (typeof data['relation-list'] !== 'undefined') {
					var relationList = data['relation-list'];
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

		recording.readData(data);

		recording._loaded = true;

		if (typeof callback == 'function') callback(false, recording);
	});
};

mb.lookupArtist = function (mbid, callback) {
	mb.lookup('artist', mbid, ['releases', 'release-groups'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		data = data.artist;

		var artist = new Artist(data['@'].id);
		artist.type = data['@'].type;
		artist.name = data.name;
		artist.sortName = data['sort-name'];
		artist.country = data.country;
		if (typeof data['life-span'] !== 'undefined') {
			artist.lifeSpan.begin = data['life-span'].begin;
			artist.lifeSpan.end = data['life-span'].end;
		}

		artist.readData(data);

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

		data = data.label;

		var label = new Label(data['@'].id);
		label.type = data['@'].type;
		label.name = data.name;
		label.sortName = data['sort-name'];
		label.country = data.country;
		label.labelCode = data['label-code'];
		if (typeof data['life-span'] !== 'undefined') {
			label.lifeSpan.begin = data['life-span'].begin;
			label.lifeSpan.end = data['life-span'].end;
		}

		label.readData(data);

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
