
function Socket(host, protocol, loggingEnabled) {

	// Imports
	/////////////////////////////////////////////

	var Dispatcher	= bwco.events.Dispatcher;


	// Superclass
	/////////////////////////////////////////////

	Dispatcher.call(this);


	// Constants
	/////////////////////////////////////////////

	var DISCONNECT_CODE	= 1000;


	// Elements
	/////////////////////////////////////////////


	// Private properties
	/////////////////////////////////////////////

	var _self				= this;

	var _socket;

	var _host				= host,
		_protocol			= bwco.utils.defined(protocol) ? protocol : "";

	var _connected			= false,
		_loggingEnabled		= bwco.utils.defined(loggingEnabled) ? loggingEnabled : true;

	var _label				= "";


	// Getters & setters
	/////////////////////////////////////////////

	Object.defineProperties(this, {

		"connected": {
			get: function() {
				return _connected;
			}
		},

		"loggingEnabled": {
			get: function() {
				return _loggingEnabled;
			},
			set: function(val) {
				_loggingEnabled	= val ? true : false;
			}
		},

		"label": {
			set: function(val) {
				_label	= val;
			}
		}

	});


	// Public methods
	/////////////////////////////////////////////

	this.send = function(msg) {

		if (!_socket) {
			log("\tSocket not initialized");
			return;
		}

		if (!_connected) {
			log("\tNot connected");
			return;
		}

		console.log("(" + _label + ") Socket::send, _socket.readyState: " + _socket.readyState);

		_socket.send(msg);

	}

	this.sendJSON = function(json) {

		var msg	= JSON.stringify(json);

		_self.send(msg);

	}

	this.close = function() {

		log("Socket::close()");

		_connected	= false;

		if (_socket) {
			_socket.close();
		}

	}

	this.dispose = function() {

		disposeSocket();

	}


	// Event handlers
	/////////////////////////////////////////////

	function onOpen(e) {

		log("Socket::onOpen()");

		_connected	= true;

		_self.dispatch(Socket.CONNECT);

	}
	function onMsg(e) {

		log("Socket::onMsg()");

		_self.dispatch(Socket.MSG, {
			msg: e.data
		});

	}
	function onClose(e) {

		log("Socket::onClose()");
		log("\tcode: " + e.code);

		disposeSocket();

		if (e.code == DISCONNECT_CODE) {
			_self.dispatch(Socket.DISCONNECT);

		} else {
			_self.dispatch(Socket.ERROR, {
				msg: e.code
			});

		}

	}
	function onError(e) {

		log("Socket::onError()");
		log("\tError connecting to socket at " + _host + " (" + _protocol + ")");
		log("\t" + e.data);

		disposeSocket();

		_self.dispatch(Socket.ERROR, {
			msg: e.data
		});

	}


	// Private methods
	/////////////////////////////////////////////

	function init() {

		log("Socket::init()");

		if ("WebSocket" in window) {
			connect();

		} else {
			log("\tWebSocket not supported");

			_self.dispatch(Socket.ERROR, {
				msg: "WebSocket not supported"
			});

		}

	}

	function connect() {

		log("Socket::connect()");

		try {
			_socket				= new WebSocket(_host, _protocol);
		} catch (err) {
			log(err);
			return;
		}

		if (_socket) {
			log("\tSocket created");
			log("\t_host:     " + _host);
			log("\t_protocol: " + _protocol);

			_socket.onopen		= onOpen;
			_socket.onmessage	= onMsg;
			_socket.onclose		= onClose;
			_socket.onerror		= onError;

		} else {
			log("\tProblem creating socket");
			log("\t_host:     " + _host);
			log("\t_protocol: " + _protocol);

		}

	}

	function disposeSocket() {

		log("Socket::disposeSocket()");

		if (_socket) {

			_socket.onopen		= null;
			_socket.onmessage	= null;
			_socket.onclose		= null;
			_socket.onerror		= null;

			if (_connected) {
				_connected		= false;
				_socket.close();
			}

			_socket				= null;

		}

		log("\tSocket disposed");

	}

	function log(msg) {

		if (_loggingEnabled) {
			if (_label && _label.length) {
				App.log("(" + _label + ") " + msg);
			} else {
				App.log(msg);
			}
		}

	}


	// Helpers
	/////////////////////////////////////////////


	// Init
	/////////////////////////////////////////////

	init();

}

// Static
/////////////////////////////////////////////

Socket.CONNECT			= "Socket.CONNECT";
Socket.DISCONNECT		= "Socket.DISCONNECT";
Socket.MSG				= "Socket.MSG";
Socket.ERROR			= "Socket.ERROR";


// Inheritance
/////////////////////////////////////////////

bwco.utils.extend(Socket, bwco.events.Dispatcher);

