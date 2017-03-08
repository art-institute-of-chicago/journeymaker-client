
function ViewPrint($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Random			= bwco.utils.Random;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var CURSOR_BLINK_INTERVAL	= 500;

	var DEFAULT_NAME			= "Anonymous",
		DEFAULT_PRINTER_NAME	= "the Printing Area",
		DEFAULT_PRINTER_COLOR	= "#ffffff";

	var TILES_SPACING_X			= 8;

	var STATE_VALS				= [
		{
			"state": PrintState.ASSEMBLING,
			"title": "Creating Your Path...",
			"class": "assembling",
			"nameBtnLabel": ""
		},
		{
			"state": PrintState.REARRANGING,
			"title": "Creating Your Path...",
			"class": "rearranging",
			"nameBtnLabel": ""
		},
		{
			"state": PrintState.UNNAMED,
			"title": "Personalize Your Journey Guide",
			"class": "unnamed",
			"nameBtnLabel": "Add Name"
		},
		{
			"state": PrintState.KEYBOARD_ON,
			"title": "Personalize Your Journey Guide",
			"class": "keyboard-on",
			"nameBtnLabel": "Enter"
		},
		{
			"state": PrintState.NAMED,
			"title": "{{name}}’s Journey Guide",
			"class": "named",
			"nameBtnLabel": "Print"
		},
		{
			"state": PrintState.PRINTING,
			"title": "Thanks {{name}}!",
			"class": "printing",
			"nameBtnLabel": ""
		},
		{
			"state": PrintState.FINISHED,
			"title": "Thanks {{name}}! {{printerResponse}}",
			"class": "printed",
			"nameBtnLabel": ""
		}
	];

	var STATE_VALS_HOME			= [
		{
			"state": PrintState.ASSEMBLING,
			"title": "Creating Your Path...",
			"class": "assembling",
			"nameBtnLabel": ""
		},
		{
			"state": PrintState.REARRANGING,
			"title": "Creating Your Path...",
			"class": "rearranging",
			"nameBtnLabel": ""
		},
		{
			"state": PrintState.UNNAMED,
			"title": "Personalize Your Journey Guide",
			"class": "unnamed",
			"nameBtnLabel": "Add Name"
		},
		{
			"state": PrintState.KEYBOARD_ON,
			"title": "Personalize Your Journey Guide",
			"class": "named",
			"nameBtnLabel": "Create Guide"
		},
		{
			"state": PrintState.NAMED,
			"title": "Personalize Your Journey Guide",
			"class": "named",
			"nameBtnLabel": "Create Guide"
		},
		{
			"state": PrintState.PRINTING,
			"title": "Thanks {{name}}!",
			"class": "printing",
			"nameBtnLabel": ""
		},
		{
			"state": PrintState.FINISHED,
			"title": "Thanks {{name}}! {{printerResponse}}",
			"class": "printed",
			"nameBtnLabel": ""
		}
	];

	var PROGRESS_LABEL			= "Your Journey Guide is Printing...",
		PROGRESS_LABEL_HOME		= "Creating your Journey Guide PDF...";


	// Elements
	/////////////////////////////////////////////

	var $doc			= $(document),
		$view			= $("#wrap-sections section#print"),
		$nameForm		= $view.find("div.name-form"),
		$nameField		= $nameForm.find("div.name-field"),
		$nameFieldText	= $nameField.find("p.text"),
		$nameFieldHit	= $nameField.find("div.hit-area"),
		$nameFieldInput	= $nameField.find("input"),
		$cursor			= $nameField.find("div.cursor"),
		$btn			= $nameField.find("button"),
		$keyboard		= $view.find("div.keyboard");

	var $top			= $view.find("div.top"),
		$title			= $top.find("h3"),
		$tilesList		= $top.find("ul.tiles"),
		$tiles			= $tilesList.find("li");

	var $btm			= $view.find("div.btm"),
		$progressLabel	= $btm.find("p.progress-label"),
		$progressBar	= $btm.find("div.print-progress div.progress-bar"),
		$btmBtns		= $btm.find("p.btns"),
		$exitBtn		= $btmBtns.find("button.exit"),
		$downloadBtn	= $btmBtns.find("button.download"),
		$redoBtn		= $btmBtns.find("button.redo"),
		$buyBtn			= $btmBtns.find("button.buy"),
		$visitBtn		= $btmBtns.find("button.visit");


	// Vars
	/////////////////////////////////////////////

	var _self					= this;

	var _appModel,
		_config,
		_dataModel;

	var _keyboard;

	var _cursorInterval;

	var _state					= PrintState.ASSEMBLING;

	var _name					= DEFAULT_NAME,
		_printerResponse		= "",
		_printingComplete		= false,
		_fakePrintingComplete	= false,
		_pdfUrl					= undefined;

	var _on						= false;

	var _btn,
		_nameFieldHit,
		_exitBtn;

	var _tileW,
		_allTilesW;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"keyboardOn": {
			get: function() {
				return _state == PrintState.KEYBOARD_ON;
			}
		},

		"state": {
			get: function() {
				return _state;
			},
			set: function(val) {

				if (val != _state) {

					if (_state == PrintState.KEYBOARD_ON) {
						if (val == PrintState.UNNAMED) {
							_self.dispatch(ViewEvent.KEYBOARD_CLOSE, { named: false });

						} else if (val == PrintState.NAMED) {
							_self.dispatch(ViewEvent.KEYBOARD_CLOSE, { named: true });

						} else if (val == PrintState.PRINTING) {
							_self.dispatch(ViewEvent.KEYBOARD_CLOSE, { named: true });

						}
					}

					_state	= val;

					App.log("ViewPrint::state: " + _state);

					if (_state == PrintState.KEYBOARD_ON) {
						if (App.isHomeCompanion) {
							$nameFieldInput.focus();
						}
						if (_keyboard.empty) {
							_keyboard.shiftOn	= true;
						}

						_self.dispatch(ViewEvent.KEYBOARD_OPEN, {
							named: nameEntered()
						});

					}

					updateView();

				}
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		if (_on) return;

		_on		= true;

		updateView();

		$view.show();
		restartCursor();

		assemble();

	}

	this.hide = function() {

		if (!_on) return;

		_on		= false;

		$view.hide();
		stopCursorBlink();

	}

	this.onPrinterResponse = function(response) {

		App.log("ViewPrint::onPrinterResponse()");
		App.log("\t-success: " + response.success);

		if (response.success) {

			$btmBtns.removeClass("problem");

			if (response.pdfUrl) {
				_printerResponse	= "Your Journey Guide is ready to print!";
				_pdfUrl				= response.pdfUrl;

			} else {
				var printerName		= response.printerName ? response.printerName : DEFAULT_PRINTER_NAME,
					printerColor	= response.printerColor ? response.printerColor : DEFAULT_PRINTER_COLOR;

				_printerResponse	= "Pick up your Journey Guide from <span style=\"color: " + printerColor + ";\">" + printerName + "</span>.";

			}


		} else {

			$btmBtns.addClass("problem");

			if (App.isKiosk) {
				_printerResponse	= "Sorry, there was a problem printing."
			} else {
				_printerResponse	= "Sorry, there was a problem creating the PDF."
			}

		}

		_printingComplete	= true;

		if (_fakePrintingComplete) {
			_self.state	= PrintState.FINISHED;
		}

	}


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) {

		switch (_appModel.state) {

			case AppState.SPIN:
				_name					= DEFAULT_NAME;
				_printerResponse		= "";
				_printingComplete		= false;
				_fakePrintingComplete	= false;
				_pdfUrl					= undefined;
				_keyboard.clear();
				$nameFieldInput.val("");
				break;

			case AppState.TOUR:
				_self.state				= PrintState.PRINTING;
				fakePrintProgress();
				break;

		}

	}
	function onObjsUpdate(e) {

		if (_appModel.objs.length >= 5) {

			var artworks	= [];

			for (var i = 0; i < 5; i++) {
				artworks[i]		= _dataModel.getObjById(_appModel.objs[i]);
			}

			populateTiles(artworks);

		}

	}

	function onKeyboardTextChange(e) {

		App.log("ViewPrint::onKeyboardTextChange()");

		updateView();

		$nameFieldText.text(e.text);
		restartCursor();

	}
	function onInputTextChange(e) {

		App.log("ViewPrint::onInputTextChange()");

		updateView();

	}
	function onInputFieldFocus(e) {

		App.log("ViewPrint::onInputFieldFocus()");

		onNameFieldTap(e);

	}
	function onInputFieldUnfocus(e) {

		App.log("ViewPrint::onInputFieldUnfocus()");

		if (_state == PrintState.NAMED || _state == PrintState.KEYBOARD_ON) {

			if (!nameEntered()) {
				_self.state		= PrintState.UNNAMED;
			} else {
				_self.state		= PrintState.NAMED;
			}

		}

	}

	function onCursorInterval() {

		$cursor.toggleClass("off");

	}

	function onAssembleComplete() {

		App.log("ViewPrint::onAssembleComplete()");

		rearrange();

	}
	function onRearrangeComplete() {

		App.log("ViewPrint::onRearrangeComplete()");

		if (nameEntered()) {
			_self.state = PrintState.NAMED;
		} else {
			_self.state = PrintState.UNNAMED;
		}

	}
	function onFakePrintingComplete() {

		App.log("ViewPrint::onFakePrintingComplete()");

		_fakePrintingComplete	= true;

		if (_printingComplete) {
			_self.state	= PrintState.FINISHED;
		}

	}

	function onBtnTap(e) {

		App.log("ViewPrint::onBtnTap()");

		if (App.isHomeCompanion) {

			if (_state == PrintState.NAMED || _state == PrintState.KEYBOARD_ON) {
				_name					= $nameFieldInput.val();
				_appModel.visitorName	= _name;

				if (_name.length) {
					_self.dispatch(ViewEvent.NAME_SET, {
						name: _appModel.visitorName
					});
					_self.dispatch(ViewEvent.PRINT_TAP);
				} else {
					_self.state	= PrintState.UNNAMED;
				}
			} else {
				_self.state	= PrintState.KEYBOARD_ON;
			}

		} else {

			if (_state == PrintState.NAMED) {
				_self.dispatch(ViewEvent.NAME_SET, {
					name: _appModel.visitorName
				});
				_self.dispatch(ViewEvent.PRINT_TAP);

			} else if (_state == PrintState.KEYBOARD_ON) {

				_name					= $nameFieldText.text();
				_appModel.visitorName	= _name;

				if (_name.length) {
					_self.state	= PrintState.NAMED;
				} else {
					_self.state	= PrintState.UNNAMED;
				}

			} else {
				_self.state	= PrintState.KEYBOARD_ON;
			}


		}

	}
	function onNameFieldTap(e) {

		App.log("ViewPrint::onNameFieldTap()");

		updateView();

		if (_state == PrintState.NAMED || _state == PrintState.UNNAMED) {
			_self.state	= PrintState.KEYBOARD_ON;
		}

	}

	function onExitTap(e) {

		App.log("ViewPrint::onExitTap()");

		_self.dispatch(ViewEvent.FINISH_EXIT_TAP);

	}

	function onKeyDown(e) {

		App.log("ViewPrint::onKeyDown()");

		if (App.isHomeCompanion && (_state == PrintState.KEYBOARD_ON || _state == PrintState.NAMED)) {

			var CODE_ENTER		= 13,
				code			= e.which || e.keyCode;

			if (code == CODE_ENTER) {
				e.preventDefault();

				_name					= $nameFieldInput.val();
				_appModel.visitorName	= _name;

				if (_name.length) {
					_self.dispatch(ViewEvent.NAME_SET, {
						name: _appModel.visitorName
					});
					setTimeout(_self.dispatch, 1, ViewEvent.PRINT_TAP);

				} else {
					_self.state	= PrintState.UNNAMED;
				}

			}

		}

	}

	function onHomeDownloadBtnClick(e) {

		App.log("ViewPrint::onHomeDownloadBtnClick()");

		if (_pdfUrl) {
			_self.dispatch(ViewEvent.FINISH_DOWNLOAD_TAP);
			window.open(_pdfUrl, "_blank");

		} else {
			_self.state				= PrintState.PRINTING;
			fakePrintProgress();

		}

	}
	function onHomeRedoBtnClick(e) {

		App.log("ViewPrint::onRedoTap()");

		_self.dispatch(ViewEvent.FINISH_REDO_TAP);

	}
	function onHomeBuyBtnClick(e) {

		App.log("ViewPrint::onBuyTap()");

		_self.dispatch(ViewEvent.FINISH_BUY_TAP);

		window.open(_config.val("buyTicketsUrl"), "_blank");

	}
	function onHomeVisitBtnClick(e) {

		App.log("ViewPrint::onVisitTap()");

		_self.dispatch(ViewEvent.FINISH_VISIT_TAP);

		window.open(_config.val("visitUrl"), "_blank");

	}



	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel		= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.OBJECTS_UPDATE, onObjsUpdate);

		_dataModel		= DataModel.getInstance();
		_config			= ConfigModel.getInstance();
	}
	function initKeys() {

		if (App.isHomeCompanion) {
			$doc.keydown(onKeyDown);
		}

	}
	function initView() {

		_keyboard	= new Keyboard($keyboard, _config.val("keyboardLayoutPath"), 25);
		_keyboard.addListener(KeyboardEvent.TEXT_CHANGE, onKeyboardTextChange);

		$nameFieldInput.on('input', onInputTextChange);

		$progressLabel.text(App.isHomeCompanion ? PROGRESS_LABEL_HOME : PROGRESS_LABEL);

	}
	function initTiles() {

		_tileW		= $tiles.eq(0).width();
		_allTilesW	= (_tileW * 5) + (TILES_SPACING_X * 4);

		$tiles.each(function(i) {

			var $tile	= $(this),
				x		= (i * (_tileW + TILES_SPACING_X)) - (_allTilesW / 2);

			$tile.css("left", x);

		});

	}
	function initBtns() {

		_btn			= new TouchBtn($btn);
		_nameFieldHit	= new TouchBtn($nameFieldHit);
		_exitBtn		= new TouchBtn($exitBtn);

		_btn.addListener(TouchBtn.TAP, onBtnTap);
		_nameFieldHit.addListener(TouchBtn.TAP, onNameFieldTap);
		_exitBtn.addListener(TouchBtn.TAP, onExitTap);

		if (App.isHomeCompanion) {
			$nameFieldInput.focus(onInputFieldFocus);
			$nameFieldInput.blur(onInputFieldUnfocus);

			$downloadBtn.css("pointer-events", "auto");
			$redoBtn.css("pointer-events", "auto");
			$buyBtn.css("pointer-events", "auto");
			$visitBtn.css("pointer-events", "auto");

			$downloadBtn.click(onHomeDownloadBtnClick);
			$redoBtn.click(onHomeRedoBtnClick);
			$buyBtn.click(onHomeBuyBtnClick);
			$visitBtn.click(onHomeVisitBtnClick);

		}

	}

	function restartCursor() {

		$cursor.removeClass("off");
		startCursorBlink();

	}
	function startCursorBlink() {

		clearInterval(_cursorInterval);

		_cursorInterval	= setInterval(onCursorInterval, CURSOR_BLINK_INTERVAL);

	}
	function stopCursorBlink() {

		clearInterval(_cursorInterval);

	}

	function updateView() {

		App.log("ViewPrint::updateView()");

		var stateIndex	= getStateIndex(),
			vals		= App.isHomeCompanion ? STATE_VALS_HOME[stateIndex] : STATE_VALS[stateIndex];

		if (!vals) return;

		var titleText	= vals.title;
			titleText	= titleText.replace("{{name}}", _name);
			titleText	= titleText.replace("{{printerResponse}}", _printerResponse);

		$title.html(titleText);
		if ($view.attr("class") != vals.class) {
			$view.attr("class", vals.class);
		}

		$btn.text(vals.nameBtnLabel);

		if (_self.state == PrintState.KEYBOARD_ON && !nameEntered()) {
			_btn.disable();
		} else {
			_btn.enable();
		}

	}

	function assemble() {

		App.log("ViewPrint::assemble()");

		_self.state	= PrintState.ASSEMBLING;

		setTimeout(onAssembleComplete, 1500);

	}
	function rearrange() {

		App.log("ViewPrint::rearrange()");

		_self.state	= PrintState.REARRANGING;

		$tiles.each(function(i) {

			var id			= _appModel.objs[i],
				newIndex	= _appModel.sortedObjs.indexOf(id),
				x			= (newIndex * (_tileW + TILES_SPACING_X)) - (_allTilesW / 2);

			$(this).delay(Random.integer(0, 600)).animate({
				"left": x
			}, Random.integer(600, 750));

		});

		setTimeout(onRearrangeComplete, 2000);

	}

	function populateTiles(artworks) {

		App.log("ViewPrint::populateTiles()");

		for (var i = 0; i < artworks.length && i < 5; i++) {

			var artwork	= artworks[i];

			if (!artwork) continue;

			var url		= artwork && artwork.img && artwork.img.url ? artwork.img.url : "";

			var $tile	= $tiles.eq(i),
				$img	= $tile.find("div.img"),
				$text	= $tile.find("div.narrative p");

			$tile.css("left", (i * (_tileW + TILES_SPACING_X)) - (_allTilesW / 2));

			$img.css({
				"background-image": "url('" + url + "')"
			});

			$text.html(artwork.detailNarrative);

		}

	}

	function fakePrintProgress() {

		App.log("ViewPrint::fakePrintProgress()");

		$progressBar.css("width", "0%");

		$progressBar.animate({
			"width": "100%"
		}, 4000, "linear", onFakePrintingComplete);

	}


	// Helpers
	/////////////////////////////////////////////

	function getStateIndex() {

		var vals	= App.isHomeCompanion ? STATE_VALS_HOME : STATE_VALS;

		for (var i = 0; i < vals.length; i++) {
			if (vals[i].state == _state) {
				return i;
			}
		}

		return -1;

	}

	function nameEntered() {
		return App.isKiosk ? !_keyboard.empty || $nameFieldText.text().length : $nameFieldInput.val().length;
	}


	// Init
	/////////////////////////////////////////////

	initModels();
	initKeys();
	initView();
	initBtns();

	initTiles();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewPrint, bwco.events.Dispatcher);

