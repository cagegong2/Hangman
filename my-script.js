/* Hangman namespace */
var Hangman = {};
Hangman.secret = null;
Hangman.charactersGuessed = [];
Hangman.excepts = "";
Hangman.score = 0;
Hangman.bestScore = 78;
Hangman.results = [];

/* helper functions */
function HttpPost(url, data, success, fail) {
    var req = null;
    if (window.XMLHttpRequest) {
        req = new XMLHttpRequest();
    } else // for older IE 5/6
    {
        req = new ActiveXObject("Microsoft.XMLHTTP");
    }

    req.open("POST", url, true);
    req.setRequestHeader("Content-type", "application/json");
    req.onreadystatechange = function (aEvt) {
        if (req.readyState == 4) {
            if (req.status == 200) success(req.responseText);
            else fail("Error loading page\n");
        }
    };
    req.send(data);
}

function GetJson(url, data) {
    var req = null;
    if (window.XMLHttpRequest) {
        req = new XMLHttpRequest();
    } else // for older IE 5/6
    {
        req = new ActiveXObject("Microsoft.XMLHTTP");
    }

    req.open("POST", url, false);
    req.setRequestHeader("Content-type", "application/json");
    req.send(data);
    if (req.readyState == 4) {
        if (req.status == 200) return (JSON.parse(req.responseText));
        else alert("Error loading page\n");
    }
}

function ReplaceAll(Source, stringToFind, stringToReplace) {
    var temp = Source,
        index = temp.indexOf(stringToFind);
    while (index != -1) {
        temp = temp.replace(stringToFind, stringToReplace);
        index = temp.indexOf(stringToFind);
    }
    return temp;
}

String.prototype.ReplaceAll = function (stringToFind, stringToReplace) {
    var temp = this,
        index = temp.indexOf(stringToFind);
    while (index != -1) {
        temp = temp.replace(stringToFind, stringToReplace);
        index = temp.indexOf(stringToFind);
    }
    return temp;
};

function sleep(ms) {
    var dt = new Date();
    dt.setTime(dt.getTime() + ms);
    while (new Date().getTime() < dt.getTime());
}

/* end of helper functions */


// Query the dictionary api provided by http://developer.wordnik.com/ to get a word list.
// Then choose the proper char according to chars guessed and the word list.
function getSuggestion(query, excludes) {
    try {
        var req = null,
            limit = 50,
            includePartOfSpeech = "",
            filter = "",
            url = "http://api.wordnik.com/v4/words.json/search/" + query + "?caseSensitive=false&includePartOfSpeech=" + filter + "&minCorpusCount=1&maxCorpusCount=-1&minDictionaryCount=1&maxDictionaryCount=-1&minLength=" + query.length + "&maxLength=" + query.length + "&skip=0&limit=1000&api_key=a2a73e7b926c924fad7001ca3111acd55af2ffabf50eb4ae5";

        if (window.XMLHttpRequest) {
            req = new XMLHttpRequest();
        } else // for older IE 5/6
        {
            req = new ActiveXObject("Microsoft.XMLHTTP");
        }

        req.open("GET", url, false);
        req.send();
        if (req.responseText !== null) {
            var i, j, k,
            words = JSON.parse(req.responseText);
            if (words.totalResults > 0) {
                var matchedWords = [];
                for (i = 0; i < words.searchResults.length; i++) {
                    var word = words.searchResults[i].word;
                    if (haveCharsIn(word, excludes)) {
                        continue;
                    } else if (!match(query, word)) {
                        continue;
                    } else {
                        matchedWords.push(word.toUpperCase());
                    }
                }
                if (matchedWords.length > 0) {
                    var charWeights = {
                        "A": 0
                    };
                    for (j = 0; j < matchedWords.length; j++) {
                        var added = "";
                        for (k = 0; k < matchedWords[j].length; k++) {
                            if (added.indexOf(matchedWords[j][k]) < 0) {
                                added += matchedWords[j][k];
                                if (typeof (charWeights[matchedWords[j][k]]) == "undefined") {
                                    charWeights[matchedWords[j][k]] = 0;
                                }
                                charWeights[matchedWords[j][k]]++;
                            }
                        }
                    }
                    var result = "A";
                    for (var p in charWeights) {
                        if (haveCharsIn(query, p)) {
                            charWeights[p] = 0;
                        }
                        if (charWeights[p] > charWeights[result]) {
                            result = p;
                        }
                    }
                    console.log('Suggest: ' + result);
                    return result;
                }
            }
        }
        return getRandomChar(query, excludes);
    } catch (err) {
        console.log(err);
        sleep(5000);
        getSuggestion(query, excludes);
    }
}


