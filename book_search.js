/** 
 * RECOMMENDATION
 * 
 * To test your code, you should open "tester.html" in a web browser.
 * You can then use the "Developer Tools" to see the JavaScript console.
 * There, you will see the results unit test execution. You are welcome
 * to run the code any way you like, but this is similar to how we will
 * run your code submission.
 * 
 * The Developer Tools in Chrome are available under the "..." menu, 
 * futher hidden under the option "More Tools." In Firefox, they are 
 * under the hamburger (three horizontal lines), also hidden under "More Tools." 
 */

/**
 * An input object containing scanned content from multiple books.
 * 
 * @typedef {Book[]} ScannedTextObj
*/

/**
 * An input object containing scanned content from multiple books.
 * 
 * @typedef {{
*  "Title": string;
*  "ISBN": string;
*  "Content": ScannedLine[]
* }} Book
*/

/**
* A scanned line from a book
* 
* @typedef {{
*      "Page": number;
*      "Line": number;
*      "Text": string;
*  }} ScannedLine
*/


/**
* A single search result.
* 
* @typedef {{
*  "ISBN": string,
*  "Page": number,
*  "Line": number
* }} SearchResult
*/

/**
 * Checks that `scannedTextObj` has the expected JSON format.
 * 
 * If `scannedTextObj` does not have the expected format, the function 
 * throws an error. Otherwise, the function returns the input object.
 *  
 * @param {JSON} scannedTextObj 
 * @returns {ScannedTextObj}}
 */
function checkScannedTextObj(scannedTextObj) {
    if (!Array.isArray(scannedTextObj)) {
        throw Error("Invalid Argument: scannedTextObj must be an array")
    }
    for (const bookObj of scannedTextObj) {
        const bookObjKeys = ["Title", "ISBN", "Content"]
        for (const bookObjKey of bookObjKeys) {
            if (!(bookObjKey in bookObj)) {
                throw Error(`Invalid Argument: book objects in the scannedTextObj must contain a "${bookObjKey}" property`)
            }
        }

        // check that "Content" property is an array with the proper objects
        const lineObjs = bookObj["Content"]
        if (!Array.isArray(lineObjs)) {
            throw Error(`Invalid Argument: "Content" property of each book object must be an array`)
        }
        for (const lineObj of lineObjs) {
            const lineObjKeys = ["Page", "Line", "Text"]
            for (const lineObjKey of lineObjKeys) {
                if (!(lineObjKey in lineObj)) {
                    throw Error(`Invalid Argument: book objects in the scannedTextObj must contain a "${lineObjKey}" property`)
                }
            }
        }
    }
    return scannedTextObj
}

/**
 * Generates a regex for a search term. 
 * 
 * The regex is case-sensitive and matches on whole words. Word boundaries
 * are obtained using the word boundary `\b` metacharacter.  
 * 
 * @param {string} searchTerm - The search term to generate the regex for.
 * @returns {RegExp}
 */
function generateSearchMatcher(searchTerm) {
    const words = searchTerm.trim().split(/\b/)
    const matcher = new RegExp(words.map(word => `\\b${word}\\b`).join(""))
    return matcher
}


/**
 * Searches for matches in a {@linkcode Book}.
 * 
 * @param {RegExp} searchMatcher - The RegExp to match against the scanned
 * line. 
 * @param {Book} bookObj - The {@linkcode Book} object we're searching
 * @returns {SearchResult[]} A list of {@linkcode SearchResult}. If there
 * are multiple matches within a single line, only one result for that line
 * will be returned.
 */
function findSearchTermInBook(searchMatcher, bookObj) {
    /** @type {Set<string>} */
    const stringifiedResultsSet = new Set()
    for (const {Page, Line, Text} of bookObj["Content"]) {
        if (Text.match(searchMatcher)) {
            stringifiedResultsSet.add(JSON.stringify({
                "ISBN": bookObj["ISBN"],
                "Page": Page, 
                "Line": Line
            }))
        }
    }
    /** @type {SearchResult[]} */
    const parsedResults = [...stringifiedResultsSet].map(JSON.parse)
    return parsedResults
}


/**
 * Searches for matches in scanned text.
 * @param {string} searchTerm - The word or term we're searching for. 
 * @param {JSON} scannedTextObj - A JSON object representing the scanned text.
 * @returns {JSON} - Search results.
 * */ 
 function findSearchTermInBooks(searchTerm, scannedTextObj) {
    const validScannedTextObj = checkScannedTextObj(scannedTextObj)

    /** @type {SearchResult[]} */
    let results = []
    const matcher = generateSearchMatcher(searchTerm)
    for (const bookObj of validScannedTextObj) {
        results = results.concat(findSearchTermInBook(matcher, bookObj))
    }

    var result = {
        "SearchTerm": searchTerm,
        "Results": results
    };
    
    return result; 
}

/** Example input object. */
const twentyLeaguesIn = [
    {
        "Title": "Twenty Thousand Leagues Under the Sea",
        "ISBN": "9780000528531",
        "Content": [
            {
                "Page": 31,
                "Line": 8,
                "Text": "now simply went on by her own momentum.  The dark-"
            },
            {
                "Page": 31,
                "Line": 9,
                "Text": "ness was then profound; and however good the Canadian\'s"
            },
            {
                "Page": 31,
                "Line": 10,
                "Text": "eyes were, I asked myself how he had managed to see, and"
            } 
        ] 
    }
]
    
/** Example output object */
const twentyLeaguesOut = {
    "SearchTerm": "the",
    "Results": [
        {
            "ISBN": "9780000528531",
            "Page": 31,
            "Line": 9
        }
    ]
}

/*
 _   _ _   _ ___ _____   _____ _____ ____ _____ ____  
| | | | \ | |_ _|_   _| |_   _| ____/ ___|_   _/ ___| 
| | | |  \| || |  | |     | | |  _| \___ \ | | \___ \ 
| |_| | |\  || |  | |     | | | |___ ___) || |  ___) |
 \___/|_| \_|___| |_|     |_| |_____|____/ |_| |____/ 
                                                      
 */

/* We have provided two unit tests. They're really just `if` statements that 
 * output to the console. We've provided two tests as examples, and 
 * they should pass with a correct implementation of `findSearchTermInBooks`. 
 * 
 * Please add your unit tests below.
 * */

/** We can check that, given a known input, we get a known output. */
const test1result = findSearchTermInBooks("the", twentyLeaguesIn);
if (JSON.stringify(twentyLeaguesOut) === JSON.stringify(test1result)) {
    console.log("PASS: Test 1");
} else {
    console.log("FAIL: Test 1");
    console.log("Expected:", twentyLeaguesOut);
    console.log("Received:", test1result);
}

/** We could choose to check that we get the right number of results. */
const test2result = findSearchTermInBooks("the", twentyLeaguesIn); 
if (test2result.Results.length == 1) {
    console.log("PASS: Test 2");
} else {
    console.log("FAIL: Test 2");
    console.log("Expected:", twentyLeaguesOut.Results.length);
    console.log("Received:", test2result.Results.length);
}
