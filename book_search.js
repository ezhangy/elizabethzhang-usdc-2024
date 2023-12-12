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
    const matcher = new RegExp(searchTerm.trim().replace(/\b/g, "\\b"))
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
    const cleanLine = (text) => text.replace(/\t|\n|\r/g, " ").trim()

    /** @type {ScannedLine[]} */
    const newLines = []

    // sort so lines containing words breaks will be next to each other
    const oldLines = sortScannedLines(bookObj["Content"])
    for (const [index, { Page, Line, Text }] of oldLines.entries()) {
        /** @type {ScannedLine | undefined} */
        const nextLine = oldLines[index + 1]

         /** 
         * The newText to assign to the line
         * @type {string} 
         * */
        let newText = cleanLine(Text)

        // is the next line in the book present?
        const isConsecutiveLinePresent = (
            // this isn't the last scannedLine
            nextLine !== undefined
                // the next scannedLine is on the same page
                && Page === oldLines[index + 1]["Page"] 
                // the next scannedLine is the next consecutive line number
                && Line + 1 === oldLines[index + 1]["Line"] 
        ) 

        if (isConsecutiveLinePresent) {
            const nextLineText = cleanLine(nextLine.Text)     
            const isValidWordBreakPresent = (
                // the last word in the line ends with a hyphen
                newText.match(/^.*(\b.+?\b)-$/) !== null
                && isConsecutiveLinePresent
                // the first word in the next line
                && nextLineText.match(/^\b.+?\b/) !== null
            )
            if (isValidWordBreakPresent) {
                const [currLineMatch, currLineWithoutLastWord, lastWordInCurrLine] = newText.match(/(^.*)\b(.+?)\b-$/)
    
                const [nextLineMatch, firstWordInNextLine, nextLineWithoutFirstWord] = nextLineText.match(/^\b(.+?)\b(.*)$/)
    
                // e.g. "darkness" = "dark" + "ness"
                const unifiedWord = lastWordInCurrLine + firstWordInNextLine
    
                newText = currLineWithoutLastWord + unifiedWord
    
                oldLines[index + 1] = {
                    ...nextLine, "Text": unifiedWord + nextLineWithoutFirstWord
                }
            }
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

const exampleValidInputObj = [
    {
        "Title": "Title 1",
        "ISBN": "1",
        "Content": [
            {
                "Page": 1,
                "Line": 7,
                "Text": "now simply went on by her own momentum. (method) The dark-"
            },
            {
                "Page": 1,
                "Line": 10,
                "Text": "in Python, you may have a method __hash__"
            },
        ] 
    },
    {
        "Title": "Title 2",
        "ISBN": "2",
        "Content": [
            {
                "Page": 2,
                "Line": 1,
                "Text": "this is a sentence—that contains an em dash—"
            },
            {
                "Page": 2,
                "Line": 5,
                "Text": "er <-- should not be connected to hyphenated word in the book 3. floorboards are often made of wood."
            },
            {
                "Page": 2,
                "Line": 7,
                "Text": "and winter is here. floor-"
            },
        ] 
    },
    {
        "Title": "Title 3",
        "ISBN": "3",
        "Content": [
            {
                "Page": 2,
                "Line": 7,
                "Text": "boards creak and groan. Twenty-Three years ago"
            },
            {
                "Page": 2,
                "Line": 3,
                "Text": "the dark room has a lamp which is a lamp that"
            },
            {
                "Page": 2,
                "Line": 4,
                "Text": "glows dimly in the moon-"
            },
            {
                "Page": 2,
                "Line": 5,
                "Text": "light of the cold win-"
            },
            {
                "Page": 2,
                "Line": 6,
                "Text": "ter breeze. creak, creak. the floor-"
            },
            {
                "Page": 20,
                "Line": 1,
                "Text": "a method to the madness here"
            },
        ]
    }
]

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

/**
 * Checks whether two values of any type are equal to one another using 
 * `JSON.stringify`.
 * 
 * @param {string} testName - The name of the test.
 * @param {object} expected - The expected value to compare with the actual
 * value.
 * @param {object} actual - The actual value.
 */
function assertEquals(testName, expected, actual) {
    if (JSON.stringify(expected) === JSON.stringify(actual)) {
        console.log(`PASS: ${testName}`);
    } else {
        console.log(`FAIL: ${testName}`);
        console.log("Expected:", expected);
        console.log("Received:", actual);
    }
}


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

/*-------POSITIVE TESTS-------*/
console.log("POSITIVE TESTS")
assertEquals("Multiple matches across different books",
    {
        "SearchTerm": "method",
        "Results": [
            {
                "ISBN": "1",
                "Page": 1,
                "Line": 7
            },
            {
                "ISBN": "1",
                "Page": 1,
                "Line": 10
            },
            {
                "ISBN": "3",
                "Page": 20,
                "Line": 1
            }
        ]
    }, 
    findSearchTermInBooks("method", exampleValidInputObj)
)

assertEquals("Match multiple full words, considering punctuation",
    {
        "SearchTerm": "breeze. creak, creak.",
        "Results": [
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 6
            }
        ]
    }, 
    findSearchTermInBooks("breeze. creak, creak.", exampleValidInputObj)
)

assertEquals("Ignore whitespace at the start/end of the searchTerm",
    {
        "SearchTerm": " breeze. creak, creak.  ",
        "Results": [
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 6
            }
        ]
    }, 
    findSearchTermInBooks(" breeze. creak, creak.  ", exampleValidInputObj)
)

