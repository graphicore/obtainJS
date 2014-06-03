ObtainJS 
========
ObtainJS is a micro framework to bring together asynchronous and 
synchronous JavaScript code. It helps you to Don't Repeat Yourself 
(DRY) if you are developing a library with interfaces for both 
blocking/synchronous and non-blocking/asynchronous execution models.

This is done by defining a twofold dependency tree: one for the actions 
of the synchronous execution path and one for the actions of the 
asynchronous execution path.

Actions are small functions with dependencies on the results of other 
actions. The asynchronous execution path will fallback to synchronous
actions if there is no asynchronous action defined for a dependency. 
*You wouldn't define an asynchronous action if its synchronous
equivalent is non-blocking*. This is where you **DRY**!

So, what you do, for example, is splitting your synchronous and blocking 
method in small function-junks. These junks depend on the results of each
other. Then you define a non-blocking AND asynchronous junk for each 
synchronous AND blocking junk. The rest does obtainJS for you. Namely:

 * creating a switch for synchronous or asynchronous execution
 * resolving the dependency tree
 * executing the junks in the right order
 * providing you with the results via:
   * return value when using the synchronous path
   * promises OR callbacks (your choice!) when using the asynchronous path
 

### To run tests in nodeJS
```
$ ./runtest.sh
```
### To run tests in the browser:

```
$ ./serve.sh
```
1. Go to [`http://localhost:8000/node_modules/intern/client.html?config=tests/intern`](http://localhost:8000/node_modules/intern/client.html?config=tests/intern)
* And open you debug tool (F12) in the browser.
* In some Browsers you need to reload, because the console was not loaded
  when the tests where executed.
* Testing output should appear in the console. 
