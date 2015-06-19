var ignoreParameters = true;
var startTime = new Date().getTime();
// Create instances
var require = patchRequire(require);
var utils = require('utils');
var helpers = require('./helpers');
var googlePassed;

//discovers soft 404's through a google search
function checkWithGoogle(url){
	casper.thenOpen('https://www.google.ca/search?q=' + url + '&gws_rd=ssl',function(){
	});

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

	casper.thenOpen(url, function() {
		expected_screenshot = 'data:image/png;base64,' + this.captureBase64('png');
		pdiffy(google_screenshot).compareTo(expected_screenshot).onComplete(function(data){		
		results1 = data;
		});

	});
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
// Spider from the given URL
// spider(Object urlObj, fn urlChecker(Str url)[, Nat cap, Arr (Object urlObj), Arr (Object urlObj))])
function spider(urlObj, urlChecker, tasks) {

	// Check if cap has been reached

	if(cap !== false && cap <= 0){ 
		return;
	}
	else if(cap > 0){
		cap--;
	}

	url = urlObj.url;

	// Open the URL
	casper.open(url);
	casper.eachThen(tasks, function(response) {
		response.data(this, urlObj);
	});
	casper.then(function() {
		if(verify){
	//if(url.indexOf(host) == -1){
		if(!checkWithGoogle(url))
			urlObj.url = "Flagged Bad Url - " + urlObj.url;
	//};
		}
		// Set the status style based on server status code
		var status = this.status().currentHTTPStatus;
		if( status == null)
			status = 404;
		// Checks HTTP Status if certain HTTP codes are to be ignored

		if(ignore.indexOf(status) !== -1){
			urlObj.url = urlObj.url + " - Screenshot not taken HTTP Status = " + status.toString();
		}
		visitedUrls.push(urlObj);

		switch(status) {
			case 200: var statusStyle = { fg: 'green', bold: true }; break;
			case 404: var statusStyle = { fg: 'red', bold: true }; break;
			default: var statusStyle = { fg: 'magenta', bold: true }; break;
		}
		// Display the spidered URL and status
		this.echo(this.colorizer.format(status, statusStyle) + ' ' + url);
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

		else{
		// Find links present on this page (node only mode is off)
		var links = this.evaluate(function() {
			var links = [];
			Array.prototype.forEach.call(__utils__.findAll('a'), function(e) {
				links.push(e.getAttribute('href'));
			});
			return links;
		});
		// Add newly found URLs to the stack
		var baseUrl = this.getGlobal('location').href;
		Array.prototype.forEach.call(links, function(link) {
			var newUrl = helpers.absoluteUri(baseUrl, link);
			if(ignoreParameters) {
				newUrl = newUrl.replace(/\?.*$/, ''); //Ignoring PHP parameters
			}
			newUrl = newUrl.replace(/\/$/, ''); //Ignoring trailing '/' symbols
			newUrl = newUrl.replace(/#.*$/, ''); //Ignoring hashchanges

			// Check if url passes urlChecker
			if(urlChecker(newUrl)) {
				var wasVisited = false;
				var isPending = false;

				//Check if already visited
				for(var i = 0; i < visitedUrls.length; i++) {
					if(newUrl == visitedUrls[i].url
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


				//Check if url is pending
				if(!wasVisited) {
					for(var i = 0; i < pendingUrls.length; i++) {
						if(newUrl == pendingUrls[i].url) {
							isPending = true;
							if(pendingUrls[i].parentUrls.indexOf(url) == -1){
								pendingUrls[i].parentUrls.push(url);
							}
							break;
						}
					}
				}

				if(!wasVisited && !isPending){
					pendingUrls.push({
					url: newUrl,
					parentUrls: [ url ]
				});
				}
			}
		});
		}
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
	});
	return results;
};