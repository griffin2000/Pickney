
import * as PickneyFramework from './PickneyFrameworkWrapper';

import * as PickneyComponents from './PickneyComponentsWrapper.js';

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as glm from 'gl-matrix';

export class ThreeResourceLoader {
  constructor () {
    this._gltfLoader = new GLTFLoader();
    this._completedCommands = [];
    this._resources = new Map();
    const self = this;
    this._resourceLoaders = {
      geometry: (url,onLoad) => {
        const index = ~~url.searchParams.get('index');
        const modelUrl = url.searchParams.get('model');
        self.loadGLTF(modelUrl,(data)=>{
          onLoad(data.geometry[index]);
        });    
      },
      material: (url, onLoad) => {
        const index = ~~url.searchParams.get('index');
        const modelUrl = url.searchParams.get('model');
        self.loadGLTF(modelUrl,(data)=>{
          onLoad(data.materials[index]);
        });    
      },
    };
  }

  expandModel(world, uri, onLoad, parentId, namePrefix, root, preproccessNode) {
    namePrefix = namePrefix || "";
    this.loadGLTF(uri, (model)=>{
        const result = {
            nodeEntityLookup :{},
            nodeEntities: [],
            skeletonEntities: [],
            worldMatrices:[],
            localMatrices:[],
            indexLookup:{},
            model:{
              meshes: [],
              skeletons: [],
              nodes: [],
              nodeLookup: model.nodeLookup
            }
        };

        const modelNodeEntities = [];

        const rootNode = root ? model.nodeLookup[root] : model.root;

        let ni = 0;
        const skeletonsSet = new Set();
        rootNode.traverse((node)=>{
              if(preproccessNode)
              {
                preproccessNode(node);                
              }
              const nodeName = node.name || "";

            const ent = world.createEntity([
                PickneyComponents.Types.Transform, 
                PickneyComponents.Types.Hierarchy, 
                PickneyComponents.Types.EntityName
            ]);

            if(nodeName.length)
              result.indexLookup[nodeName] = ni;

            result.model.nodes.push(node);
            if(node.geometry) {
              result.model.meshes.push(node);
            }
            if(node.skeleton && !skeletonsSet.has(node.skeleton)) {
              skeletonsSet.add(node.skeleton);
              result.model.skeletons.push(node.skeleton);
            }
            modelNodeEntities[node.userData.nodeIndex] = ent;
            result.nodeEntities.push(ent);

            if(result.nodeEntityLookup[nodeName]) {            
              if(!Array.isArray(result.nodeEntityLookup[nodeName]))
                result.nodeEntityLookup[nodeName] = [result.nodeEntityLookup[nodeName]];
              result.nodeEntityLookup[nodeName].push(ent);
            }
            else result.nodeEntityLookup[nodeName] = ent;
  
            ent.components.hierarchy.setIsJoint(node.type=="Bone");

            ent.components.entityName.setName(namePrefix+"nodeIndex="+ni+":"+node.name);
            ent.components.transform.setTranslation([
                node.position.x, 
                node.position.y, 
                node.position.z 
            ]);
            ent.components.transform.setScale([
                node.scale.x, 
                node.scale.y, 
                node.scale.z 
            ]);
            ent.components.transform.setRotation([
                node.quaternion.x, 
                node.quaternion.y, 
                node.quaternion.z,  
                node.quaternion.w 
            ]);

            ni++;
        });

        for(let i=0;i<result.model.skeletons.length;i++) {
            const skeleton = result.model.skeletons[i];
            const ent = world.createEntity([
                PickneyComponents.Types.Skeleton,
            ]);
            result.skeletonEntities.push(ent);

            const numBones = skeleton.bones.length;
            ent.components.skeleton.setJointNamesCount(numBones);
            ent.components.skeleton.setJointEntitiesCount(numBones);
            ent.components.skeleton.setInverseBindMatricesCount(numBones);

            for(let i=0;i<numBones;i++) {
                const boneEntId = skeleton.bones[i].userData.nodeIndex;
                const boneEnt = modelNodeEntities[boneEntId];

                ent.components.skeleton.setJointNames(i, skeleton.bones[i].name);
                ent.components.skeleton.setJointEntitiesId(i, boneEnt.id());
                
                ent.components.skeleton.setInverseBindMatrices(i, skeleton.boneInverses[i].elements);
              }
        }

        for(let i=0;i<result.model.meshes.length;i++) {
            const mesh = result.model.meshes[i];
            const ent = modelNodeEntities[mesh.userData.nodeIndex];

            ent.addComponent(PickneyComponents.Types.Mesh);
            ent.components.mesh.setGeometryUri(`geometry://reference/?model=${uri}&index=${mesh.userData.meshGeometryIndex}`);
            ent.components.mesh.setMaterialUri(`material://reference/?model=${uri}&index=${mesh.userData.meshMaterialIndex}`);
            if(mesh.skeleton) {
                const skeletonEntIndex = mesh.userData.meshSkeletonIndex;
                ent.components.mesh.setSkeletonId(result.skeletonEntities[skeletonEntIndex].id());
                ent.components.mesh.setBindMatrix(mesh.matrixWorld.elements);
                
            }
        }

        for(let i=0;i<result.model.nodes.length;i++) {
            const node = result.model.nodes[i];
            const ent = result.nodeEntities[i];
            node.updateMatrix();
            const localMtx = node.matrix.clone();
            const worldMtx = localMtx.clone();

            if(node.parent && node!==rootNode) {
                const parentEnt= modelNodeEntities[node.parent.userData.nodeIndex];
                let np = node.parent;
                while(np) {
                  np.updateMatrix();
                  worldMtx.premultiply(np.matrix);
                  if(np===rootNode)
                    np=null;
                  else np=np.parent;

                }
                ent.components.hierarchy.setParentId(parentEnt.id());
            }
            else {
                if(parentId!=null) {
                    ent.components.hierarchy.setParentId(parentId);
                }
            }
            result.worldMatrices[i] = worldMtx;
            result.localMatrices[i] = localMtx;
            
        }
        onLoad(result);
    });
  }