assertEquals("Match word at end of line",
    {
        "SearchTerm": "wood.",
        "Results": [
            {
                "ISBN": "2",
                "Page": 2,
                "Line": 5
            }
        ]
    }, 
    findSearchTermInBooks("wood.", exampleValidInputObj)
)


assertEquals("Match hyphenated word break (no hyphens in search term)",
    {
        "SearchTerm": "winter",
        "Results": [
            {
                "ISBN": "2",
                "Page": 2,
                "Line": 7
            },
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 5
            },
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 6
            },
        ]
    }, 
    findSearchTermInBooks("winter", exampleValidInputObj)
)

assertEquals(
    "Match hyphenated word breaks even if scanned lines are out of order",
    {
        "SearchTerm": "floorboards",
        "Results": [
            {
                "ISBN": "2",
                "Page": 2,
                "Line": 5,
            },
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 6,
            },
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 7
            },
        ]
    },
    findSearchTermInBooks("floorboards", exampleValidInputObj)
)

assertEquals(
    "Match on first half of hyphenated word break if it is never completed",
    {
        "SearchTerm": "floor",
        "Results": [
            {
                "ISBN": "2",
                "Page": 2,
                "Line": 7,
            },
        ]
    },
    findSearchTermInBooks("floor", exampleValidInputObj)
)

assertEquals(
    "Multiple matches in same line do not return duplicate results",
    {
        "SearchTerm": "lamp",
        "Results": [
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 3,
            },
        ]
    },
    findSearchTermInBooks("lamp", exampleValidInputObj)
)

assertEquals(
    "Match searchTerm containing hyphens in the middle of the word.",
    {
        "SearchTerm": "Twenty-Three",
        "Results": [
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 7,
            },
        ]
    },
    findSearchTermInBooks("Twenty-Three", exampleValidInputObj)
)

assertEquals(
    "Match searchTerm containing underscores.",
    {
        "SearchTerm": "__hash__",
        "Results": [
            {
                "ISBN": "1",
                "Page": 1,
                "Line": 10,
            },
        ]
    },
    findSearchTermInBooks("__hash__", exampleValidInputObj)
)

assertEquals(
    "Match searchTerm containing apostrophe.",
    {
        "SearchTerm": "Canadian's",
        "Results": [
            {
                "ISBN": "9780000528531",
                "Page": 31,
                "Line": 9,
            },
        ]
    },
    findSearchTermInBooks("Canadian's", twentyLeaguesIn)
)

assertEquals(
    'searchTerm "Canadian" matches "Canadian\'s" in scanned text',
    {
        "SearchTerm": "Canadian",
        "Results": [
            {
                "ISBN": "9780000528531",
                "Page": 31,
                "Line": 9,
            },
        ]
    },
    findSearchTermInBooks("Canadian", twentyLeaguesIn)
)

assertEquals(
    'searchTerm matches word containing trailing punctuation',
    {
        "SearchTerm": "profound",
        "Results": [
            {
                "ISBN": "9780000528531",
                "Page": 31,
                "Line": 9
            },
        ]
    },
    findSearchTermInBooks("profound", twentyLeaguesIn)
)

