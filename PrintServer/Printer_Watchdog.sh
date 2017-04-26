#!/bin/bash

# SETUP: Set this script to run as a User Agent repeating at an interval

# TODO: Test w/ printer names that contain spaces?
# Known Issue: Does not work if printer list has a fax in it (fax machines only print 5 lines from lpc status)

# Get the list of printer names
# Read every 6th line, starting with the first
PRINTERS=($(lpc status | awk 'NR%6==1'))

# Remove the last character of every line (i.e. the colon)
for i in "${!PRINTERS[@]}"
do
	PRINTERS[$i]=$(echo "${PRINTERS[$i]}" | sed 's/.$//')
done

# Get the list of printing statuses
# Read every 6th line, starting with the fourth
# Capture only the third item (enabled or disabled)
# Put the result in an array
ENABLED=($(lpc status | awk 'NR%6==4 { print $3 }'))

# Process it to a simple boolean
for i in "${!ENABLED[@]}"
do

	# Change -q param to "enabled" for testing
	if echo "${ENABLED[$i]}" | grep -q "disabled"; then

		# Put your commands here
		cancel -a
		cupsenable "${PRINTERS[$i]}"

		# You can get the printer name using
		echo "${PRINTERS[$i]}"

	fi

done

# Debugging helpers:

# Get length of array
# echo "${#PRINTERS[@]}"

# Get specific element from array
# echo "${PRINTERS[0]}"