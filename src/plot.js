
function plotTimeline( tl, label ) {
    tl._precompute( label );
    var computedItems = tl._computedItems;
    var def = Object.keys( tl._definitions );
    var getLabel = function( obj ) {
        for( var i = 0; i < def.length; i++ ) {
            var key = def[ i ];
            if ( tl._definitions[ key ] === obj ) {
                return key;
            }
        }
        return "?";
    }

    var truncText = function( text, limit ) {
        if ( text.length > limit ) {
            text = text.slice( 0, limit - 1 ) + '\u2026';
        }
        return text;
    }

    var charPad = function( size, char ) {
        return Array.apply( null, Array( size ) )
        .map( String.prototype.valueOf, char ).join('');
    }

    var textPad = function( size, padChar, text ) {
        var s = m.round( ( size - text.length ) / 2 );
        var o = size - s - text.length;
        var left = charPad( s, padChar );
        var right = charPad( o, padChar );
        return left + text + right;
    }

    var logLine = function( arr ) {
        arr.unshift( charPad( ~~( arr.length / 2 ), "%c%s" ) );
        console.log.bind(console).apply( wnd, arr );
    }

    var bg = '';
    var pad4 = 'padding: 4px 0;';
    var pad3 = 'padding: 3px 0;';
    var pad2 = 'padding: 0px 0;';

    var totalDuration = _max( computedItems, 'end' );
    var steps = m.round( totalDuration * 10 );
    var tlStr = [];

    // Print main label name and times
    bg = 'background: #E1BEE7; padding-bottom: 6px; border-bottom: 4px solid #ba9dbf;';
    tlStr.push( [ '', '\n\n' ] );
    tlStr.push( [ pad4 + bg, textPad( 14, ' ', tl._startLabel ) ] );
    tlStr.push( [ pad4, ' ' ] );
    for( var i = 0; i < m.ceil( totalDuration ); i++ ) {
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
    var mark = 0;
    for( var i = 0; i < m.ceil( totalDuration * 2 ); i++ ) {
        tlStr.push( [ bg,  mark % 1 ? '\u25AB' : '\u25BE' ] );
        tlStr.push( [ bg, charPad( 4, '\u2009' ) ] );
        mark += 0.5;
    }
    logLine( _flatten( tlStr ) );

    // Print each timeline item
    var colors = ['E91E63', 'F44336', '9C27B0', '673AB7', '3F51B5', '2196F3' ];
    for( var i = 0; i < computedItems.length; i++ ) {
        var item = computedItems[ i ];
        var sp = charPad( m.round( item.start * 10 ), '\u2219' );
        var tSize = m.max( 2, m.round( ( item.end - item.start ) * 10 ) ) ;
        bg = textPad( tSize, '\u2009', truncText( getLabel( item.obj ), tSize ) );
        var c = colors[ i % colors.length ];
        var strings = _flatten( [
            [ "padding: 2px 0; background: #C5E1A5; color: black;", textPad( 7, ' ', item.start.toFixed( 2 ) ) ],
            [ "padding: 2px 0; background: #FF5252; color: black;", textPad( 7, ' ', item.end.toFixed( 2 ) ) ],
            [ "background: white; color: #802929;", "\u2009\u2009" ],
            [ 'background: white; color: #' + c, sp ],
            [ 'color: white; background: #' + c, bg ]
        ]);
        logLine( strings );
    }
}