import * as utils from './utils';
import * as common from './common';
import * as engine from './engine';
import * as tween from './tween';
import { Ticker } from './ticker';
import { TimelineItem } from './timeline-item';
import { plotTimeline } from './dev-tools';

const TL_ITEM_TWEEN = 0;
const TL_ITEM_CALLBACK = 1;
const TL_ITEM_LINE_SYNC = 2;
const TL_ITEM_LINE_ASYNC = 3;
const TL_ITEM_DELAY = 4;
const TL_ITEM_LABEL = 5;
const TL_ITEM_BOOKMARK = 6;
const TL_ITEM_INVALID = 7;

class Timeline {
    constructor() {
        this._definitions = {};
        this._computedItems = [];
        this._lastDirection = this._direction;
        this._lastElapsedTime = 0;
        this._startLabel = '';
        this._ticker = new Ticker( {
            onTick: this.tick.bind( this ),
        }, engine.onRunnableStateChange );
        this._ticker.pause();
    }
}

Timeline.prototype = {
    _precompute: function( label ) {
        if ( this._needsRecompute ) {
            label = label || this._startLabel;
            if ( this._definitions[ label ] ) {
                let items = computeTimeLineItems( this._definitions, label );
                this._computedItems = absShiftTimeLineItems( items );
                setTimelineTotalDuration( this );
                //console.log( this._totalDuration );
                this._needsRecompute = false;
            }
        }
    },
    define: function( label, obj ) {
        let type = getDefinitionType( obj );
        if ( utils.isString( label ) && type != TL_ITEM_INVALID ) {
            
            let isLine = type == TL_ITEM_LINE_SYNC || type == TL_ITEM_LINE_ASYNC;
            if ( isLine && !isValidLine( this._definitions, obj ) ) {
                return this;
            }
            
            if ( type == TL_ITEM_TWEEN ) {
                // reset to original state and
                // remove object from main renderer
                obj.restart( true ).pause();
            }

            this._definitions[ label ] = obj;
            this._needsRecompute = true;
        }
        return this;
    },
    tick: function( delta ) {
        this._precompute();
        timelineTick( this, delta );
        if ( ! this._running ) {
            this._ticker.pause();
        }
        return this;
    },
    delay: function( value ) {
        this._delay = utils.isNumber( value ) ? value : 0;
        return this;
    },
    plot: function( label ) {
        if ( ! utils.isUndefined( plotTimeline ) )
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
    time: function( seconds, accountForDelay ) {
        this._precompute();
        common.seek( this, seconds, accountForDelay, true );
        this.tick( 0 );
        return this;
    },
    progress: function( value, accountForDelay ) {
        this._precompute();
        common.seekProgress( this, value, true, accountForDelay );
        this.tick( 0 );
        return this;
    },
    pause: function() {
        this._ticker.pause();
        return this;
    },
    resume: function() {
        this._running = true;
        this._ticker.resume();
        return this;
    },
    restart: function( accountForDelay ) {
        common.initObjectRunnable( this );
        this.resume();
        return this;
    },
    play: function( label ) {
        // TODO: validate label?
        if ( this._definitions[ label ] ) {
            this._startLabel = label;
            this._ticker.resume();
            this._running = true;
        } else {
            throw 'Invalid label';
        }
        return this;
    },
    kill: function() {
        this.pause();
    }
}

function initTimeline( tl, params ) {
    // Init Tween Properties
    common.initObjectCallbacks( tl, params );
    common.initObjectRunnable( tl, params );
}

function setTimelineTotalDuration( tl ) {
    tl._duration = getItemsDuration( tl._computedItems );
    common.setRunnableTotalDuration( tl );
}

function timelineTick( tl, delta ) {
    common.notifyStart( tl );

    if ( tl._elapsedTime >= tl._delay ) {
        updateTimelineItems( tl );
        for( let i = 0; i < tl._computedItems.length; i++ ) {
            let item = tl._computedItems[ i ];
            if ( item._type === TL_ITEM_TWEEN ) {
                tween.tweenTick( item._obj, 0 );
            }
        }
        common.notifyOnUpdate( tl );
    }

    if ( common.notifyOnRepeat( tl ) ) {
        toggleEvents( tl, true );
    }

    common.notifyOnComplete( tl );
    common.updateState( tl );
    common.applyStep( tl, delta );
}

function updateTimelineItems( tl ) {
    if ( tl._elapsedTime >= tl._delay ) {
        let time = tl._duration * common.getProgress( tl );
        for( let i = 0; i < tl._computedItems.length; i++ ) {
            let item = tl._computedItems[ i ];
            if ( tl._direction === 1 && tl._elapsedTime >= item._start ||
                    tl._direction === -1 && tl._elapsedTime <= item._end ) {
                if ( item._type === TL_ITEM_TWEEN ) {
                    common.seek( item._obj, time - item._start );
                } else if ( item._type === TL_ITEM_CALLBACK && item._eventsEnabled ) {
                    item._obj.apply( tl );
                    item._eventsEnabled = false;
                }
            }
        }
    }
}

function toggleEvents( tl, enabled ) {
    for( let i = 0; i < tl._computedItems.length; i++ ) {
        let item = tl._computedItems[ i ];
        item._eventsEnabled = enabled;
    }
}

function getItemsDuration( items ) {
    return utils.max( items, '_end' ) - utils.min( items, '_start' );
}

function computeTimeLineItems( items, startLabel, offset ) {
    offset = offset || 0 ;
    let result = [];
    let line = resolveLabel( items, startLabel );
    line = utils.isArray( line ) ? line : [ line ];

    // resolve all labels to objects and flatten all
    // excluding async blocks
    let rLine = resolveItemLabels( items, line );
    for ( let i = 0; i < rLine.length; i++ ) {
        let obj = rLine[ i ];
        let type = getDefinitionType( obj );
        if ( type == TL_ITEM_DELAY ) {
            offset += obj;
        } else {
            let start = offset; 
            let end = offset;
            
            if ( type == TL_ITEM_TWEEN ) {
                end = start + obj._totalDuration;
            }

            if ( type == TL_ITEM_LINE_ASYNC ) {
                let keys = Object.keys( obj );
                let subItems = [];
                let min = 0;
                for( let j = 0; j < keys.length; j++ ) {
                    let key = keys[ j ];
                    min = Math.min( min, obj[ key ] );

                    // apply global offset
                    let aOffset = obj[ key ] + offset;

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
    let done = true;
    for( let i = 0; i < arr.length; i++ ) {
        let val = resolveLabel( items, arr[ i ] );

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
    let minOffset = utils.min( items, '_start' );
    if ( minOffset < 0 ) {
        let shift = Math.abs( minOffset );
        for ( let i = 0; i < items.length; i++ ) {
            items[ i ]._start += shift;
            items[ i ]._end += shift;
        }
    }
    return items;
}

function getDefinitionType( obj ) {
    if ( obj instanceof tween.Tween ) {
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
    let valid = true;
    for( let i = 0; i < lineArray.length; i++ ) {
        let item = lineArray[ i ];
        let type = getDefinitionType( item );
        if ( type == TL_ITEM_INVALID ) {
            valid = false;
        } else if ( type == TL_ITEM_LABEL ) {
            valid = ! utils.isUndefined( labels[ item ] );
        
        // validate nested arrays recursively
        } else if ( type == TL_ITEM_LINE_SYNC ) {
            valid = isValidLine( labels, item );
        
        // validate that objects have only numbers assigned
        // only numbers are valid
        } else if ( type == TL_ITEM_LINE_ASYNC ) {
            let keys = Object.keys( item );
            for( let j = 0; j < keys.length; j++ ) {
                let key = keys[ j ];
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
        let instance = new Timeline();
        initTimeline( instance, params );
        return instance;
    }
}
