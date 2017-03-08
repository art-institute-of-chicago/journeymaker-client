
function PolyhedronControls($el) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////


	// Elements
	/////////////////////////////////////////////

	var $doc			= $el.closest(document);


	// Vars
	/////////////////////////////////////////////

	var _self			= this;

	var _btn;

	var _pt				= new THREE.Vector2(0, 0),
		_delta			= new THREE.Vector2(0, 0),
		_dragDelta		= new THREE.Vector2(0, 0),
		_lastPt			= new THREE.Vector2(0, 0),
		_lastDragPt		= null;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"pt": {
			get: function() {
				return _pt;
			}
		},

		"delta": {
			get: function() {
				return _delta;
			}
		},

		"dragging": {
			get: function() {
				return (_btn.dragging);
			}
		},

		"dragDelta": {
			get: function() {
				return _dragDelta;
			}
		},

		"percX": {
			get: function() {
				return bwco.utils.Maths.norm(_pt.x, 0, winW());
			}
		},

		"percY": {
			get: function() {
				return bwco.utils.Maths.norm(_pt.y, 0, winH());
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.update = function() {

		if (_lastDragPt) {
			_dragDelta.x	= (_pt.x - _lastDragPt.x);
			_dragDelta.y	= (_pt.y - _lastDragPt.y);
			_lastDragPt.set(_pt.x, _pt.y);
		}

		_delta.x	= (_pt.x - _lastPt.x);
		_delta.y	= (_pt.y - _lastPt.y);
		_lastPt.set(_pt.x, _pt.y);

	}


	// Event handlers
	/////////////////////////////////////////////

	function onDragStart(e) {

		setPt(e.screenX, e.screenY);

		_lastDragPt	= _pt.clone();

		_self.dispatch(ControlEvent.DRAG_START, {
			x: e.screenX,
			y: e.screenY
		});

	}
	function onDragMove(e) {

		setPt(e.screenX, e.screenY);

		_self.dispatch(ControlEvent.DRAG_MOVE, {
			x: e.screenX,
			y: e.screenY
		});

	}
	function onDragEnd(e) {

		_self.dispatch(ControlEvent.DRAG_END);

		_lastDragPt	= null;

	}


	// Methods
	/////////////////////////////////////////////

	function initPts() {

		_pt.x		= $el.width()  / 2;
		_pt.y		= $el.height() / 2;
		_lastPt.x	= $el.width()  / 2;
		_lastPt.y	= $el.height() / 2;
	}

	function initBtn() {

		_btn	= new TouchBtn($el, {
			buttonMode: false,
			releaseOnLeave: false,
			enableSfx: false
		});

		_btn.addListener(TouchBtn.DRAG_START, onDragStart)
		_btn.addListener(TouchBtn.DRAG_MOVE, onDragMove)
		_btn.addListener(TouchBtn.DRAG_END, onDragEnd)

	}

	function setPt(x, y) {

		x	= Math.max(0, Math.min(winW(), x));
		y	= Math.max(0, Math.min(winH(), y));

		_pt.set(x, y);

	}


	// Helpers
	/////////////////////////////////////////////

	function winW() {
		return window.innerWidth;
	}
	function winH() {
		return window.innerHeight;
	}


	// Init
	/////////////////////////////////////////////

	initPts();
	initBtn();


};


// Prototype
/////////////////////////////////////////////

bwco.utils.extend(PolyhedronControls, bwco.events.Dispatcher);
