export class TimelineItem { 
    constructor( obj, type, start, end ) {
        this._obj = obj;
        this._type = type;
        this._start = start;
        this._end = end;
        this._eventsEnabled = true;
    }
}