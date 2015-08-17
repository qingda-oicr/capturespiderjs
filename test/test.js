/* 
	Sample casperjs testing file 
*/ 
console.log("Testing..."); 
console.log("\n===================================="); 

var casper = require('casper').create();

//////////////////////////////////////////////////////////////////////
//array of patterns to match 
/*var blacklist = new Array(); 
blacklist.push(/neopets/i); 
blacklist.push(/something/i); 
*/
var blacklist = new Array (
	/neopets/i, 
	/something/i 
);

// onBlacklist: String Array -> Boolean 
// returns true if the url contains a pattern in patternArr
function patternMatch(url, patternArr) {
	console.log("\n--- patternMatching");
	// for each patternArr, test if it is in url  
	for (i = 0; i < blacklist.length; i++) {
		if(blacklist[i].test(url)) {
			console.log("  $$" + blacklist[i] + "$$" + " is in " + url);
		} else {
			console.log("  $$" + blacklist[i] + "$$" + " is not in " + url);
		}
	}

	console.log(('http://www.sanzoid.com').replace(/^http(s)?:\/\//, '')); 
	console.log(('https://www.sanzoid.com').replace(/^http(s)?:\/\//, '')); 
	console.log(('ahttps://www.sanzoid.com').replace(/^http(s)?:\/\//, '')); 
}

patternMatch('http://www.sanzoid.com/neopets.php', blacklist); 
patternMatch('http://www.sanzoid.com/nepets.php', blacklist); 
patternMatch('http://www.sanzoid.com/something.php', blacklist); 




///////////////////////////////////////////////////////////////////////
// regex testing 
/*
var text = 'http://sanzoid.com/images/neopets/grapechia.png'; 
var pattern = /images\/neopets/; 	// regex must have slashes: /{regex}/ 

if( pattern.test(text) ) {
	console.log("DINGDINGDING!!! " + pattern + " is in " + text); 
} else {
	console.log("ANGGGNNAGNNHHGG!!" + pattern + " is not in " + text);
}

var text2 = 'http://sanzoid.com/images/neets/grapechia.png'; 
var pattern2 = /images\/neopets/;

if( pattern2.test(text2) ) {
	console.log("DINGDINGDING!!! " + pattern + " is in " + text); 
} else {
	console.log("ANGGGNNAGNNHHGG!!" + pattern + " is not in " + text);
}
*/
////////////////////////////////////////////////////////////////////////
// This uses testing module, for testing purposes only. 
// Requires 
// phantom.casperTest = true; 
// at the top of file 
// casper.test.assertMatch('Chuck Norris', /^chuck/i, 'Chuck Norris\' first name is Chuck');
/////////////////////////////////////////////////////////////////////////////

//////////////////////////////////////////////////////////////
// example casperjs code
/*console.log("\n===================================="); 
casper.start('http://casperjs.org/', function() {
    this.echo(this.getTitle());
});



casper.thenOpen('http://phantomjs.org', function() {
    this.echo(this.getTitle());
});
*/
//////////////////////////////////////////////////////////////

/////////////////////// login code //////////////////////////////////////////////
var url= 'http://facitdev.res.oicr.on.ca/dashboard/';

casper.start(url, function() {
	console.log('///////////////////////////////////////');
   // search for 'casperjs' from google form
   console.log("page loaded");
   //this.test.assertExists('#user-login-form', 'form is found');
   this.fill('form#user-login-form', { 
        name: 'joseph', 
        pass:  'Password123'
    }, true);
   console.log("login success");
});

casper.then(function() {
	this.evaluate(function () {
		$('form#user-login-form').submit(); 
	});
});

casper.then(function() {
	this.echo(this.getTitle());
});

/////////////////////// login code end //////////////////////////////////////////////

casper.run();
