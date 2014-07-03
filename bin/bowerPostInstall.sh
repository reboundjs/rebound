# We need to build handlebars to generate its compiler/parser.js file
cd ./bower_components/handlebars
npm install
grunt build
cd -

# Now, with everything install, build our project
grunt build
