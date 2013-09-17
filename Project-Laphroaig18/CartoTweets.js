var twitter = require('mtwitter');
var CartoDB = require('cartodb');


var client = new CartoDB({user: '',api_key: ''});

var twit = new twitter({consumer_key: '',
  consumer_secret: '',
  access_token_key: '',
  access_token_secret: ''});

client.on('connect', function() {
    console.log("connected");

    // template can be used
    client.query("SELECT * FROM places", function(err, data){
        var rows = data.rows;
        var  tweets;
        //console.log(rows);
        for (var i = 0; i<rows.length; i++){
            //console.log(rows[i]);
            var currRow = rows[i];
            twit.get('search/tweets',{q: currRow.placename}, function(err, item){
                //var tweets = item.statuses;
                var tweets = item.statuses;

                for (var j = 0; j<tweets.length; j++){
                    //console.log(tweets[j].text);
                    //console.log('lon'+rows[i].lon);
                    var currentTweet=tweets[j];
                    var TweetText = currentTweet.text;
                    console.log(currRow.placename);
                    var sqlCommand = "INSERT INTO posts (the_geom, lat, lon, placename, state, post_text, tweetid) VALUES(null, {lat}, {lon}, {placename}, {state}, {text}, {tweetid})";
                    var jsonvars = {lat: currRow.lat, lon: currRow.lon, placename: currRow.placename, state: currRow.state, text: currentTweet.text, tweetid: currentTweet.id};
                    client.query(sqlCommand, jsonvars , function(err,data){
                        console.log(currentTweet.text+ '|'+ TweetText + '|'+ err);
                    })
                }

            })


                
        }
    })

        


    // JSON parsed data or error messages are returned

    // chained calls are allowed
    //.query("INSERT INTO places VALUES(1,", function(err, data){});
});


var output = require('fs').createWriteStream('errors111.txt');
client.pipe(output);

client.connect();