  loadResource(uri, onLoad, expectedType) {
    const url = new URL(uri);
    const protocol = url.protocol.slice(0,-1);
    if(expectedType)
      console.assert(protocol==expectedType, "Unexpected type:"+protocol);

    if(!this._resourceLoaders[protocol]) {
      this.loadGLTF(uri);
    }
    const loaderCB = this._resourceLoaders[protocol];
    loaderCB(url,onLoad);
  }
  
  loadGeometry(url, index, onLoad) {
    this.loadGLTF(url,(data)=>{
      onLoad(data.geometry[index]);
    });
  }
  loadMaterial(url, index, onLoad) {
    this.loadGLTF(url,(data)=>{
      onLoad(data.materials[index]);
    });
  }

  loadGLTF(url, onLoad) {
    const cmds = this._completedCommands;
    if(this._resources.has(url)) {
      cmds.push({
        data:this._resources.get(url),
        cb: onLoad
      });
    }

    this._gltfLoader.load(
      // resource URL
      url,

      // called when the resource is loaded
      ( gltf ) => {
        const result = {
          root: gltf.scene,
          nodes: [],
          meshes: [],
          geometry: [],
          materials: [],
          skeletons: [],
          nodeLookup: {},
        }
        const geometrySet = new Map();
        const materialSet = new Map();
        const skeletonSet = new Map();
        gltf.scene.traverse((node)=>{
          node.userData = {
            nodeIndex: result.nodes.length
          };
          const nodeName = node.name || "";
          if(result.nodeLookup[nodeName]) {
            
            if(!Array.isArray(result.nodeLookup[nodeName]))
              result.nodeLookup[nodeName] = [result.nodeLookup[nodeName]];
            result.nodeLookup[nodeName].push(node);
          }
          else result.nodeLookup[nodeName] = node;

          result.nodes.push(node);
          if(node.geometry) {
            if(!geometrySet.has(node.geometry))
            {
              node.userData.meshIndex = result.meshes.length;
              node.userData.meshGeometryIndex = result.geometry.length;
              result.meshes.push(node);
              result.geometry.push(node.geometry);
              geometrySet.set(node.geometry.uuid,node.userData.meshGeometryIndex);
            }
            else node.userData.meshIndex = geometrySet.get(node.geometry.uuid);            
          } 

          if(node.material) {
            if(!materialSet.has(node.material))
            {
                node.userData.meshMaterialIndex = result.materials.length;
                result.materials.push(node.material);
                materialSet.set(node.material.uuid, node.userData.meshMaterialIndex);
            }
            else node.userData.meshMaterialIndex = materialSet.get(node.material.uuid);
          }

          if(node.skeleton) {
            if(!skeletonSet.has(node.skeleton.uuid))
            {
                node.skeleton.init();
                node.userData.meshSkeletonIndex = result.skeletons.length;
                result.skeletons.push(node.skeleton);
                skeletonSet.set(node.skeleton.uuid, node.userData.meshIndex);
            }
            else node.userData.meshSkeletonIndex = skeletonSet.get(node.skeleton.uuid);
          }
        })
        this._resources.set(url, result);
        cmds.push({
          data:result,
          cb: onLoad
        });
    
      },
      // called while loading is progressing
      null,
      // called when loading has errors
      ( error ) => {    
        cmds.push({
          error,
          cb: onLoad
        });    
      }
    );
  }

