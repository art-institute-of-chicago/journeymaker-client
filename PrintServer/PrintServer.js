#!/usr/bin/env node

// Config
/////////////////////////////////////////////

var _fs = require("fs");

var CONFIG = JSON.parse(_fs.readFileSync( '../App/config.custom.json', 'utf8'));

// Constants
/////////////////////////////////////////////

var SEND_TO_PRINTER			= true;

var VALID_PRINTERS			= ( CONFIG.printValidPrinters || [] );

if( VALID_PRINTERS.length < 1 ) {
	logMsg('You must set printValidPrinters in config.custom.json');
}

// To select a specific preferred printer for a station, use a printer
// name from the VALID_PRINTERS list above. If PREFERRED_PRINTER is set
// to a value that that does not match any printer names above, a random
// printer will be selected for each print job.

var PREFERRED_PRINTER		= ( CONFIG.printPreferredPrinter || "random" );

var PDF_W					= "17in",
	PDF_H					= "11in",
	PDF_IMG_QUALITY			= "100",
	PDF_BASE_PATH			= ( CONFIG.baseURL || "" ) + "/",
	PDF_OUTPUT_PATH			= ( CONFIG.printOutputPath || "/tmp" );

var PRINT_OPTIONS			= {
	"media": "na_ledger_11x17in",
	"page-ranges": 1,
	"landscape": true
};


// Vars
/////////////////////////////////////////////

var _reqSocket			= require("websocket").server,
	_reqHTTP			= require("http"),
	_reqPDF				= require("html-pdf"),
	_reqPrinter			= require("printer"),
	_reqUtil			= require("util");

var _server,
	_wsServer,
	_connection;

var _printerIndex		= -1;


// Init
/////////////////////////////////////////////

logPrintersInfo();
init();


// Event handlers
/////////////////////////////////////////////

function onServerCreate(request, response) {

	logMsg("Received request for " + request.url);

	response.writeHead(404);
	response.end();

}
function onServerListen() {

	logMsg("Server is listening on port 8080");

}
function onServerRequest(request) {

	if (!isOriginAllowed(request.origin)) {
		// Make sure we only accept requests from an allowed origin
		request.reject();
		logMsg("Connection from origin " + request.origin + " rejected");
		return;
	}

	_connection = request.accept("echo-protocol", request.origin);
	_connection.on("message", onConnectionMsg);
	_connection.on("close", onConnectionClose);

	logMsg("Connection accepted");

}

function onConnectionMsg(msg) {

	if (msg.type === "utf8") {

		var html	= msg.utf8Data;

		logMsg("Received Message: " + html);

		if (html.indexOf("<html>") == 0) {
			createPDF(html);
		}

	} else if (msg.type === "binary") {

		logMsg("Received Binary Message of " + msg.binaryData.length + " bytes");

	}

}
function onConnectionClose(reasonCode, description) {

	logMsg("Peer " + _connection.remoteAddress + " disconnected");

}

function onPDFCreate(error, result) {

	if (error) {
		logMsg("Error creating PDF");
		logMsg(error);
		return;
	}

	logMsg("PDF created at: " + result.filename);

	if (SEND_TO_PRINTER) {
		printPDF(result.filename);
	}

}

function onPrintSuccess(jobID) {

	logMsg("Print success");
	logMsg("Sent to printer with ID: " + jobID);

	var printer			= (_printerIndex != -1) ? VALID_PRINTERS[_printerIndex] : null,
		printerName		= printer ? printer.displayName : null,
		printerColor	= printer ? printer.color : null

	console.log("Printed on printer with name: " + printerName);

	_connection.sendUTF(JSON.stringify({
		"success": true,
		"printerName": printerName,
		"printerColor": printerColor
	}));

}
function onPrintError(error) {

	logMsg("Error printing");
	logMsg(error);

	_connection.sendUTF(JSON.stringify({
		"success": false,
		"printerName": null,
		"printerColor": null
	}));

}


// Functions
/////////////////////////////////////////////

