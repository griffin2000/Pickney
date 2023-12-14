const fs = require('fs')
const process = require('process')

const cFilename = process.argv[2] || "../src/PickneyComponents";
const jsFilename = process.argv[3] || "../TestPage/src/PickneyComponentsWrapper";
const componentJsonFile = process.argv[4] || "DefaultComponents.json";
console.log(process.argv)
console.log("Generating from JSON defs:"+componentJsonFile)
console.log("Generating to C files:"+cFilename)
console.log("Generating to JS files:"+jsFilename)

const jsonData =  fs.readFileSync(componentJsonFile, 'utf8');
const jsonParsed = JSON.parse(jsonData);

const componentNames = Object.keys(jsonParsed);
const componentDefs = [];
const components = {};

function toClassName(name) {
    return name.charAt(0).toUpperCase() + name.slice(1);
}
function toEnumName(name) {
    return "k"+toClassName(name);
}

for(let i=0;i<componentNames.length;i++) {
    const componentName = componentNames[i];
    const component = jsonParsed[componentName];
    component.name = componentName;
    component.className = toClassName(componentName);
    component.enumName = toEnumName(componentName);
    component.index = i;
    components[componentName] = component;
    console.log(component);
    componentDefs.push(component);
}


function codeGenJSVectorCTor(prop) {
    return `this._${prop.name} = framework.getFloats(pointer + ${prop.offset}, ${prop.typeInfo.size/4});\n`
}
function codeGenJSVectorAccessors(prop) {
        return `
    ${prop.name} () {
        return this._${prop.name};
    }
    set${prop.className} (val) {
        this._entity.modifyComponent(Types.${prop.component.className});
        glm.${prop.typeInfo.cType}.copy(this._${prop.name}, val);
    }            
`;

}
function codeGenJSIntPropertiesCtor(prop, state) {
    if(state.hasIntProperties)
        return "";
    state.hasIntProperties=true;
    console.log(prop.component.size)
    return `this._intProperties = framework.getInts(pointer, ${~~(prop.component.size/4)});\n`
}

function codeGenJSFloatPropertiesCtor(prop, state) {
    if(state.hasFloatProperties)
        return "";
    state.hasFloatProperties=true;
    return `this._floatProperties = framework.getFloats(pointer, ${~~(prop.component.size/4)});\n`
}
function codeGenJSScalarPropertiesAccessor(prop, state, propName) {
    const strideOffset = state.strideOffset || 0;
    const scalarOffset = ~~(prop.offset/4) + strideOffset;
    return `
    ${prop.name} () {
        return this._${propName || prop.type}Properties[${scalarOffset}];
    }
    set${prop.className} (val) {
        this._entity.modifyComponent(Types.${prop.component.className});
        this._${propName || prop.type}Properties[${scalarOffset}] = val;
    }
    
`;
}
function codeGenJSStringCtor(prop, state) {
    return `this._${prop.name} = entity.world().createString(pointer + ${prop.offset});\n`
}

function codeGenJSStringAccessor(prop, state) {
    return `
    set${prop.className}(uri) {
        this._entity.modifyComponent(Types.${prop.component.className});
        this._${prop.name}.set(uri);
    }
    ${prop.name}() {
        return this._${prop.name}.get();
    }
    
    `;
}
const kArraySize = 12;
const kMapSize = kArraySize*2 + 12;


function codeGenJSArrayAccessor(prop, state) {
    return `
    set${prop.className}(index, val) {
        this._entity.modifyComponent(Types.${prop.component.className});
        this._${prop.name}Array.set(index, val);
    }
    get${prop.className}(index) {
        return this._${prop.name}Array.get(index);
    }
    set${prop.className}Count(n) {
        this._entity.modifyComponent(Types.${prop.component.className});
        this._${prop.name}Array.initialize(n);
    }
    get${prop.className}Count() {        
        return this._${prop.name}Array.size();
    }
    
    `;
}
function codeGenJSMapAccessor(prop, state) {
    return `
    set${prop.className}(key, val) {
        this._entity.modifyComponent(Types.${prop.component.className});
        this._${prop.name}Map.set(key, val);
    }
    get${prop.className}(key) {
        return this._${prop.name}Map.get(key);
    }
    get${prop.className}Count() {        
        return this._${prop.name}Map.count();
    }
    clear${prop.className}() {        
        this._entity.modifyComponent(Types.${prop.component.className});
        return this._${prop.name}Map.clear();
    }
    ${prop.name}ForEach(cb) {        
        return this._${prop.name}Map.forEach(cb);
    }
    
    `;
}

