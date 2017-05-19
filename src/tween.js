import * as common from './common';
import * as utils from './utils';
import * as easing from './easing';

import {
    TweenProperty,
    PROP_ARRAY,
    PROP_COLOR,
    PROP_NUMBER,
    PROP_WAYPOINTS,
    PROP_INVALID
} from './tween-property';

export const TWEEN_SET = 0;
export const TWEEN_ALL = 1;
export const TWEEN_FROM = 2;
export const TWEEN_TO = 3;

// Dictionary to track all objects properties.
let propDict = {};
let propDictIdx = 1;

export class Tween {
    constructor( type, onStateChange ) {
        this._type = type;
        this._onStateChange = onStateChange;
    }
};

Tween.prototype = {
    delay: function( seconds ) {
        this._delayLeft = this._delay = seconds;
        return this;
    },
    progress: function( progress, accountForDelay ) {
        common.seekProgress( this, progress, true, accountForDelay );
        tweenTick( this, 0 );
        return this;
    },
    time: function( seconds, accountForDelay ) {
        common.seek( this, seconds, accountForDelay, true );
        return this;
    },
    render: function() {
        //syncTargetProperties( this );
        //overrideDictionaryProperties( this );
        updateTweenProperties( this );
        common.notifyOnUpdate( this );
    },
    restart: function( accountForDelay, immediateRender ) {
        // default for immediateRender is true
        immediateRender = utils.isBoolean( immediateRender ) ? immediateRender : true;
        
        common.initObjectRunnable( this );
        common.setRunnableTotalDuration( this );
        this.resume();

        this._elapsedTime = accountForDelay ? 0 : this._delay;
        
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
    kill: function() {
        if ( arguments.length > 0 ) {

            // fix: avoid optimization bailout
            let args = [];
            for ( let i = 0; i < arguments.length; ++i ) {
                args[ i ] = arguments[ i ];
            }
            disableProperties( this, args );

        } else {
            this._running = false;
            disableProperties( this );
        }
        this._alive = false;
        this._onStateChange( this );
        return this;
    },
    pause: function() {
        this._running = false;
        return this;
    },
    resume: function() {
        this._running = true;
        this._onStateChange( this );
        return this;
    }
}

/*
* Sync values between object properties and target properties
*/
function syncTargetProperties( tween ) {
    let currentNode = tween._firstNode;
    do {
        for ( let i = currentNode.properties.length; i--; ) {
            currentNode.properties[ i ].sync();
        }
    } while ( currentNode = currentNode.next );
}

function clearEmptyObject( objectId ) {
    let obj = propDict[ objectId ];
    if ( obj && Object.keys( obj ).length === 0 ) {
        delete propDict[ objectId ];
    }
}

function clearProperty( property ) {
    if ( property.enabled ) {
        property.enabled = false;
        let targetId = property.target._twkId;
        if ( propDict[ targetId ] ) {
            delete propDict[ targetId ][ property.name ];
        }
    }
}

/*
* Disables only <enabled> properties of a tween and removes them from dictionary.
* Keys param specifies an array containing which properties to disable, by default
* if no keys param is provided all enabled properties will be disabled.
*/
function disableProperties( tween, keys ) {

    let all = ! utils.isArray( keys );
    let currentNode = tween._firstNode;

    if ( utils.isUndefined( currentNode ) ) {
        return;
    }

    do {
        for ( let i = currentNode.properties.length; i--; ) {
            let property = currentNode.properties[ i ];
            if ( property.enabled && ( all || keys.indexOf( property.name ) > -1 ) ) {
                clearProperty( property );
                clearEmptyObject( property.target._twkId );
            }
        }
    } while ( currentNode = currentNode.next );
}


/*
* Reassigns all <enabled> properties from tween targets into the dictionary,
* if a property exists it will be disabled prior deletion
*/
function overrideDictionaryProperties( tween ) {
    let currentNode = tween._firstNode;

    do {
        for ( let i = currentNode.properties.length; i--; ) {
            let property = currentNode.properties[ i ];
            if ( property.enabled ) {
                
                // If there is a running property disable it
                // and remove it from dictionary
                let targetId = property.target._twkId;
                let existingTarget = propDict[ targetId ] || {};
                if ( existingTarget[ property.name ] && existingTarget[ property.name ] !== property) {
                    clearProperty( existingTarget[ property.name ] );
                    clearEmptyObject( targetId );
                }

                // update reverse dictionary
                propDict[ targetId ] = propDict[ targetId ] || {};
                propDict[ targetId ][ property.name ] = property;

                
            }
        }
    } while ( currentNode = currentNode.next );
}


function updateTweenProperties( tween ) {
    let currentNode = tween._firstNode;
    let updatedTargets = 0;
    
    if ( utils.isUndefined( currentNode ) ) {
        return;
    }

    do {
        let progress = common.getProgress( tween );
        let updated = false;
        for ( let i = currentNode.properties.length; i--; ) {
            let p = currentNode.properties[ i ];
            if ( p.enabled && p.type !== PROP_INVALID ) {
                
                switch( p.type ) {
                    case PROP_ARRAY:
                        var arr = currentNode.target[ p.name ];
                        for ( let j = 0; j < p.length; j++ ) {
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
                
                updated = true;
            }
        }

        updatedTargets += updated | 0;

    } while ( currentNode = currentNode.next );

    return updatedTargets;
}


export function disableObjectIdProperties( objectId ) {
    if ( utils.isObject( propDict[ objectId ] ) ) {
        let keys = Object.keys( propDict[ objectId ] );
        for ( var i = 0; i < keys.length; i++ ) {
            let name = keys[ i ];
            clearProperty( propDict[ objectId ][ name ] );
        }
        clearEmptyObject( objectId );
    }
}

/*
* Builds a linked list of all objects and properties to iterate
* It stores the first linked object in the current tween
*/
export function resetTargetProperties( tween ) {
    let targetProperties = tween._to;
    let originProperties = tween._from;
    let targets = utils.isArray( tween._target ) ? tween._target : [ tween._target ];
    let prevNode, firstNode;

    // merge keys of targetProperties and originProperties without duplicates
    let allKeys = Object.keys( targetProperties );
	let oKeys = Object.keys( originProperties );
	for ( let i = 0; i < oKeys.length; i++ ) {
		if ( ! targetProperties[ oKeys[ i ] ] ) {
			allKeys.push( oKeys[ i ] );
		}
	}

    for ( let i = targets.length; i--; ) {
        let currentTarget = targets[ i ];

        // Tag object id without overwrite
        currentTarget._twkId = currentTarget._twkId || propDictIdx++;

        let properties = [];
        for ( let j = 0; j < allKeys.length; j++ ) {
            let key = allKeys[ j ];

            // Check if key is not a tween property
            // also we check that the property exists on target
            if ( !tween.hasOwnProperty( key ) && key in currentTarget ) {
                let property = new TweenProperty(
                    key,
                    currentTarget,
                    originProperties,
                    targetProperties
                );

                //property.refresh();
                properties.push( property );
            }
        }

        let currentNode = {
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
    tween._ease         = easing.getEasing( params.ease );
    tween._from         = utils.isObject( params.from ) ? params.from : {};
    tween._to           = utils.isObject( params.to ) ? params.to: {};
    tween._duration     = utils.isNumber( duration ) ? Math.max( 0, duration ) : 0;
    tween._params       = params;
}

// Move declared properties inside root params object
// into <from> or <to> properties dependig of tween type
function setTweenDefaultProperties( tween ) {
    let keys = Object.keys( tween._params );
    let target = tween._to;
    if ( tween._type === TWEEN_FROM ) {
        target = tween._from;
    }
    for( let i = 0; i < keys.length; i++ ) {
        let key = keys[ i ];
        if ( ! ( key in utils.reserved ) && ! ( key in target ) ) {
            target[ key ] = tween._params[ key ];
        }
    }
}

function initTween( tween, target, duration, params ) {
    initTweenProperties( tween, target, duration, params );
    common.initObjectRunnable( tween, params );
    common.initObjectCallbacks( tween, params );
    common.setRunnableTotalDuration( tween );
    setTweenDefaultProperties( tween );
    if ( tween._running ) {
        tween.resume();
    }
}

/*
* Updates the properties of a given tween
*/
export function tweenTick( tween, delta ) {

    if ( utils.isUndefined( tween._firstNode ) ) {
        resetTargetProperties( tween );
        syncTargetProperties( tween );
    }
    
    if ( common.notifyStart( tween ) ) {
        overrideDictionaryProperties( tween );
    }

    if ( tween._elapsedTime >= tween._delay ) {
        
        // Update tween properties with current progress
        let updatedTargets = updateTweenProperties( tween );

        // Fire onUpdate notification only if one or more properties were updated
        if ( updatedTargets > 0 ) {
            common.notifyOnUpdate( tween );
        } else {
            // No updated targets means all properties where overrided
            // We kill the tween early to avoid further notifications
            tween.kill();
        }
    } else {
        updateTweenProperties( tween );
    }
    
    common.notifyOnRepeat( tween );
    if ( common.notifyOnComplete( tween ) ) {
        tween.kill();
    }
    //common.updateState( tween );
    if ( delta > 0 ) {
        common.applyStep( tween, delta );
    }
}

export function tweenFactory( type, onStateChange ) {  
    return ( target, duration, params ) => {
        
        if ( type === TWEEN_SET ) {
            params = duration;
            duration = 0;
        }
        
        const valid =
            utils.isObject( target ) &&
            utils.isObject( params ) &&
            utils.isNumber( duration );
        
        if ( valid ) {
            let instance = new Tween( type, onStateChange );
            initTween( instance, target, duration, params );
            return instance;
        } else {
            throw 'Invalid Tween Params';
        }
    };
}