  step() {
    for(let i=0;i<this._completedCommands.length;i++) {
      const cmd = this._completedCommands[i];
      cmd.cb(cmd.data, cmd.error);
    }
    this._completedCommands.length=0;
  }
}

export class ThreeNode {
  constructor () {
    this._node = new THREE.Group();
    this._node.name = "DefaultThreeNode";
  }

  node () {
    return this._node;
  }

  setNode (node) {
    const oldNode = this._node;
    if(node===oldNode)
        return;

    this._node = node;    
    if (oldNode) {
        if(oldNode.parent) {
            const oldParent = oldNode.parent;
            oldParent.remove(oldNode);
            oldParent.add(node);
        }
        for(let i=0;i<oldNode.children.length;i++) {
            const child = oldNode.children[i];
            oldNode.remove(child);
            node.add(child);
        }
    }
    this.modified();
  }
}

export class ThreeBox {
  constructor () {
    this.geometry = null;
    this.material = null;
  }
}

export class ThreeSkeleton {
    constructor () {
      this._skeleton = new THREE.Skeleton();
    }
  
    skeleton () {
      return this._skeleton;
    }

    setBoneCount(n) {
        this._skeleton.bones=new Array(n);
        this._skeleton.boneInverses=new Array(n);
        for(let i=0;i<n;i++) {
            this._skeleton.boneInverses[i]=new THREE.Matrix4();
        }
    }
    setBone(n, bone) {
        this._skeleton.bones[n] = bone;
    }
    setInverseBindMatrix(n, mtx) {
        this._skeleton.boneInverses[n].fromArray(mtx);
    }
    init() {
        this._skeleton.init();
    }
  }
  
export class ThreeScene {
  constructor () {
    this._scene = new THREE.Scene();
    this._scene.name = "ThreeScene";
    this._light = new THREE.HemisphereLight( 0x080820, 0xffffbb, 1 );
    this._light.name = "ThreeSceneLight";
    this._scene.add( this._light );
  }
  scene() {
      return this._scene;
  }
}

export class ThreeRenderer {
  constructor () {
    this._canvas = 'canvas';
    this.init();
  }

  init () {
    this._canvas = document.getElementById('canvas');
    this._renderer = new THREE.WebGLRenderer({ antialias: true, canvas: this._canvas });
    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(window.innerWidth, window.innerHeight);

    this._camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);
    this._camera.position.x = -0.5;
    this._camera.position.y = 0.5;
    this._camera.position.z = 2.5;
    this._camera.up.set(0,1,0);
    this._camera.lookAt(-0.5,0.5,0);
  }
}

