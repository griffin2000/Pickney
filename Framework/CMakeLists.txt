cmake_minimum_required(VERSION 3.10)

project(PickneyFramework)

# Specify the C++ standard.
set(CMAKE_CXX_STANDARD 14)
set(CMAKE_CXX_STANDARD_REQUIRED True)


# set the source files to compile
set(library_sources
    src/PickneyFramework.cpp
    src/PickneyFramework.h
    src/PickneyComponents.h
    src/PickneyComponents.cpp
    src/PickneyTypes.h
)

set(test_sources
    src/PickneyFrameworkTest.cpp
)

if(EMSCRIPTEN)
set(compile_options -DGLM_FORCE_QUAT_DATA_XYZW=1 -g)
else()
set(compile_options /DGLM_FORCE_QUAT_DATA_XYZW=1 /W3 /WX )
endif()

set(include_paths 
    src
    src/third-party/glm 
    src/third-party/json/include
)

set(emscripten_sources
    src/PickneyFrameworkEmscriptenInterface.cpp
)

if(EMSCRIPTEN)
add_custom_target(GenerateComponents ALL
COMMAND 
    node 
    ${CMAKE_CURRENT_SOURCE_DIR}/tools/GenerateComponents.js 
    ${CMAKE_CURRENT_SOURCE_DIR}/src/PickneyComponents 
    ${CMAKE_CURRENT_SOURCE_DIR}/TestPage/src/PickneyComponentsWrapper
    ${CMAKE_CURRENT_SOURCE_DIR}/tools/DefaultComponents.json
DEPENDS ${CMAKE_CURRENT_SOURCE_DIR}/tools/DefaultComponents.json
)

#  "SHELL:-gsource-map" "SHELL:--source-map-base  http://127.0.0.1:8080/dist/"
add_link_options("SHELL:-s USE_WEBGPU=1" "SHELL:-s ALLOW_TABLE_GROWTH=1" "SHELL:-s EXTRA_EXPORTED_RUNTIME_METHODS=['addFunction']" "SHELL:-s MODULARIZE=1" "SHELL:-s EXPORT_NAME=PickneyFramework" "SHELL:-s TOTAL_MEMORY=1048576000" "SHELL:-DEMSCRIPTEN=1")
add_executable(PickneyFramework ${library_sources} ${emscripten_sources})
add_dependencies(PickneyFramework GenerateComponents)
target_compile_options(PickneyFramework PRIVATE ${compile_options})
target_include_directories(PickneyFramework PRIVATE   ${include_paths})


add_custom_target(CopyWASM ALL
COMMAND ${CMAKE_COMMAND} -E copy_if_different ${CMAKE_CURRENT_BINARY_DIR}/PickneyFramework.js ${CMAKE_CURRENT_SOURCE_DIR}/TestPage/src/Emscripten
COMMAND ${CMAKE_COMMAND} -E copy_if_different ${CMAKE_CURRENT_BINARY_DIR}/PickneyFramework.wasm ${CMAKE_CURRENT_SOURCE_DIR}/TestPage/dist
#COMMAND ${CMAKE_COMMAND} -E copy_if_different ${CMAKE_CURRENT_BINARY_DIR}/PickneyFramework.wasm.map ${CMAKE_CURRENT_SOURCE_DIR}/TestPage/dist
DEPENDS PickneyFramework
)

else()

add_library(PickneyFramework STATIC ${library_sources})
target_compile_options(PickneyFramework PRIVATE ${compile_options})
target_include_directories(PickneyFramework PRIVATE   ${include_paths} )



add_executable(PickneyFrameworkTest ${test_sources}  ${emscripten_sources})
target_compile_options(PickneyFrameworkTest PRIVATE ${compile_options})
target_include_directories(PickneyFramework PRIVATE   ${include_paths})
target_link_libraries(PickneyFrameworkTest PRIVATE PickneyFramework)
target_include_directories(PickneyFrameworkTest PRIVATE   ${include_paths} )

endif()
