#!/usr/bin/env node

var fs = require('fs');
var outfile = "result.txt";
var out = "";
var nums = new Array();

for (var i = 2; i <= 600; i++) {
	var isPrime = 0;
	for(var j = i-1; j > 1; j--){
		if(i%j === 0){
			isPrime = 1;

		}
	}
	if(isPrime == 0){
		nums.push(i);
		//out = out + i + ",";
	}
}

for (var i = 0; i < 99; i++) {
	out = out + nums[i] + ",";
}

fs.writeFileSync(outfile,out);
console.log("Script: " + __filename + "\nWrote: " + out + "To: " + outfile);