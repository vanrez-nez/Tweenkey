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
        let tp = this.target[ this.name ];
        let len = Math.max( o.length, t.length );
        for ( let i = 0; i < len; i++ ) {
            o[ i ] = o[ i ] != undefined ? o[ i ] : tp[ i ];
            t[ i ] = t[ i ] != undefined ? t[ i ] : tp[ i ];
        }
        this.length = len;
    },
    sync: function() {
        
        if ( this.synced ) {
            return;
        }
        
        this.synced = true;
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
            this.colorStart = utils.hexStrToRGB( this.start );
            this.colorEnd = utils.hexStrToRGB( this.end );
        }
    }
};

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