function init() {

	_server		= _reqHTTP.createServer(onServerCreate);
	_server.listen(8080, onServerListen);

	// You should not use autoAcceptConnections for production
	// applications, as it defeats all standard cross-origin protection
	// facilities built into the protocol and the browser. You should
	// *always* verify the connection's origin and decide whether or not
	// to accept it.

	_wsServer	= new _reqSocket({
		httpServer: _server,
		autoAcceptConnections: false
	});

	_wsServer.on("request", onServerRequest);

}

function createPDF(html) {

	var fileName	= "journey-guide-" + getTimestamp() + ".pdf";

	_reqPDF.create(html, {
		width: PDF_W,
		height: PDF_H,
		base: PDF_BASE_PATH,
		quality: PDF_IMG_QUALITY
	}).toFile(PDF_OUTPUT_PATH + fileName, onPDFCreate);

}
function printPDF(filename) {

	_printerIndex	= getNextPrinterIndex();

	if (_printerIndex != -1) {

		_reqPrinter.printFile({
			filename: filename,
			printer: VALID_PRINTERS[_printerIndex].name,
			options: PRINT_OPTIONS,
			success: onPrintSuccess,
			error: onPrintError
		});

	} else {
		onPrintError("Could not find printer.");

	}

}


// Helpers
/////////////////////////////////////////////

function getNextPrinterIndex() {

	var printers	= _reqPrinter.getPrinters(),
		minJobs		= null,
		minIndex	= -1;

	var sortedValidPrinters		= getSortedValidPrinters();

	for (var i = 0; i < sortedValidPrinters.length; i++) {

		for (var j = 0; j < printers.length; j++) {

			var printer			= printers[j],
				jobs			= printer.jobs ? printer.jobs.length : 0,
				validPrinter	= printer.name == sortedValidPrinters[i].name,
				acceptingJobs	= printer.options["printer-is-accepting-jobs"] == "true";

			if (validPrinter && acceptingJobs) {

				logMsg(printer.name + ": " + jobs + " jobs");

				if (minIndex == -1 || jobs < minJobs) {
					minJobs		= jobs;
					minIndex	= VALID_PRINTERS.indexOf(sortedValidPrinters[i]);
				}

			}

		}
	}

	return minIndex;

}
function getSortedValidPrinters() {

	var sorted	= VALID_PRINTERS.slice(),
		index	= getPreferredPrinterIndex();

	if (index == -1) {
		shuffleArray(sorted);
		return sorted;

	} else {
		sorted.unshift(sorted.splice(index, 1)[0]);
		return sorted;
	}

}
function getPreferredPrinterIndex() {
	for (var i = 0; i < VALID_PRINTERS.length; i++) {
		if (PREFERRED_PRINTER == VALID_PRINTERS[i].name) {
			return i;
		}
	}
	return -1;
}

function isOriginAllowed(origin) {

	console.log(origin)

	// put logic here to detect whether the specified origin is allowed.
	return true;
}

function getTimestamp() {

	var now			= new Date(),
		nowYear		= now.getFullYear(),
		nowMonth	= now.getMonth(),
		nowDate		= now.getDate(),
		nowHours	= now.getHours(),
		nowMins		= now.getMinutes(),
		nowSecs		= now.getSeconds(),
		nowMs		= now.getMilliseconds();

	return nowYear + "-"
		+ pad2(nowMonth + 1) + "-"
		+ pad2(nowDate) + "-"
		+ pad2(nowHours) + "-"
		+ pad2(nowMins) + "-"
		+ pad2(nowSecs) + "-"
		+ pad3(nowMs);

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

}

function logPrintersInfo() {
	console.log(_reqPrinter.getPrinters());
}
function logMsg(msg) {
	console.log((new Date()) + ": " + msg);
}

function shuffleArray(a) {
	var counter = a.length;
	while (counter > 0) {
		var index	= Math.floor(Math.random() * counter);
		counter--;
		var temp		= a[counter];
		a[counter]	= a[index];
		a[index]	= temp;
	}
	return a;
}
