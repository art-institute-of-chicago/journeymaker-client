
DIR_DOWNLOADER="$( cd "$(dirname $0)" ; pwd -P )"
cd $DIR_DOWNLOADER

echo " We are currently in the '$DIR_DOWNLOADER' path..."

## Back up assers directory
cd ..
cd App

mv assets assets_bk_`date +%Y_%m_%d_%H%M%S`
mkdir assets

## Download assets
cd ..
cd AssetDownloader

node download.js

## Clean up old assets directories. Leave only the five most recent backups
cd ..
while [ $(find App -name assets_bk_* -maxdepth 1 -type d | wc -l) -gt 5 ]
do
    find App -name assets_bk_* -maxdepth 1 -type d | sort -n | head -n 1 | xargs rm -rf
done
