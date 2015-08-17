// Library for dealing with CSV files

// Convert an arrOfObjects into a CSV string, using keys as headers.
function stringify (arrOfObjects, ppl, headers, delimiter) {
	var excelCellLimit = 32000;	// actually: 32,727  

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
		if(ppl) {
				var parentsArr = String(arrOfObjects[i][headers[1]]).split(',');
				//if(parentsArr.length > 1) {
					for(var k =0; k < parentsArr.length; k++) {
						if(String(arrOfObjects[i][headers[0]]).replace(/\/$/, '') != parentsArr[k].replace(/\/$/, '')) {
								result += String(arrOfObjects[i][headers[0]]) + delimiter;
								result += parentsArr[k] + delimiter; 
								result += String(arrOfObjects[i][headers[2]]) + delimiter;
								result += String(arrOfObjects[i][headers[3]]) + delimiter;
						result += '\n';
						}
					}
/*
				} else { 
					for(var j = 0; j < headers.length; j++) {
						var cellString = String(arrOfObjects[i][headers[j]]); 
						////////////////////////////////////////////// to prevent overflow 
						if(cellString.length > excelCellLimit) {	
							cellString = cellString.substring(0,excelCellLimit); 
							cellString = cellString.concat("... (" + excelCellLimit + " character limit exceeded)");
						}
						//////////////////////////////////////////////////////////////
						result += cellString + delimiter + '\n';
					}
				}*/
		} else {
			for(var j = 0; j < headers.length; j++) {
				var cellString = String(arrOfObjects[i][headers[j]]); 
				////////////////////////////////////////////// to prevent overflow 
				if(cellString.length > excelCellLimit) {	
					cellString = cellString.substring(0,excelCellLimit); 
					cellString = cellString.concat("... (" + excelCellLimit + " character limit exceeded)");
				}
				//////////////////////////////////////////////////////////////
				result += cellString + delimiter;
			}
        	result += '\n';
			
		}
	}
    return result;
}

exports.stringify = stringify;