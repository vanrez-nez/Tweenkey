import * as tween from './tween';
import * as ticker from './ticker';
import * as timeline from './timeline';
import * as engine from './engine';

class Tweenkey {}
Tweenkey.prototype = {
    set         : tween.tweenFactory( engine.onRunnableStateChange ),
    tween       : tween.tweenFactory( engine.onRunnableStateChange ),
    ticker      : ticker.tickerFactory(  engine.onRunnableStateChange ),
    timeline    : timeline.timelineFactory(),
    clearAll    : engine.executeOnAllTweens( 'clear' ),
    clearTweensOf: () => { console.log('todo'); },
    pauseAll    : engine.executeOnAllTweens( 'pause' ),
    resumeAll   : engine.executeOnAllTweens( 'resume' ),
    update      : engine.manualStep,
    autoUpdate  : engine.setAutoUpdate,
    setFPS      : engine.setFPS
};

export default new Tweenkey();