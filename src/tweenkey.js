/*
 *  Copyright (c) 2016 Iván Juárez Núñez
 *  This code is under MIT license
 *  https://github.com/radixzz/Tweenkey
 */

var Tweenkey = Tweenkey || (function( wnd ) {
    'use strict';

    var rAF, cAF;
    var tweens = [];

    // Flat dictionary to track all objects properties
    // ids are formed from objectId + propertyName
    var propDict = {};
    var propDictIdx = 1;

    var m = Math;

    var lastTime = 0;
    var timeBehind = 0;
    var autoUpdate = true;

    var _config = {
        autoUpdate: true,
        fpsStep: 1 / 60
    };

    var TYPE_FNC = Object.prototype.toString;
    var PERFORMANCE = wnd.performance;

    // Type constants
    var S_FNC   = 'F';
    var S_ARR   = 'A';
    var S_NUM   = 'N';
    var S_BOOL  = 'B';
    var S_OBJ   = 'O';

    // Define an array for each tween type to validate parameters
    var TWEEN_SET       = [ S_OBJ ];
    var TWEEN_TO        = [ S_NUM, S_OBJ ];
    var TWEEN_FROM      = [ S_NUM, S_OBJ ];
    var TWEEN_FROM_TO   = [ S_NUM, S_OBJ, S_OBJ ];

    function getTypeCheck( typeStr ) {
        return function( object ) {
            return TYPE_FNC.call( object )[ 8 ] == typeStr;
        };
    }

    // Global object to be shared between modules
    var _g = {
        isFunction      : getTypeCheck( S_FNC ),
        isObject        : getTypeCheck( S_OBJ ),
        isArray         : getTypeCheck( S_ARR ),
        isNumber        : getTypeCheck( S_NUM ),
        isBoolean       : getTypeCheck( S_BOOL ),
        now: function() {
            if (PERFORMANCE && PERFORMANCE.now) {
                return PERFORMANCE.now();
            } else {
                return +new Date();
            }
        },
        lerp: function( t, b, c, d ) {
            return c * t / d + b;
        },
        extend: function( target, source, overwrite ) {
            for ( var key in source ) {
                ( overwrite || !( key in target ) ) && ( target[ key ] = source[ key ] );
            }
            return target;
        },
        signatureEquals: function( argumentsArray, signature ) {
            var sig = argumentsArray.reduce(function( last, current ) {
                return last + ':' + TYPE_FNC.call( current )[ 8 ];
            }, '' ).slice( 1 );
            return sig == signature;
        }
    };

    function createCallback( cb, tween ) {
        var valid = _g.isFunction( cb );
        return function() {
            valid && cb.call( tween, tween._target );
        };
    }

    /*
    * Disables target properties of a tween.
    * It keeps global properties of dictionary in sync.
    * Keys param specifies which properties to disable.
    */
    function disablePropertiesIn( tween, keys ) {

        var unfiltered = _g.isObject( keys ) == false;
        var currentNode = tween._firstNode;

        do {
            for ( var idx = currentNode.properties.length; idx--; ) {

                var property = currentNode.properties[ idx ];

                // If there is a running property disable it
                // and remove it from dictionary
                if ( propDict[ property.id ] ) {
                    propDict[ property.id ].enabled = false;
                    delete propDict[ property.id ];
                }

                if (  unfiltered || keys[ property.name ] === true ) {
                    property.enabled = true;
                    propDict[ property.id ] = property;
                }
            }
        } while ( currentNode = currentNode.next );
    }

    function refreshPropertiesIn( tween ) {
        var currentNode = tween._firstNode;
        do {
            for ( var idx = currentNode.properties.length; idx--; ) {
                currentNode.properties[ idx ].refresh();
            }
        } while ( currentNode = currentNode.next );
    }

    function Property( id, name, originProperties, targetProperties ) {
        this.id = id;
        this.name = name;
        this.originProperties = originProperties;
        this.targetProperties = targetProperties;
        this.enabled = true;
    }

    Property.prototype = {
        refresh: function() {
            this.start = this.originProperties[ this.name ];
            this.end = this.targetProperties[ this.name ];
        }
    };

    function Tween( type ) {

        this._type = type;
        this._defined = false;

        return this;
    }

    /*
    * Updates the properties of a given tween
    */
    function tweenTick( tween, dt ) {

        var target = tween._target;

        tween._delayLeft = m.max( tween._delayLeft - dt, 0 );

        if ( tween._delayLeft == 0 ) {

            if ( tween._elapsedTime == 0 ) {
                refreshPropertiesIn( tween );
                // Fire onStart notification
                tween._onStart();
            }

            tween._elapsedTime += dt;

            // Default progress for tween.set
            tween._progress = 1;
            if ( tween._duration > 0 ) {
                tween._progress = m.min( 1, tween._elapsedTime / tween._duration );
            }

            // Update tween properties
            var currentNode = tween._firstNode;
            var updatedTargets = 0;

            do {
                var updated = false;
                for ( var idx = currentNode.properties.length; idx--; ) {
                    var property = currentNode.properties[ idx ];
                    if ( property.enabled ) {
                        currentNode.target[ property.name ] = tween._ease(
                            tween._progress,
                            property.start,
                            property.end - property.start,
                            1
                        );

                        updated = true;
                    } else {
                        // We remove the property entirely to avoid performance
                        // issues due many disabled properties looping.
                        // Restarting the loop will bring back the removed
                        // properties by calling resetTargetProperties()
                        currentNode.properties.splice( idx, 1 );
                    }
                }

                updatedTargets += updated | 0;

            } while ( currentNode = currentNode.next );

            // Fire onUpdate notification only if one or more properties were updated
            if ( updatedTargets > 0 ) {
                tween._onUpdate();
            } else {

                // No updated targets means all properties where overrided
                // We kill the tween early to avoid further notifications
                tween.kill();
            }
        }

        // Tween finished?
        if ( tween._elapsedTime >= tween._duration ) {
            if ( tween._alive ) {
                tween._onComplete();
            }

            // loop count validation should be in here
            tween.kill();
        }

    }

    /*
     * Builds a linked list of all objects and properties to iterate
     * It stores the first linked object in the current tween
     */
    function resetTargetProperties( tween, targetProperties, originProperties ) {

        var targets =  _g.isArray( tween._target ) ? tween._target : [ tween._target ];
        var prevNode, firstNode;

        for ( var idx = targets.length; idx--; ) {
            var currentTarget = targets[ idx ];

            // Tag object id without overwrite
            currentTarget._twkId = currentTarget._twkId || propDictIdx++;

            // If originProperties is defined then override start values of the object
            originProperties = originProperties || currentTarget;
            var properties = [];

            for ( var key in targetProperties ) {

                // Tweeneable param names can only be numbers and not tween property names
                // also we check that currentTarget property exists on target object
                if ( !tween[ key ] && key in currentTarget &&
                    _g.isNumber( targetProperties[ key ] ) ) {

                    var property = new Property(
                            currentTarget._twkId + key,
                            key,
                            originProperties,
                            targetProperties
                        );

                    // Swap from and to values if is tween from
                    if ( tween._type == TWEEN_FROM || tween._type == TWEEN_FROM_TO ) {
                        property.targetProperties = originProperties;
                        property.originProperties = targetProperties;
                    }

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

    function initTween( tween, target, params ) {

        var duration = params.shift();
        var params1 = params.shift();
        var params2 = params.shift();

        // Swap duration to params1 if no duration was defined (Tween.set)
        if ( _g.isObject( duration ) ) {
            params1 = duration;
            duration = 0;
        }

        // Select special params
        var sParams = params2 || params1;

        // Initialize tween properties
        var delay = _g.isNumber( sParams.delay ) ? m.max( 0, sParams.delay ) : 0;

        tween._target = target;

        _g.extend( tween, {
            _defined      : true,
            _progress       : 0,
            _elapsedTime    : 0,
            _alive          : true,
            _duration       : _g.isNumber( duration ) ? m.max( 0, duration ) : 0,
            _running        : _g.isBoolean( sParams.autoStart ) ? sParams.autoStart : true,
            _ease           : _g.isFunction( sParams.ease ) ? sParams.ease : _g.lerp,
            _delay          : delay,
            _delayLeft      : delay,
            _onStart        : createCallback( sParams.onStart, tween ),
            _onUpdate       : createCallback( sParams.onUpdate, tween ),
            _onComplete     : createCallback( sParams.onComplete, tween ),
            _params         : [ params1, params2 ]
        }, true );

        resetTargetProperties( tween, params1, params2 );
    }

    Tween.prototype = {

        define: function( params ) {
            var target = params.shift();
            var validParams = _g.signatureEquals( params, this._type.join( ':' ) );
            var validTarget = _g.isObject( target ) || _g.isArray( target );

            if ( validParams && validTarget ) {
                initTween( this, target, params );
                tweens.push( this );

            } else {
                console.warn( 'Invalid tween parameters:', params );
            }

            return this;
        },

        delay: function( seconds ) {
            this._delayLeft = this._delay = seconds;
            return this;
        },

        kill: function( properties ) {
            if ( _g.isObject( properties ) ) {
                disablePropertiesIn( this, properties );
            } else {
                this._alive = false;
            }
            return this;
        },

        pause: function() {
            this._running = false;
            return this;
        },

        resume: function() {
            this._running = true;
            return this;
        }
    };

    function executeOnAllTweens ( funcName, args ) {
        return function() {
            for ( var idx = tweens.length; idx--; ) {
                tweens[ idx ][ funcName ]( args );
            }
        };
    }

    function setAutoUpdate( enabled ) {
        autoUpdate = Boolean( enabled );
        if ( enabled ) {
            enterFrame( 0 );
        }
    }

    function updateTweens( delta ) {

        // clear killed tweens
        for ( var idx = tweens.length; idx--; ) {
            !tweens[ idx ]._alive && tweens.splice( idx, 1 );
        }

        // update tweens (order matters)
        for ( var idx = 0, length = tweens.length; idx < length; idx++  ) {
            tweens[ idx ]._running && tweenTick( tweens[ idx ], delta );
        }
    }

    function onFrame( t ) {

        var now = _g.now();

        var delta = ( now - lastTime ) / 1000 - timeBehind;

        timeBehind = m.max( timeBehind - _config.fpsStep, 0 );
        
        if ( delta > _config.fpsStep ) {
            lastTime = now;
            timeBehind = delta % _config.fpsStep;
            updateTweens( m.min( delta, _config.fpsStep * 2 ) );
        }

        autoUpdate && rAF( onFrame );
    }

    function manualStep( step ) {
        step = Number( step || _config.fpsStep );
        if ( step < 0 ) {
            step = 0;
        }
        autoUpdate == false && updateTweens( step );
    }

    function newTweenFactory( type ) {
        return function() {
            var tween = new Tween( type );

            // fix: V8 optimization-killer
            // https://github.com/petkaantonov/bluebird/wiki/Optimization-killers
            var args = [];
             for ( var i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments[ i ];
             }
            return tween.define( args );
        };
    }

    // borrowed from https://github.com/soulwire/sketch.js/blob/master/js/sketch.js
    (function shimAnimationFrame() {
        var vendors, a, b, c, i, now, dt, id;
        var then = 0;

        vendors = [ 'ms', 'moz', 'webkit', 'o' ];
        a = 'AnimationFrame';
        b = 'request' + a;
        c = 'cancel' + a;

        rAF = wnd[ b ];
        cAF = wnd[ c ];

        for ( var idx = vendors.lenght; !rAF && idx--; ) {
            rAF = wnd[ vendors[ idx ] + 'Request' + a ];
            cAF = wnd[ vendors[ idx ] + 'Cancel' + a ];
        };

        rAF = rAF || function( callback ) {
            now = _g.now();
            dt = m.max( 0, 16 - ( now - then ) );
            id = setTimeout(function() {
                callback( now + dt );
            }, dt );
            then = now + dt;
            return id;
        };

        cAF = cAF || function( id ) {
            clearTimeout( id );
        };
    })();

    onFrame( 0 );

    return {
        set         : newTweenFactory( TWEEN_SET ),
        to          : newTweenFactory( TWEEN_TO ),
        from        : newTweenFactory( TWEEN_FROM ),
        fromTo      : newTweenFactory( TWEEN_FROM_TO ),
        killAll     : executeOnAllTweens( 'kill' ),
        pauseAll    : executeOnAllTweens( 'pause' ),
        resumeAll   : executeOnAllTweens( 'resume' ),
        update      : manualStep,
        autoUpdate  : setAutoUpdate
  };
})( window );

(function( root ) {

    if ( typeof define === 'function' && define.amd ) {

        // AMD
        define([], function() {
            return Tweenkey;
        });
    } else if ( root !== undefined ) {

        // Global variable
        root.Tweenkey = Tweenkey;

    }

})( this );
