import PickneyFramework from './Emscripten/PickneyFramework.js';
import * as PickneyComponents from './PickneyComponentsWrapper.js';
import * as glm from 'gl-matrix';

// Use a timeout as Emscripten doesn't like wrapping a module in a promise
let canjeFrameworkMod = null;

// Load the WASM module
PickneyFramework().then((canjeFramework) => {
  // Convenience functions to allocate arrays and strings on WASM heap
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  function encodeString(str, buffer) {
    buffer.set(encoder.encode(str));
    buffer[str.length] = 0;
  }
  function heapFree(ptr) {
    return canjeFramework._heapFree(ptr);
  }

  function allocString(str) {
    const ptr = canjeFramework._heapAlloc(str.length + 1);
    const utf8Buffer =
      new Uint8Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + ptr, str.length + 1);
    encodeString(str, utf8Buffer);
    return ptr;
  }
  function allocBytes(n) {
    const pointer = canjeFramework._heapAlloc(n);
    const byteBuffer =
      new Uint8Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);

    return { pointer, byteBuffer };
  }

  function getFloats(pointer, n) {
    const floatBuffer =
      new Float32Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);
    return floatBuffer;
  }
  function getDoubles(pointer, n) {
    const floatBuffer =
      new Float64Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);
    return floatBuffer;
  }
  function getInts(pointer, n) {
    const intBuffer = new Uint32Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);
    return intBuffer;
  }
  function getBytes(pointer, n) {
    const intBuffer = new Uint8Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);
    return intBuffer;
  }
  function getString(pointer, n) {
    if(n==null) {
      const maxLen = 10000;
      for(n=0;n<maxLen;n++) {
        if(canjeFramework.HEAP8[pointer+n]==0)
          break;
      }

      if(n===maxLen)
        return null;

      n++; // Terminator
    }

    if(n===0)
      return "";
    const utf8Buffer = getBytes(pointer, n);
    return decoder.decode(utf8Buffer).slice(0, -1);
  }

  function allocFloats(n) {
    const pointer = canjeFramework._heapAlloc(n * 4);
    const floatBuffer =
      new Float32Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);
    return { pointer, floatBuffer };
  }
  function allocInts(n) {
    const pointer = canjeFramework._heapAlloc(n * 4);
    const intBuffer = new Uint32Array(canjeFramework.HEAP8.buffer, canjeFramework.HEAP8.byteOffset + pointer, n);
    return { pointer, intBuffer };
  }
  // Attach convenience functions to module
  canjeFramework.getInts = getInts;
  canjeFramework.getFloats = getFloats;
  canjeFramework.getDoubles = getDoubles;
  canjeFramework.getBytes = getBytes;
  canjeFramework.allocFloats = allocFloats;
  canjeFramework.allocInts = allocInts;
  canjeFramework.allocString = allocString;
  canjeFramework.allocBytes = allocBytes;
  canjeFramework.encodeString = encodeString;
  canjeFramework.getString = getString;
  canjeFramework.heapFree = heapFree;

  canjeFrameworkMod = canjeFramework;
});
export function loadPickneyFramework() {
  return new Promise((resolve, reject) => {
    const checkMod = () => {
      if (canjeFrameworkMod) { resolve(canjeFrameworkMod); } else { setTimeout(checkMod, 10); }
    };

    checkMod();
  });
}

class MappedArray {
  constructor(framework, stride, pointer) {
    this._framework = framework;
    this._stride = stride;
    if (pointer) {
      this._setPointer(pointer);
    }
  }

  mapIntBuffer() {
    const numInts = ~~(this.byteCapacity()/4);

    if(!this._intBuffer || this._intBuffer.byteOffset!=this.dataPointer() || this._intBuffer.length!=numInts)
      this._intBuffer = this._framework.getInts(this.dataPointer(), numInts);

    return this._intBuffer;
  }
  mapFloatBuffer() {
    const numFloats = ~~(this.byteCapacity()/4);

    if(!this._floatBuffer || this._floatBuffer.byteOffset!=this.dataPointer() || this._floatBuffer.length!=numFloats)
      this._floatBuffer = this._framework.getFloats(this.dataPointer(), numFloats);

    return this._floatBuffer;
  }
  
  setString(str) {
    const strPtr = this._framework.allocString(str);

    this._framework._setString(this._pointer, strPtr, str.length);

    this._framework.heapFree(strPtr);
  }
  _setPointer(pointer) {
    this._pointer = pointer;
    this._buffer = this._framework.getInts(pointer, 3);
  }

