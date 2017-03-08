#!/bin/bash

# http://stackoverflow.com/questions/29436275
function yes_or_no {
	while true; do
		read -p "$* [y/n]: " yn
		case $yn in
			[Yy]*) return 0  ;;
			[Nn]*) echo "Aborted" ; return  1 ;;
		esac
	done
}

# Color markup
R=`tput setaf 1`
G=`tput setaf 2`
Y=`tput setaf 3`
C=`tput setaf 6`
W=`tput setaf 7`

# Get location of this script
DIR_REPO="$( cd "$(dirname $0)" ; pwd -P )"

# Useful if code is stored in a subfolder
DIR_ROOT="$DIR_REPO"

DIR_APP="$DIR_ROOT/App"
DIR_DOWNLOADER="$DIR_ROOT/AssetDownloader"
DIR_LOGGER="$DIR_ROOT/LogServer"
DIR_PRINTER="$DIR_ROOT/PrintServer"
DIR_TUIO="$DIR_ROOT/TUIOServer"

LOG="$DIR_ROOT/install.log"

# Determine if the app is to be installed in webapp or kiosk mode

echo "${C}Welcome to the JourneyMaker Client installer.${W}"
echo "${G}Please select the deployment mode:${W}"

PS3="${W}Mode [1-3]: ${W}"
options=("Webapp" "Kiosk" "Quit")
select opt in "${options[@]}"
do
	case $opt in
		"Webapp")
			MODE="webapp"
			break
		;;
		"Kiosk")
			MODE="kiosk"
			break
		;;
		"Quit")
			echo "${G}Exiting installer...${W}"
			exit
			break
		;;
		*)
			echo "${R}Invalid option. Please enter a number (1-3).${W}"
		;;
	esac
done


echo "${G}Installing in '$MODE' mode...${W}"

# Clear the log
echo "${G}Clearing old install log...${W}"
rm -f "$LOG"
touch "$LOG"
chown $(logname) "$LOG"

if [ ! -f "$DIR_APP/config.custom.json" ]; then

	echo "${W}No existing config.custom.json found, one will be created${W}"
	echo "${G}Performing first-time setup...${W}"

	# Default options
	OPTIONS=`cat <<- EOF
	{
	    "baseURL": null,

	    "contentOrigin": null,

	    "timeoutSecs": 180,

	    "printOutputPath": "/tmp",

	    "printValidPrinters": [
	        {
	            "name": "Print_Station_A",
	            "displayName": "Print Station A",
	            "color": "#009bce"
	        },
	        {
	            "name": "Print_Station_B",
	            "displayName": "Print Station B",
	            "color": "#dd4444"
	        }
	    ],

	    "printPreferredPrinter": "random",

	    "priorityGalleryIds": null,
	    "themeIds": null,

	    "enableAnalytics": false,
	    "analyticsId": null,
	    "analyticsPrefix": null,

	    "guideStartX": 41.880591,
	    "guideStartY": -87.62172,
	    "guideStartFloor": 1,
	    "guideFloorOffsetMeters": 60,

	    "buyTicketsUrl": "javascript:;",
	    "visitUrl": "javascript:;"

	}
	EOF`

	echo "$OPTIONS" > "$DIR_APP/config.custom.json"
	chown $(logname) "$DIR_APP/config.custom.json"

	echo "${W}Created stub config.custom.json${W}"
fi


# Handle webapp installation

if [ "$MODE" == "webapp" ]; then

	# Default options
	OPTIONS=`cat <<- EOF
	{
	    "isHomeCompanion": true,
	    "contentPath": null,
	    "enableMouse": true,
	    "enableLogging": false,
	    "enableTuio": false,
	    "enablePrintSocket": false,
	    "enableWebPdfGeneration": true,
	    "webPdfGeneratorPath": "http://journeymaker.artic.edu/PDF/phppdf.php"
	}
	EOF`


	echo "$OPTIONS" > "$DIR_APP/config.auto.json"
	chown $(logname) "$DIR_APP/config.auto.json"

	echo "${W}Toggled webapp mode in config.auto.json${W}"

fi

# Handle kiosk installation

if [ "$MODE" == "kiosk" ]; then

	# Check requirements
	command -v node >/dev/null 2>&1 || { echo >&2 "${R}node is missing. Aborting.${W}"; exit 1; }
	command -v npm >/dev/null 2>&1 || { echo >&2 "${R}npm is missing. Aborting.${W}"; exit 1; }

	# Check node version
	if [[ ! $(node -v) == *"v0.12"* ]]; then
		echo "${Y}You are using node $(node -v). npm install may fail.${W}"
		echo "${Y}Only node v0.12.x (LTS) is officially supported.${W}"
	fi

	# Default options
	OPTIONS=`cat <<- EOF
	{
	    "isHomeCompanion": false,
	    "contentPath": "assets/data.json",
	    "enableLogging": true,
	    "enablePrintSocket": true,
	    "enableWebPdfGeneration": false
	}
	EOF`

	echo "$OPTIONS" > "$DIR_APP/config.auto.json"
	chown $(logname) "$DIR_APP/config.auto.json"

	echo "${W}Toggled kiosk mode in config.auto.json${W}"

	# Clear old dependencies
	echo "${G}Removing old dependencies...${W}"
	cd "$DIR_DOWNLOADER" && rm -rf "node_modules" >> "$LOG"
	cd "$DIR_LOGGER" && rm -rf "node_modules" >> "$LOG"
	cd "$DIR_PRINTER" && rm -rf "node_modules" >> "$LOG"
	cd "$DIR_TUIO" && rm -rf "node_modules" >> "$LOG"

	# Install npm dependencies
	echo "${G}Installing AssetDownloader dependencies...${W}"
	cd "$DIR_DOWNLOADER" && npm install >> "$LOG"

	echo "${G}Installing LogServer dependencies...${W}"
	cd "$DIR_LOGGER" && npm install >> "$LOG"

	echo "${G}Installing PrintServer dependencies...${W}"
	cd "$DIR_PRINTER" && npm install >> "$LOG"

	echo "${G}Installing TUIOServer dependencies...${W}"
	cd "$DIR_TUIO" && npm install >> "$LOG"

	echo "${G}All node_modules downloaded${W}"
fi

echo "${G}JourneyMaker Client install complete!${W}"

echo "${G}Congrats! You've successfully installed the JourneyMaker Client. You need to adjust some${W}"
echo "${G}configurations personally in App/config.custom.js, in particular the baseURL and${W}"
echo "${G}contentOrigin. See README.md and README.KIOSK.md for the config options.${W}"
if [ "$MODE" == "kiosk" ]; then
    echo
    echo "${G}Since you've installed in kiosk mode, you need to run the following command to store the${W}"
    echo "${G}CMS assets locally:${W}"
    echo
    echo "${G}   chmod a+rx $DIR_DOWNLOADER/download_assets.command${W}"
    echo "${G}   .$DIR_DOWNLOADER/download_assets.command${W}"
fi

echo
echo "${G}Then, point the document root of your web server to the journeymaker-client/App folder and${W}"
echo "${G}your client site should be up and running.${W}"
