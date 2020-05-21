// vim: ts=4:sw=4:noexpandtab

'use strict';

var request = require('request'),
	xml2js = require('xml2js'),
	trickle = require('timetrickle'),
	querystring = require('querystring'),
	os = require('os'),
	timers = require('timers'),
	limit = trickle(1, 1000);

var VERSION = '0.2.4';
var mbBaseURI = 'http://musicbrainz.org/ws/2/';

var mb = exports;

exports.configure = function (options) {
	if (options.baseURI) { mbBaseURI = options.baseURI; }
	if (options.rateLimit) {
		var requests = options.rateLimit.requests || 1;
		var interval = options.rateLimit.interval || 1000;

		limit = trickle(requests, interval);
	}
};

var AliasesLinkedEntities = function () {
	var self = this;
	this.setDataFields(['aliases']);
	this.aliases = [];
	this._linkedEntities.push('aliases');

	this.loadAliases = function (data) {
		if (typeof data['alias-list'] !== 'undefined') {
			var aliasList = data['alias-list'].alias;
			for (var j = 0 ; j < aliasList.length; j++) {
				self.aliases.push(aliasList[j]["#"]);
			}
		}
	};

	this._readDataFunctions.aliases = this.loadAliases;

	return this;
};

var ReleaseLinkedEntities = function () {
	var self = this;
	this.setDataFields(['releases']);
	this.releases = [];
	this._linkedEntities.push('releases');

	this.loadReleaseList = function (data) {
		if (typeof data['release-list'] !== 'undefined') {
			var releases = data['release-list'].release || [];
			if (data['release-list']['@'].count === 1) releases = [releases];

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
							if (typeof mediums[ii]['disc-list'].disc !== 'undefined') {
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
			if (!Array.isArray(releaseGroups)) releaseGroups = [releaseGroups];

		} else if (typeof data['release-group-list'] !== 'undefined' && typeof data['release-group-list']['release-group'] !== 'undefined') {
			releaseGroups = data['release-group-list']['release-group'];
			if (data['release-group-list']['@'].count <= 1) releaseGroups = [releaseGroups];

		}

		for (var i = 0; i < releaseGroups.length; i++) {
			var releaseGroup = new ReleaseGroup(releaseGroups[i]['@'].id);
			releaseGroup.setProperty('type', releaseGroups[i]['@'].type);
			releaseGroup.setProperty('title', releaseGroups[i].title);
			releaseGroup.setProperty('firstReleaseDate', releaseGroups[i]['first-release-date']);
			releaseGroup.setProperty('primaryType', releaseGroups[i]['primary-type']);

			if (typeof releaseGroups[i]['secondary-type-list'] !== 'undefined') {
				if (typeof releaseGroups[i]['secondary-type-list']['secondary-type'] !== 'undefined') {
					var secondaryTypes = releaseGroups[i]['secondary-type-list']['secondary-type'];
					if (!Array.isArray(secondaryTypes)) secondaryTypes = [secondaryTypes];

					releaseGroup.setProperty('secondaryTypes', secondaryTypes);
				}
			}

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
	this._linkedEntities.push('discids');

	this.getMediumByDiscId = function (discId) {
		if (!discId) return null;

		for (var i = 0; i < this.mediums.length; i++) {
			var medium = this.mediums[i];
			for (var ii = 0; ii < medium.discs.length; ii++) {
				var disc = medium.discs[ii];
				if (disc.id === discId) return medium;
			}
		}

		return null;
	};

	this.loadMediumList = function (data, linkedEntities) {
		if (typeof data['medium-list'] !== 'undefined') {
			var mediums = data['medium-list'].medium;
			if (data['medium-list']['@'].count <= 1) mediums = [mediums];

			for (var i = 0; i < mediums.length; i++) {
				var medium = new Medium();
				medium.setProperty('title', mediums[i].title);
				medium.setProperty('position', mediums[i].position);
				medium.setProperty('format', mediums[i].format);

				if (typeof mediums[i]['disc-list'] !== 'undefined') {
					if (typeof mediums[i]['disc-list'].disc !== 'undefined') {
						var discs = mediums[i]['disc-list'].disc;
						if (mediums[i]['disc-list']['@'].count <= 1) discs = [discs];

						for (var ii = 0; ii < discs.length; ii++) {
							var d = new Disc(discs[ii]['@'].id);
							d.setProperty('sectors', discs[ii].sectors);

							medium.discs.push(d);
						}
					}
				}

				if (typeof mediums[i]['track-list'] !== 'undefined') {
					var tracks = mediums[i]['track-list'].track;
					if (mediums[i]['track-list']['@'].count <= 1) tracks = [tracks];

					for (var j = 0; j < tracks.length; j++) {
						var track = new Track();
						track.setProperty('position', tracks[j].position);
						track.setProperty('length', tracks[j].length);

						if (typeof tracks[j].recording !== 'undefined') {
							var recording = new Recording(tracks[j].recording['@'].id);
							recording.setProperty('title', tracks[j].recording.title);
							recording.setProperty('length', tracks[j].recording.length);

							recording.readData(linkedEntities, tracks[j].recording);

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

			for (var k = 0; k < recordings.length; k++) {
				var recording = new Recording(recordings[k]['@'].id);
				recording.setProperty('title', recordings[k].title);
				recording.setProperty('length', recordings[k].length);

				self.recordings.push(recording);
			}
		}

		self._loadedLinkedEntities.push('recordings');
		self._loadedLinkedEntities.push('discids');
	};

	this._readDataFunctions['recordings'] = this.loadMediumList;

	return this;
};

var ArtistLinkedEntities = function () {
	var self = this;
	this.setDataFields(['artist']);
	this.artistCredits = [];
	this._linkedEntities.push('artists');

	this.loadArtistCredits = function (data) {
		if (typeof data['artist-credit'] !== 'undefined') {
			if (typeof data['artist-credit']['name-credit'] !== 'undefined') {
				var nameCredits = data['artist-credit']['name-credit'];
				if (!Array.isArray(nameCredits)) nameCredits = [nameCredits];

				for (var i = 0; i < nameCredits.length; i++) {
					var artistData = nameCredits[i].artist;
					var artist = new Artist(artistData['@'].id);
					artist.setProperty('name', artistData.name);
					artist.setProperty('sortName', artistData['sort-name']);

					var nameCredit = {
						'joinphrase' : (typeof nameCredits[i]['@'] !== 'undefined' && typeof nameCredits[i]['@'].joinphrase !== 'undefined'  ? nameCredits[i]['@'].joinphrase : ''),
						'artist' : artist
					};

					self.artistCredits.push(nameCredit);
				}
			}
		}

		self._loadedLinkedEntities.push('artists');
	};

	this.artistCreditsString = function () {
		var str = '';
		for (var i = 0; i < self.artistCredits.length; i++) {
			str += self.artistCredits[i].artist.name + self.artistCredits[i].joinphrase;
		}

		return str;
	};

	this.artistCreditsSortString = function () {
		var str = '';
		for (var i = 0; i < self.artistCredits.length; i++) {
			str += self.artistCredits[i].artist.sortName + self.artistCredits[i].joinphrase;
		}

		return str;
	};

	this._readDataFunctions['artists'] = this.loadArtistCredits;
	this._readDataFunctions['artist-credits'] = this.loadArtistCredits;

	return this;
};

var ArtistRels = function () {
	var self = this;
	this.setDataFields(['artistRels']);
	this.artistRels = [];
	this._linkedEntities.push('artist-rels');

	this.loadArtistRels = function (data) {
		if (typeof data['relation-list'] !== 'undefined') {
			var relationLists = data['relation-list'];
			if (!Array.isArray(relationLists)) relationLists = [relationLists];

			for (var i = 0; i < relationLists.length; i++) {
				if (relationLists[i]['@']['target-type'] != 'artist') continue;

				var relations = relationLists[i].relation;
				if (!Array.isArray(relations)) relations = [relations];

				for (var ii = 0; ii < relations.length; ii++) {
					var relation = new ArtistRel();
					relation.setProperty('type', relations[ii]['@'].type);

					if (typeof relations[ii]['attribute-list'] !== 'undefined') {
						var attributes = relations[ii]['attribute-list'].attribute;
						if (!Array.isArray(attributes)) attributes = [attributes];

						var attrs = [];
						for (var iii = 0; iii < attributes.length; iii++) {
							attrs.push(attributes[iii]);
						}
						relation.setProperty('attributes', attrs);
					}

					var artist = new Artist(relations[ii].artist['@'].id);
					artist.setProperty('name', relations[ii].artist.name);
					artist.setProperty('sortName', relations[ii].artist['sort-name']);
					artist.setProperty('ipi', relations[ii].artist.ipi);

					relation.setProperty('artist', artist);

					self.artistRels.push(relation);
				}
			}
		}

		self._loadedLinkedEntities.push('artist-rels');
	};

	this._readDataFunctions['artist-rels'] = this.loadArtistRels;

	this.getArtistRelsByType = function (type) {
		if (!type) return null;

		var rels = [];

		for (var i = 0; i < this.artistRels.length; i++) {
			var rel = this.artistRels[i];
			if (rel.type == type) rels.push(rel);
		}

		return rels;
	};
};

var WorkRels = function () {
	var self = this;
	this.setDataFields(['workRels']);
	this.workRels = [];
	this._linkedEntities.push('work-rels');

	this.loadWorkRels = function (data) {
		if (typeof data['relation-list'] !== 'undefined') {
			var relationLists = data['relation-list'];
			if (!Array.isArray(relationLists)) relationLists = [relationLists];

			for (var i = 0; i < relationLists.length; i++) {
				if (relationLists[i]['@']['target-type'] != 'work') continue;

				var relations = relationLists[i].relation;
				if (!Array.isArray(relations)) relations = [relations];

				for (var ii = 0; ii < relations.length; ii++) {
					var relation = new WorkRel();
					relation.type = relations[ii]['@'].type;

					if (typeof relations[ii]['attribute-list'] !== 'undefined') {
						var attributes = relations[ii]['attribute-list'].attribute;
						if (!Array.isArray(attributes)) attributes = [attributes];

						for (var iii = 0; iii < attributes.length; iii++) {
							relation.attributes.push(attributes[iii]);
						}
					}

					var work = new Work(relations[ii].work['@'].id);
					work.title = relations[ii].work.title;
					relation.work = work;

					self.workRels.push(relation);
				}
			}
		}

		self._loadedLinkedEntities.push('work-rels');
	};

	this._readDataFunctions['work-rels'] = this.loadWorkRels;

	this.getWorkRelByType = function (type) {
		if (!type) return null;

		for (var i = 0; i < this.workRels.length; i++) {
			var rel = this.workRels[i];
			if (rel.type == type) return rel;
		}

		return null;
	};
};

var WorkLinkedEntities = function () {
	var self = this;
	this.setDataFields(['works']);
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

	this._dataProperties = [];

	this.data = function () {
		var data = {};
		for (var i = 0; i < this._dataProperties.length; i++) {
			var prop = this._dataProperties[i];
			if (this.hasOwnProperty(prop)) {
				if (Array.isArray(this[prop])) {
					data[prop] = [];
					for (var ii = 0; ii < this[prop].length; ii++) {
						if (this[prop][ii] && typeof this[prop][ii].data == 'function') {
							data[prop][ii] = this[prop][ii].data();
						} else {
							data[prop][ii] = this[prop][ii];
						}
					}

				} else {
					if (this[prop] && typeof this[prop] == 'function') {
						data[prop] = this[prop].data();
					} else {
						data[prop] = this[prop];
					}
				}
			}
		}

		return data;
	};

	this.setDataFields = function (fields) {
		for (var i = 0; i < fields.length; i++) {
			this._dataProperties.push(fields[i]);
		}
	};

	this.isComplete = function () {
		for (var i = 0; i < this._dataProperties.length; i++) {
			var prop = this._dataProperties[i];
			if (this.hasOwnProperty(prop) && !this[prop]) return false;
		}

		return true;
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

	this.load = function (linkedEntities, force, callback) {
		if (typeof callback === 'undefined') {
			callback = force;
			force = false;
		}

		if ( !linkedEntities ) linkedEntities = [];

		if (!force && this.loaded(linkedEntities)) {
			if (typeof callback == 'function') callback();
			return;
		}

		if (typeof this._lookup !== 'function') return;

		var self = this;
		this._lookup(this.id, linkedEntities, force, function (err, resource) {
			if ( !err ) {
				for (var i in self) {
					self[i] = resource[i];
				}
			}

			if (typeof callback == 'function') callback(err);
		});
	};

	this.update = function (callback) {
		this.load(this._loadedLinkedEntities, true, function () {
			if (typeof callback == 'function') callback();
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
				this._readDataFunctions[linkedEntities[i]](data, linkedEntities);
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

	this.getTrackByPosition = function (pos) {
		if (!pos) return null;

		for (var i = 0; i < this.tracks.length; i++) {
			var track = this.tracks[i];
			if (track.position === pos) return track;
		}

		return null;
	};
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
	ArtistRels.call(this);
	WorkRels.call(this);

	this.setDataFields(['title', 'length', 'artist', 'producer', 'vocal']);

	this.title = null;
	this.length = null;
	this.artist = null;
	this.producer = null;
	this.vocal = null;

	this._lookup = mb.lookupRecording;
};

var ReleaseGroup = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinkedEntities.call(this);
	ArtistLinkedEntities.call(this);

	this.setDataFields(['type', 'title', 'primaryType', 'secondaryTypes', 'firstReleaseDate']);

	this.type = null;
	this.title = null;
	this.primaryType = null;
	this.secondaryTypes = [];
	this.firstReleaseDate = null;

	this._lookup = mb.lookupReleaseGroup;
};

var ArtistRel = function () {
	Entity.call(this);
	this.setDataFields(['type', 'attributes', 'artist']);
	this.type = null;
	this.attributes = [];
	this.artist = null;
};

var Artist = function (mbid) {
	Resource.call(this, mbid);
	ReleaseLinkedEntities.call(this);
	ReleaseGroupLinkedEntities.call(this);
	RecordingLinkedEntities.call(this);
	AliasesLinkedEntities.call(this);
	WorkLinkedEntities.call(this);

	this.setDataFields(['type', 'name', 'sortName', 'lifeSpan', 'ipi', 'country', 'gender']);

	this.type = null;
	this.ipi = null;
	this.name = null;
	this.sortName = null;
	this.country = null;
	this.gender = null;
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

var WorkRel = function () {
	Entity.call(this);
	this.setDataFields(['type', 'attributes', 'work']);
	this.type = null;
	this.attributes = [];
	this.work = null;
};

var Work = function (mbid) {
	Resource.call(this, mbid);
	this.setDataFields(['type', 'title']);

	this.type = null;
	this.title = null;

	this._lookup = mb.lookupWork;
};

mb.lookupCache = function (uri, force, callback, lookup) {
	lookup(callback);
};

mb.searchCache = function (uri, force, callback, search) {
	search(function (err, resource) {
		callback(err, resource);
	});
};

mb.userAgent = function () {
	return 'node-musicbrainz/' + VERSION + ' (node/' + process.version + '; ' +
		os.type() + '/' + os.release() + ')';
};

mb.lookup = function (resource, mbid, inc, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}


	var uri = mbBaseURI + resource + '/' + mbid;
	if (inc && inc instanceof Array) uri += '?inc=' + inc.join('+');

	var count = 0;
	var lookup = function (callback) {
		limit(1, function (err) {
		count++;
			request({
				'method' : 'GET',
				'uri' : uri,
				'headers' : {
					'User-Agent': mb.userAgent()
				}

			}, function (err, response, body) {
				if (err) { return callback(err, null); }

				// If the service is busy, we'll try again later
				if (response.statusCode == 503) {
					timers.setTimeout(lookup, 2000, callback);
					return;
				}

				var parser = new xml2js.Parser();

				if (!err && response.statusCode == 200) {
					parser.addListener('end', function(result) {
						if (typeof callback == 'function') { return callback(null, result); }
					});
					parser.parseString(body);

				} else {
					parser.addListener('end', function(result) {
						if (typeof callback == 'function') {
							var err = new Error(result.text);
							err.statusCode = response.statusCode;
							return callback(err, null);
						}
					});
					parser.parseString(body);
				}
			});

		});
	};

	mb.lookupCache(uri, force, callback, lookup);
};

mb.search = function(resource, query, filter, force, callback){
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	var filterArr = [],
		filterStr = '',
		uri = mbBaseURI + resource + '?',
		uriToAdd = '';

	// Go through the rest of the filters
	if(filter instanceof Object) {
		for(var key in filter){
			if (key === 'limit' || key === 'offset') {
				uriToAdd += !uriToAdd.length ? '' : '&';
				uriToAdd += key + '=' + filter[key];
			} else {
				filterArr.push(key + ':' + encodeURIComponent(filter[key]));
			}
		}
		filterStr = filterArr.join( encodeURIComponent(' AND ') );
	}

	// Set query
	uriToAdd += !uriToAdd.length ? '' : '&';
	uriToAdd += 'query=';

	if(query && query.length > 0 && filterStr.length > 0){
		uriToAdd += encodeURIComponent(query).replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1") + encodeURIComponent(' AND ') + filterStr;
	} else if(!query || query.length === 0){
		uriToAdd += filterStr;
	} else {
		uriToAdd += encodeURIComponent(query).replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
	}

	// Finally add to the uri
	uri += uriToAdd || '';

	var count = 0;
	var search = function (callback) {
		limit(1, function (err) {
			count++;
			request({
				'method' : 'GET',
				'uri' : uri,
				'headers' : {
					'User-Agent': mb.userAgent()
				}

			}, function (err, response, body) {
				if (err) { callback(err, null); return; }

				// If the service is busy, we'll try again later
				if (response.statusCode == 503) {
					timers.setTimeout(search, 2000, callback);
					return;
				}

				var parser = new xml2js.Parser();

				if (!err && response.statusCode == 200) {
					parser.addListener('end', function(result) {
						if (typeof callback == 'function') callback(false, result);
					});
					parser.parseString(body);

				} else {
					parser.addListener('end', function(result) {
						if (typeof callback == 'function') {
							var err = new Error(result.text);
							err.statusCode = response.statusCode;
							callback(err, null);
						}
					});
					parser.parseString(body);
				}
			});

		});
	};

	mb.searchCache(uri, force, callback, search);
};

mb.lookupDiscId = function (discId, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	mb.lookup('discid', discId, ['recordings'], function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		data = data.disc;

		var disc = new Disc(data['@'].id);
		disc.setProperty('sectors', data.sectors);

		disc.readData(['releases'], data);

		if (typeof callback == 'function') callback(false, disc);
	});

};

mb.lookupRelease = function (mbid, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('release', mbid, linkedEntities, force, function (err, data) {
		if (err) { return callback(err); }

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

mb.lookupReleaseGroup = function (mbid, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('release-group', mbid, linkedEntities, function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		data = data['release-group'];

		var releaseGroup = new ReleaseGroup(data['@'].id);
		releaseGroup.setProperty('type', data['@'].type);
		releaseGroup.setProperty('title', data.title);
		releaseGroup.setProperty('firstReleaseDate', data['first-release-date']);
		releaseGroup.setProperty('primaryType', data['primary-type']);

		if (typeof data['secondary-type-list'] !== 'undefined') {
			if (typeof data['secondary-type-list']['secondary-type'] !== 'undefined') {
				var secondaryTypes = data['secondary-type-list']['secondary-type'];
				if (!Array.isArray(secondaryTypes)) secondaryTypes = [secondaryTypes];

				releaseGroup.setProperty('secondaryTypes', secondaryTypes);
			}
		}

		releaseGroup.readData(linkedEntities, data);

		releaseGroup._loaded = true;

		if (typeof callback == 'function') callback(false, releaseGroup);
	});
};

mb.lookupRecording = function (mbid, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('recording', mbid, linkedEntities, function (err, data) {
		if (err) {
			callback(err, data);
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
				}
			}
		}

		recording.readData(linkedEntities, data);

		recording._loaded = true;

		if (typeof callback == 'function') callback(false, recording);
	});
};

mb.lookupArtist = function (mbid, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('artist', mbid, linkedEntities, function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		data = data.artist;

		var artist = new Artist(data['@'].id);
		artist.setProperty('type', data['@'].type);
		artist.setProperty('name', data.name);
		artist.setProperty('sortName', data['sort-name']);
		artist.setProperty('country', data.country);
		artist.setProperty('gender', data.gender);
		if (typeof data['life-span'] !== 'undefined') {
			artist.setProperty('lifeSpan', {
				'begin' : data['life-span'].begin,
				'end' : data['life-span'].end
			});
		}

		artist.readData(linkedEntities, data);

		artist._loaded = true;

		if (typeof callback == 'function') callback(false, artist);
	});
};

mb.lookupLabel = function (mbid, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('label', mbid, linkedEntities, function (err, data) {
		if (err) {
			callback(err, data);
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
			label.setProperty('lifeSpan', {
				'begin' : data['life-span'].begin,
				'end' : data['life-span'].end
			});
		}

		label.readData(linkedEntities, data);

		label._loaded = true;

		if (typeof callback == 'function') callback(false, label);
	});
};

mb.lookupWork = function (mbid, linkedEntities, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	if ( !linkedEntities ) linkedEntities = [];

	mb.lookup('work', mbid, linkedEntities, function (err, data) {
		if (err) {
			callback(err, data);
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


mb.searchReleases = function (query, filter, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	mb.search('release', query, filter, force, function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		var releases = [];

		if ('release-list' in data && 'release' in data['release-list'] && !Array.isArray(data['release-list'].release)) {
			data['release-list'].release = [data['release-list'].release];
		}

		if ('release-list' in data && 'release' in data['release-list'] && data['release-list']['release'].length > 0) {
			data = data['release-list']['release'];

			for(var i=0; i < data.length; i++){

				var release = new Release(data[i]['@'].id);
				release.setProperty('title', data[i].title);
				release.setProperty('status', data[i].status);
				release.setProperty('packaging', data[i].packaging);
				release.setProperty('quality', data[i].quality);
				if (typeof data[i]['text-representation'] !== 'undefined') {
					release.setProperty('language', data[i]['text-representation'].language);
					release.setProperty('script', data[i]['text-representation'].script);
				}
				release.setProperty('date', data[i].date);
				release.setProperty('country', data[i].country);
				release.setProperty('barcode', data[i].barcode);
				release.setProperty('asin', data[i].asin);

				//release.readData(linkedEntities, data);

				release._loaded = true;

				releases.push(release);
			}
		}

		if (typeof callback == 'function') callback(false, releases);
	});

};


mb.searchReleaseGroups = function (query, filter, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	mb.search('release-group', query, filter, force, function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		var releaseGroups = [];

		if ('release-group-list' in data && 'release-group' in data['release-group-list'] && !Array.isArray(data['release-group-list']['release-group'])) {
			data['release-group-list']['release-group'] = [data['release-group-list']['release-group']];
		}

		if ('release-group-list' in data && 'release-group' in data['release-group-list'] && data['release-group-list']['release-group'].length > 0) {
			data = data['release-group-list']['release-group'];

			for(var i=0; i < data.length; i++){
				var releaseGroup = new ReleaseGroup(data[i]['@'].id);
				releaseGroup.setProperty('type', data[i]['@'].type);
				releaseGroup.setProperty('title', data[i].title);
				releaseGroup.setProperty('firstReleaseDate', data[i]['first-release-date']);
				releaseGroup.setProperty('primaryType', data[i]['primary-type']);

				if (typeof data[i]['secondary-type-list'] !== 'undefined') {
					if (typeof data[i]['secondary-type-list']['secondary-type'] !== 'undefined') {
						var secondaryTypes = data[i]['secondary-type-list']['secondary-type'];
						if (!Array.isArray(secondaryTypes)) secondaryTypes = [secondaryTypes];

						releaseGroup.setProperty('secondaryTypes', secondaryTypes);
					}
				}

				releaseGroup.readData(['artists', 'releases'], data[i]);

				releaseGroup.searchScore = parseInt(data[i]['@']['ext:score'], 10);

				releaseGroups.push(releaseGroup);
			}
		}

		if (typeof callback == 'function') callback(false, releaseGroups);
	});

};

mb.searchRecordings = function (query, filter, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	mb.search('recording', query, filter, function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}


		var recordings = [];

		if ('recording-list' in data && 'recording' in data['recording-list'] && !Array.isArray(data['recording-list'].recording)) {
			data['recording-list'].recording = [data['recording-list'].recording];
		}

		if ('recording-list' in data && 'recording' in data['recording-list'] && data['recording-list']['recording'].length > 0) {
			data = data['recording-list']['recording'];

			for(var i = 0; i < data.length; i++){

				var recording = new Recording(data[i]['@'].id);
				recording.setProperty('title', data[i].title);
				recording.setProperty('length', data[i].length);

				if (typeof data[i]['relation-list'] !== 'undefined') {
					var relationList = data[i]['relation-list'];
					if (typeof relationList.length === 'undefined') relationList = [relationList];

					for (var ii = 0; ii < relationList.length; ii++) {
						switch (relationList[ii]['@']['target-type']) {
							case 'artist': {
								var relations = relationList[ii].relation;
								if (typeof relations.length === 'undefined') relations = [relations];

								for (var iii = 0; iii < relations.length; iii++) {
									var artist = new Artist(relations[iii].artist['@'].id);
									artist.setProperty('name', relations[iii].artist.name);
									artist.setProperty('sortName', relations[iii].artist['sort-name']);

									recording[relations[iii]['@'].type] = artist;
								}
								break;
							}
						}
					}
				}

				//recording.readData(linkedEntities, data);
				recording._loaded = true;
				recordings.push(recording);
			}
		}

		if (typeof callback == 'function') callback(false, recordings);
	});
};

mb.searchArtists = function (query, filter, force, callback) {
	if (typeof callback === 'undefined') {
		callback = force;
		force = false;
	}

	mb.search('artist', query, filter, function (err, data) {
		if (err) {
			callback(err, data);
			return;
		}

		var artists = [];

		if ('artist-list' in data && 'artist' in data['artist-list'] && !Array.isArray(data['artist-list'].artist)) {
			data['artist-list'].artist = [data['artist-list'].artist];
		}

		if ('artist-list' in data && 'artist' in data['artist-list'] && data['artist-list']['artist'].length > 0) {
			var artistList = data['artist-list']['artist'];

			for(var i=0; i < artistList.length; i++){

				var artist = new Artist(artistList[i]['@'].id);
				artist.setProperty('type', artistList[i]['@'].type);
				artist.setProperty('name', artistList[i].name);
				artist.setProperty('sortName', artistList[i]['sort-name']);
				artist.setProperty('country', artistList[i].country);
				if (typeof artistList[i]['life-span'] !== 'undefined') {
					artist.setProperty('lifeSpan', {
						'begin' : artistList[i]['life-span'].begin,
						'end' : artistList[i]['life-span'].end
					});
				}

				if (typeof artistList[i]['alias-list'] !== 'undefined') {
					var aliasList = artistList[i]['alias-list'].alias;
					var aliases = [];
					for (var j = 0 ; j < aliasList.length; j++) {
						aliases.push(aliasList[j]["#"]);
					}
					artist.setProperty('aliases', aliases);
				}

				//artist.readData(linkedEntities, data);
				artist._loaded = true;
				artists.push(artist);
			}
		}

		if (typeof callback == 'function') callback(false, artists);
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
