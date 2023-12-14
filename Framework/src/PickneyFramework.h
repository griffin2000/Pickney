#pragma once

#include "PickneyTypes.h"
#include <map>

#include <nlohmann/json.hpp>
using json = nlohmann::json;

using namespace std;

#pragma warning(disable : 4996)


namespace Cj
{
    namespace Framework
    {
        struct Globals {
            double time;
            float delta;
        };

        struct ComponentReference {
			enum Flags {
				Created = 1 << 0,
				Destroyed = 1 << 1,
				Modified = 1 << 2,
				Host = 1 << 3
			};
			ComponentReference() : flags(Flags::Created | Flags::Modified) {
				component.pointer = nullptr;
			}
			ComponentReference(ComponentPtr ptr, ComponentID id) : id(id),flags(Flags::Created | Flags::Modified) {
				component.pointer = ptr;
			}
			ComponentReference(HostComponentID hostID, ComponentID id) : id(id),flags(Flags::Created | Flags::Modified | Flags::Host) {
				component.hostID = hostID;
			}

			union {
				ComponentPtr pointer;
				HostComponentID hostID;
			} component;

			ComponentID id= kInvalidComponentID;
			uint16_t flags= 0;

            bool created() const { return flags & Flags::Created; }
            bool destroyed() const { return flags & Flags::Destroyed; }
            bool modified() const { return flags & Flags::Modified; }

			HostComponentID getHostComponentID() const {
				assert(host());
				return component.hostID;
			}

            template<typename ComponentType>
			ComponentType* getComponentPointer() {
				assert(!host());
				return (ComponentType*)component.pointer;
			}

            template<typename ComponentType>
			const ComponentType* getComponentPointer() const {
				assert(!host());
				return (const ComponentType*)component.pointer;
			}

            void clearMutableFlags() {
                flags &= Flags::Host;
            }

            bool host() const  { return flags & Flags::Host; }
        };

		template<size_t MaxComponents=128>
		class ComponentLookup {
		public:
			ComponentLookup() {
				clear();
			}
			void clear() {
				std::fill_n(&_data[0], _data.size(), (uint8_t)0xff);
			}
			void set(ComponentID component, size_t index) {
				assert(index < kInvalidIndex);
				_data[component] = (ComponentIndex)index;
			}
			int get(ComponentID component) const {
				if (_data[component] == kInvalidIndex)
					return -1;
				return (int)_data[component];
			}


		private:
			using ComponentIndex = uint8_t;
			static const ComponentIndex kInvalidIndex = 0xFF;

			array<uint8_t, MaxComponents> _data;
		};

        class Entity {
            friend class World;
        public:
            Entity(EntityID id=kNullEntityID) : _id(id),_destroyed(false) {
            }

            bool valid() const {
                return _id != kNullEntityID;
            }

            bool hasComponent(ComponentID id) const {
				return findComponentIndex(id)>=0;
            }

			bool isHostComponent(ComponentID id) const {
				int32_t idx = findComponentIndex(id);
				if (idx < 0)
					return false;
                return _components[idx].host();
            }

			bool componentModified(ComponentID id) const {
				int32_t idx = findComponentIndex(id);
				if (idx < 0)
					return false;
                return _components[idx].modified();
            }

			bool componentCreated(ComponentID id) const {
				int32_t idx = findComponentIndex(id);
				if (idx < 0)
					return false;
				return _components[idx].created();
			}

			bool componentDestroyed(ComponentID id) const {
				int32_t idx = findComponentIndex(id);
				if (idx < 0)
					return false;
				return _components[idx].destroyed();
			}

            void modifyComponent(ComponentID type) {
				CjAssert(valid(), "Invalid entity");
                int32_t idx = findComponentIndex(type);
				CjAssert(idx >= 0, "id:%d is not found in entity %d", idx, _id);
                _components[idx].flags |= ComponentReference::Flags::Modified;
            }

