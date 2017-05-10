
function AppModel() {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher,
		Geom			= bwco.utils.Geom,
		Arrays			= bwco.utils.Arrays;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var DEFAULT_LANG_CODE			= "en";

	var PROMPT_COUNT				= 5;

	var CHICAGO_METERS_PER_DEGREE	= 111071;


	// Elements
	/////////////////////////////////////////////


	// Vars
	/////////////////////////////////////////////

	var _self				= this;

	var _config;

	var _state				= AppState.OFF,
		_prevState			= AppState.OFF,
		_themeIndex			= 0,
		_promptIndex		= -1,
		_prevThemeIndex		= -1,
		_prevPromptIndex	= -1;

	var _langCode			= App.getUrlParam("lang");

	var _objs				= [],
		_sortedObjs			= [],
		_visitorName		= "";

	var _spriteSheetData	= {},
		_keyboardLayouts	= [],
		_strings			= {};

	var _creditsOn			= false;


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"prevState": {
			get: function() {
				return _prevState;
			}
		},

		"state": {
			get: function() {
				return _state;
			},
			set: function(val) {

				if (val != _state) {

					_prevState	= _state;
					_state		= val;

					App.log("AppModel::state: " + _state);

					_self.dispatch(ModelEvent.APP_STATE_UPDATE, {
						state: _state
					});

				}

			}
		},

		"themeIndex": {
			get: function() {
				return _themeIndex;
			},
			set: function(val) {

				if (val < 0) return;
				if (val == _themeIndex) return;

				_prevThemeIndex	= _themeIndex;
				_themeIndex		= val;

				App.log("AppModel::themeIndex: " + _themeIndex);

				_self.dispatch(ModelEvent.THEME_INDEX_UPDATE, {
					index: _themeIndex
				});

			}
		},

		"promptIndex": {
			get: function() {
				return _promptIndex;
			},
			set: function(val) {

				if (val < 0) return;
				if (val >= PROMPT_COUNT) return;
				if (val == _promptIndex) return;

				_prevPromptIndex	= _promptIndex;
				_promptIndex		= val;

				App.log("AppModel::promptIndex: " + _promptIndex);

				_self.dispatch(ModelEvent.PROMPT_INDEX_UPDATE, {
					index: _promptIndex
				});

			}
		},

		"prevThemeIndex": {
			get: function() {
				return _prevThemeIndex;
			}
		},

		"prevPromptIndex": {
			get: function() {
				return _prevPromptIndex;
			}
		},

		"visitorName": {
			get: function() {
				return _visitorName;
			},
			set: function(val) {
				if (val != _visitorName) {
					_visitorName	= val;

					App.log("AppModel::visitorName: " + _visitorName);

					_self.dispatch(ModelEvent.VISITOR_NAME_UPDATE, {
						name: _visitorName
					});
				}
			}
		},

		"lang": {
			get: function() {
				var langs	= _config.val("languages");

				for (var i = 0; i < langs.length; i++) {
					var lang	= langs[i];
					if (lang && lang.code && lang.code == _langCode) {
						return lang;
					}
				}
				return null;
			}
		},
		"langCode": {
			get: function() {
				return _langCode;
			},
			set: function(val) {
				if (val != _langCode && _self.isSupportedLang(val)) {

					_langCode	= val;

					_self.dispatch(ModelEvent.LANGUAGE_UPDATE, {
						lang: _langCode
					});

				}
			}
		},
		"langCodes": {
			get: function() {

				var a		= [],
					langs	= _config.val("languages");

				for (var i = 0; i < langs.length; i++) {
					if (langs[i] && langs[i].code) {
						a.push(langs[i].code);
					}
				}

				return a;

			}
		},

		"objs": {
			get: function() {
				return _objs;
			}
		},

		"sortedObjs": {
			get: function() {
				return _sortedObjs;
			}
		},

		"firstMissedObjIndex": {
			get: function() {
				for (var i = 0; i < _objs.length; i++) {
					if (!_objs[i] || !_objs.length) {
						return i;
					}
				}
				return -1;
			}
		},

		"spriteSheetsData": {
			get: function() {
				return _spriteSheetsData;
			},
			set: function(val) {
				_spriteSheetsData	= val;
			}
		},

		"keyboardLayouts": {
			get: function() {
				return _keyboardLayouts;
			},
			set: function(val) {
				_keyboardLayouts	= val;
			}
		},

		"creditsOn": {
			get: function() {
				return _creditsOn;
			}
		},

		"stringsData": {
			set: function(val) {
				_strings	= processStrings(val);
			}
		},
		"strings": {
			get: function() {
				return _strings[_langCode] || _strings["en"] || { };
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.reset = function() {

		_self.clearObjs();

		_self.promptIndex	= 0;
		_self.visitorName	= "";

		App.log("AppModel::reset()");

	}

	this.addObj = function(id) {

		_objs[_promptIndex] = id;

		updateSortedObjs();

		App.log("AppModel::addObj(" + id + ")");

		_self.dispatch(ModelEvent.OBJECTS_UPDATE);

	}
	this.clearObj = function(index) {

		_objs[index]	= null;

		cleanUpObjsList();
		updateSortedObjs();

		App.log("AppModel::clearObj(" + index + ")");

		_self.dispatch(ModelEvent.OBJECTS_UPDATE);

	}
	this.clearObjs = function() {

		_objs		= [];
		_sortedObjs	= [];

		App.log("AppModel::clearObjs()");

		_self.dispatch(ModelEvent.OBJECTS_UPDATE);

		_self.promptIndex	= 0;

	}

	this.openCredits = function() {

		if (!_creditsOn) {
			_creditsOn	= true;

			App.log("AppModel::openCredits()");
			_self.dispatch(ModelEvent.CREDITS_UPDATE);
		}

	}
	this.closeCredits = function() {

		if (_creditsOn) {
			_creditsOn	= false;

			App.log("AppModel::closeCredits()");
			_self.dispatch(ModelEvent.CREDITS_UPDATE);
		}

	}

	this.getKeyboardLayout = function(id) {

		for (var i = 0; i < _keyboardLayouts.length; i++) {
			if (_keyboardLayouts[i] && _keyboardLayouts[i].id == id) {
				return _keyboardLayouts[i];
			}
		}

	}

	this.getString = function(id) {
		return this.strings[id];
	}

	this.isSupportedLang = function(code) {

		var langs		= _config.val("languages"),
			langFound	= false;

		for (var i = 0; i < langs.length; i++) {
			if (langs[i].code == code) {
				langFound	= true;
				break;
			}
		}

		return langFound;

	}

	this.validateLang = function() {

		if (!_self.isSupportedLang(_langCode)) {
			_langCode	= DEFAULT_LANG_CODE;
		}

	}


	// Event handlers
	/////////////////////////////////////////////


	// Methods
	/////////////////////////////////////////////

	function initModels() {

		_config		= ConfigModel.getInstance();

	}

	function cleanUpObjsList() {

		App.log("AppModel::cleanUpObjsList...while start");
		while (_objs.length && !_objs[_objs.length - 1]) {
			_objs.pop();
		}
		App.log("AppModel::cleanUpObjsList...while end");

	}

	function updateSortedObjs() {

		var dataModel	= DataModel.getInstance(),
			artworks	= [];

		for (var i = 0; i < _objs.length; i++) {

			var id			= _objs[i];

			if (id) {
				artwork		= dataModel.getObjById(id);
				artworks.push(artwork);
			}

		}

		/////////////////////////////////////////////

		var prevX				= _config.val("guideStartX"),
			prevY				= _config.val("guideStartY"),
			prevFloor			= _config.val("guideStartFloor"),
			floorOffsetMeters	= _config.val("guideFloorOffsetMeters");

		var floorOffsetDeg		= floorOffsetMeters / CHICAGO_METERS_PER_DEGREE;

		/////////////////////////////////////////////

		_sortedObjs				= [];

		App.log("AppModel::updateSortedObjs...while start");
		while (artworks.length) {

			var minIndex		= -1,
				minDist			= NaN;

			for (var i = 0; i < artworks.length; i++) {

				var artwork			= artworks[i];

				var distFloor		= Maths.diff(Number(artwork.floor), prevFloor) * floorOffsetDeg,
					distLngLat		= Geom.dist(artwork.mapX, artwork.mapY, prevX, prevY),
					distTotal		= distFloor + distLngLat;

				// All artworks not in a priority gallery get their
				// distances increased by 1 deg to make sure all
				// artworks in priority galleries are ordered first
				if (!isInPriorityGallery(artwork)) {
					distTotal		+= 1;
				}

				if (minIndex == -1 || distTotal < minDist) {
					minIndex		= i;
					minDist			= distTotal;
				}

			}

			artwork		= artworks[minIndex];
			prevX		= artwork.mapX;
			prevY		= artwork.mapY;
			prevFloor	= artwork.floor;

			_sortedObjs.push(artwork.lookupId);
			artworks.splice(minIndex, 1);

		}
		App.log("AppModel::updateSortedObjs...while end");

	}

	function processStrings(data) {

		// If this is the home companion, replace all strings
		// with -home suffixed alternatives, if they exist

		var homeSuffix	= _config.val("stringsHomeAlternativeSuffix");

		if (App.isHomeCompanion) {
			for (var lang in data) {

				for (var label in data[lang]) {
					if (data[lang][label + homeSuffix]) {
						data[lang][label]	= data[lang][label + homeSuffix];
					}
				}

			}
		}

		return data;

	}


	// Helpers
	/////////////////////////////////////////////

	function isInPriorityGallery(artwork) {

		var ids	= _config.has("priorityGalleryIds") ? _config.val("priorityGalleryIds") : [ ];

		for (var i = 0; i < ids.length; i++) {
			if (artwork.galleryId == ids[i]) {
				return true;
			}
		}

		return false;

	}


	// Init
	/////////////////////////////////////////////

	initModels();


}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(AppModel, bwco.events.Dispatcher);
bwco.utils.makeSingleton(AppModel);

