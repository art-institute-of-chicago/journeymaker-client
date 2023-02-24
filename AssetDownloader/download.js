// Constants
/////////////////////////////////////////////

var PREFIX_FILE_IN_JSON         = "http://localhost:8888/assets/";

// Requires
/////////////////////////////////////////////

var _reqFs          = require('fs'),
    _reqRequest     = require('request'),
    _reqXhr         = require("xmlhttprequest"),
    _reqFileQueue   = require('filequeue');

// Vars
/////////////////////////////////////////////

var _fileQueue      = new _reqFileQueue(1);
    _downloadIndex  = 0,
    _downloadQueue  = [];

// FILE PREFIX ON FOR THE LOCAL FILE SYSTEM
var rootDir   = __dirname.split('/').slice( 0, -1).join('/');

var appDir    = rootDir  + '/App';
var assetsDir = appDir   + '/assets/';

//var localFilePrefix = assetsDir + '/';

// CUSTOM CONFIG FILE
var config = JSON.parse(_reqFs.readFileSync( appDir + '/config.custom.json', 'utf8'));

var JSONURL_EN = config.contentOriginEN,
		JSONURL_ES = config.contentOriginES,
		JSONURL_ZH = config.contentOriginZH;

// FILE PREFIX ON THE LOCAL WEB SERVER
var localURLPrefix =  ( config.baseURL || '' ) + '/assets/';

var JSON_SOURCES    = [
    {
        "lang": "en",
        "url": JSONURL_EN,
        "localFilename": "data-en.json"
    },
    {
        "lang": "es",
        "url": JSONURL_ES,
        "localFilename": "data-es.json"
    },
    {
        "lang": "zh",
        "url": JSONURL_ZH,
        "localFilename": "data-zh.json"
    }
];

// Classes
/////////////////////////////////////////////

function MediaAsset(url, filename) {
    this.url        = url;
    this.filename   = filename;
    this.localPath  = assetsDir + filename;
}


// Init
/////////////////////////////////////////////

init();


// Methods
/////////////////////////////////////////////

function init() {

    log("\nJourneyMaker Asset Downloader");

    for (var i = 0; i < JSON_SOURCES.length; i++) {

        var source          = JSON_SOURCES[i],
            localDataPath   = assetsDir + "/" + source.localFilename,
            prevQueueLen    = _downloadQueue.length;

        log("\nLoading source " + (i + 1) + '/' + JSON_SOURCES.length + ": " + source.lang);
        log("  URL: " + source.url);

        log("  Loading JSON... ", true);
        var data    = JSON.parse(loadJSON(source.url));
        log("Complete");

        log("  Adding assets to queue... ", true);
        addToDownloadQueue(data);
        log("Complete (" + (_downloadQueue.length - prevQueueLen) + " unique assets added to queue)");

        log("  Writing local data to \"" + source.localFilename + "\"... ", true);
        _reqFs.writeFile(localDataPath, stringifyJSON(data), 'utf8', (err) => {
            if (err) throw err;
                log(localDataPath + ' has been saved');
            });
        log("Complete");

    }


    // Download assets
    /////////////////////////////////////////////

    log("\nDownloading " + _downloadQueue.length + " assets...\n");
    downloadNextAsset();

}

function loadJSON(url) {

    var response    = "",
        request     = new _reqXhr.XMLHttpRequest();

    if (request) {
        request.open("GET", url, false);
        request.send(null);
        response    = request.responseText;
    }

    return response;

}

function addToDownloadQueue(data) {

    for (var i = 0; i < data.themes.length; i++) {
        var theme       = data.themes[i];

        addAssetToDownloadQueue(theme.icon, "url", "theme-" + i + "-icon");
        addAssetToDownloadQueue(theme.guideCoverArt, "url", "theme-" + i + "-guide-cover-art");
        addAssetToDownloadQueue(theme.guideCoverArtHome, "url", "theme-" + i + "-guide-cover-art-home");

        for (var j = 0; j < theme.bgs.length; j++) {
            var bg          = theme.bgs[j];

            addAssetToDownloadQueue(bg, "url", "theme-" + i + "-bg-" + j);

        }

        for (var k = 0; k < theme.prompts.length; k++) {
            var prompt          = theme.prompts[k];

            for (var l = 0; l < prompt.artworks.length; l++) {
                var artwork         = prompt.artworks[l];

                addAssetToDownloadQueue(artwork.img, "url", "theme-" + i + "-prompt-" + k + "-artwork-" + l);

            }
        }

    }

}

function addAssetToDownloadQueue(obj, urlField, fileLabel) {

    if (!obj) return;

    var url         = obj[urlField],
        filename    = fileLabel + "." + getFileExtension(url),
        newPath     = PREFIX_FILE_IN_JSON + filename;
        asset       = new MediaAsset(url, filename);

    if (!assetAlreadyInQueue(asset)) {
        _downloadQueue.push(asset);
    }

    obj[urlField]   = newPath;

}

function downloadNextAsset() {

    if (_downloadIndex >= _downloadQueue.length) {
        log("\nCompleted downloading " + _downloadQueue.length + " assets.");
        log("You're good to go!\n");
        return;
    }

    var asset       = _downloadQueue[_downloadIndex],
        perc        = _downloadIndex / (_downloadQueue.length - 1),
        progress    = getProgressString(perc),
        count       = (_downloadIndex + 1) + "/" + _downloadQueue.length;

    log("  " + progress + " " + count + " (" + asset.filename + ") ", true);

    downloadAsset(asset.url, asset.localPath, onAssetDownloadComplete, onAssetDownloadError);

}

function downloadAsset(url, localPath, onComplete, onError) {

    // I don't know what's going on here exactly, so
    // I'm not going to mess with it -Scott

    _reqRequest.head(url, function(err, res, body) {
        if (err) {
            onError(err);
        } else {
            var stream = _reqRequest(url, {
                maxSockets: 1
            });
            stream.pipe(_fileQueue.createWriteStream(localPath).on("error", function(err) {
                onError(err);
            })).on("close", function() {
                onComplete();
            });
        }
    });

}


// Event handlers
/////////////////////////////////////////////

function onAssetDownloadComplete() {

    log("Complete");

    _downloadIndex++;
    downloadNextAsset();

}

function onAssetDownloadError(err) {

    log("Error loading asset: " + err);

}


// Helpers
/////////////////////////////////////////////

function stringifyJSON(s, emit_unicode) {
    var json = JSON.stringify(s);
    return emit_unicode ? json : json.replace(/[\u007f-\uffff]/g,
        function(c) {
            return '\\u'+('0000'+c.charCodeAt(0).toString(16)).slice(-4);
        }
    );
}

function assetAlreadyInQueue(asset) {

    for (var i = 0; i < _downloadQueue.length; i++) {
        if (_downloadQueue[i].filename == asset.filename) {
            return true;
        }
    }

    return false;

}

function getFileExtension(file) {

    var extension   = file.split(".").pop();

    if (extension.indexOf("?") != -1) {
        return extension.split("?")[0];

    } else if (extension.indexOf("&") != -1) {
        return extension.split("&")[0];
    }

    return extension;

}

function getProgressString(perc) {

    var LENGTH          = 20;
    var completeCount   = Math.floor(perc * LENGTH);

    var string          = "["

    for (var i = 0; i < LENGTH; i++) {
        string  += (i <= completeCount) ? "■" : " ";
    }

    return string + "]"

}

function log(msg, omitLinebreak) {

    process.stdout.write(msg + (omitLinebreak ? "" : "\n"));

}
