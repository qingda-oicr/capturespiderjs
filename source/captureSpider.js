var casper = require('casper').create({/* verbose: true, logLevel: 'debug' */});
var casper2 = require('casper').create({/* verbose: true, logLevel: 'debug' */});
var Spider = require('./spider');
var csv = require('./csv');
var fs = require('fs');


// Handling CLI paramters and options
var args = casper.cli.args;
var opts = casper.cli.options;


var startUrl = String(args.slice(-1));
var limitingRegex = opts.regex;
if(limitingRegex) limitingRegex = new RegExp(limitingRegex);
var cap = opts.cap || false;
var folderName = opts.folder;
var retake = opts.retake;  //retake the screenshot if it doesn't exist
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

var startNode;
//Parse out the node number if node = true
if(node == true){
	var tempArray = startUrl.split('/');
	startNode = tempArray[tempArray.length - 1];
	tempArray.splice(tempArray.length - 1, 1);
	startUrl = tempArray.join('/');
}
// ****************************************************** //
// Screenshot capturing function
function screenshot_save_location(view, destination) {
	var fileName = view.getCurrentUrl().replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
	return destination + '/' + encodeURIComponent(fileName) + ".jpg";
}
function screenshot(view, location, width, height) {

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
							if(ignore.indexOf(casper.status().currentHTTPStatus) == -1){
								var save_location = screenshot_save_location(view, folderName);
								var save_location_file_exists = false;
								if (retake || (!retake && !save_location_file_exists)) {
								    var url_location = screenshot(view, save_location, width, height);
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
	} else {
		fs.write(folderName + '/visitedUrls.tsv', csv.stringify(results.visitedUrls), 'w');
		if(results.pendingUrls) fs.write(folderName + '/pendingUrls.tsv', csv.stringify(results.pendingUrls), 'w');
	}
});

casper.run();