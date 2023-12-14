
import * as PickneyFramework from './PickneyFrameworkWrapper';

import * as PickneyComponents from './PickneyComponentsWrapper.js';

import * as ThreeFramework from './ThreeFramework.js';

import * as glm from 'gl-matrix';

import * as THREE from 'three';



// Async function to implement webpage
async function runPickneyApp () {

  const world = await PickneyFramework.create(PickneyComponents.Names);

  const objectOrbitorId = world.registerHostComponent('objectOrbitor', () => {
    return {
      startTime:-1,
      radiusX:1.0,
      radiusY:1.0,
      periodX:1.0,
      periodY:1.0,
      center:[0,0,0],
    };
}, false);






  ThreeFramework.initialize(world);
  world.addSystem({ condition: 'exists', component: 'objectOrbitor' }, (ent, globals) => {
  
    ent.ensureComponent(PickneyComponents.Types.Transform);
    const pos = glm.vec3.create();
    const orbitor = ent.components.objectOrbitor;
    if(orbitor.startTime<0)
      orbitor.startTime = globals.time;

    const t = globals.time-orbitor.startTime;

    pos[0] = orbitor.center[0] +  Math.sin(t*orbitor.periodX)*orbitor.radiusX;
    pos[1] = orbitor.center[1] +  Math.sin(t*orbitor.periodY)*orbitor.radiusY;
    pos[2] = orbitor.center[2];
    ent.components.transform.setTranslation(pos);

  });


  

  const ent0 = world.createEntity([PickneyComponents.Types.Transform, PickneyComponents.Types.Hierarchy, PickneyComponents.Types.Model, PickneyComponents.Types.EntityName]);
  const ent1 = world.createEntity([PickneyComponents.Types.Transform, PickneyComponents.Types.Hierarchy, PickneyComponents.Types.Model, PickneyComponents.Types.EntityName]);
  const ent2 = world.createEntity([PickneyComponents.Types.Transform, PickneyComponents.Types.Hierarchy, PickneyComponents.Types.EntityName]);

  const loader = world.singletons().threeResourceLoader;

  ent1.components.entityName.setName("CesiumManRoot");

  loader.expandModel(world, "data/Man/CesiumMan.gltf", (data)=>{
    //const charEnt = world.createEntity([PickneyComponents.Types.Character,PickneyComponents.Types.CharacterState, PickneyComponents.Types.EntityName]);
  });
  
 

  let t = 0;
  async function animate () {
    requestAnimationFrame(animate);

    world.step();
  }

  await animate();
}

// Execute the actual webpage code
runPickneyApp().then(() => { console.log('App finished'); });
