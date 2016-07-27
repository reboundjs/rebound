pcregrep -oh '(?<=_\.)[^\(]*(?=\()' ./packages/*/**/*.js | sort | uniq -c
