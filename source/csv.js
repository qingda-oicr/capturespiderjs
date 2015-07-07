// Library for dealing with CSV files

// Convert an arrOfObjects into a CSV string, using keys as headers.
function stringify (arrOfObjects, headers, delimiter) {
	var excelCellLimit = 32000;	// 32,727  

	delimiter = delimiter || '\t';
	var result = "";
	if(arrOfObjects.length == 0){
		return '';
	}
	
	if(!headers) {
		headers = Object.keys(arrOfObjects[0]);
	}

	result += headers.join(delimiter) + delimiter + '\n';

	for(var i = 0; i < arrOfObjects.length; i++) {
		for(var j = 0; j < headers.length; j++) {
			var cellString = String(arrOfObjects[i][headers[j]]); 
			if(cellString.length > excelCellLimit) {	// to prevent overflow 
				cellString = cellString.substring(0,excelCellLimit); 
				cellString = cellString.concat("... (" + excelCellLimit + " character limit exceeded)");
			}
			result += cellString + delimiter;
		}
        result += '\n';
	}
    return result;
}

exports.stringify = stringify;