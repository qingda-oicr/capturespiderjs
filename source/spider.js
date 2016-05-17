var ignoreParameters = true;
var startTime = new Date().getTime();
// Create instances
var require = patchRequire(require);
var utils = require('utils');
var helpers = require('./helpers');
var googlePassed;
var domain;
var loggedIn = false;

// get domain
function getDomain(url) {
	var pos = 0;
	var ct = 0;
	for(var i = 0; i < url.length; i++) {
		if (url[i] == '/') ct++;
		if(ct == 3 && url[i] == '/') {
			pos2 = i;
			return url.substr(0, pos2);
		}
        if(i == (url.length)-1 && ct == 2) {
        	return url;
        }
    }  
}

//discovers soft 404's through a google search
function checkWithGoogle(url){

	if(Patterns.patternMatch(url, Patterns.bigFileArr)) {
		casper.thenOpen('https://www.google.ca/search?q=' + url + '&gws_rd=ssl', { method: 'head' }, function(){});
	} else {
		casper.thenOpen('https://www.google.ca/search?q=' + url + '&gws_rd=ssl',function(){});
 	}

	casper.then(function() {
    // Click on 1st result link
	    try {
	    	casper.click('h3.r a');
		}	
	// Accounts for the fact that some links may not have a google search result
		catch(err) {
			return false;
		}
	});

	// Captures screenshots and compares using pdiffy

	casper.then(function() {
		google_screenshot = 'data:image/png;base64,' + this.captureBase64('png');
	});

	if(Patterns.patternMatch(url, Patterns.bigFileArr)) {
		casper.thenOpen(url, { method:'head' }, function() {
			expected_screenshot = 'data:image/png;base64,' + this.captureBase64('png');
			pdiffy(google_screenshot).compareTo(expected_screenshot).onComplete(function(data){		
			results1 = data;
			});
	    });
	} else {
		casper.thenOpen(url, function() {
			expected_screenshot = 'data:image/png;base64,' + this.captureBase64('png');
			pdiffy(google_screenshot).compareTo(expected_screenshot).onComplete(function(data){		
			results1 = data;
			});
	    });
 	}

	// Wait for the async compareTo(...) to return and sets the return values
	casper.waitFor(function check() {
		return (results1!== undefined);
	}, function then() {
		if( results1.misMatchPercentage < 0.5 )
			googlePassed = true;
		else
			googlePassed = false;	
	});
	return googlePassed;
};

var visitedUrls = [];
var pendingUrls = [];
var skippedUrls = []; 
var count = 0; 
var altTextUrls = [];

