import * as utils from './utils';

export function plotTimeline( tl, label ) {
    tl._precompute( label );
    let computedItems = tl._computedItems;
    let def = Object.keys( tl._definitions );
    let getLabel = ( obj ) => {
        for( let i = 0; i < def.length; i++ ) {
            let key = def[ i ];
            if ( tl._definitions[ key ] === obj ) {
                return key;
            }
        }
        return "?";
    }

    let truncText = ( text, limit ) => {
        if ( text.length > limit ) {
            text = text.slice( 0, limit - 1 ) + '\u2026';
        }
        return text;
    }

    let charPad = ( size, char ) => {
        return Array.apply( null, Array( size ) )
        .map( String.prototype.valueOf, char ).join('');
    }

    let textPad = ( size, padChar, text ) => {
        let s = Math.round( ( size - text.length ) / 2 );
        let o = size - s - text.length;
        let left = charPad( s, padChar );
        let right = charPad( o, padChar );
        return left + text + right;
    }

    let logLine = ( arr ) => {
        arr.unshift( charPad( ~~( arr.length / 2 ), "%c%s" ) );
        console.log.bind(console).apply( window, arr );
    }

    let bg = '';
    let pad4 = 'padding: 4px 0;';
    let pad3 = 'padding: 3px 0;';
    let pad2 = 'padding: 0px 0;';

    let totalDuration = tl._totalDuration;
    let steps = Math.round( totalDuration * 10 );
    let tlStr = [];

    // Print main label name and times
    bg = 'background: #E1BEE7; padding-bottom: 6px; border-bottom: 4px solid #ba9dbf;';
    tlStr.push( [ '', '\n\n' ] );
    tlStr.push( [ pad4 + bg, textPad( 14, ' ', tl._startLabel ) ] );
    tlStr.push( [ pad4, ' ' ] );
    for( let i = 0; i < Math.ceil( totalDuration ); i++ ) {
        tlStr.push( [ pad4, i + 's' ] );
        tlStr.push( [ pad4, charPad( 9 - i.toString().length, '\u2009' ) ] );
    }

    tlStr.push( [ '', '\n' ] );


    // Print timeline start/end and marks line
    bg = 'background: #C5CAE9; padding-bottom: 4px;';
    tlStr.push( [ bg, textPad( 7, ' ', 'Start' ) ] );
    tlStr.push( [ bg, textPad( 7, ' ', 'End' ) ] );

    bg = 'background: #D1C4E9; color:#B39DDB; padding-bottom: 1px;';
    tlStr.push( [ bg, '\u2009' ] );
    let mark = 0;
    for( let i = 0; i < Math.ceil( totalDuration * 2 ); i++ ) {
        tlStr.push( [ bg,  mark % 1 ? '\u25AB' : '\u25BE' ] );
        tlStr.push( [ bg, charPad( 4, '\u2009' ) ] );
        mark += 0.5;
    }
    logLine( utils.flatten( tlStr ) );

    // Print each timeline item
    let colors = ['E91E63', 'F44336', '9C27B0', '673AB7', '3F51B5', '2196F3' ];
    for( let i = 0; i < computedItems.length; i++ ) {
        let item = computedItems[ i ];
        let sp = charPad( Math.round( item._start * 10 ), '\u2219' );
        let tSize = Math.max( 2, Math.round( ( item._end - item._start ) * 10 ) ) ;
        bg = textPad( tSize, '\u2009', truncText( getLabel( item._obj ), tSize ) );
        let c = colors[ i % colors.length ];
        let strings = utils.flatten( [
            [ "padding: 2px 0; background: #C5E1A5; color: black;", textPad( 7, ' ', item._start.toFixed( 2 ) ) ],
            [ "padding: 2px 0; background: #FF5252; color: black;", textPad( 7, ' ', item._end.toFixed( 2 ) ) ],
            [ "background: white; color: #802929;", "\u2009\u2009" ],
            [ 'background: white; color: #' + c, sp ],
            [ 'color: white; background: #' + c, bg ]
        ]);
        logLine( strings );
    }
}