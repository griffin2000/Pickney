# Pickney ECS Framework

Pickney is a high performance ECS framework for web and native applications, based on Emscripten web-assembly.

## Compiling the Framw

Compile the WASM version of Pickney with the following commands:
* Ensure `make` is available in the system path (on Windows this can be installed from: https://gnuwin32.sourceforge.net/packages/make.htm)
* Ensure Emscripten is installed and activated with `emsdk activate latest`
* Create build folder `_build` in the repo root folder and CD to that folder.
* Run cmake with the command: `cmake .. -G "Unix Makefiles" -D CMAKE_C_COMPILER=emcc -D CMAKE_CXX_COMPILER=emcc -DEMSCRIPTEN=1 -D CMAKE_EXECUTABLE_SUFFIX_CXX=.js`
* Run make with the command: `make`
* This will compile the Framework and install it to the test page folder

## Running the test page

Run the test page with the following commands
* Ensure yarn is installed and accessible in the path along with its global binary folder.
* Ensure webpack and http-server are installed globally via yarn
* CD to the Framework/TestPage folder
* Run `yarn install`
* Run webpack with `webpack --watch` command
* Open a new command prompr
* Run the server with `http-server -c-1` (this will ensure no files are cached and can be used for development)
* Go to http://127.0.0.1:8080/ in a browser
