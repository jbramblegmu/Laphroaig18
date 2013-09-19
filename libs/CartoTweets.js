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

client.on('connect', function() {
    console.log("connected");

    Async.waterfall([
        // First: get all of the places
        function(next) {
            console.log("Querying for places...");

            client.query("SELECT * FROM places", function(err, data) {
                next(err, data.rows);
            });
        },

        // Then: for each place, get an array of tweets from a Twitter search
        function(rows, next) {
            // if (err) {
            //     console.log("CartoDB places read error: ", err);
            //     process.exit(1);
            // }

            console.log("Searching for tweets...");

            // Returns an array of objects containing tweet text, tweet id, and place data
            function getTweets(row, callback) {
                twit.get('search/tweets', {q: row.placename}, function(err, item) {  
                    if (err) {                    
                        console.log("Twitter read error: ", err);                    
                        process.exit(1);
                    }

                    function annotateTweet(tweet) {
                        return {lat: row.lat,
                                lon: row.lon,
                                placename: row.placename,
                                state: row.state,
                                text: tweet.text,
                                id: tweet.id};
                    }

                    callback(null, item.statuses.map(annotateTweet));
                }); 
            }   

            // Call getTweets on each place, concatenating each set of tweets into a single array
            Async.concat(rows, getTweets, function(err, tweets) {
                next(err, tweets);
            });
        },

        // Finally: insert each tweet into the posts table
        function(tweets, next) {
            // if (err) {
            //     console.log("Some error from Twitter read step: ", err);
            //     process.exit(1);
            // }

            console.log("Inserting tweets into CartoDB...");

            function insertTweet(tweet, callback) {
                var sql = "INSERT INTO posts(the_geom, lat, lon, placename, state, post_text, tweetid) VALUES(null, $1, $2, $3, $4, $5, $6, $7)";                    
                var values = [tweet.lat, tweet.lon, tweet.placename, tweet.state, tweet.text, tweet.id];

                console.log(values);

                client.query({text: sql, values: values}, function(err, result) {
                    if (err) {
                        callback(err);
                    }
                    else {
                        console.log("CartoDB insert result: ", result);
                        callback(null);
                    }
                });
            }

            Async.each(tweets, insertTweet, function(err) {
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
