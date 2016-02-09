# Tweenkey
Micro animation library for javascript.

[![Build Status](https://travis-ci.org/radixzz/Tweenkey.svg?branch=master)](https://travis-ci.org/radixzz/Tweenkey)

## Todo Core-Release in less than ~3Kb:
- [x] Support basic from, to, fromTo and set accessories for tweening.
- [x] Support pause, resume and kill for each tween and for all active tweens as well.
- [x] Delay parameter without using setTimeout (keeps running on background).
- [x] Pause tween engine when browser tab becomes inactive.
- [x] Handle array of objects as the target param.
- [x] Setup test environment.
- [x] Step manually in time with update method.
- [x] Handle multiple active tweens into the same object overriding active properties.
- [ ] Add Support for killing specific attributes only.
- [ ] Support to force the end state of the tween when killing.
- [ ] Add support to control FPS.
- [ ] Add timescale property for tween.
- [ ] Add support to handle restarts on tweens.
- [ ] Add reverse and yoyo functionality.
- [ ] Add repeat count, repeatDelay and onRepeat callback parameters.
- [ ] Add support to seek a specific position of current tween.
- [ ] Add ticker support with kill, pause, resume and fps controls per instance.
- [ ] Add support for immediate render param on set, from and fromTo tweens.
- [ ] Add support to restart the tween.
- [ ] Add plugin support.
- [ ] Test & optimize main loop.
- [ ] Make demo webpage.
- [ ] Write test code.

# Plugins
- [ ] Implement timeline plugin.
- [ ] Implement HTML plugin.
- [ ] Implement easing plugin to support paths and bezier curves.
- [ ] Implement physics plugin.

# Ideas:
- [ ] Add support for easing on pause and resume
- [ ] Organic loops.
