
// TODO: add a sleep tweens layer to avoid main tweens array from getting too big
var tweens = [];
var timelines = [];
var tickers = [];
var mainTicker;
var sleeping = true;

var PROP_NUMBER = 0;
var PROP_ARRAY = 1;
var PROP_COLOR = 2;
var PROP_WAYPOINTS = 3;
var PROP_INVALID = 4;

var TL_ITEM_TWEEN = 0;
var TL_ITEM_CALLBACK = 1;
var TL_ITEM_LINE_SYNC = 2;
var TL_ITEM_LINE_ASYNC = 3
var TL_ITEM_DELAY = 4;
var TL_ITEM_LABEL = 5;
var TL_ITEM_INVALID = 6;

// Flat dictionary to track all objects properties.
// Id's are formed from objectId + propertyName
var propDict = {};
var propDictIdx = 1;


function awake() {
    setTimeout( function() {
        sleeping = false;
        onFrame();
    }, 1 );
}
/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    var all = ! _isArray( keys );
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {

            var property = currentNode.properties[ idx ];

            if ( property.enabled && ( all || keys.indexOf(property.name) > -1 ) ) {
                property.enabled = false;
                delete propDict[ property.id ];
            }

        }
    } while ( currentNode = currentNode.next );
}

/*
* Reassigns all <enabled> properties from tween targets into the dictionary,
* if a property exists it will disable it prior deletion
*/
function overrideDictionaryProperties( tween ) {
    var currentNode = tween._firstNode;

    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            var property = currentNode.properties[ idx ];
            if ( property.enabled ) {
                
                // If there is a running property disable it
                // and remove it from dictionary
                if ( propDict[ property.id ] && propDict[ property.id ] !== property) {
                    propDict[ property.id ].enabled = false;
                    delete propDict[ property.id ];
                }

                propDict[ property.id ] = property;
            }
        }
    } while ( currentNode = currentNode.next );
}

/*
* Sync values between object properties and target properties
*/
function syncTargetProperties( tween ) {
    var currentNode = tween._firstNode;
    do {
        for ( var idx = currentNode.properties.length; idx--; ) {
            currentNode.properties[ idx ].refresh();
        }
    } while ( currentNode = currentNode.next );
}

function getPropertyType( s, e, t ) {

    if ( _isNumber( s ) &&
         _isNumber( e ) &&
         _isNumber( t ) ) {
            return PROP_NUMBER;
    } else if (
        colorRE.test( s ) &&
        colorRE.test( e ) &&
        colorRE.test( t ) ) {
            return PROP_COLOR;
    } else if ( 
        _isArray( s ) &&
        _isArray( e ) &&
        _isArray( t ) ) {
            return PROP_ARRAY;
    } else if (
        _isNumber( s ) &&
        _isArray( e ) &&
        _isNumber( t )
    ) {
        return PROP_WAYPOINTS;
    } else {
        return PROP_INVALID;
    }
}

function TweenProperty( id, name, target, origProps, targetProps ) {
    this.id = id;
    this.name = name;
    this.target = target;
    this.origProps = origProps;
    this.targetProps = targetProps;
    this.enabled = true;
    this.length = 0;
}

TweenProperty.prototype = {
    _expandArrayProperties: function( o, t ) {
        var tp = this.target[ this.name ];
        var len = m.max( o.length, t.length );
        for ( var i = 0; i < len; i++ ) {
            o[ i ] = o[ i ] != undefined ? o[ i ] : tp[ i ];
            t[ i ] = t[ i ] != undefined ? t[ i ] : tp[ i ];
        }
        this.length = len;
    },
    refresh: function() {
        this.start = this.origProps[ this.name ];
        if ( this.start === undefined ) {
            this.start = this.target[ this.name ];
        }
        
        this.end = this.targetProps[ this.name ];
        if ( this.end === undefined ) {
            this.end = this.target[ this.name ];
        }

        this.type = getPropertyType(
            this.start, this.end, this.target[ this.name ] );
        
        if ( this.type == PROP_ARRAY ) {
            this._expandArrayProperties( this.start, this.end );
        } else if ( this.type == PROP_WAYPOINTS ) {
            this.waypoints = [ this.start ].concat( this.end );
        } else if ( this.type == PROP_COLOR ) {
            this.colorStart = _hexStrToRGB( this.start );
            this.colorEnd = _hexStrToRGB( this.end );
        }
    }
};