  stride() {
    return this._stride;
  }

  size() {
    return this._buffer[2];
  }

  _setSize(n) {
    console.assert(n<=this.capacity());
    return this._buffer[2]=n;
  }

  capacity() {
    return this._buffer[1];
  }

  byteCapacity() {
    return this.capacity()*this.stride();
  }

  thisPointer() {
    return this._pointer;
  }

  dataPointer() {
    return this._buffer[0];
  }

  framework() {
    return this._framework;
  }
  get(n) {
    if (n >= this.size()) { return null; }
    return this.dataPointer() + this._stride * n;
  }
}
class MappedString {
  constructor(framework, pointer) {
    this._array = new MappedArray(framework, 1, pointer);
  }

  set(str) {
    this._array.setString(str);
  }
  get() {
    const framework = this._array._framework;
    return framework.getString(this._array.dataPointer(), this._array.size());
  }

  length() {
    return this._array.size();
  }
}
class MappedArrayOfArrays {
  constructor(framework, pointer) {
    this._array = new MappedArray(framework, framework._getArraySize(), pointer);
  }

  initialize(n) {
    this._array.framework()._arrayOfArraysInitialize(this.thisPointer(), n);
  }
  thisPointer() {
    return this._array.thisPointer();
  }
  stride() {
    return this._array.stride();
  }
  wordStride() {
    return ~~(this._array.stride()/4);
  }
  setString(index, str) {
    const framework = this._array.framework();

    const strPtr = framework.allocString(str);
    const arrayPtr = this._array.dataPointer() + this.stride()*index;
    framework._setString(arrayPtr, strPtr, str.length);
    
    framework.heapFree(strPtr);
  }
  size() {
    return this._array.size();
  }
  capacity() {
    return this._array.capacity();
  }
  dataPointer() {
    return this._array.dataPointer();
  }
  arraySize(index) {
    const intBuffer = this._array.mapIntBuffer();
    return intBuffer[this.wordStride()*index + 2];
  }

  arrayCapacity(index) {
    const intBuffer = this._array.mapIntBuffer();
    return intBuffer[this.wordStride()*index + 1];
  }

  arrayDataPointer(index) {
    const intBuffer = this._array.mapIntBuffer();
    return intBuffer[this.wordStride()*index + 0];
  }

  framework() {
    return this._array.framework();
  }
  get(n) {
    if (n >= this.size()) { return null; }
    return this.dataPointer() + this._array.stride() * n;
  }
}

class MappedMatrix4Array {
  constructor(framework, pointer) {
    this._array = new MappedArray(framework, 64, pointer);
  }
  thisPointer() {
    return this._array.thisPointer();
  }

  initialize(n) {
    this._array.framework()._matrix4ArrayInitialize(this.thisPointer(), n);
  }

  set(index, val) {
    glm.mat4.copy(this.get(index), val);
  }

  get(index) {
    const floats = this._array.mapFloatBuffer();
    return new Float32Array(floats.buffer, floats.byteOffset + index*4*16, 16);
  }

  size() {
    return this._array.size();
  }
}


class MappedIntArray {
  constructor(framework, pointer) {
    this._array = new MappedArray(framework, 4, pointer);
  }
  thisPointer() {
    return this._array.thisPointer();
  }

  initialize(n) {
    this._array.framework()._intArrayInitialize(this.thisPointer(), n);
  }
  set(index, val) {
    return this._array.mapIntBuffer()[index] = val;
  }

  get(index) {
    return this._array.mapIntBuffer()[index];
  }
  size() {
    return this._array.size();
  }
}


class MappedFloatVectorArray {
  constructor(framework, pointer, numFloats, initFunc) {
    this._array = new MappedArray(framework, numFloats*4, pointer);
    this._numFloats = numFloats;
    this.initialize = initFunc;
  }
  thisPointer() {
    return this._array.thisPointer();
  }

  set(index, val) {
    this.get(index).set(val);
  }

  get(index) {
    const floats = this._array.mapFloatBuffer();
    return new Float32Array(floats.buffer, floats.byteOffset + index*this._numFloats*4, this._numFloats);
  }
  size() {
    return this._array.size();
  }
}

class MappedStringArray {
  constructor(framework, pointer) {
    this._array = new MappedArrayOfArrays(framework, pointer);
  }
  thisPointer() {
    return this._array.thisPointer();
  }

