// Blacklisted sites 
// Array of regex to check within the site url 

var blacklistArr = new Array (
	///////////////////////// testing regexs
	///neopets/i, 

///// GA 
	/\/members\/?$/,	// http://gadig.dweb2.res.oicr.on.ca/members contains too many links  

	/\/category/, 	// /category 
	/\/rearrange/, 	// /rearrange 
	/\/taxonomy/, 	// /taxonomy  

	/\/tag\//, 		// /tag/ 
	/\/xml\//, 		// /xml/ 
	/\/json\//, 	// /json/ 
	/\/csv\//, 		// /csv/ 
	/\/tsv\//, 		// /tsv/ 
	/\/tool\//, 	// /tool/ 

	/.*rss\.xml\/?$/,	// rss.xml

	/.*\.mp4\/?$/, 	// ...anything.mp4 
	///.*\.zip\/?$/, 	// ...anything.zip 

	/\/mica\/studies\/?$/, 	// https://www.maelstrom-research.org/mica/studies
	/\/mica\/study\//, 		// https://www.maelstrom-research.org/mica/study/*

	///http(s)?:\/\/.*\.oicr\.on\.ca/, 	// when scanning oicr.on.ca, skip XXX.oicr.on.ca

	/\/(devel|book)$/, // gdc d7 

	// facitdev - block drupal menu 
	/(\/sites\/)|(\/modules\/)|(\/admin\/)|(\/node\/add)|(\/toolbar\/)/, 
	/\/facitdev.res.oicr.on.ca\/dashboard\/user/, 


	/exampleregex/
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

// wait for it to open 
// png/jpeg/jpg/gif/pdf, wait for it 
var fileUrl = /\/[^\/]*\.(png|jpeg|jpg|gif|pdf)\/?$/; 
var bigFileUrl = /\.(pdf|zip)\/?$/; 

exports.patternMatch = patternMatch;
exports.blacklistArr = blacklistArr;
exports.fileUrl = fileUrl; 
exports.bigFileUrl = bigFileUrl; 