function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;

    do {
        var updated = false;
        for ( var idx = currentNode.properties.length; idx--; ) {
            var p = currentNode.properties[ idx ];
            if ( p.enabled && p.type !== PROP_INVALID ) {
                
                switch( p.type ) {
                    case PROP_ARRAY:
                        var arr = currentNode.target[ p.name ];
                        for ( var j = 0; j < p.length; j++ ) {
                            var start = p.start[ j ];
                            var end = p.end[ j ] - start;
                            
                            arr[ j ] = tween._ease(
                                tween._progress,
                                start,
                                end
                            );
                        }
                        break;
                    case PROP_NUMBER:
                        currentNode.target[ p.name ] = tween._ease(
                            tween._progress,
                            p.start,
                            p.end
                        );
                        break;
                    case PROP_WAYPOINTS:
                        var len = p.waypoints.length - 1;
                        var a = len *  tween._progress;
                        var b = m.floor( a );
                        var val = tween._ease(
                            a - b,
                            p.waypoints[ b ],
                            p.waypoints[ b + 1 > len ? len : b + 1 ]
                        );
                        currentNode.target[ p.name ] = val;
                        break;
                    case PROP_COLOR:
                        var prog = tween._progress;
                        var r = tween._ease( prog, p.colorStart[ 0 ], p.colorEnd[ 0 ] );
                        var g = tween._ease( prog, p.colorStart[ 1 ], p.colorEnd[ 1 ] );
                        var b = tween._ease( prog, p.colorStart[ 2 ], p.colorEnd[ 2 ] );
                        var hex = ( ( r * 255 ) << 16 ) + ( ( g * 255) << 8 ) + ( b * 255 | 0 );
                        currentNode.target[ p.name ] = '#' + hex.toString( 16 );
                        break;
                }
                
                updated = p.type !== PROP_INVALID;
            } else {
                // We remove the property entirely to avoid performance
                // issues due many disabled properties loopping.
                // Restarting the loop will bring back the removed
                // properties by calling resetTargetProperties()
                currentNode.properties.splice( idx, 1 );
            }
        }

        updatedTargets += updated | 0;

    } while ( currentNode = currentNode.next );

    return updatedTargets;
}

/*
* Updates the properties of a given tween
*/
function tweenTick( tween, dt ) {

    if ( tween._delayLeft == 0 ) {
        if ( tween._syncNextTick ) {
            tween._syncNextTick = false;
            // Update current properties from targets
            syncTargetProperties( tween );

            // Kill all previous active properties in tween
            overrideDictionaryProperties( tween );
        }

        if ( ! tween._started ) {
            tween._started = true;
            // Fire onStart notification
            tween._onStart( tween._target );
        }

        // Update tween properties with current progress
        var updatedTargets = updateTweenProperties( tween );

        // Fire onUpdate notification only if one or more properties were updated
        if ( updatedTargets > 0 ) {
            tween._onUpdate( tween._target );
        } else {

            // No updated targets means all properties where overrided
            // We kill the tween early to avoid further notifications
            tween.kill();
        }
    }

    updateState( tween );
    applyStep( tween, dt );    
}

