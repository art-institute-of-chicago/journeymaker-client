
function TouchBtn($el, opts) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Pt				= bwco.geom.Pt,
		Geom			= bwco.utils.Geom,
		Maths			= bwco.utils.Maths,
		Time			= bwco.utils.Time,
		Random			= bwco.utils.Random;

	var Sound			= createjs.Sound;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var DEFAULT_OPTS	= {

		enabled: true,

		enableSfx: true,
		buttonMode: true,
		dragDist: 25,

		doubleTapEnabled: false,
		tripleTapEnabled: false,
		multiTapDelay: 300,

		releaseOnLeave: true,
		leavePadding: 25,

		width: null,
		height: null,

		classActive: "active",
		classOver: "over",
		classDragging: "dragging",
		classDisabled: "disabled"

	}

	var SFX_TAP			= "resources/sfx/sfx-tap_artic.mp3";


	// Elements
	/////////////////////////////////////////////


	// Private properties
	/////////////////////////////////////////////

	var _self				= this,
		_el					= $el.get(0);

	var _tuioModel;

	var _opts				= _.defaults(opts || { }, DEFAULT_OPTS);

	var _enabled			= false;

	var _active				= false,
		_over				= false,
		_dragging			= false,
		_tappable			= false;

	var _touchId			= undefined;

	var _grabPt				= null;

	var _timeoutMultitap,
		_multiTapBtnEvent,
		_multiTapCount		= 0;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"$el": {
			get: function() {
				return $el;
			}
		},

		"enabled": {
			get: function() {
				return _enabled;
			}
		},

		"active": {
			get: function() {
				return _active;
			}
		},

		"over": {
			get: function() {
				return _over;
			}
		},

		"dragging": {
			get: function() {
				return _dragging;
			}
		}

	})


	// Public methods
	/////////////////////////////////////////////

	this.enable = function() {

		_enabled	= true;
		updateClasses();

		addListeners();

	}
	this.disable = function() {

		_enabled	= false;
		updateClasses();

		removeListeners();

	}

	this.dispose = function() {

		_self.disable();

		removeListeners();
		removeClasses();

		clearTimeout(_timeoutMultitap);

		Object.defineProperties(this, { });

	}


	// Event handlers
	/////////////////////////////////////////////

	function onTouchStart(e) {

		if (e.touchTarget == _el && !bwco.utils.defined(_touchId)) {

			_touchId		= e.id;

			_active			= true;
			_over			= true;
			_dragging		= false;
			_tappable		= true;

			_grabPt			= e.pt;

			updateClasses();

			var btnEvent	= makeEventObj(e);

			_self.dispatch(TouchBtn.START, btnEvent);
			_self.dispatch(TouchBtn.PRESS_START, btnEvent);

		}

	}
	function onTouchMove(e) {

		if (bwco.utils.defined(_touchId) && e.id == _touchId) {

			var btnEvent	= makeEventObj(e),
				dist		= e.pt.distanceTo(_grabPt),
				onEl		= ptOnEl(e.pt);

			if (!_dragging && dist > _opts.dragDist) {
				_dragging	= true;
				_self.dispatch(TouchBtn.DRAG_START, btnEvent);
				if (!_opts.buttonMode) {
					_tappable	= false;
					_self.dispatch(TouchBtn.PRESS_END, btnEvent);
				}
			}

			_self.dispatch(TouchBtn.MOVE, btnEvent);

			if (_dragging) {
				_self.dispatch(TouchBtn.DRAG_MOVE, btnEvent);
			}

			if (_over) {
				if (!onEl) {
					_over	= false;
					if (_opts.buttonMode) {
						_tappable	= false;
						_self.dispatch(TouchBtn.PRESS_END, btnEvent);
					}
					_self.dispatch(TouchBtn.LEAVE, btnEvent);
					if (_opts.releaseOnLeave) {
						_self.dispatch(TouchBtn.PRESS_END, btnEvent);
						onTouchEnd(e);
						return;
					}
				}
			} else {
				if (onEl) {
					_over	= true;
					if (_opts.buttonMode) {
						_tappable	= true;
						_self.dispatch(TouchBtn.PRESS_START, btnEvent);
					}
					_self.dispatch(TouchBtn.ENTER, btnEvent);
				}
			}

			updateClasses();

		}

	}
	function onTouchEnd(e) {

		if (bwco.utils.defined(_touchId) && e.id == _touchId) {

			_active		= false;
			_over		= false;
			_grabPt		= null;

			var btnEvent	= makeEventObj(e);

			_self.dispatch(TouchBtn.END, btnEvent);

			if (_dragging) {
				_self.dispatch(TouchBtn.DRAG_END, btnEvent);
			}

			if (_tappable) {
				_self.dispatch(TouchBtn.PRESS_END, btnEvent);

				if (_opts.doubleTapEnabled || _opts.tripleTapEnabled) {
					_multiTapCount++;
					resetMultiTap(btnEvent);

				} else {
					_self.dispatch(TouchBtn.TAP, btnEvent);

					if (_opts.enableSfx) {
						Sound.play(SFX_TAP);
					}

				}

			}

			_dragging	= false;
			_tappable	= false;
			_touchId	= undefined;

			updateClasses();

		}

	}

	function onMultiTapTimeout() {

		var btnEvent	= _multiTapBtnEvent;

		if (_opts.tripleTapEnabled && _multiTapCount > 2) {
			_self.dispatch(TouchBtn.TRIPLE_TAP, btnEvent);

		} else if (_opts.doubleTapEnabled && _multiTapCount > 1) {
			_self.dispatch(TouchBtn.DOUBLE_TAP, btnEvent);

		} else {
			_self.dispatch(TouchBtn.TAP, btnEvent);
		}

		endMultiTap();

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_tuioModel		= TuioModel.getInstance();

	}
	function initSfx() {

		Sound.registerSound(SFX_TAP);

	}

	function addListeners() {

		removeListeners();

		_tuioModel.addListener(TouchEvent.START, onTouchStart);
		_tuioModel.addListener(TouchEvent.MOVE, onTouchMove);
		_tuioModel.addListener(TouchEvent.END, onTouchEnd);

	}
	function removeListeners() {

		_tuioModel.removeListener(TouchEvent.START, onTouchStart);
		_tuioModel.removeListener(TouchEvent.MOVE, onTouchMove);
		_tuioModel.removeListener(TouchEvent.END, onTouchEnd);

	}

	function resetMultiTap(btnEvent) {

		var multiTapEnabled	= _opts.doubleTapEnabled || _opts.tripleTapEnabled,
			moreThanTwoTaps	= _multiTapCount > 2,
			moreThanOneTap	= _multiTapCount > 1,
			enoughTaps		= !multiTapEnabled || moreThanTwoTaps || (moreThanOneTap && !_opts.tripleTapEnabled)

		if (enoughTaps) {
			onMultiTapTimeout();

		} else {

			clearTimeout(_timeoutMultitap);

			_multiTapBtnEvent	= btnEvent;
			_timeoutMultitap	= setTimeout(onMultiTapTimeout, _opts.multiTapDelay);

		}

	}
	function endMultiTap() {

		clearTimeout(_timeoutMultitap);

		_multiTapCount		= 0;
		_multiTapBtnEvent	= null;

	}

	function updateClasses() {

		if (_enabled) {
			$el.css("pointer-events", "auto");
		} else {
			$el.css("pointer-events", "none");
		}

		if (_opts.classDisabled) {
			$el.toggleClass(_opts.classDisabled, !_enabled);
		}
		if (_opts.classActive) {
			$el.toggleClass(_opts.classActive, _active);
		}
		if (_opts.classOver) {
			$el.toggleClass(_opts.classOver, _over);
		}
		if (_opts.classDragging) {
			$el.toggleClass(_opts.classDragging, _dragging);
		}

	}
	function removeClasses() {

		$el.css("pointer-events", "none");

		if (_opts.classDisabled) {
			$el.removeClass(_opts.classDisabled);
		}
		if (_opts.classActive) {
			$el.removeClass(_opts.classActive);
		}
		if (_opts.classOver) {
			$el.removeClass(_opts.classOver);
		}
		if (_opts.classDragging) {
			$el.removeClass(_opts.classDragging);
		}

	}


	// Helpers
	/////////////////////////////////////////////

	function ptOnEl(pt) {

		var pad		= _opts.leavePadding || 0,
			elW		= _opts.width  || $el.outerWidth(),
			elH		= _opts.height || $el.outerHeight();

		var minX	= $el.offset().left - pad,
			minY	= $el.offset().top  - pad,
			maxX	= minX + elW + (pad * 2),
			maxY	= minY + elH + (pad * 2)

		if (pt.x < minX) return false;
		if (pt.y < minY) return false;
		if (pt.x > maxX) return false;
		if (pt.y > maxY) return false;

		return true;

	}

	function makeEventObj(data) {

		return {
			id: data.id,
			localX: data.pt.x - $el.offset().left,
			localY: data.pt.y - $el.offset().top,
			screenX: data.pt.x,
			screenY: data.pt.y
		}

	}


	// Init
	/////////////////////////////////////////////

	initModels();
	initSfx();

	if (_opts.enabled) {
		_self.enable();
	}


}


// Events
/////////////////////////////////////////////

TouchBtn.START			= "TouchBtn.START";
TouchBtn.MOVE			= "TouchBtn.MOVE";
TouchBtn.END			= "TouchBtn.END";

TouchBtn.DRAG_START		= "TouchBtn.DRAG_START";
TouchBtn.DRAG_MOVE		= "TouchBtn.DRAG_MOVE";
TouchBtn.DRAG_END		= "TouchBtn.DRAG_END";

TouchBtn.ENTER			= "TouchBtn.ENTER";
TouchBtn.LEAVE			= "TouchBtn.LEAVE";

TouchBtn.PRESS_START	= "TouchBtn.PRESS_START";
TouchBtn.PRESS_END		= "TouchBtn.PRESS_END";
TouchBtn.TAP			= "TouchBtn.TAP";
TouchBtn.DOUBLE_TAP		= "TouchBtn.DOUBLE_TAP";
TouchBtn.TRIPLE_TAP		= "TouchBtn.TRIPLE_TAP";