  initialize(n) {
    this._array.initialize(n);
  }

  set(index, str) {
    this._array.setString(index, str);
  }
  get(index) {
    const len = this._array.arraySize(index);
    if(!len)
      return "";
    const framework = this._array.framework();
    return framework.getString(this._array.arrayDataPointer(index), this._array.arraySize(index));
  }

  size() {
    return this._array.size();
  }
}

class MappedEntityIDArray {
  constructor(framework, pointer) {
    this._array = new MappedArray(framework, 4, pointer);
  }
  thisPointer() {
    return this._array.thisPointer();
  }

  initialize(n) {
    this._array.framework()._entityIDArrayInitialize(this.thisPointer(), n);
  }
  has(id) {    
    const intBuffer = this._array.mapIntBuffer();
    for(let i=0;i<this.size();i++) {
      if(intBuffer[i]==id)
        return false;
    }
    return true;
  }
  add(id) {
    if(!this.has(id))
      return false;
    this._array.framework()._entityIDArrayPush(this.thisPointer(), id);
    return true;
  }

  remove(id) {
    
    const intBuffer = this._array.mapIntBuffer();
    const size = this.size();
    for(let i=0;i<size;i++) {
      if(intBuffer[i]==id) {
        for(let j=i;j<size-1;j++) {
          intBuffer[j] = intBuffer[j+1];
        }
        this._array._setSize(size-1);
        return true;
      }
    }
    return false;
  }

  set(index, id) {
    const intBuffer = this._array.mapIntBuffer();
    intBuffer[index] = id;
  }
  get(index) {
    const intBuffer = this._array.mapIntBuffer();
    return intBuffer[index];
  }

  size() {
    return this._array.size();
  }
}

class MappedStringMap {
  constructor(framework, pointer) {
    this._valuesArray = new MappedStringArray(framework, pointer+0);
    this._keyArray = new MappedStringArray(framework, pointer+12);
    this._thisPointer = pointer;
    this._intBuffer = framework.getInts(pointer, 9);
    this._framework = framework;
  }

  clear() {
    this._framework._stringMapClear(this._thisPointer);
  }

  forEach(cb) {
    for(let i=0;i<this._keyArray.size();i++) {
      const key = this._keyArray.get(i);
      if(key.length) {
        const value = this._valuesArray.get(i);
        cb(key, value);
      }
    }
  }

  set(key, value) {

    const framework = this._framework;

    const keyPtr = framework.allocString(key);
    const valuePtr = framework.allocString(value);
    framework._stringMapSet(this._thisPointer, keyPtr, valuePtr);
    
    framework.heapFree(keyPtr);
    framework.heapFree(valuePtr);
  }
  get(key) {
    const keyPtr = this._framework.allocString(key);
    const valuePtr = this._framework._stringMapGet(this._thisPointer, keyPtr);
    if(!valuePtr)
      return null;
    const value = this._framework.getString(valuePtr);
    this._framework.heapFree(keyPtr);
    return value;
  }
  remove(key) {
    const keyPtr = this._framework.allocString(key);
    this._framework._stringMapRemove(this._thisPointer, keyPtr);
    this._framework.heapFree(keyPtr);
  }
  count() {
    return this._intBuffer[8];
  }

}

class MappedEntityIDMap {
  constructor(framework, pointer) {
    this._valuesArray = new MappedEntityIDArray(framework, pointer+0);
    this._keyArray = new MappedStringArray(framework, pointer+12);
    this._thisPointer = pointer;
    this._intBuffer = framework.getInts(pointer, 9);
    this._framework = framework;
  }

  clear() {
    this._framework._entityIDMapClear(this._thisPointer);
  }

  forEach(cb) {
    for(let i=0;i<this._keyArray.size();i++) {
      const key = this._keyArray.get(i);
      if(key.length) {
        const value = this._valuesArray.get(i);
        cb(key, value);
      }
    }
  }

  set(key, value) {

    const framework = this._framework;

    const keyPtr = framework.allocString(key);
    framework._entityIDMapSet(this._thisPointer, keyPtr, value);
    
    framework.heapFree(keyPtr);
  }
  get(key) {
    const keyPtr = this._framework.allocString(key);
    const value = this._framework._entityIDMapGet(this._thisPointer, keyPtr);
    this._framework.heapFree(keyPtr);
    return value;
  }
  remove(key) {
    const keyPtr = this._framework.allocString(key);
    this._framework._entityIDMapRemove(this._thisPointer, keyPtr);
    this._framework.heapFree(keyPtr);
  }
  count() {
    return this._intBuffer[8];
  }

}

