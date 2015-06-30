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
var retake = opts.retake || false;  //retake the screenshot if it doesn't exist
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
function screenshot_save_location(view, urlObj, destination) {
	//console.log(view.getCurrentUrl()); 
	var fileName = view.getCurrentUrl().replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
//	console.log(urlObj.url); 
	//var fileName = urlObj.url.replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
	return destination + '/' + encodeURIComponent(fileName) + ".png";
}
/////////////////////////////////////////////////////////////

// Screenshot capturing function
function screenshot(view, location, width, height, urlObj) {
	view.evaluate(function() {
    	document.body.bgColor = 'white';
	});

	// Making the page background white instead of transparent
	view.evaluate(function() {
	  var style = document.createElement('style'),
	      text = document.createTextNode('body { background: #fff }');
	  style.setAttribute('type', 'text/css');
	  style.appendChild(text);
	  document.head.insertBefore(style, document.head.firstChild);
	});

	/*casper.thenOpen(urlObj.url, function() {
	    this.capture(location, undefined, {
	    	format: 'jpg', 
	    	quality: 60
	    });
	});*/
	// Capture
	
	view.viewport(width, height, function() {
		view.capture(location , undefined, {
			format: 'png',
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
							casper.open(urlObj.url);
							var save_location = screenshot_save_location(view, urlObj, folderName);
							var save_location_file_exists = false; 
							//console.log(save_location);
							if(ignore.indexOf(casper.status().currentHTTPStatus) == -1 ){
								// check if file exists
								if(fs.exists(save_location)) {
									save_location_file_exists = true; 
								}

								// on blacklist - skip screenshot 
								if (Blacklist.patternMatch(urlObj.url, Blacklist.blacklistArr)) {	
									urlObj.screenshot = "[not taken]"; 
								} 
								else if (Blacklist.bigFileUrl.test(urlObj.url)) {
									// don't screenshot pdf because it won't be correct 
								}
								// do not retake 
								else if(!retake && save_location_file_exists) {
									if(verbose) { console.log(" -- Skipshot " + save_location); } 
									urlObj.screenshot = save_location; 
								}
								// retake or take 
								else {
									var url_location = screenshot(view, save_location, width, height, urlObj);
									urlObj.screenshot = url_location;
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
		if(results.skippedUrls) fs.write(folderName + '/skippedUrls.json', JSON.stringify(results.skippedUrls), 'w');
	} else {
		fs.write(folderName + '/visitedUrls.tsv', csv.stringify(results.visitedUrls), 'w');
		if(results.pendingUrls) fs.write(folderName + '/pendingUrls.tsv', csv.stringify(results.pendingUrls), 'w');
		if(results.skippedUrls) fs.write(folderName + '/skippedUrls.tsv', csv.stringify(results.skippedUrls), 'w');
	}
});
//console.log("End");
casper.run();