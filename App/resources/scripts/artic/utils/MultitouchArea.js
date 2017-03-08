
function MultitouchArea($el, opts) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Pt				= bwco.geom.Pt,
		Geom			= bwco.utils.Geom,
		Maths			= bwco.utils.Maths,
		Random			= bwco.utils.Random;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var DEFAULT_OPTS	= {

		enabled: true,

		dragDist: 25,

		leavePadding: 25,

		width: null,
		height: null,

		classActive: "active",
		classDisabled: "disabled"

	}


	// Elements
	/////////////////////////////////////////////


	// Private properties
	/////////////////////////////////////////////

	var _self		= this,
		_el			= $el.get(0);

	var _tuioModel;

	var _opts		= _.defaults(opts || { }, DEFAULT_OPTS);

	var _enabled	= false,
		_tappable	= false,
		_active		= false,
		_dragging	= false;

	var _touches	= [];


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

		"touching": {
			get: function() {
				return _enabled && _touches.length > 0;
			}
		},

		"touchingOnce": {
			get: function() {
				return _enabled && _touches.length == 1;
			}
		},

		"touchingTwice": {
			get: function() {
				return _enabled && _touches.length == 2;
			}
		},

		"touches": {
			get: function() {
				return _touches;
			}
		},

		"touchesGrabDist": {
			get: function() {
				if (_self.touchingTwice) {
					return _touches[0].grabPt.distanceTo(_touches[1].grabPt);
				} else {
					return 0;
				}
			}
		},

		"touchesDist": {
			get: function() {
				if (_self.touchingTwice) {
					return _touches[0].curPt.distanceTo(_touches[1].curPt);
				} else {
					return 0;
				}
			}
		},

		"touchesScale": {
			get: function() {
				if (_self.touchingTwice) {
					var dist		= _self.touchesDist,
						grabDist	= _self.touchesGrabDist;
					if (grabDist > 0) {
						return dist / grabDist;
					} else {
						return 1;
					}
				} else {
					return 1;
				}
			}
		},

		"grabCenter": {
			get: function() {
				if (_self.touchingTwice) {
					var x	= Maths.lerp(_touches[0].grabPt.x, _touches[1].grabPt.x),
						y	= Maths.lerp(_touches[0].grabPt.y, _touches[1].grabPt.y);
					return new Pt(x, y);
				} else if (_self.touchingOnce) {
					return _touches[0].grabPt;
				} else {
					return null;
				}
			}
		},

		"touchCenter": {
			get: function() {
				if (_self.touchingTwice) {
					var x	= Maths.lerp(_touches[0].curPt.x, _touches[1].curPt.x),
						y	= Maths.lerp(_touches[0].curPt.y, _touches[1].curPt.y);
					return new Pt(x, y);
				} else if (_self.touchingOnce) {
					return _touches[0].curPt;
				} else {
					return null;
				}
			}
		},

		"deltaPt": {
			get: function() {
				if (_self.touching) {
					return _self.touchCenter.subtract(_self.grabCenter);
				} else {
					return new Pt(0, 0);
				}
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

	this.cancelTouches = function() {

		App.log("MultitouchArea::cancelTouches...while start");
		while (_touches.length) {

			var touch	= _touches.shift();

			_self.dispatch(MultitouchArea.CANCEL, {
				id: touch.id,
				touches: _touches
			});

		}
		App.log("MultitouchArea::cancelTouches...while end");

	}

	this.dispose = function() {

		_self.disable();

		removeListeners();
		removeClasses();

		Object.defineProperties(this, { });

	}

	this.getTouch = function(id) {

		for (var i = 0; i < _touches.length; i++) {
			if (_touches[i].id == id) {
				return _touches[i];
			}
		}

		return null;

	}


	// Event handlers
	/////////////////////////////////////////////

	function onTouchStart(e) {

		if (e.touchTarget != _el) return;
		if (_touches.length > 2) return;

		if (touchExists(e.id)) {
			onTouchMove(e);
			return;
		}

		if (addTouch(e)) {

			if (_touches.length == 1) {
				_tappable	= true;
			} else {
				_tappable	= false;
			}

			_active			= true;

			updateClasses();
			resetGesturePts();

			_self.dispatch(MultitouchArea.TOUCHES_CHANGE);

			_self.dispatch(MultitouchArea.START, {
				id: e.id,
				touches: _touches
			});

		}

	}
	function onTouchMove(e) {

		if (!touchExists(e.id)) return;

		if (moveTouch(e)) {

			if (_tappable) {
				var touch	= getTouch(e.id),
					dist	= touch ? touch.curPt.distanceTo(touch.grabPt) : -1;
				if (dist > _opts.dragDist) {
					_tappable	= false;
				}
			}

			updateClasses();

			_self.dispatch(MultitouchArea.MOVE, {
				id: e.id,
				touches: _touches
			});

		}

	}
	function onTouchEnd(e) {

		if (!touchExists(e.id)) return;

		var touch	= getTouch(e.id);

		if (removeTouch(e.id)) {

			if (!_touches.length) {
				_active		= true;

				if (_tappable) {
					_self.dispatch(MultitouchArea.TAP, {
						touch: touch
					});
				}
			}

			resetGesturePts();
			updateClasses();

			_self.dispatch(MultitouchArea.TOUCHES_CHANGE);

			_self.dispatch(MultitouchArea.END, {
				id: e.id,
				touches: _touches
			});

		}

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_tuioModel		= TuioModel.getInstance();

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

	function addTouch(touchData) {

		if (_touches.length < 2) {

			_touches.push({
				id: touchData.id,
				grabPt: touchData.pt,
				curPt: touchData.pt
			});
			return true;

		} else {
			return false;
		}

	}
	function moveTouch(touchData) {

		if (_touches[0] && touchData.id == _touches[0].id) {
			_touches[0].curPt	= touchData.pt;
			return true;
		}

		if (_touches[1] && touchData.id == _touches[1].id) {
			_touches[1].curPt	= touchData.pt;
			return true;
		}

		return false;

	}
	function removeTouch(id) {

		if (_touches[0] && id == _touches[0].id) {
			_touches.splice(0, 1);
			return true;
		}

		if (_touches[1] && id == _touches[1].id) {
			_touches.splice(1, 1);
			return true;
		}

		return false;

	}

	function resetGesturePts() {

		for (var i = 0; i < _touches.length; i++) {
			_touches[i].gesturePt	= _touches[i].curPt.clone();
		}

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

	}
	function removeClasses() {

		$el.css("pointer-events", "none");

		if (_opts.classDisabled) {
			$el.removeClass(_opts.classDisabled);
		}
		if (_opts.classActive) {
			$el.removeClass(_opts.classActive);
		}

	}


	// Helpers
	/////////////////////////////////////////////

	function touchExists(id) {

		return getTouch(id) ? true : false;

	}

	function getTouch(id) {

		if (_touches[0] && id == _touches[0].id) return _touches[0];
		if (_touches[1] && id == _touches[1].id) return _touches[1];

		return null;

	}


	// Init
	/////////////////////////////////////////////

	initModels();

	if (_opts.enabled) {
		_self.enable();
	}


}


// Events
/////////////////////////////////////////////

MultitouchArea.START			= "MultitouchArea.START";
MultitouchArea.MOVE				= "MultitouchArea.MOVE";
MultitouchArea.END				= "MultitouchArea.END";
MultitouchArea.TAP				= "MultitouchArea.TAP";

MultitouchArea.CANCEL			= "MultitouchArea.CANCEL";

MultitouchArea.TOUCHES_CHANGE	= "MultitouchArea.TOUCHES_CHANGE";