class World {
  constructor(canjeFramework) {
    this._framework = canjeFramework;
    this._framework._initialize();
    this._nativeComponentCount = this._framework._nativeComponentCount();
    this._entityPointers = this.createArray(this._framework._getEntities(), 4);
    this._singletonEntityIDs = this.createArray(this._framework._getSingletonEntities(), 4);
    this._entities = [];
    this._hostComponents = [];
    this._hostComponentNames = [];
    this._singletonEntities = [];
    this._singletons ={};
    this.kArraySize = this._framework._getArraySize();
    this.kNullEntityID = 0xFFFFFFFF;
/*
    //TODO: Host singletons
    //this._nativeComponentNames = nativeComponentNames;
    
    for(let i=0;i<this._nativeComponentCount;i++) {
      const entity = this.getSingletonEntity(i);
      const name = this._nativeComponentNames[i];
      this._singletons[name] = entity.name;
    }
    */
  }

  singletons() {
    return this._singletons;
  }
  registerHostComponent(name, allocFunc, singleton) {
    const hostComponents = [];
    this._hostComponents.push(hostComponents);
    this._hostComponentNames.push(name);

    const allocator = () => {
      const idx = hostComponents.length;
      hostComponents.push(allocFunc());
      return idx;
    };
    const allocatorPtr = this._framework.addFunction(allocator, 'i');
    const destructor = (idx) => {
      this._hostComponents[idx] = null;
    };
    const destructorPtr = this._framework.addFunction(destructor, 'vi');
    const namePtr = this._framework.allocString(name);
    const compID = this._framework._registerHostComponent(allocatorPtr, destructorPtr, namePtr, singleton);
    this._framework.heapFree(namePtr);
    if (singleton) {
      const entity = this.getSingletonEntity(compID);
      this._addComponentJS(entity, compID);
      this._singletons[name] = entity.components[name];
    }
    return compID;
  }

  getHostComponentArray(type) {
    if (type < this._nativeComponentCount) { return null; }
    const idx = type - this._nativeComponentCount;
    return {
      array: this._hostComponents[idx],
      name: this._hostComponentNames[idx]
    };
  }

  getSingletonEntityID(comp) {
    const entIDPtr = this._singletonEntityIDs.get(comp);
    if (entIDPtr == null) {
      return this.kNullEntityID;
    }

    const entIDPtrOffset = ~~(entIDPtr / 4);
    const entID = this._framework.HEAP32[entIDPtrOffset];
    return entID;
  }

  getSingletonEntity(comp) {
    const id = this.getSingletonEntityID(comp);
    if (id === this.kNullEntityID) {
      return null;
    }

    const ent = this.getEntity(id);
    if (!this._singletonEntities[id]) {
      this._singletonEntities[id] = ent;
    }

    return ent;
  }

  getSingletonEntity(comp) {
    const id = this.getSingletonEntityID(comp);

    const ent = this.getEntity(id);
    if (!this._singletonEntities[id]) {
      this._singletonEntities[id] = ent;
    }

    return ent;
  }

  getEntity(id) {
    if (id === this.kNullEntityID) { return null; }

    if (!this._entities[id]) {
      const entPtrPtr = this._entityPointers.get(id);
      const entPtr = this._framework.HEAP32[entPtrPtr / 4];

      this._entities[id] = new Entity(this, entPtr);
    }

    return this._entities[id];
  }

  _addComponentJS(entity, type) {
    const entID = entity.id();
    if (type < this._nativeComponentCount) {
      return PickneyComponents.addComponent(entity, type);
    }
    const framework = this._framework;
    const hostCompIdx = framework._getHostComponent(entID, type);
    const { name, array } = this.getHostComponentArray(type);
    const hostComp = array[hostCompIdx];
    hostComp.modified = () => {
      framework._modifyComponent(entity.id(), type);
    };
    entity.components[name] = hostComp;
    return hostComp;
  }

  _createJSComponentsIfNeeded(ent) {
    for(let compId=0;compId< this._nativeComponentCount;compId++) {
      if(ent._componentLookup[compId]!=255) {
        let compName =PickneyComponents.Names[compId];
        if(!ent.components[compName]) {
          this._addComponentJS(ent, compId);          
        }
      }
    }
  }

