
DIR_DOWNLOADER="$( cd "$(dirname $0)" ; pwd -P )"
JM_ROOT=$DIR_DOWNLOADER/..

echo "JourneyMaker root is '$JM_ROOT'"

mv $JM_ROOT/App/assets $JM_ROOT/App/assets_bk_`date +%Y_%m_%d_%H%M%S`
mkdir $JM_ROOT/App/assets

## Download assets
node $JM_ROOT/AssetDownloader/download.js

## Clean up old assets directories. Leave only the five most recent backups
cd ..
while [ $(find $JM_ROOT/App -name assets_bk_* -maxdepth 1 -type d | wc -l) -gt 5 ]
do
    find $JM_ROOT/App -name assets_bk_* -maxdepth 1 -type d | sort -n | head -n 1 | xargs rm -rf
done
