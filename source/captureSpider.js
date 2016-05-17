var casper = require('casper').create({
    pageSettings: {
        webSecurityEnabled: false
    }
/* verbose: true, logLevel: 'debug' */});
var casper2 = require('casper').create({/* verbose: true, logLevel: 'debug' */});
var Spider = require('./spider');
var csv = require('./csv');
var fs = require('fs');
var Patterns = require('./patterns'); 

// Handling CLI paramters and options
var args = casper.cli.args;
var opts = casper.cli.options;

var username = opts.user || false;
var password; 

var auth = opts.auth || false;
var auth_password;

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
var parentPerLine = opts.parentPerLine || false; 
/////////////////////////////////////

var startNode;
//Parse out the node number if node = true
if(node == true){
	var tempArray = startUrl.split('/');
	startNode = tempArray[tempArray.length - 1];
	tempArray.splice(tempArray.length - 1, 1);
	startUrl = tempArray.join('/');
}

//////////////////////////////////////////////////////////////
//get user password if applicable
function getPassword() {
	var system = require('system');
	system.stdout.write('Password: ');
	var line = system.stdin.readLine();
	return line;
}
/////////////////////////////////////////////////////////////

///////////////////////////////////////////////////////////// 
function screenshot_save_location(view, urlObj, destination) {
	//console.log(view.getCurrentUrl()); 
	var fileName = view.getCurrentUrl().replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
	//console.log(urlObj.url); 
	//var fileName = urlObj.url.replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
	
	return destination + '/' + encodeURIComponent(fileName) + ".png";
}
/////////////////////////////////////////////////////////////



