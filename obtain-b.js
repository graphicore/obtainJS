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
    
    function Argument(name) {
        Object.defineProperty(this, 'name', {
            get: function() { return name; }
        });
    }
    Argument.prototype.toString = function argumentString() {
        return '<Argument ' + this.name +'>'
    }
    
    function Dependency(name, async, args/* [argument, names, …, function getter] */) {
        var args = args.slice(0) // make a copy so we don't change the outer world
          , getter = args.pop()
          , dependencies = []
          , async ? {'_callback': null, '_errback': null} : {}
          , i = 0
          ;
        
        // dependencies are cleaned args: no doubles, no specials
        for(;i<args.length; i++) {
            if(args[i] in skip)
                continue;
            skip[args[i]] = null
            dependencies.push(args[i])
        }
        
        Object.defineProperty(this, 'name', {
            get: function() { return name; }
        });
        
        Object.defineProperty(this, 'async', {
            get: function() { return !!async; }
        });
        
        Object.defineProperty(this, 'getter', {
            get: function() { return getter; }
        });
        
        Object.defineProperty(this, 'args', {
            get: function() { return args; }
        });
        
        Object.defineProperty(this, 'hasDependencies', {
            get: function() { return !!dependencies.length; }
        });
        
        Object.defineProperty(this, 'dependencyCount', {
            get: function() { return dependencies.length; }
        });
        
        Object.defineProperty(this, 'dependencies', {
            get: function() { return dependencies; }
        });
    }
    
    Dependency.prototype.toString = function dependencyString() {
        return '<Dependency ' + this.name +'>'
    }

    function DependencyFrame(dependency) {
        this.name = dependency.name;
        this.visitDependencies = dependency.hasDependencies;
        this.dependency = dependency;
        this.dependencyCount = dependency.dependencyCount;
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
    
    function DependencyGraphError() {
        Error.apply(this, Array.prototype.slice.call(arguments))
    }
    DependencyGraphError.prototype = Object.create(Error.prototype)
    
    function DependencyGraph(
            syncGetters, asyncGetters, callerArguments, job) {
        this.asyncGetters = asyncGetters;
        this.syncGetters = syncGetters;
        
        this._cache = {
          // caches the results of getDependency
            _asyncDependencies: {}
          , _syncDependencies: {}
          // caches the results of _getEvaluationOrder
          , asyncEvaluation: {}
          , syncEvaluation: {}
        }
        
        // list of argument names of the 'job'
        this.callerArguments = callerArguments instanceof Array
            ? callerArguments
            : [];
        
        this.job = job;
    }
    
    var _DGp = DependencyGraph.prototype;
    
    /**
     * Get the Dependency instance for name.
     * If mayBeAsync is true and an asyncGetter for name is defined,
     * the Dependency will resolve asynchronous. Otherwise it will be
     * synchronous.
     * 
     * caches created Dependency instances, these are reuseable
     */
    _DGp.getDependency = function(mayBeAsync, name) {
        var isAsync = false, cache, getterDef;
        
        if(mayBeAsync && name in this.asyncGetters)
            isAsync = true;
        else if(!(name in this.syncGetters))
            throw new DependencyGraphError(['Name "',name, '" not found '
                                      +'in DependencyGraph.'].join(''));
        
        cache = isAsync
            ? this._cache._asyncDependencies
            : this._cache._syncDependencies
        
        
        
        if(!(name in cache)) {
            getterDef = (isAsync
                            ? this.asyncGetters : this.syncGetters)[name]
            cache[name] = new Dependency(name, isAsync, getterDef)
        }
        
        return cache[name];
    }
    
    /**
     * prepare evaluation
     */
    _DGp._getEvaluationOrder = function (async, startNode) {
        var stack = []
        , dependencyCount = {} // return value
        , dependents = {} // return value
        , visiting = {} // detect circles
        , visited = {} // detect circles
        , path = [] // only needed for good error reporting
        , frame, length, i, dependency, getDependency
        ;
        
        // factory and currying the async away
        getFrame = function(name) {
            return new DependencyFrame(this.getDependency(async, name));
        }.bind(this);
        
        stack.push(getFrame(startNode));
        dependents[startNode] = [];
        while(stack.length) {
            frame = stack[stack.length-1];
            
            if(frame.name in visited) {
                stack.pop(); // clear frame
                continue;
            }
            
            if(frame.visitDependencies && (frame.name in visiting))
                // I think a direct error is better here. However, we could
                // collect all found strongly connected components and return
                // these. That might ease debugging or make it harder.
                throw new DependencyGraphError(['Circle detected but the '
                            , 'graph must be acyclic!'
                            , 'Current frame.name:', frame.name
                            , 'Path:', path.join('->')
                            , 'strongly connected component:'
                            , path.slice(path.indexOf(frame.name)).concat([frame.name]).join('->')
                            ].join(' '));
            
            // path is only used for the error message above
            path.push(frame.name);
            
            dependencyCount[frame.name] = frame.dependencyCount;
            if(frame.visitDependencies) {
                // entering the frames dependencies
                visiting[frame.name] = null;
                frame.visitDependencies = false;
                
                for(i=0; i<frame.dependencyCount; i++) {
                    dependency = frame.dependency.dependencies[i];
                    
                    // create the transpose graph
                    if(!(dependency in dependents))
                        dependents[dependency] = [];
                    // frame.name is a dependent of dependency
                    dependents[dependency].push(frame.name);
                    
                    if(dependency in visited)
                        // shortcut: this will be detected at the beginning of
                        // the while loop anyways, so we save us from creating,
                        // pushing and then popping the frame
                        continue;
                    
                    // create a new frame
                    // Frame.visitDependencies is true when the dependency has any dependencies
                    stack.push(getFrame(dependency));
                }
            }
            else {
                // leaving the frame
                visited[frame.name] = null;
                path.pop();
                stack.pop();
            }
        }
        return [dependencyCount, dependents]
    }
    
    /**
     * Return the result of _getEvaluationOrder (with underscore).
     * The result will be cached for later possible executions.
     */
    _DGp.getEvaluationOrder(async, startNode) {
        var cache = async
            ? this._cache.asyncEvaluation
            ? this._cache.syncEvaluation
        if(!(startNode in cache))
            cache[startNode] = this._getEvaluationOrder(async, startNode)
        
        return cache[startNode];
    }
    
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
        
        // callerArguments are already obtained
        for(;i<this._graph.callerArguments.length; i++)
            this._obtained[this._graph.callerArguments[i]] = this._args[i];
        this._args.unshift(this._obtainAPI.bind(this));
        
        this._waitingFor = {}
        this._waitingCount = 0
        
        this._dependencyCounters = null;
        this._dependents = null;
        
    }
    
    // Constructor.prototype = Object.create(null);
    var p = Constructor.prototype;
    
    /**
     * keep track of tasks we are waiting for
     */
    p.addWaitingAsync = function(dependency) {
        assert(!(dependency in this._waitingFor), 'Already waiting for '
                                                  + dependency)
        // Useful? Add a time when waiting started, or a setTimeout for
        // timeout control or such?
        this._waitingFor[dependency] = null;
        this._waitingCount += 1;
        return this._waitingCount
    }
    
    /**
     * when the task finished, we clean up here
     */
    p.removeWaitingAsync = function(dependency) {
        assert(dependency in this._waitingFor, 'Not waiting for '
                                                  + dependency)
        delete this._waitingFor[dependency];
        this._waitingCount -= 1;
        return this._waitingCount;
    }
    

    p._getAsyncArgs(dependency) {
        throw new NotImplementedError();
        
        var callback_index
          , errback_index
          , i=0
          ;
        // default is the united callback as last argument
        callback_index = args.length;
        for(; i<args.length; i++)
            // first '_errback' wins, the seccond will raise an error
            // TODO: test this
            if(errback_index !== undefined && args[i] === '_errback')
                errback_index = i;
            // the lowest '_callback' wins
            else if(i < callback_index && args[i] === '_callback')
                callback_index = i;
        
        if(errback_index === undefined)
            args[callback_index] = receiver(key, 'united');
        else {
            args[errback_index] = receiver(key, 'errback');
            args[callback_index] = receiver(key, 'callback');
        }
    }
    
    p._getArgs = function(dependency) {
        throw new NotImplementedError();
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
                        resolved.push(this._graph.getDependency(this._async, dependent))
                }
            }
        }
    }
    
    /**
     * 
     */
    // this._dependencyCallback.bind(this, dependency)
    p._dependencyCallback(dependency, result) {
        this._obtained[dependency.name] = result
        this._resolve(dependency)
        if(!this._waitingFor.length)
            // that's it, nothing to do anymore
            this.execute();
    }
    
    
    p._obtain =  function _obtain(key) {
        throw new NotImplementedError();
        
        assert(!(key in this._obtained), 'Key "'+ key +'" must not be '
                                        + 'in this._obtained, but it is.')
        
        // order is a topological sorting as a starting point
        var order = this._graph.getEvaluationOrder(this._async, key)
          , resolved = []
          , k
        ;
        
        this._dependencyCounters = order[0];
        this._dependents = order[1];
        
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
        
        // TODO: callerArguments and everything that is already obtained
        // callerArguments probably shoudn't even be accounted by this._graph.getEvaluationOrder
        
        // Every dependency with a count of 0 can be executed immediately
        for(k in this._dependencyCounters) {
            if (this._dependencyCounters[k] === 0)
                resolved.push(this._graph.getDependency(this._async, k));
        }
        
        this._resolve.apply(this, resolved)
        // if there wasn't any async dependency we should have a result
        // by now. So we should return it.
        if(this._waitingFor.length)
            throw new AsyncExecutionException()
        
        // it has to be in this._obtained at this point
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
            // FIXME: When promises are added to the API this needs reflection
            // here, too.
            if (async)
                setTimeout(state.execute.bind(state), 0)
            else
                return state.execute();
        }
    }
    
    return executionEnvironmentFactory;
})()
