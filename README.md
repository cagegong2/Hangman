Hangman
=======

This is a javascript solution to solve a problem from https://github.com/cagegong/strikingly-interview-test-instructions
To describe it briefly, the task is to write a program to play Hangman, guessing words from their server through a REST API.

My solution is:
First, I need a dictionary, so I searched many websites, and found this http://developer.wordnik.com/ . The api provided by this website
is cool enough. It let me search for words with certain length and contains certain chars. Then I will make a suggestion according to the 
words searched out and some mathematics.

Most stuff is in my-script.js.
I also included json2.js and jquery as tools.

