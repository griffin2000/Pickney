
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
    const charEnt = world.createEntity([PickneyComponents.Types.CharacterDefinition,PickneyComponents.Types.Character,PickneyComponents.Types.CharacterState, PickneyComponents.Types.EntityName]);
  });
  
  /*

  ent2.components.transform.setTranslation([0, 0, 0]);
  ent2.components.transform.setScale([1, 1, 1]);
  ent2.components.entityName.setName("RootNode");

  loader.expandModel(world, "data/Rabbit/RabbitAnimated.gltf", (data)=>{ 
    debugger;
    const skeleton = data.model.skeletons[0];
    const numBones = skeleton.bones.length;
  const rabbitNodes = [
    "RootNode",
    "Rabbit",
    "Rabbit_Head",
    "Rabbit_Nose",
    "Rabbit_Spine2",
    "Rabbit_Neck",
    "Rabbit_L_Clavicle",
    "Rabbit_Spine1",
    "Rabbit_Spine",
    "Rabbit_L_UpperArm",
    "Rabbit_L_Forearm",
    "Rabbit_Pelvis",
    "Rabbit_L_Hand",
    "Rabbit_L_Thigh",
    "Rabbit_L_Calf",
    "Rabbit_L_Foot",
    "Rabbit_R_Clavicle",
    "Rabbit_R_UpperArm",
    "Rabbit_R_Forearm",
    "Rabbit_R_Hand",
    "Rabbit_R_Thigh",
    "Rabbit_R_Calf",
    "Rabbit_R_Foot",
    "Rabbit_R_Toe0"
  ];

  const rabbitHikNodes = [
    "ReferenceNodeId",
    "HipsNodeId",
    "HeadNodeId",
    "NoseNodeId",
    "Spine3NodeId",
    "NeckNodeId",
    "LeftShoulderNodeId",
    "Spine2NodeId",
    "Spine1NodeId",
    "LeftElbowNodeId",
    "LeftWristNodeId",
    "WaistNodeId",
    "LeftHandNodeId",
    "LeftHipsNodeId",
    "LeftCalfNodeId",
    "RightShoulderNodeId",
    "RightElbowNodeId",
    "RightWristNodeId",
    "RightHandNodeId",
    "RightHipsNodeId",
    "RightKneeNodeId",
  ];
    for(let i=0;i<numBones;i++) {
      console.log(skeleton.bones[i].name);
    }
  }, ent2.id(), "RabbitEnt:");*/

 
  
  world.addSystem({ condition: 'created', component: 'characterEffectors' }, (ent) => {
    const poseDetectorEnt = world.getSingletonEntity(poseDetectorId);
    poseDetectorEnt.components.poseApplicator.characterEffectorsEnt = ent;
  });
  world.addSystem({ condition: 'created', component: 'characterEffector' }, (ent) => {
    const effectorName = ent.name();
    console.log(effectorName);

    ent.components.characterEffector.setTranslationActive(1.0);
    ent.components.characterEffector.setRotationActive(1.0);
    if( effectorName=="RightWristEffectorId" || 
      effectorName=="LeftWristEffectorId" ||
      effectorName=="HeadEffectorId"
    )
    {
      ent.components.characterEffector.setPull(1.0);          
    }
    
    if(effectorName=="RightHipEffectorId" ||
      effectorName=="LeftHipEffectorId"
    )
    {
      ent.components.characterEffector.setPull(1.0);
          
    }
    ent.addComponent(PickneyComponents.Types.Box);
    ent.components.box.setSize([0.03,0.03,0.03]);
    ent.components.box.setColor([1,0,0]);
  });

  const cameraMarkers = [];
  for(let i=0;i<34;i++) {
    const camMarker = world.createEntity([PickneyComponents.Types.Transform, PickneyComponents.Types.Hierarchy, PickneyComponents.Types.Box]);
    camMarker.addComponent(PickneyComponents.Types.Box);
    
    camMarker.components.box.setSize([0.15,0.15,0.15]);
    camMarker.components.box.setColor([0,0,1]);
    cameraMarkers.push(camMarker);
  }

  async function startCamera() {
    const camera = await setupCamera();
    console.log(camera);
  
    let detector = await createDetector();
    console.log(detector);

    
    async function processCamera () {
      requestAnimationFrame(processCamera);

      if (camera.video.readyState < 2) {
        await new Promise((resolve) => {
          camera.video.onloadeddata = () => {
            resolve(video);
          };
        });
      }

      let poses;
      if(detector) {
        try {
          poses = await detector.estimatePoses(
            camera.video,
            { maxPoses: 1, flipHorizontal: false });
          if(poses[0]) {
            const poseDetector = world.singletons().poseDetector;
            poseDetector.pose = poses[0];
            let activeKPs = false;
            for(let i=0;i<poses[0].keypoints3D.length;i++){
              const name=  poses[0].keypoints3D[i].name;
              if(!poseDetector.keypoints[name])
                poseDetector.keypoints[name]= world.createEntity([poseKeypointId]);
  
              const kp = poseDetector.pose.keypoints3D[i];
              const poseKeypoint = poseDetector.keypoints[name].components.poseKeypoint;
              if(kp.score<poseDetector.minScore) {
                poseKeypoint.active = false;
  
              }
              else {
                activeKPs=true;
                
                poseKeypoint.active = true;
                poseKeypoint.poseData = kp;
                poseKeypoint.currentPosition[0] = kp.x;
                poseKeypoint.currentPosition[1] = kp.y;
                poseKeypoint.currentPosition[2] = kp.z;
                if(!poseKeypoint.startPosition) {
                  poseKeypoint.startPosition = glm.vec3.create();
                  glm.vec3.copy(poseKeypoint.startPosition, 
                    poseKeypoint.currentPosition);
                }
                glm.vec3.sub(poseKeypoint.offset, poseKeypoint.currentPosition, poseKeypoint.startPosition);
                 
                poseKeypoint.name = kp.name;
                poseKeypoint.index = i;
                //console.log(poseKeypoint)
    
    
              }
              if(activeKPs)
                poseDetector.modified();

              if(kp.score>0.8) {
                if(kp.name=="right_wrist" || kp.name=="right_thumb" || kp.name=="left_wrist" || kp.name=="left_thumb" ) {
                  cameraMarkers[i].components.transform.setTranslation([
                    -kp.x*2.5,
                    -kp.y*2.5,
                    -kp.z
                  ]);    
                }
              } else {
                cameraMarkers[i].components.transform.setTranslation([
                  100000,100000,100000 
                ]);  
              }
            }
              
          }
        } catch (error) {
          console.error(error);
          detector.dispose();
          detector = null;
          alert(error);
        }  
      }
    }
    processCamera();
  
  }
  startCamera().then(() => { console.log('Camera started'); });

  let t = 0;
  async function animate () {
    requestAnimationFrame(animate);

    world.step();
  }

  await animate();
}

// Execute the actual webpage code
runPickneyApp().then(() => { console.log('App finished'); });