// Spider from the given URL
// spider(Object urlObj, fn urlChecker(Str url)[, Nat cap, Arr (Object urlObj), Arr (Object urlObj))])
function spider(urlObj, urlChecker, tasks) {

	// get domain

	if(count == 0) {
		domain = getDomain(urlObj.url);
		console.log("Domain is", domain);
	}

	// Check if cap has been reached

	if(cap !== false && cap <= 0){ 
		return;
	}
	else if(cap > 0){
		cap--;
	}
	++count; 

	url = urlObj.url;
	//console.log("#### " + url);


/////////////////////////////////// skip if on blacklist 
if(Patterns.patternMatch(url, Patterns.blacklistArr)) {
	casper.then(function() {	// pretty message 
		var statusStyle = { fg: 'blue', bold: true }; 
		urlObj.status = "Skip"; 
		this.echo(count + '\t' + "|" + visitedUrls.length + "|" + pendingUrls.length + "|" + skippedUrls.length + "|\t" + this.colorizer.format(urlObj.status, statusStyle) + '\t ' + url);
		skippedUrls.push(urlObj);
	});
} else if(urlObj.url.indexOf(domain) == -1) {

    console.log("Skip non-domain link: ", urlObj.url); // skip non-domain links 

} else { 

	if(Patterns.patternMatch(url, Patterns.bigFileArr)) {
		casper.open(url, {
    		method: 'head' // send 'HEAD' requests for big files
        });
	} else {
		casper.open(url); // send 'GET' requests for normal links
 	}
		/////////////////////////////////////////////////////////////////////////////

	/////////////////////////////////// log in - ids and names will have to change 
	if(username && !loggedIn) {
		casper.then(function() {
			var formArr = ['form#user-login', 'form#loginform', 'form#login-form', 'form#user-login-form']; // add form names here
			for(var i = 0; i < formArr.length; i++) {
				if(this.exists(formArr[i])) {
					//console.log("filling form....");
					this.fill(formArr[i], { 
		              name: username, 	// name="name", different for every site
		              pass:  password	// name="pass", different for every site
			        }, true);
					//console.log("logged in");
					break;
				} 
			}
			loggedIn = true;
		}); 
    }
	////////////////////////////////// log in end 

	// if(Patterns.bigFileUrl.test(url)) {
	// 		urlObj.screenshot = "no image"; 
	// }

	// if(Patterns.fileUrl.test(url)) {
	// 	casper.waitForResource(/.*\.(png|jpeg|jpg|gif|pdf)$/, 
	// 	function() {
	// 		//this.echo(this.colorizer.format(url.match(fileUrl)[0] + ' has been fully loaded: ', { fg: 'orange' }));
	// 	}, 
	// 	function() {
	// 		this.echo(this.colorizer.format('File took too long to load: ', { fg: 'red' }));
	// 		urlObj.screenshot = "took too long to load"; 
	// 	}, 10000); // 10 seconds
	// }
	

	casper.eachThen(tasks, function(response) {
		//console.log("pre-response"); 
		response.data(this, urlObj);
		//console.log("post-response");
	});
	/////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////
	// check status, echo status, scan for links on the page
	casper.then(function() {
		if(verify){
		if(!checkWithGoogle(url))
			urlObj.url = "Flagged Bad Url - " + urlObj.url;
		}

		// Set the status style based on server status code
		var status = this.status().currentHTTPStatus;
		//console.log(status); 
		if( status == null)
			status = 404;
		//	console.log(urlObj.url);
		// Checks HTTP Status if certain HTTP codes are to be ignored

		if(ignore.indexOf(status) !== -1){
			urlObj.url = urlObj.url + " - Screenshot not taken HTTP Status = " + status.toString();
		}
		visitedUrls.push(urlObj); // goes to csv here 

		switch(status) {
			case 200: var statusStyle = { fg: 'green', bold: true }; break;
			case 404: var statusStyle = { fg: 'red', bold: true }; break;
			default: var statusStyle = { fg: 'magenta', bold: true }; break;
		}
		// Display the spidered URL and status
		this.echo(count + '\t' + "|" + visitedUrls.length + "|" + pendingUrls.length + "|" + skippedUrls.length + "|\t" + this.colorizer.format(status, statusStyle) + ' ' + url);
		urlObj.status = status;

		// Only adds nodes to the queue if node-only mode is enabled
		if(node == true){
			var nodeUrl = { url:url,
				parentUrls:[url], 
				};
				nodeUrl.url = startUrl + "/" + startNode.toString();
				startNode++;
			pendingUrls.push(nodeUrl);
		}
		else if(Patterns.patternMatch(urlObj.url, Patterns.bigFileArr)) {
		 	// don't look for links 
		}
		else{
			// Find links present on this page (node only mode is off)
			// Links: contains tag, alt and origninal link
			var links = this.evaluate(function() {
				var links = [];
				Array.prototype.forEach.call(__utils__.findAll('a'), function(e) {
					var linkItem = {
						source: e.getAttribute('href'),
						tag: 'a',
						alt: undefined,
					};
					links.push(linkItem);
					//links.push(e.getAttribute('href'));
				});
				Array.prototype.forEach.call(__utils__.findAll('img'), function(e) {
					var linkItem = {
						source: e.getAttribute('src'),
						tag: 'img',
						alt: e.getAttribute('alt'),
					};
					links.push(linkItem);
			 		//links.push(e.getAttribute('src'));
				});
				Array.prototype.forEach.call(__utils__.findAll('area'), function(e) {
					var linkItem = {
						source: e.getAttribute('href'),
						tag: 'area',
						alt: undefined,
					};
					links.push(linkItem);
					//links.push(e.getAttribute('href'));	
				});
				return links;
			});
			///////////////////////////////////////////////////////////////////////////////////////////////
			// find elements with alt tags. 
			// if no alt tag, then status = 0000 
			// if alt tag is empty, then status = 0000 
			// else, alt tag is good. 
			// maybe only add it to the array if the alt tags are missing. If the alt tag is empty or if it doesn't exist, then add the source to the array and output that. 
			// only add it to altTextUrls if and only if the alt tag is empty. 
			// For that page, go through all alt tags. If empty, create an object and add it to the array. 

			// var altTexts = this.evaluate(function() {
			// 	casper.echo("test");
			// 	var altTexts = {
			// 		url: url,
			// 		imgs: []
			// 	};
			// 	Array.prototype.forEach.call(__utils__.findAll('img'), function(e) {
			// 		//altTexts.push(e.getAttribute('alt'));
			// 		var source = e.getAttribute('src'); 
			// 		var altTextElement = {
			// 			source: source,
			// 			alt: ""
			// 		};
			// 		var altValue = e.getAttribute('alt');
			// 		//console.log("alt: " + altValue);
			// 		if(!altValue || altValue == "") {	// if no alt tag or empty  
			// 			altTextElement.alt = undefined;
			// 		}
			// 		else{
			// 			altTextElement.alt = altValue;
			// 		}
			// 		//console.log("source: " + source);

			// 		altTexts.imgs.push(altTextElement);
			// 	});

			// 	return altTexts;
			// });


			// altTextUrls.push(altTexts);

			//////////////////////////////////////////////////////////////////////////////////////////////

			// Add newly found URLs to the stack
			var baseUrl = this.getGlobal('location').href;
			var altTexts = {
				url: url,
				imgs: [],
			};
			//console.log("baseUrl for " + url + " is " + baseUrl); 
			Array.prototype.forEach.call(links, function(linkItem) {
				var link = linkItem.source;
				// Scan for images with alt values
				var linkTag = linkItem.tag;
				var linkAlt = linkItem.alt;

				var newUrl = helpers.absoluteUri(baseUrl, link);
				if(ignoreParameters) {
					newUrl = newUrl.replace(/\?.*$/, ''); //Ignoring PHP parameters
				}
				newUrl = newUrl.replace(/\/$/, ''); //Ignoring trailing '/' symbols
				newUrl = newUrl.replace(/#.*$/, ''); //Ignoring hashchanges

				// Check if url passes urlChecker
				if(urlChecker(newUrl)) {
					var wasVisited = false;
					var wasSkipped = false; 
					var isPending = false;

					if(linkTag == 'img' && link != undefined && link != ""){

						var altTextElement = {
							source: newUrl,
							alt: linkAlt,
						};
						altTexts.imgs.push(altTextElement);
						//console.log(linkAlt);
					}

					//Check if already visited
					for(var i = 0; i < visitedUrls.length; i++) {
						if(newUrl.replace(/^http(s)?:\/\//, '') == visitedUrls[i].url.replace(/^http(s)?:\/\//, '')
							|| (visitedUrls[i].url).indexOf(newUrl + " - Screenshot not taken HTTP Status = ") > -1 
							|| (visitedUrls[i].url).indexOf("Flagged Bad Url - " + newUrl) > -1 
							) { 
							wasVisited = true;
							if(visitedUrls[i].parentUrls.indexOf(url) == -1){
								visitedUrls[i].parentUrls.push(url);
							}
							break;
						}
					}
					// Checked if already skipped 
					for(var i = 0; i < skippedUrls.length; i++) {
						if(newUrl == skippedUrls[i].url) {
							wasSkipped = true; 
						}
					}
					//Check if url is pending
					if(!wasVisited || !wasSkipped) {
						for(var i = 0; i < pendingUrls.length; i++) {
							if(newUrl.replace(/^http(s)?:\/\//, '') == pendingUrls[i].url.replace(/^http(s)?:\/\//, '')) {
								isPending = true;
								if(pendingUrls[i].parentUrls.indexOf(url) == -1){
									pendingUrls[i].parentUrls.push(url);
								}
								break;
							}
						}
					}

					if(!wasVisited && !isPending && !wasSkipped){
						pendingUrls.push({
							url: newUrl,
							parentUrls: [ url ]
						});
					}
				}
			}); // endforeach 
			altTextUrls.push(altTexts);
		}
	
	});
} ////////////////////////// end check blacklist 
casper.then(function() {
	// If there are URLs to be processed
	if (pendingUrls.length > 0) {
		var nextUrl = pendingUrls.shift();
		//this.echo(this.colorizer.format('<- Popped ' + nextUrl + ' from the stack', { fg: 'blue' }));
		spider(nextUrl, urlChecker, tasks);
	} else {
		return;
	}
	});
	
}


exports.spider = function(url, limitingRegex, tasks) {
	// visitedUrls = visitedUrls || [];
	// pendingUrls = pendingUrls || [];
	var results = {};
	var urlObj = { url:url,
				   parentUrls:[url], 
					};
	/*var altTextObj = {
		status:"0000", 
		element:"no", 
		pageUrl:"X"
	}*/

	//Determining if "limitingRegex" is a simple string or a RegularExpression
	if(limitingRegex[0]) { //i.e. limitingRegex is a string
		var urlChecker = function(url) {
			// The protocol and domain name
			preUrl = url.match(/.*?:\/\/.*?(\/|$)/);
			if(!preUrl){
				return false; 
			}
			else {
				if(external == true)
					return casper.getCurrentUrl().indexOf(limitingRegex) !== -1;
				else
					return preUrl[0].indexOf(limitingRegex) !== -1;
			}
		}
	} else {
		var urlChecker = function(url) {
			return url.match(limitingRegex);
		}
	}


	casper.then(function() {
		spider(urlObj, urlChecker, tasks);
	});
	casper.then(function() {
		results.elapsedTime = new Date().getTime() - startTime;
		results.count = visitedUrls.length;
		results.visitedUrls = visitedUrls;
		results.pendingUrls = pendingUrls;
		results.skippedUrls = skippedUrls; 
		results.altTextUrls = altTextUrls; ////////////// 
	});
	return results;
};