  addComponent(entity, type) {
    this._framework._addComponent(entity.id(), type);
    return this._addComponentJS(entity, type);
  }

  hasComponent(entity, type) {
    return entity._componentLookup[type] !== 0xff;
  }

  createEntity(components) {
    const entId = this._framework._createEntity();
    const entity = this.getEntity(entId);

    for (let i = 0; i < components.length; i++) {
      this.addComponent(entity, components[i]);
    }
    return entity;
  }

  framework() {
    return this._framework;
  }

  createIntArray(pointer) {
    return new MappedIntArray(this._framework, pointer);
  }

  createMatrix4Array(pointer) {
    return new MappedMatrix4Array(this._framework, pointer);
  }

  createFloat3Array(pointer) {
    return new MappedFloatVectorArray(this._framework, pointer, 3, 
      (n)=>{ this._framework._float3ArrayInitialize(pointer, n); },
    );;
    
  }
  
  createQuatArray(pointer) {
    return new MappedFloatVectorArray(this._framework, pointer, 4, 
      (n)=>{ this._framework._quatArrayInitialize(pointer, n); },
    );; 
  }
  
  createStringArray(pointer) {
    return new MappedStringArray(this._framework, pointer);
  }
  createEntityIDArray(pointer) {
    return new MappedEntityIDArray(this._framework, pointer);
  }
  createEntityIDMap(pointer) {
    return new MappedEntityIDMap(this._framework, pointer);
  }
  createArrayOfArrays(pointer) {
    return new MappedArrayOfArrays(this._framework, pointer);
  }

  createArray(pointer, stride) {
    return new MappedArray(this._framework, stride, pointer);
  }
  createString(pointer) {
    return new MappedString(this._framework, pointer);
  }

  addSystem(condition, cb, priority) {
    const self = this;
    const func = (globalsPtr, entityIDPtr, entityIDCount) => {
      const entIDs = this._framework.getInts(entityIDPtr, entityIDCount);
      const globalsDblBuffer = this._framework.getDoubles(globalsPtr,1);
      const globalsFltBuffer = this._framework.getFloats(globalsPtr,3);
      const time = globalsDblBuffer[0];
      const delta =globalsFltBuffer[2];
      const globals = { time, delta};
      for (let i = 0; i < entityIDCount; i++) {
        const entID = entIDs[i];
        const ent = self.getEntity(entID);        
        this._createJSComponentsIfNeeded(ent);
        cb(ent, globals);
      }
    };
    const funcPtr = this._framework.addFunction(func, 'viii');
    const serializedCond = JSON.stringify(condition);
    const serializedCondStr = this._framework.allocString(serializedCond);
    return this._framework._addSystem(serializedCondStr, funcPtr, priority || 0);
  }

  step() {
    this._framework._step();
  }
}

class Entity {
  constructor(world, pointer) {
    this._world = world;
    this._pointer = pointer;
    this._header = this._world.framework().getInts(pointer, 2);
    this._componentPointers = this._world.createArray(pointer + 8, 4 * 2);
    this._componentLookup = this._world.framework().getBytes(pointer + 20, 128);
    this.components = {};
  }
  name() {
    if(!this.components.entityName)
      return null;
    return this.components.entityName.name();
  }
  traverse(cb) {
    if(!this.components.hierarchyTree)
      return;

    if(!cb(this)) return;

    for(let i=0;i<this.components.hierarchyTree.getChildrenCount();i++) {
      const childEnt = this.components.hierarchyTree.getChildren(i);
      childEnt.traverse(cb);
    }
  }
  id() {
    return this._header[0];
  }

  getComponentPointer(type) {
    if (type >= this._componentLookup.length || this._componentLookup[type] === 0xff) {
      return null;
    }
    return this._componentPointers.get();
  }

  modifyComponent(type) {
    this.world().framework()._modifyComponent(this.id(), type);
  }

  addComponent(type) {
    this._world.addComponent(this, type);
  }

  ensureComponent(type) {
    if(!this._world.hasComponent(this, type))
      this._world.addComponent(this, type);
  }

  world() {
    return this._world;
  }
}
export async function create() {
  const canjeFramework = await loadPickneyFramework();
  // Create render wrapper object
  return new World(canjeFramework);
}
