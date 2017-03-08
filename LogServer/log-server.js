#!/usr/bin/env node

// Constants
/////////////////////////////////////////////

var FILENAME_PREFIX		= "logs/log-",
	FILENAME_SUFFIX		= "-0",
	FILENAME_EXTENSION	= ".txt";

var PORT				= 8085,
	PROTOCOL			= "echo-protocol";

var MAX_SIZE_MB			= 10;


// Vars
/////////////////////////////////////////////

var _reqSocket			= require("websocket").server,
	_reqHTTP			= require("http"),
	_reqWinston			= require('winston');


// Init
/////////////////////////////////////////////

initLogger();
initSocket();

log("info", "Log server started.");


// Event handlers
/////////////////////////////////////////////

function onServerCreate(request, response) {

	consoleLog("Received request for " + request.url);

	response.writeHead(404);
	response.end();

}
function onServerListen() {

	consoleLog("Server is listening on port " + PORT);

}
function onServerRequest(request) {

	if (!isOriginAllowed(request.origin)) {
		request.reject();
		consoleLog("Connection from origin " + request.origin + " rejected");
		return;
	}

	var connection = request.accept(PROTOCOL, request.origin);
		connection.on("message", onConnectionMsg);
		connection.on("close", onConnectionClose);

	consoleLog("Connection accepted");

}

function onConnectionMsg(msg) {

	if (msg.type === "utf8") {

		try {
			var json		= JSON.parse(msg.utf8Data);
		} catch (err) {
			consoleLog("Received message not valid JSON, ignoring: " + msg.utf8Data);
			return;
		}

		log(json.type, json.msg);

	} else if (msg.type === "binary") {
		consoleLog("Received binary message of " + msg.binaryData.length + " bytes, ignoring.");

	}

}
function onConnectionClose(reasonCode, description) {

	consoleLog("Peer " + this.remoteAddress + " disconnected");

}


// Methods
/////////////////////////////////////////////

function initLogger() {

	_reqWinston.level	= "debug";

	_reqWinston.add(_reqWinston.transports.File, {

		filename: (FILENAME_PREFIX + getTimestamp(true) + FILENAME_SUFFIX + FILENAME_EXTENSION),
		json: false,
		level: "debug",
		maxsize: MAX_SIZE_MB * 1024 * 1024,
		timestamp: getTimestamp,
		formatter: function(options) {
			return options.timestamp()
				+ " [" + options.level.toUpperCase() + "] "
				+ (undefined !== options.message ? options.message : "")
				+ (options.meta && Object.keys(options.meta).length ? "\n\t" + JSON.stringify(options.meta) : "")
		}

	});

}
function initSocket() {

	var server		= _reqHTTP.createServer(onServerCreate);
		server.listen(PORT, onServerListen);

	var socket		= new _reqSocket({
		httpServer: server,
		autoAcceptConnections: false
	});

	socket.on("request", onServerRequest);

}

function log(level, msg) {

	if (typeof level === "undefined") {
		level	= "debug";
	}

	_reqWinston.log(level, msg);

}


// Helpers
/////////////////////////////////////////////

function consoleLog(msg) {
	console.log((new Date()) + ": " + msg);
}

function isOriginAllowed(origin) {

	// put logic here to detect whether the specified origin is allowed.
	return true;

}

function getTimestamp(dateOnly) {

	var now			= new Date(),
		nowYear		= now.getFullYear(),
		nowMonth	= now.getMonth(),
		nowDate		= now.getDate(),
		nowHours	= now.getHours(),
		nowMins		= now.getMinutes(),
		nowSecs		= now.getSeconds(),
		nowMs		= now.getMilliseconds();

	function pad2(num) {
		return (num < 10) ? ("0" + num) : num;
	}

	function pad3(num) {
		if (num < 10) {
			return "00" + num;
		} else if (num < 100) {
			return "0" + num;
		} else {
			return num;
		}
	}

	if (dateOnly) {
		return nowYear + "-"
			+ pad2(nowMonth + 1) + "-"
			+ pad2(nowDate);

	} else {
		return nowYear + "-"
			+ pad2(nowMonth + 1) + "-"
			+ pad2(nowDate) + " "
			+ pad2(nowHours) + ":"
			+ pad2(nowMins) + ":"
			+ pad2(nowSecs) + ":"
			+ pad3(nowMs);
	}

}