export function initialize(world) {
    const threeRendererTypeID = world.registerHostComponent('threeRenderer', () => {
        return new ThreeRenderer();
    }, true);
    const threeResourceLoaderTypeID = world.registerHostComponent('threeResourceLoader', () => {
        return new ThreeResourceLoader();
    }, true);
    const threeSceneTypeID = world.registerHostComponent('threeScene', () => {
        return new ThreeScene();
    }, true);

    const threeNodeTypeID = world.registerHostComponent('threeNode', () => {
        return new ThreeNode();
    });
    
    const threeBoxTypeID = world.registerHostComponent('threeBox', () => {
        return new ThreeBox();
    });
    
    const threeSkeletonTypeID = world.registerHostComponent('threeSkeleton', () => {
        return new ThreeSkeleton();
    });
        
      world.addSystem({ condition: 'exists', component: 'threeResourceLoader' }, (ent) => {
        const loader = ent.components.threeResourceLoader;
        loader.step();
      });
    
      world.addSystem({
        condition: 'all',
        children:[
          { condition: 'exists', component: 'threeNode', negate: true },
          {
            condition: 'any',
            children: [
              { condition: 'exists', component: 'box' },
              { condition: 'exists', component: 'model' },
              { condition: 'exists', component: 'mesh' },
              { condition: 'exists', component: 'transform' },
            ]
          },
        ]
      }, (ent) => {
        ent.addComponent(threeNodeTypeID);
      });

      world.addSystem({
        condition: 'all',
        children:[
          { condition: 'exists', component: 'threeSkeleton', negate: true },
          { condition: 'exists', component: 'skeleton' },
        ]
      }, (ent) => {
        ent.addComponent(threeSkeletonTypeID);
    });
    
      world.addSystem({ condition: 'modified', component: 'model' }, (ent) => {
        const uri = ent.components.model.uri();
        const loader = world.singletons().threeResourceLoader;
        if(uri.length) {
            loader.loadGLTF(uri, (data)=>{
                const nodeComp = ent.components.threeNode;
                if(ent.components.entityName)
                  data.root.name = ent.components.entityName.name();
                nodeComp.setNode(data.root);
              });      
        }
      });

 
      world.addSystem({ condition: 'modified', component: 'mesh' }, (ent) => {
        const nodeComp = ent.components.threeNode;
        const skeletonEnt = ent.components.mesh.skeleton();
        const isSkinned = skeletonEnt!=null;

        const mesh = isSkinned ? new THREE.SkinnedMesh() : new THREE.Mesh();
        mesh.userData = {
          id: ent.id(),
        };
        if(ent.components.entityName)
            mesh.name = ent.components.entityName.name();
            
        nodeComp.setNode(mesh);
    
        const loader = world.singletons().threeResourceLoader;
        const geometryUri = ent.components.mesh.geometryUri();
        const materialUri = ent.components.mesh.materialUri();
        if(geometryUri.length) {
            loader.loadResource(geometryUri, (loadedGeom)=>{
            nodeComp.node().geometry = loadedGeom;
            }, "geometry");
        }
        if(materialUri.length) {
            loader.loadResource(materialUri, (loadedMtl)=>{
                nodeComp.node().material = loadedMtl;
              }, "material");
      
        }
        if(isSkinned) {
            const skeleton = skeletonEnt.components.threeSkeleton.skeleton();
            const bindMtx = new THREE.Matrix4();
            bindMtx.fromArray(ent.components.mesh.bindMatrix());
            nodeComp.node().bind(skeleton, bindMtx);
        }
      });
    
  
      world.addSystem({
        condition: 'any',
        children:[
          { condition: 'modified', component: 'box' },
          {
            condition: 'all',
            children: [
              { condition: 'exists', component: 'box' },
              { condition: 'exists', component: 'threeBox', negate:true },
            ]
          },
        ]
      }, (ent) => {
        if(!ent.components.threeBox)
          ent.addComponent(threeBoxTypeID);

        const nodeComp = ent.components.threeNode;
        const size = ent.components.box.size();
        const color = ent.components.box.color();
        ent.components.threeBox.geometry  = new THREE.BoxBufferGeometry(size[0], size[1], size[2]);
        ent.components.threeBox.material = new THREE.MeshStandardMaterial({ 
          color: new THREE.Color(color[0], color[1], color[2]),
        });
    
        const mesh = new THREE.Mesh(ent.components.threeBox.geometry, ent.components.threeBox.material);
        nodeComp.setNode(mesh);
      });
    
      const updateHierFunc = (ent) => {
        ent.ensureComponent(threeNodeTypeID);


        if(ent.components.hierarchy) {
            const nodeType = ent.components.threeNode.node().type;
            if(ent.components.hierarchy.isJoint() && nodeType!="Bone") {
                ent.components.threeNode.setNode(new THREE.Bone());
            }
            else if(!ent.components.hierarchy.isJoint() && nodeType=="Bone") {
                ent.components.threeNode.setNode(new THREE.Group());
            }   
        }
        const node = ent.components.threeNode.node();
        const scene = world.singletons().threeScene.scene();
        const parentEnt = ent.components.hierarchy ? ent.components.hierarchy.parent() : null;

        if(parentEnt) {
            const parentNode = parentEnt.components.threeNode.node();

            if(parentNode!=node.parent) {
              if(node.parent)
                node.parent.remove(node);
              parentNode.add(node);

              parentEnt.ensureComponent(PickneyComponents.Types.HierarchyTree);
              parentEnt.components.hierarchyTree.addChildren(ent.id());      
            }
        }
        else {
          if(node.parent)
            node.parent.remove(node);
          scene.add(node);    
        }

        const parentId = ent.components.hierarchy ? ent.components.hierarchy.parentId() : world.kNullEntityID;
        ent.ensureComponent(PickneyComponents.Types.HierarchyTree);
        if(ent.components.hierarchyTree.parentId() !== parentId) {
          if(ent.components.hierarchyTree.parentId()!==world.kNullEntityID)
            ent.components.hierarchyTree.parent.removeChildren(ent.id());
          ent.components.hierarchyTree.setParentId(parentId);
        }        
      };

      world.addSystem({
        condition: 'any',
        children: [
          { condition: 'modified', component: 'hierarchy' },
          { condition: 'modified', component: 'threeNode' },
        ]
      }, updateHierFunc);
      world.addSystem({
        condition: 'any',
        children: [
          { condition: 'modified', component: 'hierarchy' },
          { condition: 'modified', component: 'threeNode' },
        ]
      }, updateHierFunc, -2);


      world.addSystem({ condition: 'modified', component: 'skeleton' }, (ent) => {

        const skeletonComp = ent.components.skeleton;
        const boneNum = skeletonComp.getJointEntitiesCount();
        ent.components.threeSkeleton.setBoneCount(boneNum);
        for(let i=0;i<boneNum;i++) {
            const jointEnt = skeletonComp.getJointEntities(i);
            const jointNode = jointEnt.components.threeNode.node();
            ent.components.threeSkeleton.setBone(i, jointNode);
            ent.components.threeSkeleton.setInverseBindMatrix(i, skeletonComp.getInverseBindMatrices(i));
        }
        ent.components.threeSkeleton.init();

        
    });
    const updateXform = (ent) => {
      ent.ensureComponent(PickneyComponents.Types.Transform);
      ent.ensureComponent(threeNodeTypeID);

      const nodeComp = ent.components.threeNode;
      const pos = ent.components.transform.translation();
      const scale = ent.components.transform.scale();
      const quat = ent.components.transform.rotation();
/*
      for(let i=0;i<3;i++)
        if(!isFinite(pos[i])) console.error("Invalid position:"+pos);
      for(let i=0;i<3;i++)
        if(!isFinite(scale[i])) console.error("Invalid scale:"+scale);
      for(let i=0;i<4;i++)
        if(!isFinite(quat[0])) console.error("Invalid rotaiton:"+pos);
        */

      nodeComp.node().position.fromArray(pos);
      nodeComp.node().quaternion.fromArray(quat);
      nodeComp.node().scale.fromArray(scale);
      
    };

    world.addSystem({
      condition: 'any',
      children: [
        { condition: 'modified', component: 'transform' },
        { condition: 'modified', component: 'threeNode' },
      ]
    },updateXform);

    world.addSystem({
      condition: 'any',
      children: [
        { condition: 'modified', component: 'transform' },
        { condition: 'modified', component: 'threeNode' },
      ]
    },updateXform, -2);

      world.addSystem({
        condition: 'any',
        children: [
          { condition: 'modified', component: 'entityName' },
          { condition: 'modified', component: 'threeNode' },
        ]
      }, (ent) => {
        if(ent.components.entityName && ent.components.threeNode && ent.components.threeNode.node()) {
            const name =ent.components.entityName.name();
            ent.components.threeNode.node().name = name;
        }
      });

      world.addSystem({ condition: 'exists', component: 'threeRenderer' }, (ent) => {
        const renderer = ent.components.threeRenderer._renderer;
        const camera = ent.components.threeRenderer._camera;
        const scene = world.singletons().threeScene.scene();
        if (renderer) { renderer.render(scene, camera); }
      });

}