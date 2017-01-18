// Type definitions for tweenkey
// Project: https://github.com/radixzz/Tweenkey
// Definitions: https://github.com/radixzz/Tweenkey/tree/master/types

declare class TweenkeyTween {
    
     /** Starts the tween after a certain amount of time. */
    delay( seconds: number ): TweenkeyTween;
    
     /** Sets the current animation's progress in wich a value of 0 represents the start point and 1 the end. */
    progress( progress: number, accountForDelay?: boolean ): TweenkeyTween;
    
     /** TODO */
    time( seconds: number, accountForDelay?: boolean ): TweenkeyTween;
    
    /** Forces to render the current tween properties into the target object. */
    render(): TweenkeyTween;
    
    /** TODO */
    restart( accountForDelay?: boolean, immediateRender?: boolean ): TweenkeyTween;
    
    /** TODO */
    reverse(): TweenkeyTween;
    
    /** TODO */
    timeScale( scale: number ): TweenkeyTween;
    
    /** TODO */
    kill(): TweenkeyTween;
    
    /** TODO */
    pause(): TweenkeyTween;
    
    /** TODO */
    resume(): TweenkeyTween;
}


declare interface ITickerParams {
    onTick: ( delta: number ) => void;
    fps?: number;
}

declare class TweenkeyTicker {
    
    /** Pauses the current ticker. Listener will no longer be called. */
    pause(): TweenkeyTicker;
    
    /** Resumes current ticker. Will have effect if tickers has not been
      * killed.
      */
    resume(): TweenkeyTicker;
    
    /** Kills the current ticker. This prevents the ticker from calling the
     * listener again.
    */
    kill(): TweenkeyTicker;
    
    /** Forces current ticker to emmit a manual tick and to advance in time
     * for the given ammount of seconds.
     * */
    tick( time: number ): TweenkeyTicker;
    
    /** Sets the ticker update frequency in the given FPS (Frame per Seconds) */
    setFPS( fps: number ): TweenkeyTicker;
    
}

declare class Tweenkey {
    
    /** TODO */
    constructor( target: any, duration: number, props: any );
    
    /** TODO */
    static set( target: any, props: any  ): TweenkeyTween;
    
    /** TODO */
    static to( target: any, duration: number, props: any ): TweenkeyTween;
    
    /** TODO */
    static fromTo( target: any, duration: number, props: any ): TweenkeyTween;
    
    /** TODO */
    static ticker( params: ITickerParams ): TweenkeyTicker;

    /** TODO */
    static update( step: number ): void;

    /** TODO */
    static autoUpdate( enabled: boolean ): void;

    /** TODO */
    static setFPS( fps: number ): void;
    
    /** TODO */
    static killAll(): void;

    /** TODO */
    static pauseAll(): void;

    /** TODO */
    static resumeAll(): void;

}

declare module "tweenkey" {
    export = Tweenkey;
}