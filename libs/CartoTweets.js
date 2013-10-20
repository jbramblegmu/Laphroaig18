var twitter = require('mtwitter');
var CartoDB = require('cartodb');
var Async = require('async');
require('js-yaml');

try {
    var auth = require('../auth.yml');
} 
catch (e) {
    console.log(e);
    process.exit(1);
}

var client = new CartoDB({user: auth.user, api_key: auth.api_key});

var twit = new twitter({consumer_key: auth.consumer_key,
                        consumer_secret: auth.consumer_secret,
                        access_token_key: auth.access_token_key,
                        access_token_secret: auth.access_token_secret});

// via Paul d'Aoust http://stackoverflow.com/questions/7744912/making-a-javascript-string-sql-friendly
function sqlEscape(stringToEscape){
    return stringToEscape
        .replace("\\", "\\\\")
        .replace("\'", "\\\'")
        .replace("\"", "\\\"")
        .replace("%", "\\%")
        .replace("\n", "\\\n")
        .replace("\r", "\\\r")
        .replace("\x00", "\\\x00")
        .replace("\x1a", "\\\z")
        .replace("\x09", "\\\t")
        .replace("\0", "\\\0")
        .replace("\x08", "\\\b");
}

client.on('connect', function() {
    console.log("connected");

    Async.waterfall([
        // First: get all of the places
        function(next) {
            console.log("Querying for places...");

            client.query("select * from places", function(err, data) {
                next(err, data.rows);
            });
        },

        // Then: for each place, get an array of tweets from a Twitter search
        function(rows, next) {
            console.log("Searching for tweets...");

            // Returns an array of objects containing tweet text, tweet id, and place data
            function getTweetsByPlaceName(row, callback) {
                twit.get('search/tweets', {q: row.placename}, function(err, item) {                                         
                    if (err) {                    
                        console.log("Twitter read error: ", err);                    
                        process.exit(1);
                    }

                    function annotateTweet(tweet) {
                        return {lat: row.lat,
                        lon: row.lon,
                        placename: "'"+row.placename+"'",
                        state: "'"+row.state+"'",
                        text: "'"+sqlEscape(tweet.text)+"'",
                        id: tweet.id};
                    }

                    callback(null, item.statuses.map(annotateTweet));
                }); 
            } 

            function getTweetsByHash(row, callback) {
                var placeString = row.placename;
                var stringArray = placeString.split(" ");
                var newPlace = "";
                for(i = 0; i < stringArray.length; i++){
                    newPlace = newPlace.concat(stringArray[i]);
                }
                twit.get('search/tweets', {q: '#'.concat(newPlace)}, function(err, item) {  
                    if (err) {                    
                        console.log("Twitter hashtag search error: ", err);                    
                        process.exit(1);
                    }

                    function annotateTweet(tweet) {
                        return {lat: row.lat,
                        lon: row.lon,
                        placename: "'"+row.placename+"'",
                        state: "'"+row.state+"'",
                        text: "'"+sqlEscape(tweet.text)+"'",
                        id: tweet.id};
                    }

                    callback(null, item.statuses.map(annotateTweet));
                }); 
            }

            function getTweetsByGeo(row,callback){
                var latString = row.lat.toString();
                var lonString = row.lon.toString();
                twit.get('search/tweets', {geocode: latString + "," + lonString + ",1mi"}, function(err, item){
                    if (err) {
                        console.log("Twitter geo search error: ", err);
                        process.exit(1);
                    }

                    function annotateTweet(tweet){
                        if(tweet.coordinates != null){
                            return {lat: tweet.coordinates.coordinates[1],
                            lon: tweet.coordinates.coordinates[0],
                            placename: "'"+row.placename+"'",
                            state: "'"+row.state+"'",
                            text: "'"+sqlEscape(tweet.text)+"'",
                            id: tweet.id};
                        }

                        else{
                            return {lat: row.lat,
                            lon: row.lon,
                            placename: "'"+row.placename+"'",
                            state: "'"+row.state+"'",
                            text: "'"+sqlEscape(tweet.text)+"'",
                            id: tweet.id};
                        }       
                    }

                    callback(null,item.statuses.map(annotateTweet));
                });
             }

            // Call getTweets on each place, concatenating each set of tweets into a single array
            Async.concat(rows, getTweetsByPlaceName, function(err, tweets) {
                Async.concat(rows, getTweetsByHash, function(err, hashtweets){
                    Async.concat(rows, getTweetsByGeo, function(err, geotweets){
                        var allTweets = tweets.concat(hashtweets, geotweets);
                        next(err, allTweets);
                    });
                });
            });
        },



        // Finally: insert each tweet into the posts table
        function(allTweets, next) {
            console.log("Inserting tweets into CartoDB...");

            function insertTweet(tweet, callback) {                
                var sql = "insert into posts(the_geom, lat, lon, place_name, state, post_text, tweetid) " +
                                "values(null, {lat}, {lon}, {place}, {state}, {text}, {tweetId})";
                var args = {lat: tweet.lat,
                            lon: tweet.lon,
                            place: tweet.placename,
                            state: tweet.state,
                            text: tweet.text,
                            tweetId: tweet.id};

                console.log(args);

                client.query(sql, args, function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        console.log("CartoDB insert result: ", result);
                        callback(null);
                    }
                });                
            }

            Async.each(allTweets, insertTweet, function(err) {
                next(err, "Done!");
            });
        }
    ], function (err, result) {
           if (err) {
               console.log(err);
               process.exit(1);
           }
           else {
               console.log(result);
               process.exit(0);
            }
    });
});


var output = require('fs').createWriteStream('errors111.txt');
client.pipe(output);

client.connect();
