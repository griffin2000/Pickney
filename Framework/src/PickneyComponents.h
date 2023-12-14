
#pragma once

#include "PickneyTypes.h"

namespace Cj {
    namespace Framework {
        namespace Components {
            extern  const vector<ComponentDescription> descriptions;
			ComponentPtr allocate(ComponentID type);



            enum Type :ComponentID {
		kUnused = 0,
		kTransform = 1,
		kHierarchy = 2,
		kModel = 3,
		kBox = 4,
		kMesh = 5,
		kSkeleton = 6,
		kEntityName = 7,
		kCharacterDefinition = 8,
		kCharacter = 9,
		kCharacterEffector = 10,
		kCharacterState = 11,
		kCharacterEffectorState = 12,
		kCharacterEffectors = 13,
		kHierarchyTree = 14,

                kNumNativeComponents = 15,
                kInvalid = -1
            };


    
            struct Unused : public ComponentBase {

                static Unused* allocate() {
                    return new Unused();
                }
                static void destroy(Unused* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kUnused;
                }
            };
            struct Transform : public ComponentBase {
                vec3 translation;
                quat rotation;
                vec3 scale = vec3(1,1,1);

                static Transform* allocate() {
                    return new Transform();
                }
                static void destroy(Transform* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kTransform;
                }
            };
            struct Hierarchy : public ComponentBase {
                EntityID parent = kNullEntityID;
                Bool isJoint = false;

                static Hierarchy* allocate() {
                    return new Hierarchy();
                }
                static void destroy(Hierarchy* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kHierarchy;
                }
            };
            struct Model : public ComponentBase {
                Uri uri;

                static Model* allocate() {
                    return new Model();
                }
                static void destroy(Model* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kModel;
                }
            };
            struct Box : public ComponentBase {
                vec3 size = vec3(1,1,1);
                vec3 color = vec3(1,1,1);

                static Box* allocate() {
                    return new Box();
                }
                static void destroy(Box* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kBox;
                }
            };
            struct Mesh : public ComponentBase {
                Uri geometryUri;
                Uri materialUri;
                EntityID skeleton = kNullEntityID;
                mat4 bindMatrix;

                static Mesh* allocate() {
                    return new Mesh();
                }
                static void destroy(Mesh* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kMesh;
                }
            };
            struct Skeleton : public ComponentBase {
                Uri skinUri;
                EntityIDArray jointEntities;
                StringArray jointNames;
                Matrix4Array inverseBindMatrices;

                static Skeleton* allocate() {
                    return new Skeleton();
                }
                static void destroy(Skeleton* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kSkeleton;
                }
            };
            struct EntityName : public ComponentBase {
                Name name;

                static EntityName* allocate() {
                    return new EntityName();
                }
                static void destroy(EntityName* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kEntityName;
                }
            };
            struct CharacterDefinition : public ComponentBase {
                StringArray nodesUsed;
                StringArray modelNodeNames;
                Float3Array bindPosition;
                QuatArray bindRotation;
                Float3Array bindScale;
                IntArray minRotationLimitsActive;
                IntArray maxRotationLimitsActive;
                Float3Array minRotationLimits;
                Float3Array maxRotationLimits;

                static CharacterDefinition* allocate() {
                    return new CharacterDefinition();
                }
                static void destroy(CharacterDefinition* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kCharacterDefinition;
                }
            };
            struct Character : public ComponentBase {
                EntityID definition = kNullEntityID;

                static Character* allocate() {
                    return new Character();
                }
                static void destroy(Character* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kCharacter;
                }
            };
            struct CharacterEffector : public ComponentBase {
                EntityID characterState = kNullEntityID;
                float pull = 0.0f;
                float resist = 0.0f;
                float rotationActive = 0.0f;
                float translationActive = 0.0f;
                int hikId;

                static CharacterEffector* allocate() {
                    return new CharacterEffector();
                }
                static void destroy(CharacterEffector* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kCharacterEffector;
                }
            };
            struct CharacterState : public ComponentBase {
                EntityID character = kNullEntityID;
                EntityIDArray targetEntities;

                static CharacterState* allocate() {
                    return new CharacterState();
                }
                static void destroy(CharacterState* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kCharacterState;
                }
            };
            struct CharacterEffectorState : public ComponentBase {
                float leftHandPullHips = 0.0f;
                float rightHandPullHips = 0.0f;

                static CharacterEffectorState* allocate() {
                    return new CharacterEffectorState();
                }
                static void destroy(CharacterEffectorState* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kCharacterEffectorState;
                }
            };
            struct CharacterEffectors : public ComponentBase {
                EntityIDMap effectorEntities;

                static CharacterEffectors* allocate() {
                    return new CharacterEffectors();
                }
                static void destroy(CharacterEffectors* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kCharacterEffectors;
                }
            };
            struct HierarchyTree : public ComponentBase {
                EntityID parent = kNullEntityID;
                EntityIDArray children;

                static HierarchyTree* allocate() {
                    return new HierarchyTree();
                }
                static void destroy(HierarchyTree* ptr) {
                    delete ptr;
                }
                static Type id() {
                    return Type::kHierarchyTree;
                }
            };
        }
    }
}
    