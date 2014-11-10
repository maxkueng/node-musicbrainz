"use strict";

var expect = require('chai').expect,
    mb = require('../lib/musicbrainz'),

	Release = mb.Release,
	ReleaseGroup = mb.ReleaseGroup,
	Recording = mb.Recording,
	Artist = mb.Artist,
	Label = mb.Label,
	Work = mb.Work,
	Disc = mb.Disc;


var testReleaseMbid = '1d9f2d0e-f81d-4ee9-90b4-d2fa8c1f13f0',
	testReleaseGroupMbid = 'eda96b07-480c-3c97-9223-1ead72289dd2',
	testRecordingMbid = '066c13ca-e62b-4b49-ba4e-290e23723e0e',
	testArtistMbid = '11ae9fbb-f3d7-4a47-936f-4c0a04d3b3b5',
	testLabelMbid = '46f0f4cd-8aab-4b33-b698-f459faf64190',
	testWorkMbid = '15d89e06-c8b4-3170-8258-570f0b811273',
	testDiscId = '5RCTaO1Vd7Lv4pwVqo6kk7UVGzs-';

var testBadReleaseMbid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	testBadReleaseGroupMbid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	testBadRecordingMbid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	testBadArtistMbid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	testBadLabelMbid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	testBadWorkMbid = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
	testBadDiscId = 'discIddiscIddiscId';

var testReleaseQuery = 'Elephant',
    testReleaseSpecialCharsQuery = 'I\'m Not a Fan...But the Kids Like It!',
	testReleaseGroupQuery = '',
	testRecordingQuery = 'Fell In Love With A Girl',
	testArtistQuery = 'The White Stripes',
	testLabelQuery = 'Warp',
	testWorkQuery = 'XX';

var testBadReleaseQuery = 'Uyguyg uiygu ygui',
	testBadReleaseGroupQuery = 'Ugb uhbu yvgg uyv',
	testBadRecordingQuery = '0976087078',
	testBadArtistQuery = 'OIouiyhi ughiug',
	testBadLabelQuery = 'OIjhkopk p;ko',
	testBadWorkQuery = 'OIjhiouhguhuh uh u';


