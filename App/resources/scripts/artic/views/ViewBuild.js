
function ViewBuild($) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Random			= bwco.utils.Random;

	var Sound			= createjs.Sound;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var OBJ_LAYOUTS	= [
		[
			{ x: 287, y: 667 },
			{ x: 1618, y: 352 },
			{ x: 466, y: 273 },
			{ x: 1426, y: 745 },
			{ x: 1242, y: 227 },
			{ x: 670, y: 767 }
		],
		[
			{ x: 300, y: 747 },
			{ x: 1679, y: 311 },
			{ x: 271, y: 315 },
			{ x: 1618, y: 726 },
			{ x: 1275, y: 240 },
			{ x: 700, y: 785 },
			{ x: 700, y: 260 },
			{ x: 1148, y: 805 },
			{ x: 1471, y: 509 },
			{ x: 385, y: 527 }
		],
		[
			{ x: 300, y: 747 },
			{ x: 1679, y: 311 },
			{ x: 271, y: 315 },
			{ x: 1618, y: 726 },
			{ x: 1378, y: 242 },
			{ x: 527, y: 777 },
			{ x: 649, y: 273 },
			{ x: 1242, y: 800 },
			{ x: 1471, y: 509 },
			{ x: 385, y: 527 },
			{ x: 1040, y: 233 },
			{ x: 875, y: 831 }
		],
		[
			{ x: 439, y: 555 },
			{ x: 1461, y: 459 },
			{ x: 531, y: 274 },
			{ x: 1383, y: 748 },
			{ x: 1159, y: 228 },
			{ x: 786, y: 800 },
			{ x: 1706, y: 721 },
			{ x: 235, y: 275 },
			{ x: 1642, y: 252 },
			{ x: 235, y: 729 },
			{ x: 1706, y: 479 },
			{ x: 230, y: 478 },
			{ x: 857, y: 231 },
			{ x: 1073, y: 791 },
			{ x: 530, y: 768 },
			{ x: 1404, y: 218 }
		]
	];

	var FRONT_OBJ_COUNT			= 4;

	var SWAP_INTERVAL_SECS		= 3;

	var SFX_OBJ_ADD				= "resources/sfx/sfx-obj-add.mp3";


	// Elements
	/////////////////////////////////////////////

	var $view					= $("#wrap-sections section#build"),
		$objsBg					= $view.find("div.objs-bg"),
		$wrapObjs				= $view.find("div.wrap-objs"),
		$wrapDetail				= $view.find("div.wrap-obj-detail");

	var $wrapPromptTitles		= $view.find("div.wrap-prompt-titles");


	// Vars
	/////////////////////////////////////////////

	var _self				= this;

	var _appModel,
		_helpModel,
		_dataModel;

	var _objs				= [];

	var _intevalSwap,
		_timeoutTitleCleanup;

	var _bgBtn,
		_detailPanel		= new DetailPanel($wrapDetail);


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"detailOn": {
			get: function() {
				return _detailPanel.on;
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.show = function() {

		$view.fadeIn();

	}
	this.hide = function() {

		$view.delay(500).fadeOut();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onAppStateUpdate(e) {

		if (_appModel.state == AppState.BUILD) {

			var direction;

			if (_appModel.prevState == AppState.SPIN) {
				direction	= 1;
			} else if (_appModel.prevState == AppState.PRINT) {
				direction	= -1;
			} else {
				direction	= 0;
			}

			updatePromptTitle();
			resetObjs(direction);
			resetSwapInterval();

		} else {
			stopSwapInterval();
			clearObjs(1);
			animateOutPromptTitle();

		}

	}
	function onThemeIndexUpdate(e) {

		if (_appModel.state == AppState.BUILD) {

			updatePromptTitle();
			resetObjs(-1);

		}

	}
	function onPromptIndexUpdate(e) {

		var direction	= (_appModel.prevPromptIndex < _appModel.promptIndex) ? 1 : -1;

		updatePromptTitle();
		resetObjs(direction);

		if (_appModel.state == AppState.BUILD) {
			resetSwapInterval();
		}

	}
	function onObjsUpdate(e) {

		var addedObjs		= _appModel.objs;

		for (var i = 0; i < _objs.length; i++) {

			var obj	= _objs[i];

			if (addedObjs.indexOf(obj.id) != -1) {
				setTimeout(obj.add, 100);

			} else {
				obj.unAdd();
			}

		}

	}

	function onHelpModelUpdate(e) {

		if (_appModel.state != AppState.BUILD) return;

		var $objs			= $wrapObjs.children("div.obj"),
			fiveAdded		= _appModel.objs.length == 5,
			noneMissed		= _appModel.firstMissedObjIndex == -1;

		if (_helpModel.on) {

			if (fiveAdded && noneMissed) {
				$objs.removeClass("help-selected");

			} else {

				if (!getSelectedObj()) {

					var objs		= Random.shuffled(_objs),
						selected;

					for (var i = 0; i < objs.length; i++) {
						selected	= objs[i];
						if (selected.$el.position().left > App.stgW() / 2) {
							break;
						}
					}

					selected.$el.addClass("help-selected");

					setTimeout(function() {
						selected.registerTouch();
						selected.bringToFront();
					}, 450);

				}
			}

		} else {
			resetSwapInterval();
			$objs.removeClass("help-selected");

		}

	}

	function onObjPress(e) {

		App.log("ViewBuild::onObjPress()");

	}
	function onObjSelect(e) {

		App.log("ViewBuild::onObjSelect()");

		var trgtObj		= e.target;
		var selectedObj	= getSelectedObj();

		if (selectedObj != null) {
			selectedObj.deselect();
			return;
		}

		for (var i = 0; i < _objs.length; i++) {
			var obj	= _objs[i];
			if (obj != trgtObj) {
				obj.deselect();
				obj.sendToBack();
			}
		}

		trgtObj.select();
		trgtObj.bringToFront();

	}

	function onDetailCancel(e) {

		App.log("ViewBuild::onDetailCancel()");

		var obj		= getSelectedObj();

		if (obj) {
			obj.deselect();
		}

		_self.dispatch(ViewEvent.DETAIL_CANCEL, {
			id: obj.id
		});

	}
	function onDetailAdd(e) {

		App.log("ViewBuild::onDetailAdd()");

		var obj		= getSelectedObj();

		if (!obj) return;

		_self.dispatch(ViewEvent.DETAIL_ADD, {
			id: obj.id
		});

		refreshDepths();

		_detailPanel.hide();

	}

	function onObjSelected(e) {

		App.log("ViewBuild::onObjSelected()");

		var promptIndex		= _appModel.promptIndex,
			addedObjs		= _appModel.objs,
			toReplace		= bwco.utils.defined(addedObjs[promptIndex]);

		_detailPanel.show(e.target, toReplace);

		_self.dispatch(ViewEvent.ARTWORK_SELECT, {
			id: e.target.id
		});

	}
	function onObjDeselected(e) {

		App.log("ViewBuild::onObjDeselected()");

		var obj	= e.target;
		$wrapObjs.append(obj.$el);
		_detailPanel.hide();

		refreshDepths();

	}
	function onObjAdded(e) {

		App.log("ViewBuild::onObjAdded()");

		Sound.play(SFX_OBJ_ADD);

	}
	function onObjUnadded(e) {

		App.log("ViewBuild::onObjAdded()");

	}

	function onBgTap(e) {

		App.log("ViewBuild::onBgTap()");

		var selectedObj	= getSelectedObj();

		if (selectedObj != null) {
			selectedObj.deselect();
		}

	}

	function onSwapInterval() {

		// there will be no swapping if an object is selected, nor if help on
		if (getSelectedObj()) return;
		if (_helpModel.on) return;

		App.log("ViewBuild::onSwapInterval()");

		var inBackObjs	= [];

		for (var i = 0; i < _objs.length; i++) {
			var obj	= _objs[i];
			if (obj.isInBack) {
				inBackObjs.push(obj);
			}
		}

		// simulates touching an object that is in the back
		// in order to bring it forward
		var toFrontObj	= bwco.utils.Random.item(inBackObjs);
			toFrontObj.registerTouch();

		refreshDepths();

	}


	// Private methods
	/////////////////////////////////////////////

	function initModels() {

		_appModel	= AppModel.getInstance();
		_appModel.addListener(ModelEvent.APP_STATE_UPDATE, onAppStateUpdate);
		_appModel.addListener(ModelEvent.THEME_INDEX_UPDATE, onThemeIndexUpdate);
		_appModel.addListener(ModelEvent.PROMPT_INDEX_UPDATE, onPromptIndexUpdate);
		_appModel.addListener(ModelEvent.OBJECTS_UPDATE, onObjsUpdate);

		_dataModel	= DataModel.getInstance();

		_helpModel	= HelpModel.getInstance();
		_helpModel.addListener(ModelEvent.UPDATE, onHelpModelUpdate);

	}
	function initBtns() {

		_bgBtn	= new TouchBtn($objsBg, {
			enableSfx: false
		});
		_bgBtn.addListener(TouchBtn.TAP, onBgTap);

	}
	function initEvents() {

		_detailPanel.addListener(ViewEvent.DETAIL_CANCEL, onDetailCancel);
		_detailPanel.addListener(ViewEvent.DETAIL_ADD, onDetailAdd);

	}
	function initView() {

		$view.hide();

	}
	function initSfx() {

		Sound.registerSound(SFX_OBJ_ADD);

	}

	function resetObjs(direction) {

		App.log("ViewBuild::resetObjs()");

		_detailPanel.hide();

		clearObjs(direction);
		createObjs(direction);

		refreshDepths();

	}
	function clearObjs(direction) {

		App.log("ViewBuild::clearObjs()");

		App.log("ViewBuild::clearObjs...while start");
		while (_objs.length) {

			var obj	= _objs.pop();
				obj.removeListener(ViewEvent.OBJ_PRESS, onObjPress);
				obj.removeListener(ViewEvent.OBJ_SELECT, onObjSelect);
				obj.removeListener(ViewEvent.OBJ_SELECTED, onObjSelected);
				obj.removeListener(ViewEvent.OBJ_DESELECTED, onObjDeselected);
				obj.removeListener(ViewEvent.OBJ_ADDED, onObjAdded);
				obj.removeListener(ViewEvent.OBJ_UNADDED, onObjUnadded);
				obj.exitAndDispose(direction);

		}
		App.log("ViewBuild::clearObjs...while end");

	}
	function createObjs(direction) {

		App.log("ViewBuild::createObjs()");

		var themeIndex		= _appModel.themeIndex;
		var promptIndex		= _appModel.promptIndex;

		if (themeIndex == -1) return;
		if (promptIndex == -1) return;

		var theme			= _dataModel.getTheme(themeIndex);
		var prompt			= theme.prompts[promptIndex];
		var count			= prompt.artworks.length;
		var pts				= calcObjPts(count);

		for (var i = 0; i < count; i++) {

			var data		= prompt.artworks[i],
				id			= data.lookupId;
			var $el			= generateObjEl(id, data);

			$wrapObjs.append($el);

			var isAdded		= _appModel.objs.indexOf(id) != -1;

			var obj			= new Obj(id, $el, pts[i].x * App.stgScaleX(), pts[i].y * App.stgScaleY(), promptIndex, isAdded, direction);
				obj.addListener(ViewEvent.OBJ_PRESS, onObjPress);
				obj.addListener(ViewEvent.OBJ_SELECT, onObjSelect);
				obj.addListener(ViewEvent.OBJ_SELECTED, onObjSelected);
				obj.addListener(ViewEvent.OBJ_DESELECTED, onObjDeselected);
				obj.addListener(ViewEvent.OBJ_ADDED, onObjAdded);
				obj.addListener(ViewEvent.OBJ_UNADDED, onObjUnadded);

			_objs.push(obj);

		}

	}

	function updatePromptTitle() {

		App.log("ViewBuild::updatePromptTitle()");

		animateOutPromptTitle();
		createPromptTitle();

		clearTimeout(_timeoutTitleCleanup);
		_timeoutTitleCleanup	= setTimeout(cleanUpPromptTitles, 1000)

	}

	function animateOutPromptTitle() {

		App.log("ViewBuild::animateOutPromptTitle()");

		$wrapPromptTitles.children("div.prompt-title").addClass("unloaded");

	}
	function createPromptTitle() {

		App.log("ViewBuild::createPromptTitle()");

		var themeIndex	= _appModel.themeIndex;
		var theme		= _dataModel.getTheme(themeIndex);

		if (!theme) return;

		var prompt		= theme.prompts[_appModel.promptIndex];

		if (!prompt) return;

		var $el			= generateTitleEl(prompt);

		setTimeout(function() {
			$el.removeClass("unloaded");
		}, 25);

		$wrapPromptTitles.append($el);

	}
	function cleanUpPromptTitles() {

		App.log("ViewBuild::cleanUpPromptTitles()");

		$wrapPromptTitles.children(".unloaded").remove();

	}

	function refreshDepths() {

		App.log("ViewBuild::refreshDepths()");

		var sortedObjs		= _objs.slice();

		bwco.utils.Arrays.sortOn(sortedObjs, "lastTouched");

		for (var i = 0; i < sortedObjs.length; i++) {

			var obj	= sortedObjs[i];

			if (obj.isAdded) {
				sortedObjs.splice(i, 1);
				i--;
				continue;
			}

			if (i < FRONT_OBJ_COUNT) {
				obj.sendToBack();

			} else {
				obj.bringToFront();

			}

		}

	}

	function stopSwapInterval() {

		App.log("ViewBuild::stopSwapInterval()");

		clearInterval(_intevalSwap);

	}
	function resetSwapInterval() {

		App.log("ViewBuild::resetSwapInterval()");

		clearInterval(_intevalSwap);

		_intevalSwap	= setInterval(onSwapInterval, SWAP_INTERVAL_SECS * 1000);

	}


	// Helpers
	/////////////////////////////////////////////

	function calcObjPts(count) {

		for (var i = 0; i < OBJ_LAYOUTS.length; i++) {
			var layout	= OBJ_LAYOUTS[i];

			if (count <= layout.length) {
				return layout.slice(0, count);
			}
		}

		// if more objs than in the largest layouts array

		var spots	= OBJ_LAYOUTS[OBJ_LAYOUTS.length - 1];

		App.log("ViewBuild::calcObjPts...while start");
		while (spots.length < count) {

			spots.push({
				x: Random.integer(0, App.stgW()),
				y: Randon.integer(60, App.stgH() - 120)
			});

		}
		App.log("ViewBuild::calcObjPts...while end");

		return spots;

	}

	function generateTitleEl(data) {

		return $($.templates("#template-prompt-title").render(data));

	}
	function generateObjEl(id, data) {

		return $($.templates("#template-obj").render({
			id: id,
			data: data
		}));

	}

	function getSelectedObj() {

		for (var i = 0; i < _objs.length; i++) {

			var obj	= _objs[i];

			if (obj.isSelected) {
				return obj;
			}

		}

		return null;

	}


	// Init
	/////////////////////////////////////////////

	initModels();
	initView();
	initSfx();
	initBtns();
	initEvents();

}

// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ViewBuild, bwco.events.Dispatcher);


