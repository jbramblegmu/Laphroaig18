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
function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
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
            function getTweets(row, callback) {
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
                                text: "'"+mysql_real_escape_string(tweet.text)+"'",
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