			ComponentPtr getComponentPointer(ComponentID id) {
				CjAssert(valid(), "Invalid entity");
				int32_t idx = findComponentIndex(id);
				CjAssert(idx >= 0, "id:%d is not found in entity %d", idx, _id);
				CjAssert(!isHostComponent(id), "%d is not a native compenent for entity %d", id, _id);
				return _components[idx].component.pointer;
			}


			HostComponentID getHostComponent(ComponentID id) const {
				CjAssert(valid(), "Invalid entity");

				int32_t idx = findComponentIndex(id);
				CjAssert(idx >= 0, "id:%d is not found in entity %d", idx, _id);
				CjAssert(isHostComponent(id), "%d is not a host compenent for entity %d", id, _id);
				auto &comp = _components[idx];
				auto cid= comp.getHostComponentID();
				return cid;
			}

			const ComponentPtr getComponentPointer(ComponentID id) const {
				CjAssert(valid(), "Invalid entity");
				int32_t idx = findComponentIndex(id);
				CjAssert(!isHostComponent(id), "%d is not a host compenent for entity %d", id, _id);
				CjAssert(idx >= 0, "Component %d does not exist in entity %d", id, this->id());
				return _components[idx].component.pointer;
			}
			void destroy() {
                assert(!_destroyed);
				_destroyed = true;
				for (size_t i = 0; i < _components.size(); i++) {
					_components[i].flags |= ComponentReference::Flags::Destroyed;
				}
			}

			bool isDestroyed() {
				return _destroyed;
			}

            EntityID id() const { return _id;  }

			void forAllComponents(function<bool(ComponentReference&)> func) {
				_components.forEach(func);
			}

        private:
			ComponentPtr addComponent(ComponentID type, ComponentPtr pNewComp ) {
				assert(valid());
				_componentLookup.set(type, _components.size());
				_components.push({ pNewComp,type });
                return pNewComp;
            }
			void addHostComponent(ComponentID type, HostComponentID hostCompID) {
				assert(valid());
				_componentLookup.set(type, _components.size());
				_components.push({ hostCompID,type });
            }

			void doDestroy() {
				_components.reset();
				_componentLookup.clear();
				_id = kNullEntityID;
			}


            int32_t findComponentIndex(ComponentID compId) const {
				CjAssert(compId != 0, "Using zero (unused) component ID not allowed, in entity %d", _id);

				if (compId == kInvalidComponentID) {
					CjWarning("Invalid component index in entity %d",_id);
					return -1;
				}
				return _componentLookup.get(compId);
            }

			EntityID _id;
            int _destroyed = false;
			Array<ComponentReference> _components;
			ComponentLookup<128> _componentLookup;
        };

		class Condition {
		public:
			virtual bool test(const Entity& entity) const = 0;
		};
		using ConditionPtr = shared_ptr<Condition>;
		using ConstConditionPtr = shared_ptr<const Condition>;

		struct System {
			using Function = function<void(const Globals & globals, const Array<EntityID> & entities)>;
			Function function;
			ConstConditionPtr pCondition;
			SystemID id;
			int priority;

		};
		bool operator >(const System& a, const System& b);

		template <typename Cond, typename ... Args>
        ConditionPtr makeCondition(Args&& ... args) {
            return make_shared<Cond>(forward<Args>(args)...);
        }

        class World {
        public:

			World(function<ComponentPtr(ComponentID)> componentAllocator, const vector<ComponentDescription>& components);

            EntityID createEntity() {
                EntityID newId = (EntityID)_entities.size();
				Entity* pEnt = allocateEntity(newId);
				_entities.push(pEnt);
                return newId;
			}

			Entity& getEntity(EntityID id) {
				if(id>=_entities.size()) {
					cerr<<"Invalid index "<<id<<">="<<_entities.size()<<endl;
					abort();
				}
				return *_entities[id];
			}
			const Entity& getEntity(EntityID id) const {
				return *_entities[id];
			}

			void ensureComponent(EntityID id, ComponentID type) {
				if(!hasComponent(id,type))
					addComponent(id, type);
			}

			bool hasComponent(EntityID id, ComponentID type) const {
				return getEntity(id).hasComponent(type);
            }

