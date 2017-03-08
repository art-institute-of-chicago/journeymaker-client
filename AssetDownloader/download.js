var fs = require('fs');
var request = require('request');
var separateReqPool = {
	maxSockets: 1
};
var FileQueue = require('filequeue');
var fq = new FileQueue(1);

// FILE PREFIX ON FOR THE LOCAL FILE SYSTEM
var rootDir   = __dirname.split('/').slice( 0, -1).join('/');

var appDir    = rootDir  + '/App';
var assetsDir = appDir   + '/assets';

var localFilePrefix = assetsDir + '/';

// CUSTOM CONFIG FILE
var config = JSON.parse(fs.readFileSync( appDir + '/config.custom.json', 'utf8'));

// RETRIEVE CONFIGS
var JSONURL = config.contentOrigin;

// FILE PREFIX ON THE LOCAL WEB SERVER
var localURLPrefix =  ( config.baseURL || '' ) + '/assets/';

if(!fs.existsSync( assetsDir ) ) {
	fs.mkdirSync( assetsDir );
}

// CLASS FOR ASSETS TO BE DOWNLOADED
function MediaAsset(url, filename) {
	this.url = url;
	this.filename = filename;
}

// QUEUE FOR ASSETS
var downloadQueue = [];

// DOWNLOAD
var download = function(uri, filename, callback) {
	request.head(uri, function(err, res, body) {
		if (err) callback(err, filename);
		else {
			var stream = request(uri, separateReqPool);
			stream.pipe(
					fq.createWriteStream(localFilePrefix+filename)
					.on('error', function(err) {
						callback(error, filename);
						//  stream.read();
					})
				)
				.on('close', function() {
					callback(filedone, filename);
				});
		}
	});
};

// HANDLERS ( NOT QUITE WORKING YET )
function filedone(filename) {
	console.log("FILE DONE: " + filename);

}

function error(err) {
	console.log("ERROR : " + err);

}

// GRAB THE JSON
function getJSON(url) {
	var resp;
	var xmlHttp;

	resp = '';
	var XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
	xmlHttp = new XMLHttpRequest();

	if (xmlHttp != null) {
		xmlHttp.open("GET", url, false);
		xmlHttp.send(null);
		resp = xmlHttp.responseText;
	}

	return resp;
}

function startDownload() {
	if (downloadQueue.length > 0) {
		var assetToDL = downloadQueue.pop();
		console.log('start downloading ' + assetToDL.filename);
		download(assetToDL.url, assetToDL.filename, function() {
			console.log('done downloading ' + assetToDL.filename);
			startDownload();
		});
	}

}

function getFileExtension(fileExtensionToProcess) {
	fileExtension = fileExtensionToProcess.split('.').pop();
	if (fileExtension.indexOf('?') > -1) {
		var splitName = fileExtension.split('?');
		return splitName[0];
	}
	else if (fileExtension.indexOf('&') > -1) {
		var splitName = fileExtension.split('&');
		return splitName[0];
	}
	return fileExtension;
}

var gjson;

gjson = getJSON(JSONURL);
var jsonParsed = JSON.parse(gjson);


var i;



// themes
for (i = 0; i < jsonParsed.themes.length; i++) {

		var j;
		var k;

		var urltoDL = jsonParsed.themes[i].icon.url;
		fileExtension = getFileExtension(urltoDL)
		jsonParsed.themes[i].icon.url = localURLPrefix + "theme_" + i + "_iconimage." + fileExtension;
		var asset = new MediaAsset(urltoDL, "theme_" + i + "_iconimage." + fileExtension);
		downloadQueue.push(asset);

		var urltoDL = jsonParsed.themes[i].guideCoverArt.url;
		fileExtension = getFileExtension(urltoDL)
		jsonParsed.themes[i].guideCoverArt.url = localURLPrefix + "theme_" + i + "_guidecoverart." + fileExtension;
		var asset = new MediaAsset(urltoDL, "theme_" + i + "_guidecoverart." + fileExtension);
		downloadQueue.push(asset);

		for (j = 0; j < jsonParsed.themes[i].bgs.length; j++) {
			var urltoDL = jsonParsed.themes[i].bgs[j].url;
			fileExtension = getFileExtension(urltoDL)
			jsonParsed.themes[i].bgs[j].url = localURLPrefix + "theme_" + i + "_bg_" + j + "." + fileExtension;
			var asset = new MediaAsset(urltoDL, "theme_" + i + "_bg_" + j + "." +  fileExtension);
			downloadQueue.push(asset);
		}

		for (j = 0; j < jsonParsed.themes[i].prompts.length; j++) {
			for (k = 0; k < jsonParsed.themes[i].prompts[j].artworks.length; k++) {
				if (jsonParsed.themes[i].prompts[j].artworks[k].img != null) {
					var urltoDL = jsonParsed.themes[i].prompts[j].artworks[k].img.url;
					fileExtension = getFileExtension(urltoDL)
					jsonParsed.themes[i].prompts[j].artworks[k].img.url = localURLPrefix + "theme_" + i + "_prompt_" + j + "_artwork_" + k +"_image." + fileExtension;
					var asset = new MediaAsset(urltoDL, "theme_" + i + "_prompt_" + j + "_artwork_" + k +"_image." + fileExtension);
					downloadQueue.push(asset);
				}
			}
		}



}

startDownload();

function JSON_stringify(s, emit_unicode)
{
	var json = JSON.stringify(s);
	return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
		function(c) {
			return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);
		}
	);
}

fs.writeFile(
	localFilePrefix + "data.json",
	JSON_stringify(jsonParsed),
	{
		encoding: 'utf8',
		flag: 'w'
	}, function( err ) {
		if (err) throw err;
		console.log('Saved data.json!');
	}
);
