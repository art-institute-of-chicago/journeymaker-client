JourneyMaker Client Changelog
=============================

At the Digital Experience department of the Art Institute of Chicago, we use Redmine as our internal issue tracker. Some of the changes listed here reference issues tracked via Redmine. In order to differentiate between references to GitHub issues and Redmine issues, we are adopting the following scheme:

```
* Change description (#14) [#23]

(#14) = reference to a GitHub issue
[#23] = reference to a Redmine issue
```

Outside contributors can ignore Redmine references.

-----------------------------

1.2.0 - Multiple language support (in progress by Belle & Wissel Co.)

1.1.0 - Changes for open source release:

* Lint whitespace for consistency [#1462]
* Improve documentation on deployment process [#1480]
* Remove AIC-specific deployment-related items [#1477]
* Remove old SVN repository data from LogServer [#1479]
* Move the contents of the `journeymaker` subfolder into root [#1475]
* Modify `ConfigModel.load()` to accept multiple files [#1464]
* Create `config.custom.json`, which extends and overrides `config.default.json` on a per-setting basis [#1463]
* Create `package.json` for LogServer, PrintServer, and TUIOServer [#1469, #1457]
* Write `install.sh` to run `npm install`, generate config, and other tasks [#1468, #1478]
* Add downloaded assets and `node_modules` to `.gitignore` [#1461, #1470]
* Add README.md and README.KIOSK.md [#1485, #1486, #1522]
* Add CHANGELOG.md [#1506]

1.0.0 - In-gallery deployment (initial)
