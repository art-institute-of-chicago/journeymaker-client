
function ConfigModel() {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher		= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Vars
	/////////////////////////////////////////////

	var _self		= this;

	var _data		= { };


	// Public
	/////////////////////////////////////////////

	this.load = function($, urls) {

		$.when.apply($, urls.map(function(url) {
			return $.ajax({
				dataType: "json",
				url: url,
				error: onLoadError,
			});
		})).done(onLoad);

	}

	this.val = function(field) {

		return _data[field];

	}

	this.has = function(field) {

		return bwco.utils.defined(_data[field]);

	}


	// Event handlers
	/////////////////////////////////////////////

	function onLoadError(xhr, status) {

		_self.dispatch(ModelEvent.LOAD_ERROR, {
			status: status
		});

	}

	function onLoad() {

		for (var i = 0; i < arguments.length; i++) {
			$.extend( _data, arguments[i][0] );
		}

		console.log( _data );

		_self.dispatch(ModelEvent.READY);

	}


	// Methods
	/////////////////////////////////////////////


	// Helpers
	/////////////////////////////////////////////


}


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(ConfigModel, bwco.events.Dispatcher);
bwco.utils.makeSingleton(ConfigModel);


