
function TuioModel() {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Pt				= bwco.geom.Pt;
		Area			= bwco.geom.Area,
		Ticker			= bwco.ticker.Ticker,
		TickerEvent		= bwco.ticker.TickerEvent,
		Maths			= bwco.utils.Maths;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var TOUCH_END_TIMEOUT	= 100;

	var DEFAULT_AREA		= new Area(0, 0, 1, 1);


	// Private properties
	/////////////////////////////////////////////

	var _self			= this;

	var _area			= DEFAULT_AREA.clone();

	var _emulateTouch	= false;

	var _touches		= [];


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"area": {
			get: function() {
				return _area;
			}
		},

		"x": {
			get: function() {
				return _area.x
			}
		},

		"y": {
			get: function() {
				return _area.y
			}
		},

		"width": {
			get: function() {
				return _area.width
			}
		},

		"height": {
			get: function() {
				return _area.height
			}
		},

		"handleOutsideTouches": {
			get: function() {
				return ConfigModel.getInstance().val("handleOutsideTouches", true);
			}
		},

		"emulateTouch": {
			get: function() {
				return _emulateTouch;
			},
			set: function(val) {
				val	= val ? true : false;
				if (val != _emulateTouch) {
					_emulateTouch	= val;
					updateTouchEmulation();
				}
			}
		}


	});


	// Public methods
	/////////////////////////////////////////////

	this.connect = function(host) {

		_client	= new Tuio.Client({
			host: host
		});

		_client.on("addTuioCursor", onAddTuioCursor);
		_client.on("updateTuioCursor", onUpdateTuioCursor);
		_client.on("removeTuioCursor", onRemoveTuioCursor);
		_client.on("connect", onConnect);

		_client.connect();

	}

	this.setCalibration = function(x, y, w, h) {

		console.log("TuioModel::setCalibration: { x: " + x + ", y: " + y + ", w: " + w + ", h: " + h + " }");

		_area.x			= x;
		_area.y			= y;
		_area.width		= w;
		_area.height	= h;

		_self.dispatch(ModelEvent.TUIO_CALIBRATION_UPDATE);

	}


	// Event handlers
	/////////////////////////////////////////////

	function onConnect() {
		console.log("TuioModel::onConnect");
	}

	function onAddTuioCursor(cursor) {
		if (_self.handleOutsideTouches || withinArea(cursor)) {
			registerTouch(cursor.cursorId, TouchEvent.START, getScreenPt(cursor));
		}
	}
	function onUpdateTuioCursor(cursor) {
		if (_self.handleOutsideTouches || withinArea(cursor)) {
			registerTouch(cursor.cursorId, TouchEvent.MOVE, getScreenPt(cursor));
		}
	}
	function onRemoveTuioCursor(cursor) {
		if (_self.handleOutsideTouches || withinArea(cursor)) {
			registerTouch(cursor.cursorId, TouchEvent.END, getScreenPt(cursor));
		}
	}

	function onMouseDown(e) {

		registerTouch(0, TouchEvent.START, new Pt(e.clientX, e.clientY));

		document.onmousemove	= onMouseMove;
		document.onmouseup		= onMouseUp;

	}
	function onMouseMove(e) {

		registerTouch(0, TouchEvent.MOVE, new Pt(e.clientX, e.clientY));

	}
	function onMouseUp(e) {

		document.onmousemove	= null;
		document.onmouseup		= null;

		registerTouch(0, TouchEvent.END, new Pt(e.clientX, e.clientY));

	}

	function onTouchStart(e) {

		e.preventDefault();

		var touches		= e && e.changedTouches ? e.changedTouches : [],
			touch		= touches[0];

		if (!touch) return;

		registerTouch(0, TouchEvent.START, new Pt(touch.clientX, touch.clientY));

		document.addEventListener("touchmove", onTouchMove, false);
		document.addEventListener("touchend", onTouchEnd, false);
		document.addEventListener("touchcancel", onTouchEnd, false);

	}
	function onTouchMove(e) {

		e.preventDefault();

		var touches		= e && e.changedTouches ? e.changedTouches : [],
			touch		= touches[0];

		if (!touch) return;

		registerTouch(0, TouchEvent.MOVE, new Pt(touch.clientX, touch.clientY));

	}
	function onTouchEnd(e) {

		var touches		= e && e.changedTouches ? e.changedTouches : [],
			touch		= touches[0];

		if (!touch) return;

		registerTouch(0, TouchEvent.END, new Pt(touch.clientX, touch.clientY));

		document.removeEventListener("touchmove", onTouchMove);
		document.removeEventListener("touchend", onTouchEnd);
		document.removeEventListener("touchcancel", onTouchEnd);

	}


	// Private methods
	/////////////////////////////////////////////

	function updateTouchEmulation() {

		if (_emulateTouch) {
			document.onmousedown	= onMouseDown;
			document.addEventListener("touchstart", onTouchStart, false);

		} else {
			document.onmousedown	= null;
			document.onmousemove	= null;
			document.onmouseup		= null;

			document.removeEventListener("touchstart", onTouchStart);
			document.removeEventListener("touchmove", onTouchMove);
			document.removeEventListener("touchend", onTouchEnd);
			document.removeEventListener("touchcancel", onTouchEnd);

		}

	}

	function registerTouch(id, type, pt) {

		var touch		= makeTouch(id, type, pt),
			lastTouch	= _touches[id];

		if (lastTouch) {

			clearTimeout(lastTouch.timeout);

			switch (touch.type) {

				case TouchEvent.MOVE:
					sendTouchEvent(touch);
					break;

				case TouchEvent.END:
					queueTouchEnd(touch);
					break;
			}

		} else if (type == TouchEvent.START) {
			sendTouchEvent(touch);

		}

	}

	function queueTouchEnd(t) {

		_touches[t.id]	= t;

		t.timeout		= setTimeout(endTouch, TOUCH_END_TIMEOUT, t);

	}
	function endTouch(t) {

		clearTimeout(t.timeout);

		sendTouchEvent(t);

	}

	function sendTouchEvent(t) {

		t.touchTarget	= document.elementFromPoint(t.pt.x, t.pt.y);

		_touches[t.id]	= (t.type == TouchEvent.END) ? false : t;

		_self.dispatch(t.type, t);

	}


	// Helpers
	/////////////////////////////////////////////

	function withinArea(cursor) {

		return _area.xRange.contains(cursor.xPos) && _area.yRange.contains(cursor.yPos);

	}

	function getScreenPt(cursor) {

		var x	= Maths.lerp(0, App.stgW(), _area.xRange.norm(cursor.xPos)),
			y	= Maths.lerp(0, App.stgH(), _area.yRange.norm(cursor.yPos));

		return new Pt(x, y);

	}

	function makeTouch(id, type, pt) {

		return {
			type: type,
			id: id,
			pt: pt,
			time: Date.now()
		}

	}


}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(TuioModel, bwco.events.Dispatcher);
bwco.utils.makeSingleton(TuioModel);
