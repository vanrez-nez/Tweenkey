import * as tween from './tween';
import * as ticker from './ticker';
import * as timeline from './timeline';
import * as engine from './engine';

class Tweenkey {}
Tweenkey.prototype = {
    set         : tween.tweenFactory( tween.TWEEN_SET, engine.onRunnableStateChange ),
    tween       : tween.tweenFactory( tween.TWEEN_ALL, engine.onRunnableStateChange ),
    from        : tween.tweenFactory( tween.TWEEN_FROM, engine.onRunnableStateChange ),
    to          : tween.tweenFactory( tween.TWEEN_TO, engine.onRunnableStateChange ),
    ticker      : ticker.tickerFactory( engine.onRunnableStateChange ),
    timeline    : timeline.timelineFactory(),
    killAll     : engine.executeOnAllTweens( 'kill' ),
    killTweensOf: engine.killTweensOf(),
    pauseAll    : engine.executeOnAllTweens( 'pause' ),
    resumeAll   : engine.executeOnAllTweens( 'resume' ),
    update      : engine.manualStep,
    autoUpdate  : engine.setAutoUpdate,
    setFPS      : engine.setFPS
};

export default new Tweenkey();