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

declare class TweenkeyTicker {
    
    /** TODO */
    pause(): TweenkeyTicker;
    
    /** TODO */
    resume(): TweenkeyTicker;
    
    /** TODO */
    kill(): TweenkeyTicker;
    
    /** TODO */
    tick( time: number ): TweenkeyTicker;
    
    /** TODO */
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
    static ticker(): TweenkeyTicker;

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