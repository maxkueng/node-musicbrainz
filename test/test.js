var assert = require('assert')
    mb = require('../lib/musicbrainz');


var testReleaseMbid = '1d9f2d0e-f81d-4ee9-90b4-d2fa8c1f13f0',
    testReleaseGroupMbid = '',
    testRecordingMbid = '066c13ca-e62b-4b49-ba4e-290e23723e0e',
    testArtistMbid = '11ae9fbb-f3d7-4a47-936f-4c0a04d3b3b5',
    testWorkMbid = '15d89e06-c8b4-3170-8258-570f0b811273',
    testDiscMbid = '';

var testBadReleaseMbid = '',
    testBadReleaseGroupMbid = '',
    testBadRecordingMbid = '',
    testBadArtistMbid = '',
    testBadWorkMbid = '',
    testDiscMbid = '';

var testReleaseQuery = '',
    testReleaseGroupQuery = '',
    testRecordingQuery = '',
    testArtistQuery = 'The White Stripes',
    testWorkQuery = '',
    testDiscQuery = '';


describe('mb', function(){
    
    describe('#lookupRelease()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupRelease( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });
    });


    describe('#lookupReleaseGroup()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupReleaseGroup( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });

    });


    describe('#lookupRecording()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupRecording( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });

    });


    describe('#lookupArtist()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupArtist( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });

    });


    describe('#lookupLabel()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupLabel( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });

    });


    describe('#lookupWork()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupWork( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });

    });


    describe('#lookupDiscId()', function(){
        it('should return an error when mbid is not present', function(){
            mb.lookupDiscId( '', [], function(err, res){
                if(err) throw err;
                done();
            });
        });

    });
    

    describe('#searchReleases()', function(){
        it('should return an error when mbid is not present', function(){
            mb.searchReleases( '', {}, function(err, res){
                if(err) throw err;
                done();
            });
        });
        it('should return an array of releases from a valid query', function(){
            mb.searchArtists( testReleaseQuery, {}, function(err, res){
                if(err) throw err;
                ok(res instanceof Array);
            });
        });

    });


    describe('#searchRecordings()', function(){
        it('should return an error when mbid is not present', function(){
            mb.searchRecordings( '', {}, function(err, res){
                if(err) throw err;
                done();
            });
        });
        it('should return an array of recordings from a valid query', function(){
            mb.searchArtists( testRecordingQuery, {}, function(err, res){
                if(err) throw err;
                ok(res instanceof Array);
            });
        });

    });


    describe('#searchArtists()', function(){
        it('should return an error when mbid is not present', function(){
            mb.searchArtists( '', {}, function(err, res){
                if(err) throw err;
                done();
            });
        });
        it('should return an array of artists from a valid query', function(){
            mb.searchArtists( testArtistQuery, {}, function(err, res){
                if(err) throw err;
                ok(res instanceof Array);
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
