
import * as glm from 'gl-matrix';

export const Types = {
	Unused:0,
	Transform:1,
	Hierarchy:2,
	Model:3,
	Box:4,
	Mesh:5,
	Skeleton:6,
	EntityName:7,
	HierarchyTree:8

};


export const Names = [
	"unused",
	"transform",
	"hierarchy",
	"model",
	"box",
	"mesh",
	"skeleton",
	"entityName",
	"hierarchyTree"

];

export function addComponent(entity, type) {
    const framework = entity.world().framework();
    const compPtr = framework._getComponent(entity.id(), type);
    if (!compPtr) { return null; }
  
    let comp;

     if (type === Types.Unused) {
        comp = new Unused(entity, compPtr);
    }
    else if (type === Types.Transform) {
        comp = new Transform(entity, compPtr);
    }
    else if (type === Types.Hierarchy) {
        comp = new Hierarchy(entity, compPtr);
    }
    else if (type === Types.Model) {
        comp = new Model(entity, compPtr);
    }
    else if (type === Types.Box) {
        comp = new Box(entity, compPtr);
    }
    else if (type === Types.Mesh) {
        comp = new Mesh(entity, compPtr);
    }
    else if (type === Types.Skeleton) {
        comp = new Skeleton(entity, compPtr);
    }
    else if (type === Types.EntityName) {
        comp = new EntityName(entity, compPtr);
    }
    else if (type === Types.HierarchyTree) {
        comp = new HierarchyTree(entity, compPtr);
    }
    const name = Names[type];
    entity.components[name] = comp;
    // eslint-disable-next-line indent
    return comp;
}
  

export class Unused {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    

    }


} // End of class Unused
        
export class Transform {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._translation = framework.getFloats(pointer + 0, 3);
        this._rotation = framework.getFloats(pointer + 12, 4);
        this._scale = framework.getFloats(pointer + 28, 3);

    }

        
    translation () {
        return this._translation;
    }
    setTranslation (val) {
        this._entity.modifyComponent(Types.Transform);
        glm.vec3.copy(this._translation, val);
    }            
        
    rotation () {
        return this._rotation;
    }
    setRotation (val) {
        this._entity.modifyComponent(Types.Transform);
        glm.quat.copy(this._rotation, val);
    }            
        
    scale () {
        return this._scale;
    }
    setScale (val) {
        this._entity.modifyComponent(Types.Transform);
        glm.vec3.copy(this._scale, val);
    }            

} // End of class Transform
        
export class Hierarchy {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._intProperties = framework.getInts(pointer, 2);
        
    }

        
    parentId () {
        return this._intProperties[0];
    }
    setParentId (val) {
        this._entity.modifyComponent(Types.Hierarchy);
        this._intProperties[0] = val;
    }
    parent () {
        return this._entity.world().getEntity(this.parentId());
    }
    
            
    isJoint () {
        return this._intProperties[1];
    }
    setIsJoint (val) {
        this._entity.modifyComponent(Types.Hierarchy);
        this._intProperties[1] = val;
    }
    

} // End of class Hierarchy
        
export class Model {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._uri = entity.world().createString(pointer + 0);

    }

        
    setUri(uri) {
        this._entity.modifyComponent(Types.Model);
        this._uri.set(uri);
    }
    uri() {
        return this._uri.get();
    }
    
    
} // End of class Model
        
export class Box {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._size = framework.getFloats(pointer + 0, 3);
        this._color = framework.getFloats(pointer + 12, 3);

    }

        
    size () {
        return this._size;
    }
    setSize (val) {
        this._entity.modifyComponent(Types.Box);
        glm.vec3.copy(this._size, val);
    }            
        
    color () {
        return this._color;
    }
    setColor (val) {
        this._entity.modifyComponent(Types.Box);
        glm.vec3.copy(this._color, val);
    }            

} // End of class Box
        
export class Mesh {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._geometryUri = entity.world().createString(pointer + 0);
        this._materialUri = entity.world().createString(pointer + 12);
        this._intProperties = framework.getInts(pointer, 23);
        this._bindMatrix = framework.getFloats(pointer + 28, 16);

    }

        
    setGeometryUri(uri) {
        this._entity.modifyComponent(Types.Mesh);
        this._geometryUri.set(uri);
    }
    geometryUri() {
        return this._geometryUri.get();
    }
    
            
    setMaterialUri(uri) {
        this._entity.modifyComponent(Types.Mesh);
        this._materialUri.set(uri);
    }
    materialUri() {
        return this._materialUri.get();
    }
    
            
    skeletonId () {
        return this._intProperties[6];
    }
    setSkeletonId (val) {
        this._entity.modifyComponent(Types.Mesh);
        this._intProperties[6] = val;
    }
    skeleton () {
        return this._entity.world().getEntity(this.skeletonId());
    }
    
            
    bindMatrix () {
        return this._bindMatrix;
    }
    setBindMatrix (val) {
        this._entity.modifyComponent(Types.Mesh);
        glm.mat4.copy(this._bindMatrix, val);
    }            

} // End of class Mesh
        