			template<typename ComponentType>
			ComponentType& addComponent(EntityID id) {
				addComponent(id, ComponentType::id());
				return getComponent<ComponentType>(id);
			}

			void addComponent(EntityID id, ComponentID type) {
				if(type<nativeComponentCount()) {
					ComponentPtr ptr = _componentAllocator(type);
					getEntity(id).addComponent(type,ptr);
					return;
				}
				addHostComponent(id, type);
			}

			HostComponentID addHostComponent(EntityID id, ComponentID type) {
				assert(type>=nativeComponentCount());
				HostComponentID hostId = _hostComponents[type-nativeComponentCount()].alloc();
				getEntity(id).addHostComponent(type,hostId);
				return hostId;
			}

			template<typename ComponentType>
			ComponentType& modifyComponent(EntityID id) {
				getEntity(id).modifyComponent(ComponentType::id());
				return getComponent<ComponentType>(id);
			}

			void modifyComponent(EntityID id, ComponentID type) {
				return getEntity(id).modifyComponent(type);
			}

			template<typename ComponentType>
			const ComponentType& getComponent(EntityID id) const {
				return *(const ComponentType*)getComponent(ComponentType::id());
			}

			template<typename ComponentType>
			ComponentType& getComponent(EntityID id) {
				return *(ComponentType*)getEntity(id).getComponentPointer(ComponentType::id());
			}

			HostComponentID getHostComponent(EntityID id, ComponentID type) const {
				auto& ent = getEntity(id);
				auto cid = ent.getHostComponent(type);
				return cid;
			}
			ComponentPtr getComponent(EntityID id, ComponentID type) const {
				return getEntity(id).getComponentPointer(type);
			}
            void destroyEntity(EntityID id) {
                getEntity(id).destroy();
            }
			ComponentID findTypeID(const string & name) const {
				auto iter = _typeLookup.find(name);
				if(iter==_typeLookup.end())
					return kInvalidComponentID;

				return iter->second;
			}

			ComponentID registerHostComponent(function<HostComponentID()> alloc,function<void (HostComponentID)> free, const string &name, bool singleton=false) {
				ComponentID id = (ComponentID)(_hostComponents.size()+nativeComponentCount());
				
				_hostComponents.push({
					alloc,
					free
				});
				_typeLookup[name] = id;
				_totalComponentCount = id+1;

				if(singleton) {
					EntityID ent = createEntity();
					_singletonEntities.push(ent);
					const Cj::Framework::EntityID *data = _singletonEntities.data();
					addComponent(ent, id);
				} else _singletonEntities.push(kNullEntityID);

				return  id;
			}

            size_t query(ConstConditionPtr pCondition, Array<EntityID> &results) {
                results.clear();
                for (size_t i = 0; i < _entities.size(); i++) {
                    if (pCondition->test(*_entities[i]))
                        results.push(_entities[i]->id());
                }
                return results.size();
            }

            SystemID addSystem(System::Function cb, ConstConditionPtr pCondition,int priority=0) {
                SystemID id = (SystemID)_systems.size();
				_systems.push({
						cb, pCondition, id, priority
					});
				_systemsOrder.push_back(id);
				sortSystems();
				return id;
			}
			
			void removeSystem(SystemID systemId) {
				_systems.remove(systemId);
				_systemsOrder.clear();
				for (int i = 0; i < _systems.size(); i++)
					_systemsOrder.push_back(i);
				sortSystems();
			}


			void step();

			const Array<Entity*>& entities() {
				return _entities;
			}
			const Array<EntityID>& singletonEntities() {
				return _singletonEntities;
			}

			size_t nativeComponentCount() {
				return _componentDescriptions.size();
			}
			size_t totalComponentCount() {
				return _totalComponentCount;
			}
			size_t hostComponentCount() {
				return _totalComponentCount-nativeComponentCount();
			}

			shared_ptr<Condition> deserialize(const string& jsonStr) {
				return deserializeCondition(json::parse(jsonStr));
			}
		private:

