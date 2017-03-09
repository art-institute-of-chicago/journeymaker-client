<img src=https://raw.githubusercontent.com/Art-Institute-of-Chicago/template/master/aic-logo.gif alt="Art Institute of Chicago" width=20% />
<img src=journeymaker-logo.png alt="JourneyMaker: Your Journey Begins Here" width=75% style="float: right"/>

# JourneyMaker Client
> A JavaScript app that digests data from the JourneyMaker CMS

![Screenshot of JourneyMaker](/screenshot.png?raw=true)

[JourneyMaker](http://www.artic.edu/journeymaker/) is an innovative new interactive experience that empowers families to create
their own personalized journeys of the Art Institute of Chicago. Designed as a web application
and developed for multi-touch screens, the interactive is allows your family to create your
very own tour of the museum. Choose one of eight storylines—like Superheroes, Time Travelers, or Strange
and Wild Creatures—and then select works from the museum’s collection within that story.
After you’ve made your selections, print out your personalized Journey Guide, which includes
information, activities, and wayfinding directions. Then head into the museum for an art-filled
adventure!

JourneyMaker launched at the Art Institute of Chicago on July 1, 2016 as six multi-touchscreens in our Ryan 
Learning Center, along with a [desktop version](http://journeymaker.artic.edu/) available online. It's 
still in place today and is being maintained by a team of internal developers.



## Features

* Administered via a Drupal CMS
* Interactive story and object selector
* Powered by TUIO for accurate multi-touch
* Dynamically accounts for objects that are off-view
* Wayfinding algorithm optimizes tour path, accounting for elevation
* Print personalized tours via in-gallery printers or generate PDFs



## Overview

JourneyMaker consists of two parts: a content authoring system written in Drupal and a public-facing frontend written in JavaScript. This repository contains the client code. In order to deploy your own instance of JourneyMaker, you will also need to install the JourneyMaker CMS:

https://github.com/art-institute-of-chicago/journeymaker-cms

The JourneyMaker CMS does not need to be installed on the same server or under the same domain as the client: as long as the client can access the assets stored in the CMS over HTTP ([CORS](http://stackoverflow.com/questions/20035101/no-access-control-allow-origin-header-is-present-on-the-requested-resource)), everything should work fine. For cross-domain development, you can use the [Allow-Control-Allow-Origin: \*](https://chrome.google.com/webstore/detail/allow-control-allow-origi/nlfbmbojpeacfghkpbjhddihlkkiljbi) Chrome extension.

The JourneyMaker client can run in two modes: kiosk or web app. The web app is meant to be accessed via HTTP as any website. Kiosk mode is meant to enable its deployment as an in-gallery interactive.

For brevity, throughout the rest of this repo's documentation, "JourneyMaker" refers to the public-facing frontend client, i.e. this repository. "JourneyMaker CMS" refers to the Drupal instance you've installed from the link above.



## Requirements

JourneyMaker can run in two modes: kiosk or webapp. For webapp mode, any webserver (Apache, nginx, etc.) is sufficient. Kiosk mode, however, requires Node.js v0.12.7: [kiosk mode requirements](README.KIOSK.md#requirements).

Due to its reliance on shell scripts, JourneyMaker requires a \*NIX environment (Linux, Mac OS X, etc.). On Windows, [Git Bash](https://git-for-windows.github.io/) should work fine, but is not officially supported.

We use Mac OS X to develop and deploy, so our code and documentation is biased towards that OS. Feel free to report any issues you encounter while running JourneyMaker on other \*NIX environments.



### Fonts and Sounds

We use licensed materials in this interactive which are proprietary to the Art Institute of Chicago and/or are licensed from third-party distributors. These materials are not included as part of this repository.

This project utilizes the third-party font Anchor Medium. You may [purchase your own license](https://processtypefoundry.com/fonts/anchor/complete-specs-webfonts) or replace references to this font with one of your own.

This project utilizes the font Ideal Sans. This is an Art Institute proprietary font owned by the Art Institute of Chicago. You should replace references to this font with one of your own.

Fonts are stored in `App/resources/fonts`.

This project utilizes sounds licensed from [AudioJungle](https://audiojungle.net). The audio clips located in `App/resources/sfx` have been replaced with dummy silent audio clips. You can replace these audio files with sound effects of your choosing, or purchase the sounds we used:

https://audiojungle.net/item/menu-button-sounds-pack/4023594?s_rank=1
https://audiojungle.net/item/wood-click/11845976?s_rank=2
https://audiojungle.net/item/elegant-button-clicks/12286426?s_rank=1



## Installation

We created an `install.sh` script that will walk you through the setup process.

```bash
# Clone the repo to your computer
git clone https://github.com/art-institute-of-chicago/journeymaker-client

# Enter the folder that was created by the clone
cd journeymaker-client

# Run the install script with sudo privilege
sudo bash install.sh

# If you do not have sudo rights, try this instead:
chmod a+rx install.sh
./install.sh

```

The script will ask you if you'd like to install JourneyMaker in webapp or kiosk mode. It will then create an `App/config.auto.json` with the necessary settings toggled to support that mode. On its first run, it will also create an `App/config.custom.json`, which you must edit manually.

It is safe to re-run this script multiple times. It will not erase any of your custom settings.

If you encounter issues with the install script, check the `install.log` file in the root of your cloned repo.



### Webapp Mode

In webapp mode, JourneyMaker can run on any web server and does not require node to function. We typically serve it using Apache. The recommended deployment process is as follows:

1. Install JourneyMaker as described above
2. Set your webserver to point to the `App` subdirectory
3. Run the install script and type `1` for `1) Webapp`
4. Edit `config.custom.json` according to the Configuration section.

In particular, you must ensure that `contentOrigin` in your custom config is set to the URL of `json.json` generated by your JourneyMaker CMS instance.

The webapp requires an HTML-to-PDF generator to work. We are working on open-sourcing the PHP code for our remote generator, but for now, you may use our generator endpoint for your JourneyMaker projects. See `webPdfGeneratorPath` for more details.



## Configuration

Check the `App` folder after running `install.sh`. There should be three config files:

```
App/config.auto.json = generated whenever you run install.sh
App/config.custom.json = edit this file!
App/config.defaults.json = lists available configs and their defaults
```

These configs will be applied in a sort of "stack" – configs in `auto` will override `custom`, which will in turn override `defaults`. Whenever you need to change a config setting, such as `contentOrigin` or `analyticsId`, please do so in `config.custom.json`.

Note that `config.auto.json` will be overriden everytime you run `install.sh` – its purpose is merely to toggle between kiosk and web modes. Likewise, please do not edit `config.defaults.json`, since it might be overriden by future updates to this repository.

Here is a sample `config.custom.json` explaining the various settings:

```javascript
{

    // IMPORTANT: Change this to point at your webserver, specifically
    //   to wherever the App folder's contents can be accessed via HTTP.
    // Please do not include a trailing slash!
    // This defaults to Apache's default settings:
    "baseURL": "http://localhost:80",

    // If you must host JourneyMaker in a subdirectory, try something like:
    // "baseURL": "https://your.museum/journeymaker",

    // For kiosk mode: AssetDownloader prepends the baseURL to the URLs of
    //   assets it downloads. If you change the baseURL, you will have to
    //   re-run the AssetDownloader.

    // IMPORTANT: Change this to point at your JourneyMaker CMS.
    // The webapp mode queries contentOrigin directly on each visit.
    // The kiosk mode's AssetDownloader caches this file.
    "contentOrigin": "http://journeymaker.your.museum/sites/default/files/json/json.json",

    // The interactive will reset if left alone for this many seconds
    "timeoutSecs": 180,

    // This is relevant to kiosk only. JourneyMaker defaults to accept
    //   mouse input; TUIO is a multi-touch protocol. If you'd like to
    //   use a touchscreen in your kiosk, we recommend disabling mouse
    //   and enabling TUIO. You will need to install and run a UPDD
    //   TUIO Server, as well as the Node.js TUIOServer included in this
    //   repo to make it work. See README.KIOSK.md for more details.
    // This example shows the defaults. Please don't enable both mouse
    //   and TUIO input at the same time, effects of this are unknown.
    "enableMouse": true,
    "enableTuio": false,

    // This only applies in kiosk mode.
    // This is where the PrintServer will save the PDFs it generates.
    // PrintServer for kiosk != remote PDF generator for webapp!
    // You can set this to whatever you'd like, default is "/tmp"
    // Note that the path is relative to the PrintServer folder;
    //   ~/ doesn't seem to work, type out /Users/user/ etc.
    "printOutputPath": "../Kiosk/JourneyGuidePDFs/",

    // This only applies in kiosk mode.
    // `name` must match a printer installed on the system.
    // Try running `lpstat -p` to see available printers.
    // You can add as many printers as you'd like.
    // See README.KIOSK.md for more details.
    "printValidPrinters": [
        {
            "name": "Print_Station_A",
            "displayName": "Print Station A",
            "color": "#009bce"
        }
    ],

    // This only applies in kiosk mode. Defaults to "random".
    // Set this to the `name` of a printer listed in `printValidPrinters`.
    // If it does not match the `name` of any printer, printer will be
    //   picked randomly from the list of valid printers.
    // See README.KIOSK.md for more details.
    "printPreferredPrinter": "random",

    // We are working on opensourcing our remote PDF generator code.
    // For the time being, you may use our remote PDF generator.
    // In fact, install.sh sets it as the default for this setting:
    "webPdfGeneratorPath": "http://journeymaker.artic.edu/PDF/phppdf.php",

    // During the "Creating Your Path..." sorting stage,
    //   objects that are not located in any of these galleries
    //   will be pushed to appear later in the sorting order.
    // We use this to ensure that objects nearest the in-gallery
    //   printers (i.e. in the Modern Wing) will be sorted first.
    "priorityGalleryIds": [
        23965, 23966, 23967, 23969, 23970, 23971,
        23972, 23973, 23974, 23975, 23976, 23977,
        23978, 23989, 23990, 23991, 23992, 23993,
        23994, 23995, 23996, 23997, 23999, 24000,
        24300, 24301, 24302, 24303, 24304, 24305,
        24306, 24307, 24308, 24309, 24310, 24311,
        24312, 24313, 24317, 24318, 24366, 24563,
        24564, 24565, 24566, 24568, 24569, 24570,
        24571, 24572, 24573, 24575, 25208, 25210,
        25456, 25467, 25468, 25469, 25470, 25471,
        25472, 25473, 25474, 25475, 25476, 25477,
        25478, 25479, 25490, 26509, 26771
    ],

    // This is used to sort the themes provided by the CMS
    // Themes that don't appear in this list will still be displayed
    // This only determines sort order
    "themeIds": [ 444, 403, 612, 361, 484, 524, 565, 703 ],

    // This is also used during the "Creating Your Path..." sort.
    // There is an algorithm that determines the optimal order,
    //  based on your starting point and distance between objects,
    //  accounting for what floor they are on and the height of each floor.
    // Set this to the latitute and longitude of your kiosk.
    "guideStartX": 41.880591,
    "guideStartY": -87.62172,
    "guideStartFloor": 1,
    "guideFloorOffsetMeters": 135,

    // Google Analytics settings, replace as needed
    "enableAnalytics": true,
    "analyticsId": "UA-XXXXXXX-XX",
    // This is the prefix we use to build our GA views
    // You can modify install.sh to set different prefixes for each mode
    "analyticsPrefix": "journey-maker/home-companion/",
    "analyticsDebug": false,

    // Replace this with you museum's admissions and visit pages
    "buyTicketsUrl": "https://sales.artic.edu/",
    "visitUrl": "http://www.artic.edu/visit/visiting-your-family"

}
```

You may override any setting from `config.defaults.json` in your `config.custom.json`. Please search the codebase to see what these settings do. Additionally, please see [README.KIOSK.md](README.KIOSK.md) for information regarding the kiosk mode settings.



## Contributing

We encourage your contributions. Please fork this repository and make your changes in a separate branch. 
We like to use [git-flow](https://github.com/nvie/gitflow) to make this process easier.

```bash
# Clone the repo to your computer
git clone git@github.com:your-github-account/journeymaker-client.git

# Enter the folder that was created by the clone
cd journeymaker-client

# Run the install script
chmod a+rx install.sh
./install.sh

# Start a feature branch
git flow start feature yourinitials-good-description-issuenumberifapplicable

# ... make some changes, commit your code

# Push your branch to GitHub
git push origin yourinitials-good-description-issuenumberifapplicable
```

Then on github.com, create a Pull Request to merge your changes into our 
`develop` branch. 

This project is released with a Contributor Code of Conduct. By participating in 
this project you agree to abide by its [terms](CODE_OF_CONDUCT.md).

We also welcome bug reports and questions under GitHub's [Issues](issues).



## Acknowledgements

Design and Development by [Belle & Wissell, Co.](http://www.bwco.info/)



## Licensing

The code in this project is licensed under the AGNU Affero General Public License Version 3.
