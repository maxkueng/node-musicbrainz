var request = require('request');
var xml2js = require('xml2js');
var querystring = require('querystring');

var mbBaseURI = 'http://musicbrainz.org/ws/2/';
var mb = exports;

var ReleaseLinkedEntities = function () {
	var self = this;
	this.releases = [];
	this._linkedEntities.push('releases');

	this.loadReleaseList = function (data) {
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
				release.asin = releases[i].asin;

				if (typeof releases[i]['medium-list'] !== 'undefined') {
					var mediums = releases[i]['medium-list'].medium;
					if (releases[i]['medium-list']['@'].count <= 1) mediums = [mediums];

					for (var ii = 0; ii < mediums.length; ii++) {
						var medium = new Medium();
						medium.title = mediums[ii].title;
						medium.position = mediums[ii].position;
						medium.format = mediums[ii].format;

						if (typeof mediums[ii]['disc-list'] !== 'undefined') {
							var discs = mediums[ii]['disc-list'].disc;
							if (mediums[ii]['disc-list']['@'].count <= 1) discs = [discs];

							for (var iii = 0; iii < discs.length; iii++) {
								var d = new Disc(discs[iii]['@'].id);
								d.sectors = discs[iii].sectors;

								medium.discs.push(d);
							}

							release.mediums.push(medium);
						}
					}
				}

				self.releases.push(release);
			}
		}

		self._loadedLinkedEntities.push('releases');
	};

	this._readDataFunctions['releases'] = this.loadReleaseList;

	return this;
};

var ReleaseGroupLinkedEntities = function () {
	var self = this;
	this.releaseGroups = [];
	this._linkedEntities.push('release-groups');

	this.loadReleaseGroupList = function (data) {
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

		self._loadedLinkedEntities.push('release-groups');
	};

	this._readDataFunctions['release-groups'] = this.loadReleaseGroupList;

	return this;
};

var LabelLinkedEntities = function () {
	var self = this;
	this.labelInfo = [];
	this._linkedEntities.push('labels');

	this.loadLabelInfoList = function (data) {
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

				self.labelInfo.push(labelInfo);
			}
		}

		self._loadedLinkedEntities.push('labels');
	};

	this._readDataFunctions['labels'] = this.loadLabelInfoList;

	return this;
};

var RecordingLinkedEntities = function () {
	var self = this;
	this.mediums = [];
	this.recordings = [];
	this._linkedEntities.push('recordings');

	this.loadMediumList = function (data) {
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

				self.mediums.push(medium);
			}
		}

		if (typeof data['recording-list'] !== 'undefined') {
			var recordings = data['recording-list'].recording;
			if (data['recording-list']['@'].count <= 1) recordings = [recordings];

			for (var i = 0; i < recordings.length; i++) {
				var recording = new Recording(recordings[i]['@'].id);
				recording.title = recordings[i].title;
				recording.length = recordings[i].length;

				self.recordings.push(recording);
			}
		}

		self._loadedLinkedEntities.push('recordings');
	};

	this._readDataFunctions['recordings'] = this.loadMediumList;

	return this;
};

var ArtistLinkedEntities = function () {
	var self = this;
	this.artist = null;
	this._linkedEntities.push('artists');

	this.loadArtistCredits = function (data) {
		if (typeof data['artist-credit'] !== 'undefined') {
			if (typeof data['artist-credit']['name-credit'] !== 'undefined') {
				var artistData = data['artist-credit']['name-credit'].artist;
				var artist = new Artist(artistData['@'].id);
				artist.name = artistData.name;
				artist.sortName = artistData['sort-name'];

				self.artist = artist;
			}
		}

		self._loadedLinkedEntities.push('artists');
	};

	this._readDataFunctions['artists'] = this.loadArtistCredits;

	return this;
};

var WorkLinkedEntities = function () {
	var self = this;
	this.works = [];
	this._linkedEntities.push('works');

	this.loadWorkList = function (data) {
		if (typeof data['work-list'] !== 'undefined') {
			var works = data['work-list'].work;
			if (data['work-list']['@'].count <= 1) works = [works];

			for (var i = 0; i < works.length; i++) {
				var work = new Work(works[i]['@'].id);
				work.title = works[i].title;

				self.works.push(work);
			}
		}

		self._loadedLinkedEntities.push('works');
	};

	this._readDataFunctions['works'] = this.loadWorkList;

	return this;
};

