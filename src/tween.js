import * as common from './common';
import * as utils from './utils';
import * as easing from './easing';
import * as globals from './globals';

import {
    TweenProperty,
    PROP_ARRAY,
    PROP_COLOR,
    PROP_NUMBER,
    PROP_WAYPOINTS,
    PROP_INVALID
} from './tween-property';

// Flat dictionary to track all objects properties.
// Id's are formed from objectId + propertyName
let propDict = {};
let propDictIdx = 1;

class Tween {
    constructor( onQueue, onDequeue ) {
        this._onQueue = onQueue;
        this._onDequeue = onDequeue;
    }
};

Tween.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        this._onQueue( this );
        common.seekProgress( this, progress, true, accountForDelay );
        tweenTick( this, 0 );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        common.seek( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        overrideDictionaryProperties( this );
        updateTweenProperties( this );
    },
    restart: function( accountForDelay, immediateRender ) {

        // default for accountForDelay is false
        accountForDelay = utils.isBoolean( accountForDelay ) ? accountForDelay : false;
        
        // default for immediateRender is true
        immediateRender = utils.isBoolean( immediateRender ) ? immediateRender : true;
        
        this._lastElapsedTime = 0;
        this._elapsedTime = 0;
        this._progress = 0;
        this._totalProgress = 0;
        this._running = true;
        this._direction = 1;
        this.resume();

        if ( immediateRender ) {
            this.render();
        }

        return this;
    },
    reverse: function() {
        this._direction *= -1;
        return this;
    },
    timeScale: function( scale ) {
        if ( utils.isNumber( scale ) && scale > 0 ) {
            this._timeScale = scale;
        }
        return this;
    },
    clear: function() {
        if ( arguments.length > 0 ) {

            // fix: avoid optimization bailout
            var args = [];
            for ( var i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments[ i ];
            }
            disableProperties( this, args );

        } else {
            this._running = false;
            disableProperties( this );
            this._firstNode = undefined;
        }
        this._onDequeue( this );
        return this;
    },
    pause: function() {
        this._running = false;
        this._onDequeue( this );
        return this;
    },
    resume: function() {
        this._running = true;
        this._onQueue( this );
        return this;
    }
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

/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    var all = ! utils.isArray( keys );
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



function getLocalProgress( obj ) {
    if ( obj._yoyo && obj._elapsedTime > obj._duration + obj._delay ) {
        // when yoyo is active we need to invert
        // the progress on each odd lap
        var local = obj._duration + obj._repeatDelay + globals.DEC_FIX;
        var elapsed = Math.max( 0, obj._elapsedTime - obj._delay );
        var lapOdd = Math.ceil( elapsed / local ) % 2 === 0;
        return lapOdd ? 1 - obj._progress : obj._progress;
    } else {
        return obj._progress;
    }
}

function updateTweenProperties( tween ) {
    var currentNode = tween._firstNode;
    var updatedTargets = 0;

    do {
        var progress = getLocalProgress( tween );
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
                                progress,
                                start,
                                end
                            );
                        }
                        break;
                    case PROP_NUMBER:
                        currentNode.target[ p.name ] = tween._ease(
                            progress,
                            p.start,
                            p.end
                        );
                        break;
                    case PROP_WAYPOINTS:
                        var len = p.waypoints.length - 1;
                        var a = len * progress;
                        var b = Math.floor( a );
                        var val = tween._ease(
                            a - b,
                            p.waypoints[ b ],
                            p.waypoints[ b + 1 > len ? len : b + 1 ]
                        );
                        currentNode.target[ p.name ] = val;
                        break;
                    case PROP_COLOR:
                        var r = tween._ease( progress, p.colorStart[ 0 ], p.colorEnd[ 0 ] );
                        var g = tween._ease( progress, p.colorStart[ 1 ], p.colorEnd[ 1 ] );
                        var b = tween._ease( progress, p.colorStart[ 2 ], p.colorEnd[ 2 ] );
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
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
export function resetTargetProperties( tween ) {
    var targetProperties = tween._to;
    var originProperties = tween._from;
    var targets = utils.isArray( tween._target ) ? tween._target : [ tween._target ];
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

function initTweenProperties( tween, target, duration, params ) {
    tween._target       = target;
    tween._syncNextTick = true;
    tween._ease         = easing.getEasing( params.ease );
    tween._from         = utils.isObject( params.from ) ? params.from : {};
    tween._to           = utils.isObject( params.to ) ? params.to: {};
    tween._duration     = utils.isNumber( duration ) ? Math.max( 0, duration ) : 0;
}


function setTweenTotalDuration( tween ) {
    var total = 0;
    var tweenDuration = tween._duration;
    var repeatDelay = tween._repeatDelay;
    var delay = tween._delay;
    
    if ( tween._infinite ) {
        // if is an infinite loop then just 
        // take two laps as the total duration
        total = tween._duration * 2;
        total += delay + repeatDelay * 2;
    } else if ( tween._repeat > 0 ) {
        var repeatDuration = ( tweenDuration + repeatDelay ) * tween._repeat;
        total = tweenDuration + repeatDuration + delay;
    } else {
        total = tweenDuration + delay;
    }

    tween._totalDuration = total;
}

function initTween( tween, target, duration, params ) {
    initTweenProperties( tween, target, duration, params );
    common.initObjectRunnable( tween, params );
    common.initObjectCallbacks( tween, params );
    setTweenTotalDuration( tween );
    if ( tween._running ) {
        tween.resume();
    }
}

/*
* Updates the properties of a given tween
*/
export function tweenTick( tween, dt ) {
    common.notifyStart( tween );
    if ( tween._elapsedTime - tween._delay > 0 ) {
        if ( tween._syncNextTick ) {
            tween._syncNextTick = false;
            // Update current properties from targets
            syncTargetProperties( tween );

            // clear all previous active properties in tween
            overrideDictionaryProperties( tween );
        }

        // Update tween properties with current progress
        var updatedTargets = updateTweenProperties( tween );

        // Fire onUpdate notification only if one or more properties were updated
        if ( updatedTargets > 0 ) {
            common.notifyOnUpdate( tween );
        } else {

            // No updated targets means all properties where overrided
            // We clear the tween early to avoid further notifications
            tween.clear();
        }
    } else {
        updateTweenProperties( tween );
    }
    
    common.notifyOnRepeat( tween );
    common.notifyOnComplete( tween );
    common.updateState( tween );
    common.applyStep( tween, dt );
}

export function tweenFactory( onQueue, onDequeue ) {  
    return ( target, duration, params ) => {
        
        if ( utils.isObject( duration ) ) {
            params = duration;
            duration = 0;    
        }
        
        const valid = utils.isObject( target ) &&
            utils.isObject( params ) &&
            utils.isNumber( duration );
        
        if ( valid ) {
            let instance = new Tween( onQueue, onDequeue );
            initTween( instance, target, duration, params );
            return instance;
        } else {
            throw 'Invalid Tween Params';
        }
    };
}