describe('mb', function() {

	describe('#configure', function () {
		it('shouldn\'t crash', function (done) {
			mb.configure({
				baseURI: 'http://musicbrainz.org/ws/2/',
				rateLimit: {
					requests: 2,
					interval: 2000
				}
			});

			done();
		});
	});
    
	describe('#lookupRelease()', function(){
		it('should find an release by MBID', function (done) {
			mb.lookupRelease(testReleaseMbid, null, function (err, release) {
				if (err) { throw err; }
				
				expect(release).to.be.an.instanceof(Release);
				expect(release).to.have.property('id').that.equals(testReleaseMbid);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupRelease(testBadReleaseMbid, null, function (err, release) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when MBID is not present', function (done) {
			mb.lookupRelease( '', [], function(err, release){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});
	});

	describe('#lookupReleaseGroup()', function(){
		it('should find an release group by MBID', function (done) {
			mb.lookupReleaseGroup(testReleaseGroupMbid, null, function (err, releaseGroup) {
				if (err) { throw err; }
				
				expect(releaseGroup).to.be.an.instanceof(ReleaseGroup);
				expect(releaseGroup).to.have.property('id').that.equals(testReleaseGroupMbid);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupReleaseGroup(testBadReleaseMbid, null, function (err, releaseGroup) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when MBID is not present', function (done) {
			mb.lookupReleaseGroup( '', [], function(err, releaseGroup){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

	});


	describe('#lookupRecording()', function(){
		it('should find an recording by MBID', function (done) {
			mb.lookupRecording(testRecordingMbid, null, function (err, recording) {
				if (err) { throw err; }
				
				expect(recording).to.be.an.instanceof(Recording);
				expect(recording).to.have.property('id').that.equals(testRecordingMbid);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupRecording(testBadReleaseMbid, null, function (err, recording) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when MBID is not present', function (done) {
			mb.lookupRecording( '', [], function(err, recording){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

	});

	describe('#lookupArtist()', function(){
		it('should find an artist by MBID', function (done) {
			mb.lookupArtist(testArtistMbid, null, function (err, artist) {
				if (err) { throw err; }
				
				expect(artist).to.be.an.instanceof(Artist);
				expect(artist).to.have.property('id').that.equals(testArtistMbid);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupArtist(testBadArtistMbid, null, function (err, artist) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when MBID is not present', function (done) {
			mb.lookupArtist( '', [], function(err, artist){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it ('should include aliases when requested and present', function(done) {
			mb.lookupArtist('1bc41dff-5397-4c53-bb50-469d2c277197', ['aliases'], function(err, artist) {
				if (err) { throw err; }

				expect(artist.aliases).to.have.length.above(0);
				done();
			});
		});
	});

	describe('#lookupLabel()', function(){

		it('should find a label by MBID', function (done) {
			mb.lookupLabel(testLabelMbid, null, function (err, label) {
				if (err) { throw err; }
				
				expect(label).to.be.an.instanceof(Label);
				expect(label).to.have.property('id').that.equals(testLabelMbid);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupLabel(testBadLabelMbid, null, function (err, label) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when MBID is not present', function (done) {
			mb.lookupLabel( '', [], function(err, label){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

	});

	describe('#lookupWork()', function(){

		it('should find a work by MBID', function (done) {
			mb.lookupWork(testWorkMbid, null, function (err, work) {
				if (err) { throw err; }
				
				expect(work).to.be.an.instanceof(Work);
				expect(work).to.have.property('id').that.equals(testWorkMbid);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupWork(testBadWorkMbid, null, function (err, work) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when mbid is not present', function (done) {
			mb.lookupWork( '', [], function(err, work){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

	});

	describe('#lookupDiscId()', function(){
		it('should find a disc its DiscId', function (done) {
			mb.lookupDiscId(testDiscId, null, function (err, disc) {
				if (err) { throw err; }
				
				expect(disc).to.be.an.instanceof(Disc);
				expect(disc).to.have.property('id').that.equals(testDiscId);
				done();
			});
		});

		it('should return an error with a bad MBID', function (done) {
			mb.lookupDiscId(testBadDiscId, null, function (err, disc) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an error when mbid is not present', function (done) {
			mb.lookupDiscId( '', [], function(err, disc){
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

	});

	describe('#searchReleases()', function(){
		it('should return an array of releases from a valid query', function (done) {
			mb.searchReleases( testReleaseQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				if (result.length) {
					expect(result[0]).to.be.instanceof(Release);
				}
				done();
			});
		});

		it('should return an empty array from a bad query', function (done) {
			mb.searchReleases( testBadReleaseQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);
				expect(result).to.be.empty;
				done();
			});
		});

		it('should return an error when query is empty', function (done) {
			mb.searchReleases( '', {}, function (err, result) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return an array of a single release from a valid query with 1 result', function(done) {
			mb.searchReleases( "\"From Parts Unknown\"", {
				reid: "7b396f47-71e4-4624-b1e4-92f125b720a1",
			}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				expect(result.length).to.be.eql(1);
				expect(result[0]).to.be.instanceof(Release);
				done();
			});
		});


        it('should return a release even with special characters in the name', function(done) {
            mb.searchReleases( testReleaseSpecialCharsQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);
				expect(result[0]).to.be.instanceof(Release);

                done();
            });
        });

	});

	describe('#searchReleaseGroups()', function(){
		it('should return an array of release groups from a valid query', function (done) {
			mb.searchReleaseGroups( '"I Shall Exterminate Everything Around Me That Restricts Me From Being the Master"', {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				if (result.length) {
					expect(result[0]).to.be.instanceof(ReleaseGroup);
				}
				done();
			});
		});

		it('should return an empty array from a bad query', function (done) {
			mb.searchReleaseGroups( testBadReleaseQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);
				expect(result).to.be.empty;
				done();
			});
		});

		it('should return an error when query is empty', function (done) {
			mb.searchReleaseGroups( '', {}, function (err, result) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it('should return a release even with special characters in the name', function(done) {
			mb.searchReleaseGroups( '"Ænima"', {}, function (err, result) {
			if (err) { throw err; }
				expect(result).to.be.instanceof(Array);
				expect(result[0]).to.be.instanceof(ReleaseGroup);
				done();
      });
    });

	});

	describe('#searchRecordings()', function(){
		it('should return an array of recordings from a valid query', function (done) {
			mb.searchRecordings( testRecordingQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				if (result.length) {
					expect(result[0]).to.be.instanceof(Recording);
				}
				done();
			});
		});

		it('should return an empty array from a bad query', function (done) {
			mb.searchRecordings( testBadRecordingQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);
				expect(result).to.be.empty;
				done();
			});
		});

		it('should return an array of a single recording from a valid query with 1 result', function(done) {
			mb.searchRecordings( "\"Heart On\"", {
				reid: "0bfb1ff1-a34f-4224-8e90-674aaaa8ad6a",
			}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				expect(result.length).to.be.eql(1);
				expect(result[0]).to.be.instanceof(Recording);
				done();
			});
		});

		it('should return an error when query is empty', function (done) {
			mb.searchRecordings( '', {}, function (err, result) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

	});


	describe('#searchArtists()', function(){
		it('should return an array of artists from a valid query', function (done) {
			mb.searchArtists( testArtistQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				if (result.length) {
					expect(result[0]).to.be.instanceof(Artist);
				}
				done();
			});
		});

		it('should return an array of a single artist from a valid query with 1 result', function(done) {
			mb.searchArtists( "\"Eagles of Death Metal\"", {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);

				expect(result.length).to.be.eql(1);
				expect(result[0]).to.be.instanceof(Artist);
				done();
			});
		});

		it('should return an empty array from a bad query', function (done) {
			mb.searchArtists( testBadArtistQuery, {}, function (err, result) {
				if (err) { throw err; }
				expect(result).to.be.instanceof(Array);
				expect(result).to.be.empty;
				done();
			});
		});

		it('should return an error when query is empty', function (done) {
			mb.searchArtists( '', {}, function (err, result) {
				expect(err).to.be.an.instanceof(Error);
				done();
			});
		});

		it ('should include aliases in results', function(done) {
			mb.searchArtists('"The Dillinger Escape Plan"', {}, function(err, result) {
				if (err) { throw err; }

				expect(result[0].aliases).to.have.length.above(0);
				done();
			});
		});

	});

});


//describe('Release', function(){ });
//describe('ReleaseGroup', function(){ });
//describe('Recording', function(){ });
//describe('Artist', function(){ });
//describe('Label', function(){ });
//describe('Work', function(){ });
//describe('Disc', function(){ });
