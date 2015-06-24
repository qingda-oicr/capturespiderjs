// Blacklisted sites 
// Array of regex to check within the site url 

var blacklistArr = new Array (
	/neopets/i, 
	/something/i, 
	/spadr/i, 
	/IMAGES/
);

// patternMatch: String Array -> Boolean 
// returns true if the url contains a pattern in patternArr
function patternMatch(url, patternArr) {
//	console.log("\n--- patternMatchinggggggg");
	// for each patternArr, test if it is in url  
	var matched = false; 
	for (var i = 0; i < patternArr.length; i++) {
		if(patternArr[i].test(url)) {
			//console.log("  $$" + patternArr[i] + "$$" + " is in " + url);
			matched = true; 
		} 
	}
	return matched; 
}

exports.patternMatch = patternMatch;
exports.blacklistArr = blacklistArr;