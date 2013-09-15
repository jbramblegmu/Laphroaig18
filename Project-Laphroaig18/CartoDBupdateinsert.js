#!/usr/bin/env node

var CartoDB = require('cartodb');
//var secret = require('./secret.js');

var client = new CartoDB({user: '',api_key: ''});

client.on('connect', function() {
    console.log("connected");

    //do not run with current values, change VALUES
    client.query("INSERT INTO places (the_geom, lat, lon, placename, state) VALUES(null,38.887176,-77.0950128,'Clarendon','Washington, D.C.')", function(err, data){})
    	

});
    

    // chained calls are allowed such as:
    //.query("INSERT INTO places VALUES(1,", function(err, data){});



var output = require('fs').createWriteStream('errors1.txt');
client.pipe(output);

client.connect();

