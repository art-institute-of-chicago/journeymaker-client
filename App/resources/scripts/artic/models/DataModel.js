
function DataModel() {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Vars
	/////////////////////////////////////////////

	var _self		= this;

	var _config;

	var _data		= {},
		_themes		= [];


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"themes": {
			get: function() {
				return _themes;
			}
		}

	});


	// Public
	/////////////////////////////////////////////

	this.load = function($, url) {

		$.ajax({
			dataType: "json",
			url: url,
			error: onLoadError,
			success: onLoad
		});

	}

	this.getTheme = function(index) {

		return _themes[index];

	}

	this.getObjById = function(id) {

		if (!id || !id.length) return null;

		var fields		= id.split(",");

		var themeIndex	= parseInt(fields[0]);
		var promptIndex	= parseInt(fields[1]);
		var objIndex	= parseInt(fields[2]);

		var theme		= _themes[themeIndex];
		var prompt		= theme ? theme.prompts[promptIndex] : null;
		var obj			= prompt ? prompt.artworks[objIndex] : null;

		return obj;

	}

	this.getPromptByObjId = function(id) {

		if (!id || !id.length) return null;

		var fields		= id.split(",");

		var themeIndex	= parseInt(fields[0]);
		var promptIndex	= parseInt(fields[1]);

		var theme		= _themes[themeIndex];
		var prompt		= theme ? theme.prompts[promptIndex] : null;

		return prompt;

	}


	// Event handlers
	/////////////////////////////////////////////

	function onLoadError(xhr, status) {

		_self.dispatch(ModelEvent.LOAD_ERROR, {
			status: status
		});

	}

	function onLoad(data) {

		_data		= processData(data);
		_themes		= _data.themes;

		_self.dispatch(ModelEvent.READY);

	}


	// Methods
	/////////////////////////////////////////////

	function initModels() {

		_config	= ConfigModel.getInstance();

	}

	function processData(data) {

		var themeCount	= data.themes.length;


		// Sort themes by config ids
		/////////////////////////////////////////////

		var lang	= AppModel.getInstance().lang;

		if (lang) {

			var ids			= lang.themeIds,
				arranged	= [];

			for (var i = 0; i < ids.length; i++) {
				var id	= ids[i];

				for (var j = 0; j < themeCount; j++) {
					if (data.themes[j].id == id) {
						arranged.push(data.themes[j]);
					}
				}

			}

			for (var i = 0; i < themeCount; i++) {
				if (arranged.indexOf(data.themes[i]) == -1) {
					arranged.push(data.themes[i]);
				}
			}

			data.themes	= arranged;

		}


		// Fill 8 spots in the shape, if not enough themes
		/////////////////////////////////////////////

		for (var i = 0; i < (8 - themeCount); i++) {
			data.themes[themeCount + i]		= data.themes[i];
		}


		// Validate artworks, add lookupId
		/////////////////////////////////////////////

		var artworksNotOnDisplay	= [],
			artworksNoImg			= [],
			artworksBadDimensions	= [];

		for (var themeIndex = 0; themeIndex < data.themes.length; themeIndex++) {
			var theme		= data.themes[themeIndex];

			for (var i = 0; i < theme.bgs.length; i++) {
				var bg	= theme.bgs[i];
				if (!bg) {
					console.log("Omitting theme background, bad image: " + theme.title + ", background " + (i + 1))
					theme.bgs.splice(i, 1);
					i--;
				} else if (!bg.width || !bg.height) {
					console.log("Theme background image has no defined dimensions, assuming 1920x1080: " + theme.title + ", background " + (i + 1))
					bg.width	= 1920;
					bg.height	= 1080;
				}
			}

			for (var promptIndex = 0; promptIndex < theme.prompts.length; promptIndex++) {
				var prompt		= theme.prompts[promptIndex];

				for (var artworkIndex = 0; artworkIndex < prompt.artworks.length; artworkIndex++) {
					var artwork		= prompt.artworks[artworkIndex];

					var noImg			= !bwco.utils.defined(artwork.img),
						noImgW			= noImg ? true : !artwork.img.width,
						noImgH			= noImg ? true : !artwork.img.height,
						noMapX			= !bwco.utils.defined(artwork.mapX),
						noMapY			= !bwco.utils.defined(artwork.mapY),
						mapAtZeroZero	= (artwork.mapX == 0 && artwork.mapY == 0),
						notOnDisplay	= noMapX || noMapY || mapAtZeroZero;

					if (_config.val("showArtworksNotOnDisplay", true)) {

						if (noMapX || mapAtZeroZero) artwork.mapX	= _config.val("guideStartX");
						if (noMapY || mapAtZeroZero) artwork.mapY	= _config.val("guideStartY");

						notOnDisplay	= false;

					}

					var artworkLabel	= "(id " + artwork.id + ") " + theme.title + ", prompt " + (promptIndex + 1) + ", artwork " + (artworkIndex + 1) + ": " + artwork.title;

					if (noImg || noImgW || noImgH || notOnDisplay) {

						if (notOnDisplay) {
							artworksNotOnDisplay.push(artworkLabel);
						} else if (noImg) {
							artworksNoImg.push(artworkLabel);
						} else if (noImgW || noImgH) {
							artworksBadDimensions.push(artworkLabel);
						}

						prompt.artworks.splice(artworkIndex, 1);
						artworkIndex--;
						continue;

					}

					if (!bwco.utils.defined(artwork.floor)) {
						artwork.floor	= _config.val("guideStartFloor");
					}

					if (artwork.floor == "LL") {
						artwork.floor	= 0;
					}

					artwork.lookupId	= themeIndex + "," + promptIndex + "," + artworkIndex;

				}
			}
		}

		for (var i = 0; i < artworksNotOnDisplay.length; i++) {
			console.log("Omitting artwork, not on display: " + artworksNotOnDisplay[i]);
		}

		for (var i = 0; i < artworksNoImg.length; i++) {
			console.log("Omitting artwork, no image defined: " + artworksNoImg[i]);
		}

		for (var i = 0; i < artworksBadDimensions.length; i++) {
			console.log("Omitting artwork, bad image dimensions: " + artworksBadDimensions[i]);
		}


		return data;

	}


	// Helpers
	/////////////////////////////////////////////

	// Init
	/////////////////////////////////////////////

	initModels();


}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(DataModel, bwco.events.Dispatcher);
bwco.utils.makeSingleton(DataModel);
