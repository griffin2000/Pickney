#pragma once


#include "PickneyFramework.h"
#include "PickneyComponents.h"

#if EMSCRIPTEN
#include <emscripten.h>
#define EM_EXPORT EMSCRIPTEN_KEEPALIVE extern "C"
#else
#define EM_EXPORT extern "C"
#endif

EM_EXPORT Cj::Framework::World * getFrameworkWorld();
EM_EXPORT void initialize();