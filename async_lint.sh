#!/bin/bash

scan() {
  local identifier=$1
  grep "\b$identifier(" *.js | grep -Ev "await |async |return |\.then\(|\.map"
}

for name in $(grep -oE "async \w+\(" *.js | grep -oE "\w+\(" | sed -e "s/(//"); do
  scan $name
done

for name in $(grep -oE "async function \w+\(" *.js | grep -oE "\w+\(" | sed -e "s/(//"); do
  scan $name
done