assertEquals(
    'searchTerm matches word containing leading punctuation',
    {
        "SearchTerm": "dash",
        "Results": [
            {
                "ISBN": "2",
                "Page": 2,
                "Line": 1
            },
        ]
    },
    findSearchTermInBooks("dash", exampleValidInputObj)
)

assertEquals(
    'Trailing punctuation in searchTerm matches correctly',
    {
        "SearchTerm": "profound;",
        "Results": [
            {
                "ISBN": "9780000528531",
                "Page": 31,
                "Line": 9
            },
        ]
    },
    findSearchTermInBooks("profound;", twentyLeaguesIn)
)

/*-------CASE-SENSITIVE TESTS-------*/
console.log("CASE-SENSITIVE TESTS")
assertEquals(
    'Matches are case-sensitive (first letter of word capitalized)',
    {
        "SearchTerm": "The",
        "Results": [
            {
                "ISBN": "9780000528531",
                "Page": 31,
                "Line": 8
            },
        ]
    },
    findSearchTermInBooks("The", twentyLeaguesIn)
)

assertEquals(
    'Matches are case-sensitive (capitalization within word)',
    0,
    findSearchTermInBooks("floOrBoArds", twentyLeaguesIn).Results.length
)

assertEquals(
    'Matches are case-sensitive (capitalized hyphenated word)',
    {
        "SearchTerm": "Twenty-Three",
        "Results": [
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 7
            },
        ]
    },
    findSearchTermInBooks("Twenty-Three", exampleValidInputObj)
)

assertEquals(
    'Matches are case-sensitive (multiple words)',
    {
        "SearchTerm": "Twenty-Three years",
        "Results": [
            {
                "ISBN": "3",
                "Page": 2,
                "Line": 7
            },
        ]
    },
    findSearchTermInBooks("Twenty-Three years", exampleValidInputObj)
)

/*-------NEGATIVE TESTS-------*/
console.log("NEGATIVE TESTS")
assertEquals(
    "No books in input object.",
    {
        "SearchTerm": "the",
        "Results": []
    },
    findSearchTermInBooks("the", [])
)

assertEquals(
    "No lines in input object.",
    {
        "SearchTerm": "the",
        "Results": []
    },
    findSearchTermInBooks("the", [{
        "Title": "Twenty Thousand Leagues Under the Sea",
        "ISBN": "9780000528531",
        "Content": []
    }])
)

assertEquals(
    "searchTerm not present in scanned text",
    {
        "SearchTerm": "totality",
        "Results": []
    },
    findSearchTermInBooks("totality", twentyLeaguesIn)
)

assertEquals(
    "Does not return partial matches within word boundaries (single word in searchTerm).",
    0,
    findSearchTermInBooks("floor", twentyLeaguesIn).Results.length
)


assertEquals(
    "Does not return partial matches within word boundaries (multiple words in searchTerm).",
    0,
    findSearchTermInBooks("breeze. creak, cre.", exampleValidInputObj).Results.length
)

assertEquals(
    'Leading punctuation in searchTerm is considered',
    0,
    findSearchTermInBooks(";profound", twentyLeaguesIn).Results.length
)

assertEquals(
    "Does not return word halves from a hyphenated line break (first half)",
    0,
    findSearchTermInBooks("dark", twentyLeaguesIn).Results.length
)


assertEquals(
    "Word break does not match hyphenated version of broken word",
    0,
    findSearchTermInBooks("win-ter", exampleValidInputObj).Results.length
)

assertEquals(
    "Does not return word halves from a hyphenated line break (second half)",
    0,
    findSearchTermInBooks("ness", twentyLeaguesIn).Results.length
)

assertEquals(
    "Does not match different forms of the same word",
    0,
    findSearchTermInBooks("asking", twentyLeaguesIn).Results.length
)

assertEquals(
    "Does not match close but inexact matches",
    0,
    findSearchTermInBooks("Teh", twentyLeaguesIn).Results.length
)

assertEquals(
    "Does not match searchTerm that does not contain valid word boundaries",
    0,
    findSearchTermInBooks("<--", twentyLeaguesIn).Results.length
)

console.log("INPUT VALIDATION TESTS")
try {
    findSearchTermInBooks("the", {})
} catch ({ message }) {
    assertEquals(
        "Invalid input object throws appropriate error",
        message,
        "Invalid Argument: scannedTextObj must be an array"
    )
}

