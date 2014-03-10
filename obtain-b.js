(function() {
    
    function NotImplementedError(){}
    
    function Expectation(name) {
        Object.defineProperty(this, 'name', {
            get: function() {return name;}
        });
        Error.apply(this, Array.prototype.slice.call(arguments))
    }
    
    Expectation.prototype = Object.create(Error.prototype)
    Expectation.prototype.toString = function expectationString() {
        return '<Expectation ' + this.name +'>'
    }
    
    Expectation.prototype.toString = function expectationString() {
        return '<Expectation ' + this.name +'>'
    }
    
    function Argument(value) {
        Object.defineProperty(this, 'value', {
            get: function() { return name; }
        });
    }
    Argument.prototype.toString = function argumentString() {
        return '<Argument ' + this.name +'>'
    }
    
    function Dependency(value) {
        Object.defineProperty(this, 'value', {
            get: function() { return name; }
        });
    }
    Dependency.prototype.toString = function dString() {
        return '<Dependency ' + this.name +'>'
    }
    
    
    function AsyncExecutionException(){}
    
    function AssertionFailed(){
        Error.apply(this, Array.prototype.slice.call(arguments))
    }
    AssertionFailed.prototype = Object.create(Error.prototype)
    
    function assert(test, message) {
        if(!test)
            throw new AssertionFailed(mesage);
    }
    
    function DependencyGraph(
            syncGetters, asyncGetters, callerArguments, job) {
        this.asyncGetters = asyncGetters;
        this.syncGetters = syncGetters;
        
        this.callerArguments = callerArguments instanceof Array
            ? callerArguments
            : [];
        
        this.job = job;
    }
     var _DGp = DependencyGraph.prototype;
    
    var Constructor = function State(host, graph /* instanceof DependencyGraph */,
            args /* array: [async [, arguments ... ], callback, errrback] */) {
        this._host = host;
        this._graph = graph;
        
        this._async = args[0];
        this._args = args.slice(1);
        // FIXME: in case we'll support returning a promise this will need
        // an adjustment here
        this._errback = this._async
            ? this._args.pop()
            : undefined;
        this._callback = this._async
            ? this._args.pop()
            : undefined;
        
        this._obtained = {};
        
        for(;i<this._graph.callerArguments.length; i++)
            this._obtained[this._graph.callerArguments[i]] = this._args[i];
        this._args.unshift(this._obtainAPI.bind(this));
        
        this._waitingFor = {}
        this._waitingCount = 0
    }
        
    // Constructor.prototype = Object.create(null);
    var p = Constructor.prototype;
    
    p.addWaitingAsync = function(dependency) {
        assert(!(dependency in this._waitingFor), 'Already waiting for '
                                                  + dependency)
        // Add a time when waiting started, or a setTimeout for
        // timeout control or such?
        this._waitingFor[dependency] = null;
        this._waitingCount += 1;
        return this._waitingCount
    }
    
    p.removeWaitingAsync = function(dependency) {
        assert(dependency in this._waitingFor, 'Not waiting for '
                                                  + dependency)
        delete this._waitingFor[dependency];
        this._waitingCount -= 1;
        return this._waitingCount;
    }
    
    // this._dependencyCallback.bind(this, dependency)
    p._dependencyCallback(dependency, result) {
        this._obtained[dependency.name] = result
        this._resolve(dependency)
        if(!this._waitingFor.length)
            // that's it, nothing to do anymore
            this.execute();
    }
    
    p._call = function(dependency) {
        throw new NotImplementedError();
        
        var args = this._getArgs(dependency)
          , func = this._getFunc(dependency)
          ;
        if(dependency.isAsync) {
            this._waitingFor.push(dependency)
            func.apply(this._host, args)
        }
        else
            this._obtained[dependency.name] = func.apply(this._host, args)
    }
    
    /**
     * Executes all dependencies given by the arguments.
     * First execute all asynchronous dependencies, as these probably
     * dispatch to a server or such and run nonblocking (hopefully,
     * where is the point otherwise?)
     */
    p._resolve = function(/* dependency, ... */) {
        var resolved = Array.prototype.call(arguments)
          , sosd = [] // stack of synchconous dependencies
          , i
          , dependency
          , dependents = this._dependents
          , dependencyCounters = this._dependencyCounters
          , dependent
          ;
        
        // IMPORTANT! The logical or || will execute dependency = sosd.pop()
        // only if the first expression returns something false.
        // so we first we _call all async dependencies and then the sync
        // ones. This is done, because we wan't to dispatch the async requests
        // ASAP.
        while((dependency = resolved.pop()) || dependency = sosd.pop()) {
            if(dependency.isAsync)
                this._call(dependency)
            else if(resolved.length === 0)
                // execute after all async dependencies have been called
                sosd.push(k)
            else {
                // execute the sync dependency
                this._call(dependency);
                for(i=0; i<dependents[dependency.name].length;i++) {
                    dependent = dependents[dependency.name][i]
                    dependencyCounters[dependent] -= 1
                    if (dependencyCounters[dependent] === 0)
                        // might be async or sync
                        resolved.push(this._graph.get(dependent))
                }
            }
        }
    }
    
    p._obtain =  function _obtain(key) {
        throw new NotImplementedError();
        
        assert(!(key in this._obtained), 'Key "'+ key +'" must not be '
                                        + 'in this._obtained, but it is.')
        
        // so we need to obtain a key
        // this should build a topological sorting as a starting point
        
        var dependentMethod, dependentArgs, dependencies, dependents = {};
        
        dependentMethod = this._graph.asyncGetters[key][0];
        dependentArgs = this._graph.asyncGetters[key].slice(1);
        
        
        // dependents with count of unresolved dependencies
        // when count of unresolved dependencies === 0 the dependent
        // can be executed
        
        // this must exclude all already known dependencies,
        // like in callerArguments (everything that is already obtained)
        // or special args _callback, _errback, _obtain(?), etc.
        //   I'm noy shure if this is true, if it's already obtained we'll
        //   detect it later and callerArguments are like dependencies without
        //   own dependencies
        
        // AND all args that are no Expectations but the value to be passed
        //itself: Expectations are everything where typof x === 'string'
        // e.G. strings created with the string literal. to pass a string
        // as string argument use new String('value') so typeof x will be
        // 'object' or use the Argument constructor of this package:
        // new Argument('value')
        
        // FIXME: for easier development I use the not cleaned args yet
        dependencies = dependentArgs
        // TODO:
        // this.dependencyCounters, this.dependents = prepareEvaluation(key, dependencies)
        // see prepareEvaluation of dependencyGraph.js to get 
        // dependencyCount and dependents and start from there
        
        
        // Every dependency with a count of 0 can be executed immediately
        var resolved = []
          , k
          ;
        for(k in dependencyCounters) {
            if (dependencyCounters[k] === 0)
                resolved.push(this._graph.get(k));
        }
        
        this._resolve.apply(this, resolved)
        // if there wasn't any async dependency we should have a result
        // by now. So we should return it.
        if(this._waitingFor.length)
            throw new AsyncExecutionException()
        // it has to be in this._obtained now
    }
    
    p._obtainAPI = function _obtainAPI(key) {
        if (!(key in this._obtained))
            // will raise AsyncExecutionException when needed
            this._obtain(key);
        assert(key in this._obtained, 'Key "'+ key +'" must be in '
                                    + 'this._obtained, but it isn\'t.')
        return this._obtained[key];
    }
    
    p.execute = function execute () {
        var result;
        try {
            // job is expected to call _obtainAPI zero or more times
            result = this.graph.job.call(this._host, this._args);
        }
        catch(e) {
            if(e instanceof AsyncExecutionException) {
                console.log('AsyncExecutionException');
                // the receiver will call execute again
                return;
            }
            
            if(!this._async)
                throw e;
            this._errback(e);
            return;
        }
        
        // got a result
        if(!this._async)
            return result;
        this._callback(result);
    }
    
    function executionEnvironmentFactory(syncGetters, asyncGetters,
            callerArguments, job) {
        var graph = new DependencyGraph(syncGetters, asyncGetters,
                                        callerArguments, job);
        return function runner( /* async, [ ... arguments, ] callback, errrback */) {
            // 'this' is the host
            var state = new State(this, graph, Array.prototype.slice.call(arguments));
            
            // There needs to be an assurance that an async job is
            // deferred (asynchronously) at least once! Theoretically,
            // since a developer might not expect stuff like an immediate
            // execution when calling an async method and since we have
            // side effects in javascript ASAP is just right.
            // Without side effects it would be better to wait and see
            // if an extra decoupling is needed (when there was no async
            // execution after resolving)
            // FIXME: Think about doing this smarter.
            // FIXME: When promises are aded to the API this needs reflection
            // here, too.
            if (async)
                setTimeout(state.execute.bind(state), 0)
            else
                return state.execute();
        }
    }
    
    return executionEnvironmentFactory;
})()
