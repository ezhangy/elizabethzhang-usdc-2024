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
 * 
 * @param {ScannedLine[]} scannedLines 
 * @returns {ScannedLine[]}
 */
function sortScannedLines(scannedLines) {
    return [...scannedLines].sort((lineA, lineB) => {
        if (lineA["Page"] !== lineB["Page"]) {
            return lineA["Page"] - lineB["Page"]
        } else { // if both lines are on the same page, then we compare lines
            return lineA["Line"] - lineB["Line"]
        }
    })
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
 * Processes `ScannedLines` for word breaks by reconnecting words that 
 * have been split across lines. 
 * 
 * The second half of the broken word is added to the end of the line
 * containing the first half. The second half of the broken word is then 
 * removed from the beginning of the next line. 
 * 
 * **Example**
 * 
 * The following lines: 
 * ```
 * [
 *  {
 *   "Page": 31,
 *   "Line": 8, 
 *   "Text": "now simply went on by her own momentum.  The dark-"
 *  },
 *  {
 *  "Page": 31,
 *  "Line": 9,
 *  "Text": "ness was then profound; and however good the Canadian\'s"
 *  },
 * ]
 * ```
 * 
 * Would be transformed into: 
 * ```
 * [
 *  {
 *   "Page": 31,
 *   "Line": 8, 
 *   "Text": "now simply went on by her own momentum.  The darkness"
 *  },
 *  {
 *  "Page": 31,
 *  "Line": 9,
 *  "Text": " was then profound; and however good the Canadian\'s"
 *  },
 * ]
 * ```
 * 
 * @param {Book} bookObj - The {@linkcode Book} object to process the lines for.
 * @returns {ScannedLine[]} A list of processed {@linkcode ScannedLine}
 */
function processLinesForWordBreaks(bookObj) {
    /** @type {ScannedLine[]} */
    const newLines = []

    // sort so lines containing words breaks will be next to each other
    const oldLines = sortScannedLines(bookObj["Content"])
    for (const [index, { Page, Line, Text }] of oldLines.entries()) {
        /** @type {ScannedLine | undefined} */
        const nextLine = oldLines[index + 1]

        // is the next line in the book present?
        const isConsecutiveLinePresent = (
            // this isn't the last scannedLine
            nextLine !== undefined
                // the next scannedLine is on the same page
                && Page === oldLines[index + 1]["Page"] 
                // the next scannedLine is the next consecutive line number
                && Line + 1 === oldLines[index + 1]["Line"] 
        ) 
        
        const isValidWordBreakPresent = (
            Text[Text.length - 1] === "-"
            && isConsecutiveLinePresent
            // the first word in the next line
            && nextLine.Text.match(/^\b.+?\b/) !== null
        )

        /** 
         * The newText to assign to the line
         * @type {string} 
         * */
        let newText;
        if (isValidWordBreakPresent) {
            const currLineWithoutHyphen = Text.slice(0, -1)
            const firstWordInNextLine = nextLine.Text.match(/^\b.+?\b/)
            newText = currLineWithoutHyphen + firstWordInNextLine
            
            const nextLineWithoutFirstWord = nextLine.Text.match(/^\b.+?\b(.*)$/)[1];
            oldLines[index + 1] = {
                ...nextLine, "Text": nextLineWithoutFirstWord
            }
        } else {
            newText = Text
        }
        newLines.push({
            "Page": Page,
            "Line": Line,
            "Text": newText
        })
    }
    return newLines
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
    const processedLines = processLinesForWordBreaks(bookObj)

    for (const {Page, Line, Text} of processedLines) {
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

const test3result = findSearchTermInBooks("darkness", twentyLeaguesIn); 
const test3expected = {
    "SearchTerm": "darkness",
    "Results": [
        {
            "ISBN": "9780000528531",
            "Page": 31,
            "Line": 8
        }
    ]
}
if (JSON.stringify(test3result) === JSON.stringify(test3expected)) {
    console.log("PASS: Test 3");
} else {
    console.log("FAIL: Test 3");
    console.log("Expected:", test3expected);
    console.log("Received:", test3result);
}