var Resource = function (mbid) {
	this._loaded = false;
	this._linkedEntities = [];
	this._loadedLinkedEntities = [];
	this._readDataFunctions = [];
	this.id = mbid;

	this.load = function (linkedEntities, callback) {
		if ( !linkedEntities ) linkedEntities = [];

		if (this.loaded(linkedEntities)) {
			if (typeof callback == 'function') callback();
			return;
		};

		if (typeof this._lookup !== 'function') return;

		var self = this;
		this._lookup(this.id, linkedEntities, function (error, resource) {
			if ( !error ) { 
				for (i in self) {
					self[i] = resource[i];
				}
			}

			if (typeof callback == 'function') callback(error);
		});
	};

	this.loaded = function (linkedEntities) {
		if ( !this._loaded ) return false;
		if (typeof linkedEntities === 'undefined') linkedEntities = this._linkedEntities;

		for (var i = 0; i < linkedEntities.length; i++) {
			if (this._loadedLinkedEntities.indexOf(linkedEntities[i]) < 0) return false;
		}

		return true;
	};

	this.readData = function (linkedEntities, data) {
		for (var i in linkedEntities) {
			if (typeof this._readDataFunctions[linkedEntities[i]] === 'function') {
				this._readDataFunctions[linkedEntities[i]](data);
			}
		}
	};

	return this;
};

var Disc = function (discId) {
	Resource.call(this, discId);
	ReleaseLinkedEntities.call(this);

	this._lookup = mb.lookupDiscId;
};

var Release = function (mbid) {
	Resource.call(this, mbid);
	ReleaseGroupLinkedEntities.call(this);
	LabelLinkedEntities.call(this);
	RecordingLinkedEntities.call(this);
	ArtistLinkedEntities.call(this);

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
	ReleaseLinkedEntities.call(this);
	ArtistLinkedEntities.call(this);

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
	ReleaseLinkedEntities.call(this);
	ArtistLinkedEntities.call(this);

	this.type = null;
	this.title = null;
	this.firstReleaseDate = null;

	this._lookup = mb.lookupReleaseGroup;
};

var Artist = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinkedEntities.call(this);
	ReleaseGroupLinkedEntities.call(this);
	RecordingLinkedEntities.call(this);
	WorkLinkedEntities.call(this);

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
	ReleaseLinkedEntities.call(this);

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

mb.lookupDiscId = function (discId, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('discid', discId, linkedEntities, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		data = data.disc;

		var disc = new Disc(data['@'].id);
		disc.sectors = data.sectors;
		
		disc.readData(linkedEntities, data);

		if (typeof callback == 'function') callback(false, disc);
	});

};

mb.lookupRelease = function (mbid, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('release', mbid, linkedEntities, function (error, data) {
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

		release.readData(linkedEntities, data);

		release._loaded = true;

		if (typeof callback == 'function') callback(false, release);
	});
};

mb.lookupReleaseGroup = function (mbid, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('release-group', mbid, linkedEntities, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		data = data['release-group'];

		var releaseGroup = new ReleaseGroup(data['@'].id);
		releaseGroup.type = data['@'].type;
		releaseGroup.title = data.title;
		releaseGroup.firstReleaseDate = data['first-release-date'];

		releaseGroup.readData(linkedEntities, data);

		releaseGroup._loaded = true;

		if (typeof callback == 'function') callback(false, releaseGroup);
	});
};

mb.lookupRecording = function (mbid, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('recording', mbid, linkedEntities, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		data = data.recording;

		var recording = new Recording(data['@'].id);
		recording.title = data.title;
		recording.length = data.length;

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

		recording.readData(linkedEntities, data);

		recording._loaded = true;

		if (typeof callback == 'function') callback(false, recording);
	});
};

mb.lookupArtist = function (mbid, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('artist', mbid, linkedEntities, function (error, data) {
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

		artist.readData(linkedEntities, data);

		artist._loaded = true;

		if (typeof callback == 'function') callback(false, artist);
	});
};

mb.lookupLabel = function (mbid, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('label', mbid, linkedEntities, function (error, data) {
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

		label.readData(linkedEntities, data);

		label._loaded = true;

		if (typeof callback == 'function') callback(false, label);
	});
};

mb.lookupWork = function (mbid, linkedEntities, callback) {
	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('work', mbid, linkedEntities, function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		var work = new Work(data.work['@'].id);
		work.type = data.work['@'].type;
		work.title = data.work.title;

		work.readData(linkedEntities, data);

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
mb.Disc = Disc;