// Check if the word contains the following chars
function haveCharsIn(word, chars) {
    var upperWord = word.toUpperCase();
    var upperChars = chars.toUpperCase();
    for (var i = 0; i < upperChars.length; i++) {
        if (upperWord.indexOf(upperChars[i]) != -1) {
            return true;
        }
    }
    return false;
}

// Get a random char from A to Z except chars already guessed
function getRandomChar(query, excludes) {
    var upperQuery = query.toUpperCase(),
        A2Z = "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        charsToRemove = upperQuery.ReplaceAll("*", "") + excludes.toUpperCase(),
        stripped = "";
    for (var i = 0; i < A2Z.length; i++) {
        if (haveCharsIn(charsToRemove, A2Z[i])) {} else {
            stripped += A2Z[i];
        }
    }
    var rnum = Math.floor(Math.random() * stripped.length);
    var result = stripped[rnum].toUpperCase();
    console.log("get random: " + result);
    return result;
}

// Check if the query matches the word
function match(query, word) {
    var upperQuery = query.toUpperCase(),
        upperWord = word.toUpperCase();
    if (upperQuery.length != upperWord.length) {
        return false;
    } else {
        var knownChars = upperQuery.ReplaceAll("*", "");
        for (var i = 0; i < upperQuery.length; i++) {
            if (upperQuery[i] == "*") {
                if (knownChars.indexOf(upperWord[i]) >= 0) {
                    return false;
                }
            } else if (upperQuery[i] != upperWord[i]) {
                return false;
            }
        }
    }
    return true;
}

// Initialize, get next word, guess and submit automaticly
// Will submit if the correct number is the biggest.
function AutoStart() {
    $("#mask").show();
    Hangman.bestScore = parseInt($("#targetScore").val(), 10); // get best score from ui
    var retryTimes = parseInt($("#retry").val(), 10);
    // Validate input
    if (typeof (Hangman.bestScore) != "number" || typeof (retryTimes) != "number") {
        alert("wrong input");
        return false;
    }
    for (var count = 0; count < retryTimes; count++) {
        var userId = "cagegong@163.com",
            url = "http://strikingly-interview-test.herokuapp.com/guess/process",
            initData = {
                "action": "initiateGame",
                    "userId": userId
            },
            initResult = GetJson(url, JSON.stringify(initData)); // Initialize game
        Hangman.score = 0;
        Hangman.secret = initResult.secret;
        for (var i = 0; i < initResult.data.numberOfWordsToGuess; i++) {
            console.log("No.: " + i);
            var nextWordRequest = {
                "action": "nextWord",
                    "userId": userId,
                    "secret": Hangman.secret
            };
            var nextWordResult = GetJson(url, JSON.stringify(nextWordRequest)), // Get next word
                numberOfGuessAllowedForThisWord = nextWordResult.data.numberOfGuessAllowedForThisWord,
                currentWord = nextWordResult.word;
            Hangman.excepts = "";
            while (numberOfGuessAllowedForThisWord > 0) {
                var guessChar = getSuggestion(currentWord, Hangman.excepts); // Get suggested character
                var guessRequest = {
                    "action": "guessWord",
                        "guess": guessChar,
                        "userId": userId,
                        "secret": Hangman.secret
                };
                var guessResult = GetJson(url, JSON.stringify(guessRequest)); // Make a guess
                currentWord = guessResult.word;
                console.log("guess: " + guessResult.word);
                if (!haveCharsIn(guessResult.word, guessChar)) {
                    // Put the wrong character into except list
                    Hangman.excepts += guessChar;
                    console.log("Excepts: " + Hangman.excepts);
                }
                if (!haveCharsIn(guessResult.word, "*")) {
                    // Guess success
                    console.log("Success: " + guessResult.word);
                    Hangman.score++;
                    break;
                }
                numberOfGuessAllowedForThisWord = guessResult.data.numberOfGuessAllowedForThisWord;
            }
            if (i + 1 - Hangman.score >= initResult.data.numberOfWordsToGuess - Hangman.bestScore) {
                // In this case, it will never exceed the best score, so try again.
                break;
            }
        }
        if (Hangman.bestScore < Hangman.score) {
            // Only submit when the current score is bigger than the ever best score.
            console.log("Score: " + Hangman.score);
            var submitRequest = {
                "action": "submitTestResults",
                    "userId": userId,
                    "secret": Hangman.secret
            },
            submitResult = GetJson(url, JSON.stringify(submitRequest));
            Hangman.bestScore = submitResult.data.numberOfCorrectWords;
            $("#targetScore").val(Hangman.bestScore);
            Hangman.results.push(submitResult);
            $("#score").text(submitResult.data.totalScore);
        }
    }
    $("#mask").hide();
}

// start up
$(function () {
    $("#targetScore").val(Hangman.bestScore);
    $("#mask").hide();
});