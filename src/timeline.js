import * as utils from './utils';
import * as common from './common';
import * as tween from './tween';
import { TimelineItem } from './timeline-item';

const TL_ITEM_TWEEN = 0;
const TL_ITEM_CALLBACK = 1;
const TL_ITEM_LINE_SYNC = 2;
const TL_ITEM_LINE_ASYNC = 3
const TL_ITEM_DELAY = 4;
const TL_ITEM_LABEL = 5;
const TL_ITEM_INVALID = 6;

class Timeline {
    constructor() {
        initTimeline( this, params );
        this._definitions = {};
        this._computedItems = [];
        this._lastDirection = this._direction;
        this._lastElapsedTime = 0;
        this._startLabel = '';
        this._ticker = newTicker({
            onTick: this.tick.bind( this ),
        });
        this._ticker.pause();
    }
}

Timeline.prototype = {
    _precompute: function( label ) {
        if ( this._needsRecompute ) {
            label = label || this._startLabel;
            var items = computeTimeLineItems( this._definitions, label );
            this._computedItems = absShiftTimeLineItems( items );
            this._totalDuration = getItemsDuration( this._computedItems );
            console.log( this._totalDuration );
            this._needsRecompute = false;
        }
    },
    let: function( label, obj ) {
        var type = getDefinitionType( obj );
        if ( utils.isString( label ) && type != TL_ITEM_INVALID ) {
            
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
        if ( ! this._running ) {
            this._ticker.clear();
        }
        return this;
    },
    delay: function( value ) {
        this._delay = utils.isNumber( value ) ? value : 0;
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
        return this._totalDuration;
    },
    timeScale: function( value ) {
        this._timeScale = utils.isNumber( value ) ? Math.max( 0, value ) : 1;
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
    clear: function() {
        this._ticker.clear();
        return this;
    }
}

function initTimeline( tl, params ) {
    // Init Tween Properties
    common.initObjectCallbacks( tl, params );
    common.initObjectRunnable( tl, params );
}

function timelineTick( tl, dt ) {
    if ( tl._delayLeft === 0 ) {

        common.notifyStart( tl );

        for( var i = 0; i < tl._computedItems.length; i++ ) {
            var item = tl._computedItems[ i ];
            if ( tl._direction == 1 && tl._elapsedTime >= item._start ||
                 tl._direction == -1 && tl._elapsedTime <= item._end ) {
                if ( item._type == TL_ITEM_TWEEN ) {
                    common.seek( item._obj, tl._elapsedTime - item._start );
                    tween.tweenTick( item._obj, 0 );
                } else if ( item._type == TL_ITEM_CALLBACK && item._eventsEnabled ) {
                    item._obj.apply( tl )
                    item._eventsEnabled = false;
                }
            }
        }
    }
    
    common.notifyOnComplete( tl );
    common.updateState( tl );
    common.applyStep( tl, dt );
}

function getItemsDuration( items ) {
    return _max( items, '_end' ) - utils.min( items, '_start' );
}

function computeTimeLineItems( items, startLabel, offset ) {
    offset = offset || 0 ;
    var result = [];
    var line = resolveLabel( items, startLabel );
    line = utils.isArray( line ) ? line : [ line ];

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
                end = start + obj._totalDuration;
            }

            if ( type == TL_ITEM_LINE_ASYNC ) {
                var keys = Object.keys( obj );
                var subItems = [];
                var min = 0;
                for( var j = 0; j < keys.length; j++ ) {
                    var key = keys[ j ];
                    min = Math.min( min, obj[ key ] );

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

// Get the final object of a label
// resolves indirections of n labels to an object
function resolveLabel( items, val ) {
    return utils.isString( val ) ? resolveLabel( items, items[ val ] ) : val;
}

// Resolves all labels in items to their final objects
// returns a flatten array with all the items
function resolveItemLabels( items, arr ) {
    var done = true;
    for( var i = 0; i < arr.length; i++ ) {
        var val = resolveLabel( items, arr[ i ] );

        if ( utils.isString( val ) ) {
            done = false;
            break;
        }

        if ( utils.isArray( val ) ) {
            arr[ i ] = resolveItemLabels( items, val );
        } else {
            arr[ i ] = val;
        }
    }

    if ( ! done ) {
        arr = resolveItemLabels( items, arr );
    }
    
    return utils.flatten( arr );
}

// adjust current items to start from 0
// shifting negative offsets over all items
function absShiftTimeLineItems( items ) {
    var minOffset = utils.min( items, '_start' );
    if ( minOffset < 0 ) {
        var shift = Math.abs( minOffset );
        for ( var i = 0; i < items.length; i++ ) {
            items[ i ]._start += shift;
            items[ i ]._end += shift;
        }
    }
    return items;
}

function getDefinitionType( obj ) {
    if ( obj instanceof Tween ) {
        return TL_ITEM_TWEEN;
    } else if ( utils.isNumber( obj ) ){
        return TL_ITEM_DELAY;
    } else if ( utils.isString( obj ) ) {
        return TL_ITEM_LABEL;
    } else if ( utils.isFunction( obj ) ) {
        return TL_ITEM_CALLBACK;
    } else if ( utils.isArray( obj ) ) {
        return TL_ITEM_LINE_SYNC;
    } else if ( utils.isObject( obj ) ) {
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
                if ( !utils.isNumber( item[ key ] ) ) {
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

export function timelineFactory() {
    return ( params ) => {
        return new Timeline();
    }
}
