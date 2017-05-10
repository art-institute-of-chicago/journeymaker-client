
function SpriteAnim($el, imgUrl, frames, opts) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Geom			= bwco.utils.Geom,
		Random			= bwco.utils.Random,
		Ticker			= bwco.ticker.Ticker,
		Arrays			= bwco.utils.Arrays;
		Range			= bwco.math.Range;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var DEFAULT_OPTS	= {
		"fps": 30,
		"play": true,
		"loop": true,
		"reverse": false,
		"initFrame": 0
	};


	// Elements
	/////////////////////////////////////////////


	// Vars
	/////////////////////////////////////////////

	var _self			= this;

	var _opts			= _.defaults(opts || { }, DEFAULT_OPTS);

	var _frames			= frames,
		_frameIndex		= 0,
		_lastFrameMs	= 0;

	var _playing		= false,
		_on				= true;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"playing": {
			get: function() {
				return _playing;
			}
		},

		"paused": {
			get: function() {
				return !_playing;
			}
		},

		"reverse": {
			get: function() {
				return _opts.reverse;
			},
			set: function(val) {
				_opts.reverse	= val;
			}
		},

		"index": {
			set: function(val) {
				_frameIndex		= Maths.wrap(val, _self.frameFirst, _self.frameLast);
			}
		},

		"frameInit": {
			get: function() {
				return _opts.initFrame;
			}
		},
		"frameFirst": {
			get: function() {
				return 0;
			}
		},
		"frameLast": {
			get: function() {
				return _frames.length - 1;
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.dispose = function() {

		_ticker.removeListener(TickerEvent.TICK, onFrame);

	}

	this.play = function(restart) {

		if (_playing && !restart) return;

		App.log("SpriteAnim::play()");

		_playing	= true;
		_lastFrame	= Date.now();

		if (restart) {
			resetFrame();
		}

		updateFrame();
		_ticker.addListener(TickerEvent.TICK, onFrame);

	}
	this.pause = function() {

		if (!_playing) return;

		App.log("SpriteAnim::pause()");

		_playing	= false;

		_ticker.removeListener(TickerEvent.TICK, onFrame);

	}
	this.reset = function() {

		resetFrame();
		updateFrame();

	}
	this.restart = function() {

		App.log("SpriteAnim::restart()");

		_self.play(true);

	}

	this.show = function() {

		if (!_on) {

			App.log("SpriteAnim::show()");

			_on		= true;
			$el.show();
		}

	}
	this.hide = function() {

		if (_on) {

			App.log("SpriteAnim::hide()");

			_on		= false;
			$el.hide();
		}

	}


	// Event handlers
	/////////////////////////////////////////////

	function onFrame(e) {

		if (!_on) return;

		var now			= Date.now(),
			nextMs		= (_lastFrame + (1 / _opts.fps) * 1000);

		if (now > nextMs) {
			advanceFrame();
			_lastFrame	= now;
		}

	}


	// Private methods
	/////////////////////////////////////////////

	function initImg() {

		if (imgUrl) {
			$el.css({
				"background-image": "url(" + imgUrl + ")"
			});
		}

	}
	function initTicker() {

		_ticker	= Ticker.getInstance();

	}
	function initFrames() {

		_self.index	= _self.frameInit;

		updateFrame();

	}

	function resetFrame() {

		_self.index		= _opts.reverse ? _self.frameLast : _self.frameFirst;

	}
	function advanceFrame() {

		if (_opts.reverse) {
			if (_frameIndex <= _self.frameFirst) {
				if (_opts.loop) {
					_self.index	= _self.frameLast;
				} else {
					_self.pause();
				}
			} else {
				_self.index	= _frameIndex - 1;
			}

		} else {
			if (_frameIndex >= _self.frameLast) {
				if (_opts.loop) {
					_self.index	= _self.frameFirst;
				} else {
					_self.pause();
				}
			} else {
				_self.index	= _frameIndex + 1;
			}

		}

		updateFrame();

	}
	function updateFrame() {

		var frame		= _frames[_frameIndex],
			bgPos		= (-frame.x) + "px " + (-frame.y) + "px",
			cssProps	= { "background-position": bgPos };

		$el.css(cssProps)

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	initImg();
	initTicker();
	initFrames();

	if (_opts.on) {

		_self.show();

		if (_opts.play) {
			_self.play();
		}

	}


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(SpriteAnim, bwco.events.Dispatcher);