const types = {
    "float": {
        cType: "float",
        size: 4,
        codeGenJSCtor: codeGenJSFloatPropertiesCtor,
        codeGenJSAccessors:codeGenJSScalarPropertiesAccessor,
    },
    "int": {
        cType: "int",
        size: 4,
        codeGenJSCtor: codeGenJSIntPropertiesCtor,
        codeGenJSAccessors:codeGenJSScalarPropertiesAccessor,
    },
    "bool": {
        cType: "Bool",
        size: 4,
        codeGenJSCtor: codeGenJSIntPropertiesCtor,
        codeGenJSAccessors:(prop,state)=>codeGenJSScalarPropertiesAccessor(prop,state,"int"),
    },
    "entityId": {
        cType: "EntityID",
        size: 4,
        default: "kNullEntityID",
        codeGenJSCtor: codeGenJSIntPropertiesCtor,
        codeGenJSAccessors:(prop,state)=>{
            const strideOffset = state.strideOffset || 0;
            const scalarOffset = ~~(prop.offset/4) + strideOffset;
            return `
    ${prop.name}Id () {
        return this._intProperties[${scalarOffset}];
    }
    set${prop.className}Id (val) {
        this._entity.modifyComponent(Types.${prop.component.className});
        this._intProperties[${scalarOffset}] = val;
    }
    ${prop.name} () {
        return this._entity.world().getEntity(this.${prop.name}Id());
    }
    
    `;
        }
    },
    "uri": {
        cType: "Uri",
        size: kArraySize,
        codeGenJSCtor: codeGenJSStringCtor,
        codeGenJSAccessors:codeGenJSStringAccessor,
    },
    "name": {
        cType: "Name",
        size: kArraySize,
        codeGenJSCtor: codeGenJSStringCtor,
        codeGenJSAccessors:codeGenJSStringAccessor,
    },
    "string": {
        cType: "String",
        size: kArraySize,
        codeGenJSCtor: codeGenJSStringCtor,
        codeGenJSAccessors:codeGenJSStringAccessor,
    },
    "float2": {
        cType: "vec3",
        size: 8,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
    "float3": {
        cType: "vec3",
        size: 12,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
    "float4": {
        cType: "vec4",
        size: 16,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
    "quaternion": {
        cType: "quat",
        size: 16,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
    "matrix2": {
        cType: "mat2",
        size: 16,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
    "matrix3": {
        cType: "mat3",
        size: 36,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
    "matrix4": {
        cType: "mat4",
        size: 64,
        codeGenJSCtor: codeGenJSVectorCTor,
        codeGenJSAccessors:codeGenJSVectorAccessors,
    },
     
};


const containerTypeCreators = {
    array: {
        string:{
            cType: `StringArray`,
            size: kArraySize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Array = entity.world().createStringArray(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: codeGenJSArrayAccessor,    
        },
        matrix4:{
            cType: `Matrix4Array`,
            size: kArraySize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Array = entity.world().createMatrix4Array(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: codeGenJSArrayAccessor,    
        },
        float3:{
            cType: `Float3Array`,
            size: kArraySize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Array = entity.world().createFloat3Array(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: codeGenJSArrayAccessor,    
        },
        quat:{
            cType: `QuatArray`,
            size: kArraySize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Array = entity.world().createQuatArray(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: codeGenJSArrayAccessor,    
        },

        int:{
            cType: `IntArray`,
            size: kArraySize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Array = entity.world().createIntArray(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: (prop, state)  =>{
                return `
                get${prop.className}(index) {
                    return this._${prop.name}Array.get(index);
                }
                set${prop.className}(index, val) {
                    this._entity.modifyComponent(Types.${prop.component.className});
                    this._${prop.name}Array.set(index, val);
                }
                set${prop.className}Count(n) {
                    this._entity.modifyComponent(Types.${prop.component.className});
                    this._${prop.name}Array.initialize(n);
                }
                get${prop.className}Count() {        
                    return this._${prop.name}Array.size();
                }
                
                `;
            },    
        },

        entityId:{
            cType: `EntityIDArray`,
            size: kArraySize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Array = entity.world().createEntityIDArray(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: (prop, state)  =>{
                return `
                set${prop.className}Id(index, val) {
                    this._entity.modifyComponent(Types.${prop.component.className});
                    this._${prop.name}Array.set(index, val);
                }
                get${prop.className}Id(index) {
                    return this._${prop.name}Array.get(index);
                }
                get${prop.className}(index) {
                    return this._entity.world().getEntity(this.get${prop.className}Id(index));
                }
                set${prop.className}Count(n) {
                    this._entity.modifyComponent(Types.${prop.component.className});
                    this._${prop.name}Array.initialize(n);
                }
                get${prop.className}Count() {        
                    return this._${prop.name}Array.size();
                }
                add${prop.className}(id) {        
                    this._entity.modifyComponent(Types.${prop.component.className});
                    return this._${prop.name}Array.add(id);
                }
                remove${prop.className}(id) {      
                    this._entity.modifyComponent(Types.${prop.component.className});  
                    return this._${prop.name}Array.remove(id);
                }
                has${prop.className}(id) {        
                    return this._${prop.name}Array.has(id);
                }
                
                `;
            },    
        }
    },
    map: {
        string:{
            cType: `StringMap`,
            size: kMapSize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Map = entity.world().createStringMap(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: codeGenJSMapAccessor,    
        },
        entityId:{
            cType: `EntityIDMap`,
            size: kMapSize,
            codeGenJSCtor: (prop) => {
                return `this._${prop.name}Map = entity.world().createEntityIDMap(pointer +${prop.offset});\n`
            },
            codeGenJSAccessors: (prop, state)  =>{
                return `
                set${prop.className}Id(key, val) {
                    this._entity.modifyComponent(Types.${prop.component.className});
                    this._${prop.name}Map.set(key, val);
                }
                get${prop.className}Id(key) {
                    return this._${prop.name}Map.get(key);
                }
                get${prop.className}(key) {
                    return this._entity.world().getEntity(this.get${prop.className}Id(key));
                }
                get${prop.className}Count() {        
                    return this._${prop.name}Map.size();
                }
                clear${prop.className}() {        
                    return this._${prop.name}Map.clear();
                }
                ${prop.name}ForEach(cb) {        
                    return this._${prop.name}Map.forEach((key,id)=>{
                        const ent = this._entity.world().getEntity(id);
                        cb(key,ent);
                    });
                }
                
                `;
            },    
        }

    }
};



function getType(prop) {
    console.log(prop);
    if(prop.type.container) {
        
        const containerTypes= containerTypeCreators[prop.type.container];
        if(!containerTypes)
            console.error("Unknown container type:"+prop.type.container)
        const containerType = containerTypes[prop.type.elementType];
        if(!containerType)
            console.error("Unknown element type:"+prop.type.elementType+" in container "+prop.type.container)
        return containerType;
    }
    
    return types[prop.type];
}

function generateCStruct(component) {
    let structStr = `\n            struct ${component.className} : public ComponentBase {\n`;
    for(let i=0;i<component.properties.length;i++) {
        const prop = component.properties[i];
        const type = getType(prop);
        structStr+=`                ${type.cType} ${prop.name}`;
        const defaultVal = prop.default ? prop.default : (type.default ? type.default : null);
        if(defaultVal)
            structStr+=" = "+defaultVal;
        structStr+= ";\n"    
    }
    structStr+=`
                static ${component.className}* allocate() {
                    return new ${component.className}();
                }
                static void destroy(${component.className}* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::${component.enumName};
                }
            };`;
    return structStr;
}

function generateCHeader(componentDefs) {


    let cCode = `
#pragma once

#include "PickneyTypes.h"

namespace Cj {
    namespace Framework {
        namespace Components {
            extern  const vector<ComponentDescription> descriptions;
			ComponentPtr allocate(ComponentID type);


`;
    let componentTypeStr = "";
    for(let i=0;i<componentDefs.length;i++) {
        componentTypeStr += "\t\t"+componentDefs[i].enumName+" = "+componentDefs[i].index+",\n";
    }

    cCode+= `
            enum Type :ComponentID {
${componentTypeStr}
                kNumNativeComponents = ${componentDefs.length},
                kInvalid = -1
            };


    `
    for(let i=0;i<componentDefs.length;i++) {
        cCode += generateCStruct(componentDefs[i]);
    }
    cCode += `
        }
    }
}
    `;
    return cCode;
}


function generateCSource(componentDefs) {


    let cCode = `
#include "PickneyComponents.h"

namespace Cj
{
    namespace Framework
    {
        namespace Components {
    
            ComponentPtr allocate(ComponentID type) {
                switch(type) {


`;
    for(let i=0;i<componentDefs.length;i++) {
        const component = componentDefs[i];
        cCode += `
                    case Type::${component.enumName}:
                        return ${component.className}::allocate();
        `
    }
    cCode += `
                    default:
                        assert(0);
                        return nullptr;
                }
            }
			const vector<ComponentDescription> descriptions = {

`;
    for(let i=0;i<componentDefs.length;i++) {
        const component = componentDefs[i];
        cCode += `                {"${component.name}", ${component.isSingleton?"true":"false"}}`
        if(i<componentDefs.length-1) 
            cCode+=',';
        cCode+="\n";
    }


    cCode += `
            };
        }
    }
}
    `;
    return cCode;
}

function generateJSSource(componentDefs) {


    let jsCode = `
import * as glm from 'gl-matrix';

export const Types = {
`;

    for(let i=0;i<componentDefs.length;i++) {
        const component = componentDefs[i];
        jsCode += `\t${component.className}:${component.index}`
        if(i<componentDefs.length-1) 
            jsCode+=',';
        jsCode+="\n";
    }


    jsCode += `
};


export const Names = [
`;
    for(let i=0;i<componentDefs.length;i++) {
        const component = componentDefs[i];
        jsCode += `\t"${component.name}"`
        if(i<componentDefs.length-1) 
            jsCode+=',';
        jsCode+="\n";
    }

    jsCode += `
];

export function addComponent(entity, type) {
    const framework = entity.world().framework();
    const compPtr = framework._getComponent(entity.id(), type);
    if (!compPtr) { return null; }
  
    let comp;
`
    for(let i=0;i<componentDefs.length;i++) {
        const component = componentDefs[i];
        jsCode += `
    ${i==0?"":"else"} if (type === Types.${component.className}) {
        comp = new ${component.className}(entity, compPtr);
    }`;
    }
    jsCode += `
    const name = Names[type];
    entity.components[name] = comp;
    // eslint-disable-next-line indent
    return comp;
}
  
`;
    for(let i=0;i<componentDefs.length;i++) {
        const component = componentDefs[i];
        component.size = 0;
        let state = {
            offset:0
        };
        for(let j=0;j<component.properties.length;j++) {
            const prop = component.properties[j];
            const type = getType(prop);
            prop.className = toClassName(prop.name);
            prop.component = component;
            prop.typeInfo = type;
            component.size += type.size;
            prop.offset = state.offset;
            state.offset += type.size;
            prop.index = j;
        }

        
        jsCode += `
export class ${component.className} {
    constructor (entity, pointer) {
        this._entity = entity;
        const framework = entity.world().framework();                    
`;
        state = {
            offset:0
        };
        for(let j=0;j<component.properties.length;j++) {
            const prop = component.properties[j];
            const type = prop.typeInfo;
            if(type.codeGenJSCtor)
                jsCode+="        "+type.codeGenJSCtor(prop, state);
        }
        jsCode += `
    }

`;
        state = {
            offset:0
        };
        for(let j=0;j<component.properties.length;j++) {
            const prop = component.properties[j];
            const type = prop.typeInfo;
            if(type.codeGenJSAccessors)
                jsCode+="        "+type.codeGenJSAccessors(prop, state);
            state.offset += type.size;
        }
        jsCode += `
} // End of class ${component.className}
        `;
    
    }


    return jsCode;
}


fs.writeFileSync(cFilename+".h", generateCHeader(componentDefs), 'utf8');
fs.writeFileSync(cFilename+".cpp", generateCSource(componentDefs), 'utf8');
fs.writeFileSync(jsFilename+".js", generateJSSource(componentDefs), 'utf8');