// Screenshot capturing function
function screenshot(view, location, width, height, urlObj) {
	//////////////// does not seem to work ///////////////////
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
	///////////////////////////////////////////////////////

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

// function downloadFile(downloadUrl, target){
// 	this.thenEvaluate(function(url) {
// 	    xhr = new XMLHttpRequest();
// 	    xhr.addEventListener('load', function onTransferComplete() {
// 	        // Set a flag when load completes, we'll keep checking it
// 	        transferComplete = true;
// 	    });
// 	    xhr.open('GET', url, true); /* < ASYNC */
// 	    xhr.responseType = 'arraybuffer';
// 	    xhr.send(null);
// 	}, downloadUrl);

// 	this.waitFor(function check() {
// 	    return this.evaluate(function() {
// 	        return transferComplete;
// 	    });
// 	}, function then() {
// 	    console.log('transferComplete!');
// 	    var base64encoded = this.evaluate(function() {
// 	        return btoa([].reduce.call(new Uint8Array(xhr.response), function(p, c) {
// 	            return p + String.fromCharCode(c);
// 	        }, ''));
// 	    });
// 	    /*clientutils = require('clientutils') */
// 	    /*fs = require('fs') */
// 	    var cu = clientutils.create(); 
// 	    fs.write(target, cu.decode(base64encoded), 'wb');
// 	});

// }

// Get hostname of first url
casper.start(startUrl, function() {
	phantom.injectJs('pdiffy.js'); 
	host = this.getGlobal('location').host;
	folderName = folderName || host + ' - ' + String(startTime);
	if(verbose) {
		casper.echo("Host: " + host);
		casper.echo("folderName: " + folderName);
	}
	if(username) {
		password = getPassword();
	}
	if(auth) {
		auth_password = getPassword();
		casper.setHttpAuth(auth, auth_password);
	}
});
var results = {};

casper.then(function(){
	results = Spider.spider(startUrl,  
					limitingRegex || host,
					[
						function(view, urlObj) {
							if(Patterns.patternMatch(url, Patterns.bigFileArr)) {
								casper.open(url, {
						    		method: 'head'
						        });
							} else {
								casper.open(url);
							}
							var save_location = screenshot_save_location(view, urlObj, folderName);
							var save_location_file_exists = false; 
							//console.log(save_location);
							if(ignore.indexOf(casper.status().currentHTTPStatus) == -1 ){
								// check if file exists
								if(fs.exists(save_location)) {
									save_location_file_exists = true; 
								}

								// on blacklist - skip screenshot 
								if (Patterns.patternMatch(urlObj.url, Patterns.blacklistArr)) {	
									urlObj.screenshot = "[not taken]"; 
								} 
								else if (Patterns.bigFileUrl.test(urlObj.url)) {
									// save documents to file
									// console.log(fileName);
									var fileName = urlObj.url.replace(/\/$/, '').replace(/^.*?:\/\//, '').replace(/^.*?\//, '');
									var destination = folderName + '/' + fileName;
									var fileTree = destination.substring(0, destination.indexOf('/') + 1);
									fs.makeTree(fileTree);
									// console.log(fileName);
									if(!fs.exists(destination)){
										casper.download(urlObj.url, destination);
									}
									urlObj.screenshot = "[saved as document]";

									// don't screenshot pdf because it won't be correct 
								}
								// do not retake 
								else if(!retake && save_location_file_exists) {
									if(verbose) { console.log(" -- Skipshot " + save_location); } 
									urlObj.screenshot = save_location; 
								}
								// retake or take 
								else {
									casper.download(urlObj.url, save_location + ".html");
									var url_location = screenshot(view, save_location, width, height, urlObj);
									urlObj.screenshot = url_location;
								}
							}
					  	}
					]
					);
});

// Alt Value testing
// casper.then(function(){
// 	var altUrls = results.altTextUrls;

// 	for(var i = 0; i < altUrls.length; i++){
// 		var altPageUrl = altUrls[i].url;
// 		var altPageImgs = altUrls[i].imgs;
// 		console.log("on Page: " + altPageUrl);
// 		for (var j = 0; j < altPageImgs.length; j++){
// 			console.log("        Alt: " + altPageImgs[j].alt + "  Img: " + altPageImgs[j].source);
// 		}
// 	}
// });


casper.then(function() {
	var elapsedTime = results.elapsedTime + " milliseconds"; 
	if(results.elapsedTime/1000/60 >= 1) {
		elapsedTime = results.elapsedTime/1000/60 + " minutes"; 
	} else {
		elapsedTime = results.elapsedTime/1000 + " seconds"; 
	}
	casper.echo("Crawled " + results.count + " links, taking "
		+ elapsedTime + ". (~"
			+ results.count/(results.elapsedTime/1000) + " seconds per link)");
	//console.log(csv.stringify(results.visitedUrls, parentPerLine));

	// Convert altTextUrls to better output format
	var altTextUrlsOut = [];

	for (var i = 0; i < results.altTextUrls.length; i++){
		for(var j = 0; j < results.altTextUrls[i].imgs.length; j++){
			var altTextUrlsOutItem = {
				url: "",
				img: "",
				alt: "",
			};
			altTextUrlsOutItem.url = results.altTextUrls[i].url;
			altTextUrlsOutItem.img = results.altTextUrls[i].imgs[j].source;

			if(results.altTextUrls[i].imgs[j].alt == undefined || results.altTextUrls[i].imgs[j].alt == ''){
				altTextUrlsOutItem.alt = "\<missing alt\>";
			}
			else{
				altTextUrlsOutItem.alt = results.altTextUrls[i].imgs[j].alt;
			}

			altTextUrlsOut.push(altTextUrlsOutItem);
		}
	}

	// Outputting results
	if(resultFormat == 'json') {
		fs.write(folderName + '/visitedUrls.json', JSON.stringify(results.visitedUrls, parentPerLine), 'w');
		fs.write(folderName + '/altTextUrls.json', JSON.stringify(altTextUrlsOut, parentPerLine), 'w');
		if(results.pendingUrls) fs.write(folderName + '/pendingUrls.json', JSON.stringify(results.pendingUrls), 'w');
		if(results.skippedUrls) fs.write(folderName + '/skippedUrls.json', JSON.stringify(results.skippedUrls), 'w');
	} else {
		fs.write(folderName + '/visitedUrls.tsv', csv.stringify(results.visitedUrls, parentPerLine), 'w');
		fs.write(folderName + '/altTextUrls.tsv', csv.stringify(altTextUrlsOut, parentPerLine), 'w');
		if(results.pendingUrls) fs.write(folderName + '/pendingUrls.tsv', csv.stringify(results.pendingUrls), 'w');
		if(results.skippedUrls) fs.write(folderName + '/skippedUrls.tsv', csv.stringify(results.skippedUrls), 'w');
	}
});
//console.log("End");
casper.run();