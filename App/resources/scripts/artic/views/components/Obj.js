
function Obj(id, $el, objX, objY, promptIndex, isAdded, initDirec) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Geom			= bwco.utils.Geom,
		Random			= bwco.utils.Random,
		Range			= bwco.math.Range;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var LOAD_INTERVAL_MS		= 500;
	var THM_FRONT_SIZE			= 350 * App.stgScale();
	var THM_BACK_SCALE			= 0.75;
	var ROTATION_ANGLE_RANGE	= new Range(-20, 20);

	var SELECTED_MAX_W			= 800 * App.stgScale();
	var SELECTED_MAX_H			= 750 * App.stgScale();

	var ROTATE_DURATION			= 700,
		STYLE_DURATION			= 950,
		SLIDE_DURATION			= 850,
		EXIT_DURATION			= 850;

	var EASING					= "easeOutExpo",
		EXIT_EASING				= "easeInQuad";

	var REVEAL_DELAY_RANGE		= new Range(2000, 2500),
		EXIT_DELAY_RANGE		= new Range(25, 300);


	// Elements
	/////////////////////////////////////////////

	var $img					= $el.find("img");

	var $wrap					= $el.parent(),
		$wrapTransitioning		= $el.closest("body").find("#wrap-transitioning-obj");


	// Vars
	/////////////////////////////////////////////

	var _self					= this,
		_id						= id;

	var _timeoutAdd;

	var _pt						= {
		x: objX,
		y: objY
	};

	var _sizeThmBack,
		_sizeThmFront,
		_sizeSelected,
		_sizeTray;

	var _intervalLoad,
		_lastTouched			= bwco.utils.Random.integer(-1, -99);

	var _promptIndex			= promptIndex,
		_isAdded				= isAdded,
		_isTransforming			= false;

	var _btn;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"id": {
			get: function() {
				return _id;
			}
		},

		"$el": {
			get: function() {
				return $el;
			}
		},

		"el": {
			get: function() {
				return $el.get(0);
			}
		},

		"lastTouched": {
			get: function() {
				return _lastTouched;
			}
		},

		"selectedSize": {
			get: function() {
				return _sizeSelected;
			}
		},

		"isSelected": {
			get: function() {
				return $el.hasClass("selected");
			}
		},

		"isInBack": {
			get: function() {
				return $el.hasClass("in-back");
			}
		},

		"isAdded": {
			get: function() {
				return $el.hasClass("added");
			}
		},

		"isUnloaded": {
			get: function() {
				return $el.hasClass("unloaded");
			}
		},

		"isTransforming": {
			set: function(val) {
				if (val != _isTransforming) {
					_isTransforming	= val;
					App.log("Obj::isTransforming: " + _isTransforming);
					if (_isTransforming) {
						killAnimations();
					} else {
						updateStyle();
					}
				}
			},
			get: function() {
				return _isTransforming;
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.dispose = function() {

		App.log("Obj::dispose()");

		_btn.removeListener(TouchBtn.PRESS_START, onPress);
		_btn.removeListener(TouchBtn.TAP, onTap);
		_btn.dispose();

		clearTimeout(_timeoutAdd);
		clearInterval(_intervalLoad);

		$el.remove();

		killAnimations();

		Object.defineProperties(this, { });

	}

	this.select = function() {

		App.log("Obj::select()");

		if (!$el.hasClass("selected")) {

			$el.addClass("selected");

			_self.dispatch(ViewEvent.OBJ_SELECTED, {
				target: _self
			});

			revertRotation();
			slideToSelectedSpot();
			updateStyle();

		}

	}
	this.deselect = function() {

		App.log("Obj::deselect()");

		if ($el.hasClass("selected")) {

			$el.removeClass("selected");

			_self.dispatch(ViewEvent.OBJ_DESELECTED, {
				target: _self
			});

			rotateRandomly();
			slideToSpot();
			updateStyle();

		}

	}

	this.add = function() {

		App.log("Obj::add()");

		if (!$el.hasClass("added")) {

			$el.addClass("added");
			_self.deselect();

			$wrapTransitioning.append($el);

			slideToTraySpot()
			updateStyle();
			revertRotation();

			clearTimeout(_timeoutAdd);
			_timeoutAdd	= setTimeout(function() {
				$wrap.append($el);
			}, 850);

			_self.dispatch(ViewEvent.OBJ_ADDED, {
				target: _self
			});

		}

	}
	this.unAdd = function() {

		App.log("Obj::unAdd()");

		if ($el.hasClass("added")) {

			$el.removeClass("added");
			$el.removeClass("selected");

			rotateRandomly();
			slideToSpot();
			updateStyle();

			_self.dispatch(ViewEvent.OBJ_UNADDED, {
				target: _self
			});

		}

	}

	this.sendToBack = function() {

		App.log("Obj::sendToBack()");

		if (!$el.hasClass("in-back")) {
			$el.addClass("in-back");
			updateStyle();
		}
		$el.parent().prepend($el);

	}
	this.bringToFront = function() {

		App.log("Obj::bringToFront()");

		if ($el.hasClass("in-back")) {
			$el.removeClass("in-back");
			updateStyle();
		}
		$el.parent().append($el);

	}

	this.registerTouch = function() {

		App.log("Obj::registerTouch()");

		_lastTouched	= bwco.utils.Time.now();

	}

	this.exitAndDispose = function(direction) {

		App.log("Obj::exitAndDispose()");

		if ($el.hasClass("unloaded")) {
			_self.dispose();
			return;
		}

		if ($el.hasClass("added")) {
			setTimeout(_self.dispose, 500);
			return;
		}

		$el.stop(true);

		if (direction == 0) {
			$img.delay(EXIT_DELAY_RANGE.random).animate({
				"opacity": 0
			}, EXIT_DURATION, EXIT_EASING, _self.dispose);

		} else {
			var trgtX	= parseInt($el.css("left")) + (App.stgW() * direction * -1),
				trgtY	= parseInt($el.css("top"));

			$el.delay(EXIT_DELAY_RANGE.random).animate({
				"left": trgtX,
				"top": trgtY
			}, EXIT_DURATION, EXIT_EASING, _self.dispose);
		}

		// Make sure dispose is called (should jQuery animate fail)
		setTimeout(_self.dispose, EXIT_DELAY_RANGE.max + EXIT_DURATION);

	}


	// Event handlers
	/////////////////////////////////////////////

	function onLoadCheckInterval() {

		if (($img.width() > 0) && ($img.height() > 0)) {
			onImgLoad();
		}

	}

	function onImgLoad() {

		App.log("Obj::onImgLoad()");

		clearInterval(_intervalLoad)
		$el.removeClass("unloaded");

		calcSizes();

		$img.css("opacity", 0);

		$el.css({
			"left": _pt.x + (App.stgW() * initDirec),
			"top": _pt.y
		});

		$el.delay(REVEAL_DELAY_RANGE.random).animate({
			"left": _pt.x,
			"top": _pt.y
		}, SLIDE_DURATION, EASING);

		updateStyle(true);
		rotateRandomly(true);

		if (_isAdded) {
			$el.addClass("added");
			slideToTraySpot(true);
			updateStyle();
			revertRotation();
		}

	}
	function onPress(e) {

		App.log("Obj::onPress()");

		_self.dispatch(ViewEvent.OBJ_PRESS, {
			target: _self
		});

	}
	function onTap(e) {

		App.log("Obj::onTap()");

		_self.registerTouch();

		if ($el.hasClass("selected")) {
			_self.dispatch(ViewEvent.OBJ_CANCEL, {
				target: _self
			});

		} else {
			_self.dispatch(ViewEvent.OBJ_SELECT, {
				target: _self
			});

		}

	}


	// Private methods
	/////////////////////////////////////////////

	function initBtn() {

		App.log("Obj::initBtn()");

		_btn	= new TouchBtn($img);
		_btn.addListener(TouchBtn.PRESS_START, onPress);
		_btn.addListener(TouchBtn.TAP, onTap);

	}
	function initLoadCheck() {

		App.log("Obj::initLoadCheck()");

		_intervalLoad	= setInterval(onLoadCheckInterval, LOAD_INTERVAL_MS);

	}

	function updateStyle(immediate) {

		if (_isTransforming) return;

		if (!_sizeThmBack) return;
		if (!_sizeThmFront) return;
		if (!_sizeSelected) return;
		if (!_sizeTray) return;

		App.log("Obj::updateStyle()");

		var w			= $img.width(),
			h			= $img.height(),
			opacity		= $img.css("opacity");

		var trgtW		= w,
			trgtH		= h,
			trgtOpacity	= opacity;

		if (_self.isAdded) {
			trgtW		= _sizeTray.w;
			trgtH		= _sizeTray.h;
			trgtOpacity	= 1;

		} else if (_self.isSelected) {
			trgtW		= _sizeSelected.w;
			trgtH		= _sizeSelected.h;
			trgtOpacity	= 1;

		} else if (_self.isInBack) {
			trgtW		= _sizeThmBack.w;
			trgtH		= _sizeThmBack.h;
			trgtOpacity	= 1;

		} else {
			trgtW		= _sizeThmFront.w;
			trgtH		= _sizeThmFront.h;
			trgtOpacity	= _self.isUnloaded ? 0 : 1;

		}

		if ((trgtW != w) || (trgtH != h) || (trgtOpacity != opacity)) {

			$img.stop(true);

			if (immediate) {
				$img.css({
					"width": trgtW,
					"height": trgtH,
					"opacity": trgtOpacity
				});

			} else {

				$img.animate({
					"width": trgtW,
					"height": trgtH,
					"opacity": trgtOpacity
				}, {
					duration: STYLE_DURATION,
					easing: EASING
				});

			}

		}

	}

	function slideToSelectedSpot(immediate) {

		App.log("Obj::slideToSelectedSpot()");

		var trgtX	= (App.stgW() - (DetailPanel.W * App.stgScaleX())) / 2,
			trgtY	= (DetailPanel.SELECTED_OBJ_Y * App.stgScaleY());

		slideTo(trgtX, trgtY, immediate);

	}
	function slideToTraySpot(immediate) {

		App.log("Obj::slideToTraySpot()");

		var $viewport	= $el.closest("#viewport");

		var $tray		= $viewport.find("#footer ol.tray"),
			$slot		= $tray.find("li").eq(_promptIndex);

		var trgtX		= $slot.offset().left - $viewport.offset().left + ($slot.width() / 2),
			trgtY		= $slot.offset().top - $viewport.offset().top - 27 + (_sizeTray.h / 2);

		slideTo(trgtX, trgtY, immediate);

	}
	function slideToSpot(immediate) {

		App.log("Obj::slideToSpot()");

		slideTo(_pt.x, _pt.y, immediate);

	}
	function slideTo(x, y, immediate) {

		if (_isTransforming) return;

		App.log("Obj::slideTo()");

		$el.stop(true);

		if (immediate) {
			$el.css({
				"left": x,
				"top": y
			});
		} else {
			$el.animate({
				"left": x,
				"top": y
			}, SLIDE_DURATION, EASING);
		}

	}
	function rotateRandomly(immediate) {

		App.log("Obj::rotateRandomly()");

		if (immediate) {
			$el.rotate({
				angle: ROTATION_ANGLE_RANGE.random
			});
		} else {
			$el.rotate({
				animateTo: ROTATION_ANGLE_RANGE.random,
				duration: ROTATE_DURATION
			});
		}

	}
	function revertRotation(immediate) {

		App.log("Obj::revertRotation()");

		if (immediate) {
			$el.rotate({
				angle: 0
			});

		} else {
			$el.rotate({
				animateTo: 0,
				duration: ROTATE_DURATION
			});
		}

	}

	function killAnimations() {

		App.log("Obj::killAnimations()");

		$el.stop(true);
		$img.stop(true);

	}


	// Helpers
	/////////////////////////////////////////////

	function calcSizes() {

		App.log("Obj::calcSizes()");

		var w			= $img.width(),
			h			= $img.height();

		var whRatio		= w / h,
			hwRatio		= h / w;


		// Thm front size
		/////////////////////////////////////////////

		if (w >= h) {
			_sizeThmFront	= {
				w: Math.round(THM_FRONT_SIZE * bwco.utils.Maths.lerp(whRatio, 1, 0.75)),
				h: Math.round(THM_FRONT_SIZE * bwco.utils.Maths.lerp(whRatio, 1, 0.75) * hwRatio)
			};
		} else {
			_sizeThmFront	= {
				h: Math.round(THM_FRONT_SIZE * bwco.utils.Maths.lerp(hwRatio, 1, 0.75)),
				w: Math.round(THM_FRONT_SIZE * bwco.utils.Maths.lerp(hwRatio, 1, 0.75) * whRatio)
			};
		}


		// Thm back size
		/////////////////////////////////////////////

		_sizeThmBack	= {
			w: Math.round(_sizeThmFront.w * THM_BACK_SCALE),
			h: Math.round(_sizeThmFront.h * THM_BACK_SCALE)
		};


		// Selected size
		/////////////////////////////////////////////

		if (whRatio > (SELECTED_MAX_W / SELECTED_MAX_H)) {
			_sizeSelected	= {
				w: Math.round(SELECTED_MAX_W),
				h: Math.round(SELECTED_MAX_W * hwRatio)
			};
		} else {
			_sizeSelected	= {
				w: Math.round(SELECTED_MAX_H * whRatio),
				h: Math.round(SELECTED_MAX_H)
			};
		}


		// Tray size
		/////////////////////////////////////////////

		var trayMaxW		= App.isKiosk ? ViewFooter.THM_MAX_W : ViewFooter.THM_MAX_W_HOME,
			trayThmRect		= Geom.getFitRect(w, h, 0, 0, trayMaxW, ViewFooter.THM_MAX_H);

		_sizeTray			= {
			w: Math.round(trayThmRect.width),
			h: Math.round(trayThmRect.height)
		};


		App.log("\t-_sizeThmBack:  " + _sizeThmBack.w + " x " + _sizeThmBack.h);
		App.log("\t-_sizeThmFront: " + _sizeThmFront.w + " x " + _sizeThmFront.h);
		App.log("\t-_sizeSelected: " + _sizeSelected.w + " x " + _sizeSelected.h);
		App.log("\t-_sizeTray:     " + _sizeTray.w + " x " + _sizeTray.h);

	}


	// Init
	/////////////////////////////////////////////

	initBtn();
	initLoadCheck();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(Obj, bwco.events.Dispatcher);


