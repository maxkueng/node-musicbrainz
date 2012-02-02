var request = require('request');
var xml2js = require('xml2js');
var Trickle = require('trickle').Trickle;
var os = require('os');
var timers = require('timers');
var trickle = new Trickle(1, 1000);

var VERSION = '0.1.0';
var mbBaseURI = 'http://musicbrainz.org/ws/2/';
var mb = exports;

var ReleaseLinkedEntities = function () {
	var self = this;
	this.setDataFields(['releases']);
	this.releases = [];
	this._linkedEntities.push('releases');

	this.loadReleaseList = function (data) {
		if (typeof data['release-list'] !== 'undefined') {
			var releases = data['release-list'].release;
			if (data['release-list']['@'].count <= 1) releases = [releases];

			for (var i = 0; i < releases.length; i++) {
				var release = new Release(releases[i]['@'].id);
				release.setProperty('title', releases[i].title);
				release.setProperty('status', releases[i].status);
				release.setProperty('quality', releases[i].quality);
				if (typeof releases[i]['text-representation'] !== 'undefined') {
					release.setProperty('script', releases[i]['text-representation'].script);
					release.setProperty('language', releases[i]['text-representation'].language);
				}
				release.setProperty('date', releases[i].date);
				release.setProperty('country', releases[i].country);
				release.setProperty('barcode', releases[i].barcode);
				release.setProperty('asin', releases[i].asin);

				if (typeof releases[i]['medium-list'] !== 'undefined') {
					var mediums = releases[i]['medium-list'].medium;
					if (releases[i]['medium-list']['@'].count <= 1) mediums = [mediums];

					for (var ii = 0; ii < mediums.length; ii++) {
						var medium = new Medium();
						medium.setProperty('title', mediums[ii].title);
						medium.setProperty('position', mediums[ii].position);
						medium.setProperty('format', mediums[ii].format);

						if (typeof mediums[ii]['disc-list'] !== 'undefined') {
							var discs = mediums[ii]['disc-list'].disc;
							if (mediums[ii]['disc-list']['@'].count <= 1) discs = [discs];

							for (var iii = 0; iii < discs.length; iii++) {
								var d = new Disc(discs[iii]['@'].id);
								d.setProperty('sectors', discs[iii].sectors);

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
	this.setDataFields(['releaseGroups']);
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
			releaseGroup.setProperty('type', releaseGroups[i]['@'].type);
			releaseGroup.setProperty('title', releaseGroups[i].title);
			releaseGroup.setProperty('firstReleaseDate', releaseGroups[i]['first-release-date']);

			self.releaseGroups.push(releaseGroup);
		}

		self._loadedLinkedEntities.push('release-groups');
	};

	this._readDataFunctions['release-groups'] = this.loadReleaseGroupList;

	return this;
};

var LabelLinkedEntities = function () {
	var self = this;
	this.setDataFields(['labelInfo']);
	this.labelInfo = [];
	this._linkedEntities.push('labels');

	this.loadLabelInfoList = function (data) {
		if (typeof data['label-info-list'] !== 'undefined') {
			if (typeof data['label-info-list']['label-info'] !== 'undefined') {
				var labelInfos = data['label-info-list']['label-info'];
				if (data['label-info-list']['@'].count <= 1) labelInfos = [labelInfos];

				for (var i = 0; i < labelInfos.length; i++) {
					var labelInfo = new LabelInfo();
					labelInfo.setProperty('catalogNumber', labelInfos[i]['catalog-number']);
	
					if (typeof labelInfos[i].label !== 'undefined') {
						var label = new Label(labelInfos[i].label['@'].id);
						label.setProperty('name', labelInfos[i].label.name);
						label.setProperty('sortName', labelInfos[i].label['sort-name']);
						label.setProperty('labelCode', labelInfos[i].label['label-code']);

						labelInfo.label = label;
					}

					self.labelInfo.push(labelInfo);
				}
			}
		}

		self._loadedLinkedEntities.push('labels');
	};

	this._readDataFunctions['labels'] = this.loadLabelInfoList;

	return this;
};

var RecordingLinkedEntities = function () {
	var self = this;
	this.setDataFields(['mediums', 'recordings']);
	this.mediums = [];
	this.recordings = [];
	this._linkedEntities.push('recordings');

	this.loadMediumList = function (data) {
		if (typeof data['medium-list'] !== 'undefined') {
			var mediums = data['medium-list'].medium;
			if (data['medium-list']['@'].count <= 1) mediums = [mediums];

			for (var i = 0; i < mediums.length; i++) {
				var medium = new Medium();
				medium.setProperty('title', mediums[i].title);
				medium.setProperty('position', mediums[i].position);
				medium.setProperty('format', mediums[i].format);

				if (typeof mediums[i]['track-list'] !== 'undefined') {
					var tracks = mediums[i]['track-list'].track;
					if (mediums[i]['track-list']['@'].count <= 1) tracks = [tracks];

					for (var ii = 0; ii < tracks.length; ii++) {
						var track = new Track();
						track.setProperty('position', tracks[ii].position);
						track.setProperty('length', tracks[ii].length);

						if (typeof tracks[ii].recording !== 'undefined') {
							var recording = new Recording(tracks[ii].recording['@'].id);
							recording.setProperty('title', tracks[ii].recording.title);
							recording.setProperty('length', tracks[ii].recording.length);

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
				recording.setProperty('title', recordings[i].title);
				recording.setProperty('length', recordings[i].length);

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
	this.setDataFields(['artist']);
	this.artist = null;
	this._linkedEntities.push('artists');

	this.loadArtistCredits = function (data) {
		if (typeof data['artist-credit'] !== 'undefined') {
			if (typeof data['artist-credit']['name-credit'] !== 'undefined') {
				var artistData = data['artist-credit']['name-credit'].artist;
				var artist = new Artist(artistData['@'].id);
				artist.setProperty('name', artistData.name);
				artist.setProperty('sortName', artistData['sort-name']);

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
	this.setDataFields(['work']);
	this.works = [];
	this._linkedEntities.push('works');

	this.loadWorkList = function (data) {
		if (typeof data['work-list'] !== 'undefined') {
			var works = data['work-list'].work;
			if (data['work-list']['@'].count <= 1) works = [works];

			for (var i = 0; i < works.length; i++) {
				var work = new Work(works[i]['@'].id);
				work.setProperty('title', works[i].title);

				self.works.push(work);
			}
		}

		self._loadedLinkedEntities.push('works');
	};

	this._readDataFunctions['works'] = this.loadWorkList;

	return this;
};

var Entity = function () {
	this.setProperty = function (attr, value) {
		if (typeof value === 'undefined') return false;
		this[attr] = value;
		return true;
	};

	this._dataFields = [];

	this.data = function () {
		var data = {};
		for (var i = 0; i < this._dataFields.length; i++) {
			var field = this._dataFields[i];
			if (this.hasOwnProperty(field)) {
				data[field] = this[field];
			}
		}

		return data;
	};

	this.setDataFields = function (fields) {
		for (var i = 0; i < fields.length; i++) {
			this._dataFields.push(fields[i]);
		}
	};
};

var Resource = function (mbid) {
	Entity.call(this);
	this.setDataFields(['id']);
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

	this.setDataFields(['title', 'status', 'packaging', 'quality', 
			'language', 'script', 'date', 'country', 'barcode', 'asin']);

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

	this._lookup = mb.lookupRelease;
};

var Medium = function () {
	Entity.call(this);

	this.setDataFields(['title', 'position', 'format', 'discs', 'tracks']);

	this.title = null;
	this.position = null;
	this.format = null;
	this.discs = [];
	this.tracks = [];
};

var Track = function () {
	Entity.call(this);
	this.setDataFields(['position', 'length', 'recording']);

	this.position = null; 
	this.length = null;
	this.recording = null;
};

var Recording = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinkedEntities.call(this);
	ArtistLinkedEntities.call(this);

	this.setDataFields(['title', 'length', 'artist', 'producer', 'vocal', 'performance']);

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

	this.setDataFields(['type', 'title', 'firstReleaseDate']);

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

	this.setDataFields(['type', 'name', 'sortName', 'lifeSpan']);

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
	Entity.call(this);
	this.setDataFields(['catalogNumber', 'label']);
	this.catalogNumber = null;
	this.label = null;
};

var Label = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinkedEntities.call(this);

	this.setDataFields(['name', 'sortName', 'labelCode', 'country', 'lifeSpan']);

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
	this.setDataFields(['type', 'title']);

	this.type = null;
	this.title = null;

	this._lookup = mb.lookupWork;
};

var Error = function (data) {
	Entity.call(this);
	this._dataFields = ['statusCode', 'message'];
	this.message = null;
	if (typeof data.text !== 'undefined') {
		if (!data.text.length) data.text = [data.text];
		this.message = data.text.join("\n");
	}
	this.statusCode = null;
}

mb.lookupCache = function (uri, callback, lookup) {
	lookup();
};

mb.userAgent = function () {
	return 'node-musicbrainz/' + VERSION
	              + ' (node/' + process.version
	              + '; ' + os.type() + '/' + os.release()
	              + ')';
};

mb.lookup = function (resource, mbid, inc, callback) {
	var uri = mbBaseURI + resource + '/' + mbid;
	if (inc) uri += '?inc=' + inc.join('+');

	var count = 0;
	var lookup = function (callback) {
		trickle.trickle(1, function (error) {
		count++;
			request({
				'method' : 'GET', 
				'uri' : uri, 
				'headers' : {
					'User-Agent': mb.userAgent()
				}

			}, function (error, response, body) {

				// If the service is busy, we'll try again later
				console.log(mbid, 'statusCode', response.statusCode);
//				if (count < 5 && 503 == 503) {
				if (response.statusCode == 503) {
					timers.setTimeout(lookup, 2000, callback);
					return;
				}

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

		});
	};

	mb.lookupCache(uri, callback, lookup);
};

mb.lookupDiscId = function (discId, linkedEntities, callback) {
	mb.lookup('discid', discId, ['recordings'], function (error, data) {
		if (error) {
			callback(error, data);
			return;
		}

		data = data.disc;

		var disc = new Disc(data['@'].id);
		disc.setProperty('sectors', data.sectors);
		
		disc.readData(['releases'], data);

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
		release.setProperty('title', data.title);
		release.setProperty('status', data.status);
		release.setProperty('packaging', data.packaging);
		release.setProperty('quality', data.quality);
		if (typeof data['text-representation'] !== 'undefined') {
			release.setProperty('language', data['text-representation'].language);
			release.setProperty('script', data['text-representation'].script);
		}
		release.setProperty('date', data.date);
		release.setProperty('country', data.country);
		release.setProperty('barcode', data.barcode);
		release.setProperty('asin', data.asin);

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
		releaseGroup.setProperty('type', data['@'].type);
		releaseGroup.setProperty('title', data.title);
		releaseGroup.setProperty('firstReleaseDate', data['first-release-date']);

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
		recording.setProperty('title', data.title);
		recording.setProperty('length', data.length);

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
							artist.setProperty('name', relations[ii].artist.name);
							artist.setProperty('sortName', relations[ii].artist['sort-name']);

							recording[relations[ii]['@'].type] = artist;
						}
						break;
					}

					case 'work': {
						var relations = relationList[i].relation;
						if (typeof relations.length === 'undefined') relations = [relations];

						for (var ii = 0; ii < relations.length; ii++) {
							var work = new Work(relations[ii].work['@'].id);
							work.setProperty('title', relations[ii].work.title);

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
		artist.setProperty('type', data['@'].type);
		artist.setProperty('name', data.name);
		artist.setProperty('sortName', data['sort-name']);
		artist.setProperty('country', data.country);
		if (typeof data['life-span'] !== 'undefined') {
			artist.lifeSpan.setProperty('begin', data['life-span'].begin);
			artist.lifeSpan.setProperty('end', data['life-span'].end);
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
		label.setProperty('type', data['@'].type);
		label.setProperty('name', data.name);
		label.setProperty('sortName', data['sort-name']);
		label.setProperty('country', data.country);
		label.setProperty('labelCode', data['label-code']);
		if (typeof data['life-span'] !== 'undefined') {
			label.lifeSpan.setProperty('begin', data['life-span'].begin);
			label.lifeSpan.setProperty('end', data['life-span'].end);
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
		work.setProperty('type', data.work['@'].type);
		work.setProperty('title', data.work.title);

		work.readData(linkedEntities, data);

		work._loaded = true;

		if (typeof callback == 'function') callback(false, work);
	});
};

mb.VERSION = VERSION;

mb.Release = Release;
mb.ReleaseGroup = ReleaseGroup;
mb.Recording = Recording;
mb.Artist = Artist;
mb.Label = Label;
mb.Work = Work;
mb.Disc = Disc;