/*
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
function resetTargetProperties( tween, targetProperties, originProperties ) {

    var targets =  _isArray( tween._target ) ? tween._target : [ tween._target ];
    var prevNode, firstNode;

    // merge keys of targetProperties and originProperties without duplicates
    var allKeys = Object.keys( targetProperties );
	var oKeys = Object.keys( originProperties );
	for ( var i = 0; i < oKeys.length; i++ ) {
		if ( ! targetProperties[ oKeys[ i ] ] ) {
			allKeys.push( oKeys[ i ] );
		}
	}

    for ( var idx = targets.length; idx--; ) {
        var currentTarget = targets[ idx ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        var properties = [];
        for ( var pIdx = 0; pIdx < allKeys.length; pIdx++ ) {
            var key = allKeys[ pIdx ];

            // Check if key is not a tween property
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget ) {
                var property = new TweenProperty(
                    currentTarget._twkId + key,
                    key,
                    currentTarget,
                    originProperties,
                    targetProperties
                );

                property.refresh();
                properties.push( property );
            }
        }

        var currentNode = {
            target      : currentTarget,
            properties  : properties
        };

        firstNode = firstNode || currentNode;

        if ( prevNode ) {
            prevNode.next = currentNode;
        }

        prevNode = currentNode;
    }

    tween._firstNode = firstNode;
}

function popTweenFromRenderer( tween ) {
    var idx = tweens.indexOf( tween );
    if ( idx !== -1 ) {
        tweens.splice( idx, 1 );
        tween._queued = false;
    }
}

function pushTweenToRenderer( tween ) {
    if ( ! tween._queued ) {
        resetTargetProperties( tween, tween._to, tween._from );
        
        tweens.push( tween );
        
        // flag to avoid pushing again to renderer
        tween._queued = true; 

        // refresh all properties
        tween._syncNextTick = true;

        // fire onStart event
        tween._started = false;
        awake();
    }
}

function getEasing( val ) {
    if ( easing[ val ] ) {
        return easing[ val ];
    } else if ( _isArray( val ) && val.length == 4 ) {
        return wrapEasing( bezierEase.apply( this, val ) );
    } else {
        if ( val != undefined ) {
            var easingNames = Object.keys( easing ).join(' | ');
            console.warn( 'Invalid easing name: ' + val );
            console.warn( 'Available easings: ' + easingNames );
        }
        return easing.linear;
    }
}

function initTween( tween, target, params ) {
    tween._initted = false;
    var duration = params.shift();
    var cfg = params.shift();

    // expecting duration in position 1
    // buf if an object was given instead
    // then treat it as Tween.set
    if ( _isObject( duration ) ) {
        cfg = duration;
        duration = 0;
    }

    tween._target       = target;
    tween._queued       = false;
    tween._syncNextTick = true;
    tween._ease         = getEasing( cfg.ease );
    tween._from         = _isObject( cfg.from ) ? cfg.from : {};
    tween._to           = _isObject( cfg.to ) ? cfg.to: {};
    tween._duration     = _isNumber( duration ) ? m.max( 0, duration ) : 0;
    tween._initted      = true;

    initObjectRunnable( tween, cfg );
    initObjectCallbacks( tween, cfg );
}

function Tween( params ) {
    var target = params.shift();
    if ( typeof target == 'object' && params.length > 0 ) {
        initTween( this, target, params );
    } else {
        throw 'Invalid Tween';
    }
    return this;
}

Tween.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        seek( this, progress, accountForDelay, false );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        seek( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        overrideDictionaryProperties( this );
        updateTweenProperties( this );
    },
    restart: function( accountForDelay, immediateRender ) {

        // default for accountForDelay is false
        accountForDelay = _isBoolean( accountForDelay ) ? accountForDelay : false;
        
        // default for immediateRender is true
        immediateRender = _isBoolean( immediateRender ) ? immediateRender : true;

        this._elapsedTime = 0;
        this._progress = 0;

        this._delayLeft = accountForDelay ? this._delay : 0;
        this._alive = true;
        this._direction = 1;
        this._started = false;
        this.resume();

        if ( immediateRender || this._delayLeft > 0 ) {
            this.render();
        }

        return this;
    },
    reverse: function() {
        this._direction *= -1;
        return this;
    },
    timeScale: function( scale ) {
        if ( _isNumber( scale ) && scale > 0 ) {
            this._timeScale = scale;
        }
        return this;
    },
    kill: function() {
        if ( arguments.length > 0 ) {

            // fix: avoid optimization bailout
            var args = [];
            for ( var i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments[ i ];
            }
            disableProperties( this, args );
        } else {
            this._alive = false;
            this._running = false;
        }
        return this;
    },
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._running = true;
        pushTweenToRenderer( this );
        return this;
    },
    stop: function() {
        popTweenFromRenderer( this );
        return this;
    },
    duration: function() {
        var s = this._timeScale;
        var d = this._duration / s;
        if ( this._repeat > 1 ) {
            var repeatTime = ( this._repeat - 1 ) * this._repeatDelay;
            d = ( d * this._repeat ) + repeatTime / s;
        }
        return d + this._delay / s;
    },
    toString: function() {
        return '[object Tween]';
    }
};

function executeOnAllTweens ( funcName ) {
    return function() {
        for ( var idx = tweens.length; idx--; ) {
            var tween = tweens[ idx ];
            tween[ funcName ].apply( tween, arguments );
        }
    };
}

function updateTweens( delta ) {

    // clear killed tweens
    for ( var idx = tweens.length; idx--; ) {
        if ( ! tweens[ idx ]._alive ) {
            tweens[ idx ]._queued = false;
            tweens.splice( idx, 1 );
        }
    }

    // update tweens (order matters)
    for ( var idx = 0, length = tweens.length; idx < length; idx++  ) {
        tweens[ idx ]._running && tweenTick( tweens[ idx ], delta );
    }
}

function onFrame() {
    var now = _now();
    var requestNextFrame = false;

    if ( mainTicker._running ) {
        mainTicker.tick( now );
        requestNextFrame = true;
    }

    // Update tickers
    for ( var idx = tickers.length; idx--; ) {
        
        var ticker = tickers[ idx ];
        
        if ( ticker._running ) {
            ticker.tick( now );
            requestNextFrame = true;
        }

        if ( ! ticker._alive ) {
            tickers.splice( idx, 1 );
        }
    }

    if ( tweens.length === 0 && tickers.length === 0 ) {
        sleeping = true;
    }

    if ( requestNextFrame && !sleeping ) {
        rAF( onFrame );
    }
}

function newTicker( params ) {
    var ticker = new Ticker( params );
    tickers.push(ticker);
    awake();
    return ticker;
}

function Ticker( params ) {
    params = params || {};
    this._onTick = _isFunction( params.onTick ) ? params.onTick : _noop;
    this._alive = true;
    this.setFPS( params.fps );
    this.resume();
}

Ticker.prototype = {
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._then = _now();
        this._running = true;
        rAF( onFrame );
        return this;
    },
    kill: function() {
        this._alive = false;
        return this;
    },
    tick: function( time ) {
        var delta = time - this._then;

        if ( delta > this._fpsStep ) {
            var drop = delta % this._fpsStep;
            this._then = time - drop;
            this._onTick( m.min( delta - drop, this._fpsStep * 2 ) / 1000 );
        }

        return this;
    },
    setFPS: function( fps ) {
        this.fps = _isNumber( fps ) && fps > 0 ? fps : 60;
        this._fpsStep = 1000 / this.fps;
    },
    toString: function() {
        return '[object Ticker]';
    }
}

function setAutoUpdate( enabled ) {
    if ( enabled ) {
        mainTicker.resume();
    } else {
        mainTicker.pause();
    }
}

function manualStep( step ) {
    step = typeof step == 'number' ? step : mainTicker._fpsStep;
    if ( step < 0 ) {
        step = 0;
    }
    ! mainTicker._running && updateTweens( step );
}

function newTweenFactory() {        
    return function create() {

        // fix: avoid optimization bailout
        // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
        var i = arguments.length;
        var args = [];
        while (i--) args[i] = arguments[i];

        var tween = new Tween( args );
        if ( tween._initted ) {
            pushTweenToRenderer( tween );
        }
        return tween;
    };
}

function getDefinitionType( obj ) {
    if ( obj instanceof Tween ) {
        return TL_ITEM_TWEEN;
    } else if ( _isNumber( obj ) ){
        return TL_ITEM_DELAY;
    } else if ( _isString( obj ) ) {
        return TL_ITEM_LABEL;
    } else if ( _isFunction( obj ) ) {
        return TL_ITEM_CALLBACK;
    } else if ( _isArray( obj ) ) {
        return TL_ITEM_LINE_SYNC;
    } else if ( _isObject( obj ) ) {
        return TL_ITEM_LINE_ASYNC;
    } else {
        return TL_ITEM_INVALID;
    }
}

function isValidLine( labels, lineArray ) {
    var valid = true;
    for( var i = 0; i < lineArray.length; i++ ) {
        var item = lineArray[ i ];
        var type = getDefinitionType( item );
        if ( type == TL_ITEM_INVALID ) {
            valid = false;
        } else if ( type == TL_ITEM_LABEL ) {
            valid = labels[ item ] !== undefined;
        
        // validate nested arrays recursively
        } else if ( type == TL_ITEM_LINE_SYNC ) {
            valid = isValidLine( labels, item );
        
        // validate that objects have only numbers assigned
        // only numbers are valid
        } else if ( type == TL_ITEM_LINE_ASYNC ) {
            var keys = Object.keys( item );
            for( var j = 0; j < keys.length; j++ ) {
                var key = keys[ j ];
                if ( !_isNumber( item[ key ] ) ) {
                    valid = false;
                    break;
                }
            }
        }

        if ( ! valid ) {
            console.warn( 'Unknown label value:', item );
            break;
        }
    }
    return valid;
}

function TimelineItem( obj, type, start, end ) {
    this.obj = obj;
    this.type = type;
    this.start = start;
    this.end = end;
}

// Get the final object of a label
// resolves indirections of n labels to an object
function resolveLabel( items, val ) {
    return _isString( val ) ? resolveLabel( items, items[ val ] ) : val;
}

// Resolves all labels in items to their final objects
// returns a flatten array with all the items
function resolveItemLabels( items, arr ) {
    var done = true;
    for( var i = 0; i < arr.length; i++ ) {
        var val = resolveLabel( items, arr[ i ] );

        if ( _isString( val ) ) {
            done = false;
            break;
        }

        if ( _isArray( val ) ) {
            arr[ i ] = resolveItemLabels( items, val );
        } else {
            arr[ i ] = val;
        }
    }

    if ( ! done ) {
        arr = resolveItemLabels( items, arr );
    }
    
    return _flatten( arr );
}

// adjust current items to start from 0
// shifting negative offsets over all items
function absShiftTimeLineItems( items ) {
    var minOffset = _min( items, 'start' );
    if ( minOffset < 0 ) {
        var shift = m.abs( minOffset );
        for ( var i = 0; i < items.length; i++ ) {
            items[ i ].start += shift;
            items[ i ].end += shift;
        }
    }
    return items;
}

function getItemsDuration( items ) {
    return _max( items, 'end' ) - _min( items, 'start' );
}

function computeTimeLineItems( items, startLabel, offset ) {
    offset = offset || 0 ;
    var result = [];
    var line = resolveLabel( items, startLabel );
    line = _isArray( line ) ? line : [ line ];

    // resolve all labels to objects and flatten all
    // excluding async blocks
    var rLine = resolveItemLabels( items, line );
    for ( var i = 0; i < rLine.length; i++ ) {
        var obj = rLine[ i ];
        var type = getDefinitionType( obj );
        if ( type == TL_ITEM_DELAY ) {
            offset += obj;
        } else {
            var start = offset; 
            var end = offset;
            
            if ( type == TL_ITEM_TWEEN ) {
                end = start + obj.duration();
            }

            if ( type == TL_ITEM_LINE_ASYNC ) {
                var keys = Object.keys( obj );
                var subItems = [];
                var min = 0;
                for( var j = 0; j < keys.length; j++ ) {
                    var key = keys[ j ];
                    min = m.min( min, obj[ key ] );

                    // apply global offset
                    var aOffset = obj[ key ] + offset;

                    // compute label recursively
                    subItems = subItems.concat(
                        computeTimeLineItems( items, key, aOffset ) );
                }
                result = result.concat( subItems );
                
                // add current block duration to global offset ( positive only )
                offset += getItemsDuration( subItems );

                // sub negative displacement in block to global offset
                offset += min < 0 ? min : 0;
            } else {
                result.push( new TimelineItem( obj, type, start, end ) );
                offset += end - start;
            }
        }
    }
    return result;
}

function initTimeline( tl, params ) {
    tl._initted = false;
    initObjectCallbacks( tl, params );
    initObjectRunnable( tl, params );
    tl._initted = true;
}

function Timeline ( params ) {
    initTimeline( this, params );
    this._definitions = {};
    this._computedItems = [];
    this._startLabel = '';
    this._ticker = newTicker({
        onTick: this.tick.bind( this )
    });

    if ( ! this._autoStart ) {
        this._ticker.pause();
    }
}

function timelineTick( tl, dt ) {
    if ( tl._delayLeft === 0 ) {

        if ( ! tl._started ) {
            tl._started = true;
            tl._onStart( tl );
        }

        for( var i = 0; i < tl._computedItems.length; i++ ) {
            var item = tl._computedItems[ i ];
            if ( tl._direction == 1 && tl._elapsedTime >= item.start ||
                 tl._direction == -1 && tl._elapsedTime <= item.end ) {
                if ( item.type == TL_ITEM_TWEEN ) {
                    seek( item.obj, tl._elapsedTime - item.start, true, true );
                    tweenTick( item.obj, 0 );
                }

                if ( item.type == TL_ITEM_CALLBACK ) {
                    item.obj.apply( tl );
                }
            }
        }
    }
    updateState( tl );
    applyStep( tl, dt );
}

Timeline.prototype = {
    _precompute: function( label ) {
        if ( this._needsRecompute ) {
            label = label || this._startLabel;
            var items = computeTimeLineItems( this._definitions, label );
            this._computedItems = absShiftTimeLineItems( items );
            this._duration = getItemsDuration( this._computedItems );
            this._needsRecompute = false;
        }
    },
    let: function( label, obj ) {
        var type = getDefinitionType( obj );
        if ( _isString( label ) && type != TL_ITEM_INVALID ) {
            
            var isLine = type == TL_ITEM_LINE_SYNC || type == TL_ITEM_LINE_ASYNC;
            if ( isLine && !isValidLine( this._definitions, obj ) ) {
                return this;
            }
            
            if ( type == TL_ITEM_TWEEN ) {
                // remove tween object from main renderer
                obj.stop();
            }

            this._definitions[ label ] = obj;
            this._needsRecompute = true;
        }
        return this;
    },
    tick: function( dt ) {
        this._precompute();
        timelineTick( this, dt );
        if ( ! this._alive ) {
            this._ticker.kill();
        }
        return this;
    },
    delay: function( value ) {
        this._delay = _isNumber( value ) ? value : 0;
        return this;
    },
    plot: function( label ) {
        if ( typeof plotTimeline !== 'undefined' )
            plotTimeline( this, label );
        return this;
    },
    reverse: function() {
        this._direction *= -1;
        return this;
    },
    yoyo: function( value ) {
        this._yoyo = _isBoolean( value ) ? value: false;
        return this;
    },
    duration: function() {
        this._precompute();
        return this._duration;
    },
    timeScale: function( value ) {
        this._timeScale = _isNumber( value ) ? m.max( 0, value ) : 1;
    },
    seek: function( seconds, accountForDelay ) {
        this._precompute();
        seek( this, seconds, accountForDelay, true );
        this.tick( 0 );
        return this;
    },
    progress: function( value, accountForDelay ) {
        this._precompute();
        seek( this, value, accountForDelay, false );
        this.tick( 0 );
        return this;
    },
    pause: function() {
        this._ticker.pause();
        return this;
    },
    resume: function() {
        this._ticker.resume();
        return this;
    },
    restart: function( accountForDelay ) {
        this._delayLeft = accountForDelay ? this._delay : 0;
        return this;
    },
    play: function( label ) {
        // TODO: validate label?
        this._startLabel = label;
        this._ticker.resume();
        return this;
    },
    kill: function() {
        this._ticker.kill();
        return this;
    }
};

function newTimeline( params ) {
    return new Timeline( params );
}

mainTicker = new Ticker({ onTick: updateTweens });

var instance = new function Tweenkey(){};

return _extend( instance, {
    set         : newTweenFactory(),
    tween       : newTweenFactory(),
    killAll     : executeOnAllTweens( 'kill' ),
    killTweensOf: function() { console.log('todo'); },
    pauseAll    : executeOnAllTweens( 'pause' ),
    resumeAll   : executeOnAllTweens( 'resume' ),
    timeline    : newTimeline,
    ticker      : newTicker,
    update      : manualStep,
    autoUpdate  : setAutoUpdate,
    setFPS      : mainTicker.setFPS.bind( mainTicker )
} );

