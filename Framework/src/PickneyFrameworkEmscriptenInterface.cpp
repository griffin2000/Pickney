
#include <iostream>
#include "PickneyFrameworkEmscriptenInterface.h"

Cj::Framework::World *g_world = nullptr;

using PickneyGenericArray = Cj::Framework::Array<void*>;
using PickneyArrayPointer = uint32_t *;
using PickneySystemCallback = void ( const Cj::Framework::Globals* , const Cj::Framework::EntityID *, size_t);
using PickneyAllocCallback = Cj::Framework::HostComponentID ();
using PickneyFreeCallback = void (Cj::Framework::HostComponentID );

EM_EXPORT Cj::Framework::World * getFrameworkWorld() {
	return g_world;
}

EM_EXPORT void initialize() {
	g_world = new Cj::Framework::World(Cj::Framework::Components::allocate, Cj::Framework::Components::descriptions);;
}

EM_EXPORT size_t nativeComponentCount() {
	return g_world->nativeComponentCount();
}

EM_EXPORT Cj::Framework::ComponentID registerHostComponent(PickneyAllocCallback alloc, PickneyFreeCallback free, const char* name, bool isSingleton) {
	function<Cj::Framework::HostComponentID()> allocFunc = alloc;
	function<void (Cj::Framework::HostComponentID)> freeFunc = free;
	
	return g_world->registerHostComponent(allocFunc, freeFunc, name, isSingleton);
}
EM_EXPORT void shutdown() {
	delete g_world;
}


EM_EXPORT size_t getEntitySize() {
	return sizeof(Cj::Framework::Entity);
}
EM_EXPORT size_t getArraySize() {
	return sizeof(PickneyGenericArray);
}

EM_EXPORT void setString( Cj::Framework::String *str, const char *value, size_t len) {
	str->set(value, len);
}

EM_EXPORT void matrix4ArrayInitialize(Cj::Framework::Matrix4Array *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void matrix3ArrayInitialize(Cj::Framework::Matrix3Array *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void matrix2ArrayInitialize(Cj::Framework::Matrix4Array *pArray,int n) {
	pArray->reset(n, true);
}

EM_EXPORT void quatArrayInitialize(Cj::Framework::QuatArray *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void float4ArrayInitialize(Cj::Framework::Float4Array *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void float3ArrayInitialize(Cj::Framework::Float3Array *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void float2ArrayInitialize(Cj::Framework::Float4Array *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void floatArrayInitialize(Cj::Framework::FloatArray *pArray,int n) {
	pArray->reset(n, true);
}
EM_EXPORT void intArrayInitialize(Cj::Framework::IntArray *pArray,int n) {
	pArray->reset(n, true);
}


EM_EXPORT void arrayOfArraysInitialize(Cj::Framework::Array<PickneyGenericArray> *pArrayArray,int n) {
	pArrayArray->reset(n, true);
}

EM_EXPORT void stringArrayInitialize(Cj::Framework::StringArray *pStringArray,int n, const char**pStrings) {
	pStringArray->reset(n, true);
	if(pStrings) {
		for(int i=0;i<n;i++) {
			pStringArray->at(i).set(pStrings[i], strlen(pStrings[i]));
		}
	}
}

EM_EXPORT void stringMapSet(Cj::Framework::StringMap *pStringMap, const char*key, const char*value) {
	pStringMap->set(key,value);
}

EM_EXPORT const char* stringMapGet(Cj::Framework::StringMap *pStringMap, const char*key) {
	const Cj::Framework::String*pStr = pStringMap->get(key);
	if(!pStr)
		return nullptr;
	return pStr->c_str();
}

EM_EXPORT void stringMapRemove(Cj::Framework::StringMap *pStringMap, const char*key) {
	pStringMap->remove(key);
}

EM_EXPORT void stringMapClear(Cj::Framework::StringMap *pStringMap) {
	pStringMap->clear();
}

EM_EXPORT void entityIDArrayInitialize(Cj::Framework::EntityIDArray *pEntityArray,int n) {
	pEntityArray->reset(n, true);
	pEntityArray->fill(Cj::Framework::kNullEntityID);
}

EM_EXPORT void entityIDArrayPush(Cj::Framework::EntityIDArray *pEntityArray, Cj::Framework::EntityID id)  {
	pEntityArray->push(id);
}

EM_EXPORT void entityIDMapSet(Cj::Framework::EntityIDMap *pEntityIDMap, const char*key, Cj::Framework::EntityID value) {
	pEntityIDMap->set(key,value);
}

EM_EXPORT Cj::Framework::EntityID entityIDMapGet(Cj::Framework::EntityIDMap *pEntityIDMap, const char*key) {
	const Cj::Framework::EntityID *pVal = pEntityIDMap->get(key);
	if(!pVal)
		return Cj::Framework::kNullEntityID;
	return *pVal;
}

EM_EXPORT void entityIDMapRemove(Cj::Framework::EntityIDMap *pEntityIDMap, const char*key) {
	pEntityIDMap->remove(key);
}

EM_EXPORT void entityIDMapClear(Cj::Framework::EntityIDMap *pEntityIDMap) {
	pEntityIDMap->clear();
}


EM_EXPORT void stringArrayPush(Cj::Framework::StringArray *pStringArray, const char*str) {
	pStringArray->push().set(str, strlen(str));
}

EM_EXPORT Cj::Framework::ComponentPtr getComponent( Cj::Framework::EntityID ent, Cj::Framework::ComponentID type) {
	return g_world->getComponent(ent, type);
}

EM_EXPORT Cj::Framework::HostComponentID getHostComponent( Cj::Framework::EntityID ent, Cj::Framework::ComponentID type) {
	return g_world->getHostComponent(ent, type);
}

EM_EXPORT void addComponent( Cj::Framework::EntityID ent, Cj::Framework::ComponentID type) {
	g_world->addComponent(ent, type);
}

EM_EXPORT void modifyComponent( Cj::Framework::EntityID ent, Cj::Framework::ComponentID type) {
	g_world->modifyComponent(ent, type);
}

EM_EXPORT PickneyArrayPointer getSingletonEntities() {
	const Cj::Framework::EntityID *data = g_world->singletonEntities().data();
	return (PickneyArrayPointer)	&g_world->singletonEntities();
}

EM_EXPORT Cj::Framework::EntityID createEntity() {
	auto ent = g_world->createEntity();
	getSingletonEntities();
	return ent;
}

EM_EXPORT PickneyArrayPointer getEntities() {
	return (PickneyArrayPointer)	&g_world->entities();
}
EM_EXPORT uint8_t *heapAlloc(size_t numBytes) {
	uint8_t *ptr = new uint8_t[numBytes];
	memset(ptr,0,numBytes);
	return ptr;
}

EM_EXPORT void heapFree(uint8_t *ptr) {
	delete [] ptr;
}

EM_EXPORT void step() {
	g_world->step();
}

EM_EXPORT Cj::Framework::SystemID addSystem(const char *conditionJson, PickneySystemCallback cb, int priority) {
	//g_world->entities();
	Cj::Framework::ConditionPtr pCond =  g_world->deserialize(conditionJson);
	
    return g_world->addSystem(
            [cb](const Cj::Framework::Globals& globals, const Cj::Framework::Array<Cj::Framework::EntityID>& entities) {
                cb(&globals, entities.data(), entities.size());
            },
            pCond,
			priority
        );
}