
function DetailPanel($wrap) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Pt				= bwco.geom.Pt,
		Ticker			= bwco.ticker.Ticker,
		TickerEvent		= bwco.ticker.TickerEvent,
		Geom			= bwco.utils.Geom,
		Random			= bwco.utils.Random,
		Maths			= bwco.utils.Maths;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var ADD_TEXT_DEFAULT			= "Add to Journey",
		ADD_TEXT_REPLACE			= "Replace Current Artwork";

	var SCALE_MIN					= 1,
		SCALE_MAX					= 3;

	var IMG_EASE					= 1/7,
		TRANSFORM_EASE				= 1/4;

	var TOUCH_TRANFORM_START_DELAY	= 850;


	// Elements
	/////////////////////////////////////////////

	var $wrapSelectedObj	= $wrap.find("div.wrap-selected-obj"),
		$multitouchArea		= $wrap.find("div.multitouch-area");

	var $panel				= $wrap.find("div.detail-panel"),
		$textDesc			= $panel.find("p.description"),
		$textMetaInfo		= $panel.find("p.meta-info"),
		$closeBtn			= $panel.find("button.close"),
		$addBtn				= $panel.find("button.add");

	var $wrapCredits		= $panel.find("div.wrap-credits"),
		$textCredits		= $wrapCredits.find("p"),
		$creditsBtn			= $wrapCredits.find("button.expand-collapse");


	// Vars
	/////////////////////////////////////////////

	var _self				= this;

	var _ticker;

	var _obj,
		_imgSize;

	var _closeBtn,
		_addBtn,
		_touchArea;

	var _imgPos;

	var _basePivot;

	var _scale				= {
		touch: 1,
		zoom: 1
	};

	var _offset				= {
		base: new Pt(),
		touch: new Pt(),
		pan: new Pt(),
		pivot: new Pt()
	};

	var _pivot				= new Pt(),
		_transforming		= false;

	var _startTimeout;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"on": {
			get: function() {
				return $wrap.hasClass("on");
			}
		},

		"totalScale": {
			get: function() {
				return _scale.touch * _scale.zoom;
			}
		},

		"totalOffset": {
			get: function() {
				return _offset.base.add(_offset.pan).add(_offset.touch).add(_offset.pivot);
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.show = function(obj, toReplace) {

		App.log("DetailPanel::show()");

		// Populate panel fields
		/////////////////////////////////////////////

		var dataModel	= DataModel.getInstance(),
			data		= dataModel.getObjById(obj.id);

		$textDesc.html(data.detailNarrative);
		$textMetaInfo.html(data.artist + "<br><em>" + data.title + "</em><br>" + data.year);

		$panel.removeClass("credits-expanded");

		if (data.credit && data.credit.length) {
			$wrapCredits.addClass("on");
			$textCredits.html(data.credit);
		} else {
			$wrapCredits.removeClass("on");
		}

		$addBtn.text(toReplace ? ADD_TEXT_REPLACE : ADD_TEXT_DEFAULT);

		setObj(obj);


		// Place panel
		/////////////////////////////////////////////

		var panelX	= (_imgSize.w + App.stgW() - (DetailPanel.W * App.stgScaleX())) / 2;

		$panel.css({
			left: panelX
		});

		_closeBtn.enable();
		_addBtn.enable();
		_creditsBtn.enable();


		// Turn er on
		/////////////////////////////////////////////

		$wrap.addClass("on");

		clearTimeout(_startTimeout);
		_startTimeout	= setTimeout(startTouchTransform, TOUCH_TRANFORM_START_DELAY);

	}
	this.hide = function() {

		App.log("DetailPanel::hide()");

		$wrap.removeClass("on");

		_closeBtn.disable();
		_addBtn.disable();
		_creditsBtn.disable();

		endTouchTransform();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onCloseTap(e) {

		App.log("DetailPanel::onCloseTap()");

		_self.dispatch(ViewEvent.DETAIL_CANCEL);

	}
	function onAddTap(e) {

		App.log("DetailPanel::onAddTap()");

		_self.dispatch(ViewEvent.DETAIL_ADD);

	}
	function onCreditsExpandCollapseTap(e) {

		App.log("DetailPanel::onCreditsExpandCollapseTap()");

		$panel.toggleClass("credits-expanded");

	}

	function onTouchAreaTap(e) {

		App.log("DetailPanel::onTouchAreaTap()");

		var $img	= _obj.$el.find("img"),
			pt		= (e.touch && e.touch.curPt) ? e.touch.curPt : new Pt(-1, -1);

		if (ptOnImg(pt)) {
			_transforming	= false;

		} else if (!ptOnPanel(pt)) {
			_self.dispatch(ViewEvent.DETAIL_CANCEL);

		}

	}
	function onTouchStart(e) {

		if (e.touches.length == 1) {

			var touch	= e.touches[0],
				pt		= touch ? touch.grabPt : new Pt();

			if (!ptOnImg(pt)) {

				_touchArea.cancelTouches();
				_self.dispatch(ViewEvent.DETAIL_CANCEL);

			}

		}

	}
	function onTouchesChange(e) {

		App.log("DetailPanel::onTouchesChange()");

		if (_touchArea.touching) {
			_transforming	= true;
		} else {
			_transforming	= false;
		}

		_scale.zoom		= _scale.zoom * _scale.touch;
		_offset.pan		= _offset.pan.add(_offset.touch);
		_scale.touch	= 1;
		_offset.touch	= new Pt();

		resetPivot();

	}

	function onFrame(e) {

		updateTouchTransform();
		updateZoomAndPan();

		if (updateImgPos()) {
			updateImg();
		}

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() { }
	function initView() { }
	function initTicker() {

		_ticker			= Ticker.getInstance();

	}
	function initMultitouch() {

		_touchArea	= new MultitouchArea($multitouchArea, {
			enabled: false
		});
		_touchArea.addListener(MultitouchArea.TAP, onTouchAreaTap);
		_touchArea.addListener(MultitouchArea.START, onTouchStart);
		_touchArea.addListener(MultitouchArea.TOUCHES_CHANGE, onTouchesChange);
		_touchArea.addListener(MultitouchArea.CANCEL, onTouchesChange);

	}
	function initBtns() {

		_closeBtn	= new TouchBtn($closeBtn, { enabled: false });
		_addBtn		= new TouchBtn($addBtn, { enabled: false });
		_creditsBtn	= new TouchBtn($creditsBtn, { enabled: false });

		_closeBtn.addListener(TouchBtn.TAP, onCloseTap);
		_addBtn.addListener(TouchBtn.TAP, onAddTap);
		_creditsBtn.addListener(TouchBtn.TAP, onCreditsExpandCollapseTap);

	}

	function setObj(obj) {

		App.log("DetailPanel::setObj()");

		_obj			= obj;
		_imgSize		= obj.selectedSize;

		$wrapSelectedObj.append(_obj.$el);

		var imgW		= _imgSize.w,
			imgH		= _imgSize.h;

		_scale.touch	= 1;
		_scale.zoom		= 1;

		_offset.base	= new Pt((App.stgW() - (DetailPanel.W * App.stgScaleX())) / 2, (DetailPanel.SELECTED_OBJ_Y * App.stgScaleY()));
		_offset.touch	= new Pt();
		_offset.pan		= new Pt();
		_offset.pivot	= new Pt();

		_basePivot		= new Pt(imgW / 2, imgH / 2);
		_pivot			= new Pt();

		var scale		= _self.totalScale,
			offset		= _self.totalOffset;

		_imgPos			= new Area(offset.x - (_pivot.x * scale), offset.y - (_pivot.y * scale), _imgSize.w, _imgSize.h);

	}

	function startTouchTransform() {

		App.log("DetailPanel::startTouchTransform()");

		clearTimeout(_startTimeout);

		_obj.isTransforming	= true;
		_touchArea.enable();

		_ticker.addListener(TickerEvent.TICK, onFrame);

	}
	function endTouchTransform() {

		App.log("DetailPanel::endTouchTransform()");

		clearTimeout(_startTimeout);

		if (_obj) {
			_obj.isTransforming	= false;
		}

		_touchArea.disable();
		_ticker.removeListener(TickerEvent.TICK, onFrame);

	}

	function updateTouchTransform() {

		var touchA			= _touchArea.touches[0],
			touchB			= _touchArea.touches[1];

		if (touchA && touchB) {

			var distStart	= touchA.gesturePt.distanceTo(touchB.gesturePt),
				distCur		= touchA.curPt.distanceTo(touchB.curPt);

			var xStart		= Maths.lerp(touchA.gesturePt.x, touchB.gesturePt.x),
				yStart		= Maths.lerp(touchA.gesturePt.y, touchB.gesturePt.y),
				xCur		= Maths.lerp(touchA.curPt.x, touchB.curPt.x),
				yCur		= Maths.lerp(touchA.curPt.y, touchB.curPt.y);

			var ptStart		= new Pt(xStart, yStart),
				ptCur		= new Pt(xCur, yCur);

			var minScale	= SCALE_MIN / _scale.zoom,
				maxScale	= SCALE_MAX / _scale.zoom;

			_scale.touch	= Math.min(maxScale, Math.max(minScale, distCur / distStart));
			_offset.touch	= ptCur.subtract(ptStart);

			limitTouchOffset();

		} else if (touchA) {

			_offset.touch	= touchA.curPt.subtract(touchA.gesturePt);
			limitTouchOffset();

		}

	}
	function updateZoomAndPan() {

		if (!_transforming) {

			_scale.zoom			= Maths.ease(_scale.zoom, 1, IMG_EASE, 0.005);

			_offset.pan.x		= Maths.ease(_offset.pan.x, 0, IMG_EASE, 0.1);
			_offset.pan.y		= Maths.ease(_offset.pan.y, 0, IMG_EASE, 0.1);

			_offset.pivot.x		= Maths.ease(_offset.pivot.x, 0, IMG_EASE, 0.1);
			_offset.pivot.y		= Maths.ease(_offset.pivot.y, 0, IMG_EASE, 0.1);

		} else if (!_touchArea.touchingTwice) {

			var trgtZoom		= Math.min(SCALE_MAX, Math.max(SCALE_MIN, _scale.zoom));

			_scale.zoom			= Maths.ease(_scale.zoom, trgtZoom, IMG_EASE, 0.005);

		}

	}
	function updateImgPos() {

		var lastX	= _imgPos.x,
			lastY	= _imgPos.y,
			lastW	= _imgPos.width,
			lastH	= _imgPos.height;

		var scale	= _self.totalScale,
			offset	= _self.totalOffset;

		var nextX	= offset.x - (_pivot.x * scale),
			nextY	= offset.y - (_pivot.y * scale),
			nextW	= _imgSize.w * scale,
			nextH	= _imgSize.h * scale;

		if ((nextX != lastX) || (nextY != lastY) || (nextW != lastW) || (nextH != lastH)) {

			_imgPos.x		= Maths.ease(_imgPos.x, nextX, TRANSFORM_EASE, 1);
			_imgPos.y		= Maths.ease(_imgPos.y, nextY, TRANSFORM_EASE, 1);
			_imgPos.width	= Maths.ease(_imgPos.width, nextW, TRANSFORM_EASE, 1);
			_imgPos.height	= Maths.ease(_imgPos.height, nextH, TRANSFORM_EASE, 1);

			return true;

		} else {

			return false;

		}

	}
	function updateImg() {

		_obj.$el.css({
			"left": _imgPos.x,
			"top":  _imgPos.y
		})

		_obj.$el.find("img").css({
			"width":  _imgPos.width,
			"height": _imgPos.height
		});

	}

	function resetPivot() {

		App.log("DetailPanel::resetPivot()");

		if (_transforming && !_touchArea.touching) return;

		var lastPivot		= _pivot.clone(),
			nextPivot		= _touchArea.touching ? areaPtToImgPt(_touchArea.touchCenter) : new Pt(),
			deltaPivot		= imgPtToAreaPt(nextPivot).subtract(imgPtToAreaPt(lastPivot));

		_pivot				= nextPivot;
		_offset.pivot		= _offset.pivot.add(deltaPivot);

	}


	// Helpers
	/////////////////////////////////////////////

	function ptOnEl(pt, $el, pad) {

		pad			= bwco.utils.defined(pad) ? pad : 0;

		var minX	= $el.offset().left - pad,
			minY	= $el.offset().top  - pad,
			maxX	= minX + $el.outerWidth()  + (pad * 2),
			maxY	= minY + $el.outerHeight() + (pad * 2);

		if (pt.x < minX) return false;
		if (pt.y < minY) return false;
		if (pt.x > maxX) return false;
		if (pt.y > maxY) return false;

		return true;

	}
	function ptOnImg(pt) {

		var $img	= _obj.$el.find("img");

		return ptOnEl(pt, $img, 25);

	}
	function ptOnPanel(pt) {

		return ptOnEl(pt, $panel, 25);

	}

	function areaPtToImgPt(areaPt) {
		var scale	= _self.totalScale,
			x		= (areaPt.x - _imgPos.x) / scale;
			y		= (areaPt.y - _imgPos.y) / scale;
		return new Pt(x, y);
	}
	function imgPtToAreaPt(imgPt) {
		var scale	= _self.totalScale,
			x		= (imgPt.x * scale) + _imgPos.x,
			y		= (imgPt.y * scale) + _imgPos.y;
		return new Pt(x, y);
	}

	function limitTouchOffset() {

		return;

		var scale			= _self.totalScale,
			o				= _offset;

		var offsetOtherX	= o.base.x + o.pan.x + o.pivot.x - (_pivot.x * scale),
			offsetOtherY	= o.base.y + o.pan.y + o.pivot.y - (_pivot.y * scale);

		var minX			= -offsetOtherX + (App.stgW() * 2/3) - (_imgSize.w * scale),
			minY			= -offsetOtherY + (App.stgH() * 2/3) - (_imgSize.h * scale),
			maxX			= -offsetOtherX + (App.stgW() * 1/3),
			maxY			= -offsetOtherY + (App.stgH() * 1/3);

		o.touch.x			= Math.min(maxX, Math.max(minX, o.touch.x));
		o.touch.y			= Math.min(maxY, Math.max(minY, o.touch.y));

	}


	// Init
	/////////////////////////////////////////////

	initModels();
	initView();
	initTicker();
	initBtns();
	initMultitouch();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(DetailPanel, bwco.events.Dispatcher);

// Static
/////////////////////////////////////////////

DetailPanel.W				= 550;
DetailPanel.SELECTED_OBJ_Y	= 510;
