var casper = require('casper').create({/* verbose: true, logLevel: 'debug' */});
var casper2 = require('casper').create({/* verbose: true, logLevel: 'debug' */});
var Spider = require('./spider');
var csv = require('./csv');
var fs = require('fs');
var Blacklist = require('./blacklist'); 


// Handling CLI paramters and options
var args = casper.cli.args;
var opts = casper.cli.options;


var startUrl = String(args.slice(-1));
var limitingRegex = opts.regex;
if(limitingRegex) limitingRegex = new RegExp(limitingRegex);
var cap = opts.cap || false;
var folderName = opts.folder;

var width = opts.width || 1024;
var height = opts.height || 768;
var resultFormat = opts.format || 'tsv';
var startTime = new Date().getTime();
var verbose = opts.verbosity || opts.verbose;
var node = opts.node || false;
opts.ignore = opts.ignore || "";
var ignore = opts.ignore.toString().split(',');
var external = opts.external || false;
var verify = opts.verify || false;
for (var i = 0; i < ignore.length; i++) {
	ignore[i] = parseInt(ignore[i]);
};

//////////////////////////////////// New Variables
//var blacklist = /neopets/; 
var retake = opts.retake || false;  //retake the screenshot if it doesn't exist
var incSkipped = opts.incSkipped || false; // include skipped urls in visitedUrls
/////////////////////////////////////

var startNode;
//Parse out the node number if node = true
if(node == true){
	var tempArray = startUrl.split('/');
	startNode = tempArray[tempArray.length - 1];
	tempArray.splice(tempArray.length - 1, 1);
	startUrl = tempArray.join('/');
}

///////////////////////////////////////////////////////////// 
function screenshot_save_location(view, destination) {
	var fileName = view.getCurrentUrl().replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
	return destination + '/' + encodeURIComponent(fileName) + ".jpg";
}
/////////////////////////////////////////////////////////////

// ****************************************************** //
// Screenshot capturing function
function screenshot(view, location, width, height) {
	/*var fileName = view.getCurrentUrl().replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
	var location = destination + '/' + encodeURIComponent(fileName) + ".jpg";*/
	
	// Making the page background white instead of transparent
	view.evaluate(function() {
	  var style = document.createElement('style'),
	      text = document.createTextNode('body { background: #fff }');
	  style.setAttribute('type', 'text/css');
	  style.appendChild(text);
	  document.head.insertBefore(style, document.head.firstChild);
	});

	// Capture
	view.viewport(width, height, function() {
		view.capture(location , undefined, {
			format: 'jpg',
			quality: 60
		});
	});
	return location;
}

// Get hostname of first url
casper.start(startUrl, function() {
	phantom.injectJs('pdiffy.js'); 
	host = this.getGlobal('location').host;
	folderName = folderName || host + ' - ' + String(startTime);
	if(verbose) {
		casper.echo("Host: " + host);
		casper.echo("folderName: " + folderName);
	}
});
var results = {};
casper.then(function(){
	results = Spider.spider(startUrl,  
					limitingRegex || host,
					[
						function(view, urlObj) {
							if(ignore.indexOf(casper.status().currentHTTPStatus) == -1 ){
								console.log("\n");
								if(Blacklist.patternMatch(url, Blacklist.blacklistArr)) {	// skips screenshot capture 
									urlObj.screenshot = "[not taken]"; 
								} else {	

									// check if file exists 
									//// josephs code 
									var save_location = screenshot_save_location(view, folderName);
									//console.log("> save_location = " + save_location); 
									var save_location_file_exists = false;
									if(fs.exists(save_location)) {
										console.log("! " + save_location + " already exists!!");
										save_location_file_exists = true; 
									}
									// if I want to retake or I don't want to retake and the file does nto exist, take the screeshot
									if (retake || (!retake && !save_location_file_exists)) {
										console.log("screenshot taken"); 
									    var url_location = screenshot(view, save_location, width, height);
									    urlObj.screenshot = url_location;	
									} 
									else {
										urlObj.screenshot = save_location; 
									}
									//// end j code 


										/*var loc = screenshot(view, folderName, width, height);
										urlObj.screenshot = loc;*/
									
								}
							}
					  	}
					]
					);
});


casper.then(function() {
	casper.echo("Crawled " + results.count + " links, taking "
		+ results.elapsedTime/1000 + " seconds. (~"
			+ results.count/(results.elapsedTime/1000) + " seconds per link)");
	
	// Outputting results
	if(resultFormat == 'json') {
		fs.write(folderName + '/visitedUrls.json', JSON.stringify(results.visitedUrls), 'w');
		if(results.pendingUrls) fs.write(folderName + '/pendingUrls.json', JSON.stringify(results.pendingUrls), 'w');
	} else {
		fs.write(folderName + '/visitedUrls.tsv', csv.stringify(results.visitedUrls), 'w');
		if(results.pendingUrls) fs.write(folderName + '/pendingUrls.tsv', csv.stringify(results.pendingUrls), 'w');
	}
});

casper.run();