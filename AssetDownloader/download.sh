
DIR_DOWNLODER="$( cd "$(dirname $0)" ; pwd -P )"

echo " We are currently in the '$DIR_DOWNLOADER' path..."


DIR_ROOT="$( cd "$(dirname $0)" ; pwd -P )"

cd ..
cd App

rm -R assets
mkdir assets

cd ..
cd AssetDownloader

node download.js
