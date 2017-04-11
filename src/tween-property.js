import * as utils from './utils';

export const PROP_NUMBER = 0;
export const PROP_ARRAY = 1;
export const PROP_COLOR = 2;
export const PROP_WAYPOINTS = 3;
export const PROP_INVALID = 4;

export class TweenProperty {
    constructor( id, name, target, origProps, targetProps ) {
        this.id = id;
        this.name = name;
        this.target = target;
        this.origProps = origProps;
        this.targetProps = targetProps;
        this.enabled = true;
        this.length = 0;
        this.synced = false;
        this.type = PROP_INVALID;
    }
}

TweenProperty.prototype = {
    _expandArrayProperties: function( o, t ) {
        /*
        Normalize <origin> and <target> arrays so they have the same
        size. We expand the smallest array ( or unexistent ) to match
        the number of elements in the the biggest array.
        */
        let tp = this.target[ this.name ];
        let len = Math.max( o.length, t.length );
        for ( let i = 0; i < len; i++ ) {
            o[ i ] = utils.isUndefined( o[ i ] ) ? tp[ i ] : o[ i ];
            t[ i ] = utils.isUndefined( t[ i ] ) ? tp[ i ] : t[ i ];
        }
        this.length = len;
    },
    sync: function() {
        sync( this );
    }
};

function sync( prop ) {
    if ( prop.synced ) {
        return;
    }
    
    prop.synced = true;
    prop.start = prop.origProps[ prop.name ];
    if ( utils.isUndefined( prop.start ) ) {
        prop.start = prop.target[ prop.name ];
    }
    
    prop.end = prop.targetProps[ prop.name ];
    if ( utils.isUndefined( prop.end ) ) {
        prop.end = prop.target[ prop.name ];
    }

    prop.type = getPropertyType(
        prop.start, prop.end, prop.target[ prop.name ] );
    
    if ( prop.type == PROP_ARRAY ) {
        prop._expandArrayProperties( prop.start, prop.end );
    } else if ( prop.type == PROP_WAYPOINTS ) {
        prop.waypoints = [ prop.start ].concat( prop.end );
    } else if ( prop.type == PROP_COLOR ) {
        prop.colorStart = utils.hexStrToRGB( prop.start );
        prop.colorEnd = utils.hexStrToRGB( prop.end );
    }
}

function getPropertyType( s, e, t ) {
    if ( utils.isNumber( s ) &&
         utils.isNumber( e ) &&
         utils.isNumber( t ) ) {
            return PROP_NUMBER;
    } else if (
        utils.colorRE.test( s ) &&
        utils.colorRE.test( t ) &&
        utils.colorRE.test( e ) ) {
            return PROP_COLOR;
    } else if ( 
        utils.isArray( s ) &&
        utils.isArray( e ) &&
        utils.isArray( t ) ) {
            return PROP_ARRAY;
    } else if (
        utils.isNumber( s ) &&
        utils.isArray( e ) &&
        utils.isNumber( t )
    ) {
        return PROP_WAYPOINTS;
    } else {
        return PROP_INVALID;
    }
}
