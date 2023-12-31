
#include "PickneyComponents.h"

namespace Cj
{
    namespace Framework
    {
        namespace Components {
    
            ComponentPtr allocate(ComponentID type) {
                switch(type) {



                    case Type::kUnused:
                        return Unused::allocate();
        
                    case Type::kTransform:
                        return Transform::allocate();
        
                    case Type::kHierarchy:
                        return Hierarchy::allocate();
        
                    case Type::kModel:
                        return Model::allocate();
        
                    case Type::kBox:
                        return Box::allocate();
        
                    case Type::kMesh:
                        return Mesh::allocate();
        
                    case Type::kSkeleton:
                        return Skeleton::allocate();
        
                    case Type::kEntityName:
                        return EntityName::allocate();
        
                    case Type::kHierarchyTree:
                        return HierarchyTree::allocate();
        
                    default:
                        assert(0);
                        return nullptr;
                }
            }
			const vector<ComponentDescription> descriptions = {

                {"unused", false},
                {"transform", false},
                {"hierarchy", false},
                {"model", false},
                {"box", false},
                {"mesh", false},
                {"skeleton", false},
                {"entityName", false},
                {"hierarchyTree", false}

            };
        }
    }
}
    