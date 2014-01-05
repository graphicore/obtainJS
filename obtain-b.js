(function() {
    
    function Expectation(name) {
        Object.defineProperty(this, 'name', {
            get: function() {return name;}
        });
        Error.apply(this, Array.prototype.slice.call(arguments))
    }
    Expectation.prototype = Object.create(Error.prototype)
    Expectation.prototype.toString = function expectationString() {
        return '<Expectation of ' + this.name +'>'
    }
    
    function Argument(value) {
        Object.defineProperty(this, 'value', {
            get: function() { return name; }
        });
        
    }
    
    function AsyncExecutionException(){}
    
    
    function DependencyGraph(
            syncGetters, asyncGetters, callerArguments, job) {
        this.asyncGetters = asyncGetters;
        this.syncGetters = syncGetters;
        
        this.callerArguments = callerArguments instanceof Array
            ? callerArguments
            : [];
        
        this.job = job;
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
            ? this.args.pop()
            : undefined;
        this._callback = this._async
            ? this.args.pop()
            : undefined;
        
        this._obtained = {};
        for(;i<this._graph.callerArguments.length; i++)
            this._obtained[this._graph.callerArguments[i]] = this._args[i];
        this._args.unshift(this._obtainAPI.bind(this));
        
        // let's see if this will stay like it is
        this._missingExpectations = []
    }
        
    // Constructor.prototype = Object.create(null);
    var p = Constructor.prototype;
    
    p._obtain =  function _obtain(key) {
        // so we need to obtain a key
        // this should build a topological sorting as a starting point
        
        var func, args, dependencies, dependents = {};
        
        dependent = this._graph.asyncGetters[key];
        args = this._graph.asyncGetters[key].slice(1);
        
        // see prepareEvaluation of dependencyGraph.js to get 
        // dependencyCount and dependents and start from there
        
        
        
        // dependents with count of unresolved dependencies
        // when count of unresolved dependencies === 0 the dependent
        // can be executed
        
        // this must exclude all already known dependencies,
        // like in callerArguments (everything that is already obtained)
        // or special args _callback, _errback, _obtain(?), etc.
        // AND all args that are the value to be passed itself.
        // Expectations are everything where typof x === 'string'
        // e.G. strings created with the string literal.
        // to pass a string as string argument use new String('value')
        // so typeof x will be 'object'
        
        // FIXME: for easier development I use the not cleaned args yet
        dependencies = args
        dependents[dependent] = dependencies.length;
        
        // record who is dependent of these dependencis
        // so when the dependency is resolved we can do:
        // for(var i=0; i<depandantOf[dependency].length; i++){
        //     dependent = depandantOf[dependency][i];
        //     dependents[dependent] -= 1;
        //     if(dependents[dependent] === 0)
        //        and if it is not beeing executed at the moment!
        //        and if it is not already resolved!
        //        both last points are unlikeley, because this is
        //        the single point where the method is exexuted, when
        //        all dependencies are resolved
        //        
        //        execute(dependent);
        //  }
        for(var i=0; i<dependencies.length; i++) {
            if(!(dependencies[i] in depandantOf))
                depandantOf[dependencies[i]] = [];
            depandantOf[dependencies[i]].push(dependent);
        }
        
        for(var i=0; i<dependencies.length; i++) {
            var dependent2 = dependencies[i];
            var dependancies2 = this._graph.asyncGetters[i].slice(1);
        }
        
        var dependents = {
            
            
        }
        
        // dependencyCount and dependentsOf is what we want to create:
    }
    
    p._obtainAPI = function _obtainAPI(key) {
        var result;
        if (key in this._obtained)
            return this._obtained[key];
        
        try {
            result = this._obtain(key);
        }
        catch(e) {
            if(e instanceof AsyncExecutionException)
                 this._missingExpectations.push(key);
            // we re raise it in any case
            throw e;
        }
        // still here, so key is not missing anymore
        return result;
    }
    
    //
    p._resolve = function resolve() {
        // this threw an expectation in the previous version
        // that might be not needed any more
        // however job is expected to call _obrainAPI zero or more times
        return this.graph.job.call(this._host, this._args);
    } 
    
    p.execute = function execute () {
        var result;
        try {
            result = this._resolve();
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
            return state.execute();
        }
    }
    
    return executionEnvironmentFactory;
})()
