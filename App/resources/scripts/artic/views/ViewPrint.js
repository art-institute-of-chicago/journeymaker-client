
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

	var DEFAULT_PRINTER_COLOR	= "#ffffff";

	var TILES_SPACING_X			= 8;

	var STATE_VALS				= [
		{
			"state": PrintState.ASSEMBLING,
			"class": "assembling",
			"stringTitle": "printAssemblingTitle",
			"stringEditBtnLabel": null
		},
		{
			"state": PrintState.REARRANGING,
			"class": "rearranging",
			"stringTitle": "printRearrangingTitle",
			"stringEditBtnLabel": null
		},
		{
			"state": PrintState.UNNAMED,
			"class": "unnamed",
			"stringTitle": "printUnnamedTitle",
			"stringEditBtnLabel": "printBtnEditUnnamed"
		},
		{
			"state": PrintState.KEYBOARD_ON,
			"class": "keyboard-on",
			"stringTitle": "printKeyboardOnTitle",
			"stringEditBtnLabel": null
		},
		{
			"state": PrintState.NAMED,
			"class": "named",
			"stringTitle": "printNamedTitle",
			"stringEditBtnLabel": "printBtnEditNamed"
		},
		{
			"state": PrintState.PRINTING,
			"class": "printing",
			"stringTitle": "printPrintingTitle",
			"stringEditBtnLabel": null
		},
		{
			"state": PrintState.FINISHED,
			"class": "printed",
			"stringTitle": "printFinishedTitle",
			"stringEditBtnLabel": null
		}
	];


	// Elements
	/////////////////////////////////////////////

	var $doc			= $(document),
		$view			= $("#wrap-sections section#print");

	var $nameForm,
		$nameField,
		$nameFieldText,
		$nameFieldHit,
		$nameFieldInput,
		$cursor,
		$editBtn,
		$submitBtn,
		$createBtn,
		$restartBtn,
		$keyboard,
		$top,
		$title,
		$tilesList,
		$tiles,
		$btm,
		$progressLabel,
		$progressBar,
		$btmBtns,
		$exitBtn,
		$downloadBtn,
		$redoBtn,
		$buyBtn,
		$visitBtn;


	// Vars
	/////////////////////////////////////////////

	var _self					= this;

	var _appModel,
		_config,
		_dataModel;

	var _keyboard;

	var _cursorInterval;

	var _state					= PrintState.ASSEMBLING;

	var _name					= "",
		_printerResponse		= "",
		_printingComplete		= false,
		_fakePrintingComplete	= false,
		_pdfUrl					= undefined;

	var _on						= false;

	var _editBtn,
		_nameFieldHit,
		_restartBtn,
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

						_keyboard.revert();

						if (App.isHomeCompanion) {
							$nameFieldInput.focus();
						}
						if (_keyboard.empty) {
							_keyboard.shiftOn	= true;
						}

						_self.dispatch(ViewEvent.KEYBOARD_OPEN, {
							named: nameEntered()
						});

					} else {

						if (App.isHomeCompanion) {
							$nameFieldInput.blur();
						}

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
				_printerResponse	= _appModel.getString("printResponseUrl");
				_pdfUrl				= response.pdfUrl;

			} else {
				var printerName		= response.printerName ? response.printerName : _appModel.getString("printDefaultPrinterName"),
					printerColor	= response.printerColor ? response.printerColor : DEFAULT_PRINTER_COLOR;

				_printerResponse	= _appModel.getString("printResponseSuccess") + " <span style=\"color: " + printerColor + ";\">" + printerName + "</span>.";

			}


		} else {

			$btmBtns.addClass("problem");

			_printerResponse	= _appModel.getString("printResponseProblem");

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
				_name					= _appModel.getString("printDefaultName");
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

		if (_state == PrintState.NAMED || _state == PrintState.UNNAMED) {
			_self.state	= PrintState.KEYBOARD_ON;
		}

		updateView();

	}
	function onInputFieldFocus(e) {

		App.log("ViewPrint::onInputFieldFocus()");

		onNameFieldTap(e);

	}
	function onInputFieldUnfocus(e) { }

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

	function onEditBtnTap(e) {

		App.log("ViewPrint::onEditBtnTap()");

		if (_state == PrintState.NAMED || _state == PrintState.UNNAMED) {
			_self.state	= PrintState.KEYBOARD_ON;
		}

	}
	function onNameFieldTap(e) {

		App.log("ViewPrint::onNameFieldTap()");

		updateView();

		if (_state == PrintState.NAMED || _state == PrintState.UNNAMED) {
			_self.state	= PrintState.KEYBOARD_ON;
		}

	}

	function onSubmitBtnTap(e) {

		App.log("ViewPrint::onSubmitBtnTap()");

		_name					= App.isHomeCompanion ? $nameFieldInput.val() : $nameFieldText.text();
		_appModel.visitorName	= _name;

		if (_name.length) {
			_self.dispatch(ViewEvent.NAME_SET, {
				name: _appModel.visitorName
			});
			_self.state	= PrintState.NAMED;

		} else {
			_self.state	= PrintState.UNNAMED;
		}

	}
	function onCreateBtnTap(e) {

		App.log("ViewPrint::onCreateBtnTap()");

		_self.dispatch(ViewEvent.CREATE_TAP);

	}
	function onRestartTap(e) {

		App.log("ViewPrint.onRestartTap()");

		_self.dispatch(ViewEvent.PRINT_RESTART);

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
					_self.state	= PrintState.NAMED;

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
	function initTemplate() {

		var html		= $.templates({
			markup: "#template-print"
		}).render({
			strings: _appModel.strings
		});

		$view.html(html);

		$nameForm		= $view.find("div.name-form");

		$nameField		= $nameForm.find("div.name-field");

		$nameFieldText	= $nameField.find("p.text");
		$nameFieldHit	= $nameField.find("div.hit-area");
		$nameFieldInput	= $nameField.find("input");
		$cursor			= $nameField.find("div.cursor");
		$editBtn		= $nameField.find("button.edit");
		$submitBtn		= $nameField.find("button.submit");
		$createBtn		= $nameField.find("button.create");
		$restartBtn		= $nameField.find("button.restart");

		$keyboard		= $view.find("div.keyboard");
		$top			= $view.find("div.top");

		$title			= $top.find("h3");
		$tilesList		= $top.find("ul.tiles");

		$tiles			= $tilesList.find("li");

		$btm			= $view.find("div.btm");

		$progressLabel	= $btm.find("p.progress-label");
		$progressBar	= $btm.find("div.print-progress div.progress-bar");
		$btmBtns		= $btm.find("p.btns");

		$exitBtn		= $btmBtns.find("button.exit");
		$downloadBtn	= $btmBtns.find("button.download");
		$redoBtn		= $btmBtns.find("button.redo");
		$buyBtn			= $btmBtns.find("button.buy");
		$visitBtn		= $btmBtns.find("button.visit");

	}
	function initKeys() {

		if (App.isHomeCompanion) {
			$doc.keydown(onKeyDown);
		}

	}
	function initView() {

		var layout		= _appModel.getKeyboardLayout(_appModel.langCode);

		_keyboard		= new Keyboard($keyboard, 25);
		_keyboard.addListener(KeyboardEvent.TEXT_CHANGE, onKeyboardTextChange);
		_keyboard.setLayout(layout);

		$nameFieldInput.on('input', onInputTextChange);

		$progressLabel.text(_appModel.getString("printProgress"));

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

		_editBtn		= new TouchBtn($editBtn);
		_submitBtn		= new TouchBtn($submitBtn);
		_createBtn		= new TouchBtn($createBtn);
		_restartBtn		= new TouchBtn($restartBtn);

		_nameFieldHit	= new TouchBtn($nameFieldHit);
		_exitBtn		= new TouchBtn($exitBtn);

		_editBtn.addListener(TouchBtn.TAP, onEditBtnTap);
		_submitBtn.addListener(TouchBtn.TAP, onSubmitBtnTap);
		_createBtn.addListener(TouchBtn.TAP, onCreateBtnTap);
		_restartBtn.addListener(TouchBtn.TAP, onRestartTap);

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
			vals		= STATE_VALS[stateIndex];

		if (!vals) return;

		if ($view.attr("class") != vals.class) {
			$view.attr("class", vals.class);
		}

		var titleText	= _appModel.getString(vals.stringTitle);
			titleText	= titleText.replace("{{name}}", _name);
			titleText	= titleText.replace("{{printerResponse}}", _printerResponse);
		$title.html(titleText);

		var editBtnText	= _appModel.getString(vals.stringEditBtnLabel);
		$editBtn.text(editBtnText);

		if (_self.state == PrintState.KEYBOARD_ON && !nameEntered()) {
			_editBtn.disable();
		} else {
			_editBtn.enable();
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

		for (var i = 0; i < STATE_VALS.length; i++) {
			if (STATE_VALS[i].state == _state) {
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
	initTemplate();
	initKeys();
	initView();
	initBtns();

	initTiles();


}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewPrint, bwco.events.Dispatcher);