export class Skeleton {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._skinUri = entity.world().createString(pointer + 0);
        this._jointEntitiesArray = entity.world().createEntityIDArray(pointer +12);
        this._jointNamesArray = entity.world().createStringArray(pointer +24);
        this._inverseBindMatricesArray = entity.world().createMatrix4Array(pointer +36);

    }

        
    setSkinUri(uri) {
        this._entity.modifyComponent(Types.Skeleton);
        this._skinUri.set(uri);
    }
    skinUri() {
        return this._skinUri.get();
    }
    
            
                setJointEntitiesId(index, val) {
                    this._entity.modifyComponent(Types.Skeleton);
                    this._jointEntitiesArray.set(index, val);
                }
                getJointEntitiesId(index) {
                    return this._jointEntitiesArray.get(index);
                }
                getJointEntities(index) {
                    return this._entity.world().getEntity(this.getJointEntitiesId(index));
                }
                setJointEntitiesCount(n) {
                    this._entity.modifyComponent(Types.Skeleton);
                    this._jointEntitiesArray.initialize(n);
                }
                getJointEntitiesCount() {        
                    return this._jointEntitiesArray.size();
                }
                addJointEntities(id) {        
                    this._entity.modifyComponent(Types.Skeleton);
                    return this._jointEntitiesArray.add(id);
                }
                removeJointEntities(id) {      
                    this._entity.modifyComponent(Types.Skeleton);  
                    return this._jointEntitiesArray.remove(id);
                }
                hasJointEntities(id) {        
                    return this._jointEntitiesArray.has(id);
                }
                
                        
    setJointNames(index, val) {
        this._entity.modifyComponent(Types.Skeleton);
        this._jointNamesArray.set(index, val);
    }
    getJointNames(index) {
        return this._jointNamesArray.get(index);
    }
    setJointNamesCount(n) {
        this._entity.modifyComponent(Types.Skeleton);
        this._jointNamesArray.initialize(n);
    }
    getJointNamesCount() {        
        return this._jointNamesArray.size();
    }
    
            
    setInverseBindMatrices(index, val) {
        this._entity.modifyComponent(Types.Skeleton);
        this._inverseBindMatricesArray.set(index, val);
    }
    getInverseBindMatrices(index) {
        return this._inverseBindMatricesArray.get(index);
    }
    setInverseBindMatricesCount(n) {
        this._entity.modifyComponent(Types.Skeleton);
        this._inverseBindMatricesArray.initialize(n);
    }
    getInverseBindMatricesCount() {        
        return this._inverseBindMatricesArray.size();
    }
    
    
} // End of class Skeleton
        
export class EntityName {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._name = entity.world().createString(pointer + 0);

    }

        
    setName(uri) {
        this._entity.modifyComponent(Types.EntityName);
        this._name.set(uri);
    }
    name() {
        return this._name.get();
    }
    
    
} // End of class EntityName
        
export class HierarchyTree {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
        this._intProperties = framework.getInts(pointer, 4);
        this._childrenArray = entity.world().createEntityIDArray(pointer +4);

    }

        
    parentId () {
        return this._intProperties[0];
    }
    setParentId (val) {
        this._entity.modifyComponent(Types.HierarchyTree);
        this._intProperties[0] = val;
    }
    parent () {
        return this._entity.world().getEntity(this.parentId());
    }
    
            
                setChildrenId(index, val) {
                    this._entity.modifyComponent(Types.HierarchyTree);
                    this._childrenArray.set(index, val);
                }
                getChildrenId(index) {
                    return this._childrenArray.get(index);
                }
                getChildren(index) {
                    return this._entity.world().getEntity(this.getChildrenId(index));
                }
                setChildrenCount(n) {
                    this._entity.modifyComponent(Types.HierarchyTree);
                    this._childrenArray.initialize(n);
                }
                getChildrenCount() {        
                    return this._childrenArray.size();
                }
                addChildren(id) {        
                    this._entity.modifyComponent(Types.HierarchyTree);
                    return this._childrenArray.add(id);
                }
                removeChildren(id) {      
                    this._entity.modifyComponent(Types.HierarchyTree);  
                    return this._childrenArray.remove(id);
                }
                hasChildren(id) {        
                    return this._childrenArray.has(id);
                }
                
                
} // End of class HierarchyTree
        