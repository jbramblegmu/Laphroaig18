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
    	//console.log(rows);
    	for (var i = 0; i<rows.length; i++){
    		//console.log(rows[i]);
    		twit.get('search/tweets',{q: rows[i].placename}, function(err, item){
    			var tweets = item.statuses;
    			for (var j = 0; j<tweets.length; j++){
    				console.log(tweets[j].text);
                    //this should print allthe tweets returned. however the query below causes an error related to item.statuses?? I have to do HW and cant fix ATM. :(
    				//client.query("INSERT INTO posts (the_geom, lat, lon, placename, state, post_text, tweetid) VALUES(null, {lat}, {lon}, {placename}, {state}, {text}, {tweetid})", {lat: rows[i].lat, lon: rows[i].lon, placename: rows[i].placename, state: rows[i].state, text: tweets[j].text, tweetid: tweets[j].id}, function(err,data){})
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