			struct HostComponentType {
				function<HostComponentID()> alloc;
				function<void(ComponentID)> free;
			};

			shared_ptr<Condition> deserializeCondition(const json& jsonVal);
			void deleteEntity(Entity*pEnt) {
				delete pEnt;
			}

			Entity* allocateEntity(EntityID id) {
				return new Entity(id);
			}

			void sortSystems() {

				std::sort(_systemsOrder.begin(), _systemsOrder.end(), [this](int a, int b) {
					return _systems[a] > _systems[b];
					});
			}
			Array<System> _systems;
			vector<SystemID> _systemsOrder;
			Array<Entity*> _entities;
			Array<EntityID> _singletonEntities;
			function<ComponentPtr(ComponentID)> _componentAllocator;
			Array<HostComponentType> _hostComponents;
			chrono::time_point<chrono::steady_clock> _startTime;
			chrono::time_point<chrono::steady_clock> _lastTime;
			size_t _totalComponentCount;
			vector<ComponentDescription> _componentDescriptions;
			map<string, ComponentID> _typeLookup;

        };


		class ModifiedCondition : public Condition {
		public:
            ModifiedCondition(ComponentID comp) : _comp(comp) {}
			bool test(const Entity& entity) const override {
				return entity.componentModified(_comp);
			}
		private:
			ComponentID _comp;
		};

		class CreatedCondition : public Condition {
		public:
            CreatedCondition(ComponentID comp) : _comp(comp) {}
			bool test(const Entity& entity) const override {
				return entity.componentCreated(_comp);
			}
		private:
			ComponentID _comp;
		};

		class DestroyedCondition : public Condition {
		public:
            DestroyedCondition(ComponentID comp) : _comp(comp) {}
			bool test(const Entity& entity) const override {
				return entity.componentDestroyed(_comp);
			}
		private:
			ComponentID _comp;
		};

        class ExistsCondition : public Condition {
        public:
            ExistsCondition(ComponentID comp, bool negate=false) : _comp(comp), _negate(negate) {}
            bool test(const Entity& entity) const override {
                bool res = entity.hasComponent(_comp);
				res = _negate ? !res : res;
                return res;
            }
        private:
            ComponentID _comp;
            bool _negate;
		};

		class AllCondition : public Condition {
		public:
            AllCondition(vector<ConditionPtr> children = {}) : _children(std::move(children)) {

            }

            template <typename Cond, typename ... Args>
			void addChild(Args&& ... args) {
				_children.push_back(makeCondition<Cond>(forward<Args>(args)...));
			}

			bool test(const Entity& entity) const override {
                for (auto& pCond : _children) {
                    if (!pCond->test(entity))
					{
                        return false;
					}
                }
				return true;
			}
		private:
            vector<ConditionPtr> _children;
		};

		class AnyCondition : public Condition {
		public:
            AnyCondition(vector<ConditionPtr> &&children = {}) {
                for (auto& child : children) {
                    _children.push_back(std::move(child));
                }
            }

			template <typename Cond, typename ... Args>
			void addChild(Args&& ... args) {
				_children.push_back(makeCondition<Cond>(forward<Args>(args)...));
			}
			bool test(const Entity& entity) const override {
				for (auto& pCond : _children) {
					if (pCond->test(entity))
						return true;
				}
                return false;
			}
		private:
			vector<ConditionPtr> _children;
		};

		template<typename Component>
        class ComponentAllocator {
        public:
			ComponentAllocator(World *world, const string &componentName, bool singleton = false):_world(world) {
				_componentDefID = world->registerHostComponent([this]() {
					HostComponentID ci = (HostComponentID)new Component();
					return ci;
				}, [this](HostComponentID id) {
					Component* ptr = (Component*)id;
					delete ptr;
				}, componentName, singleton);
			}
			ComponentID id() const  { return _componentDefID; }
			Component &get(EntityID ent) const {
				HostComponentID id = _world->getHostComponent(ent, _componentDefID);
				return *(Component*)id;
			}

		private:
			World *_world;
			ComponentID _componentDefID;
        };
 
    }
}