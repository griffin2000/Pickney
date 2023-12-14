
#include "PickneyFramework.h"

#include <chrono>



namespace Cj
{
	namespace Framework
	{

		const char String::_sEmptyString[1] = "";

		World::World(function<ComponentPtr(ComponentID)> componentAllocator, const vector<ComponentDescription> &components ) :
		_componentAllocator(componentAllocator),_componentDescriptions(components) {
			_startTime = std::chrono::steady_clock::now();
			for(ComponentID i=0;i< _componentDescriptions.size();i++) {
				EntityID id = kNullEntityID;
				_typeLookup[_componentDescriptions[i].name] = i;

				if(_componentDescriptions[i].isSingleton) {
					id = createEntity();
					addComponent(id, i);
				}
				_singletonEntities.push(id);
			}
		}

		shared_ptr<Condition> World::deserializeCondition(const json& jsonVal) {

			auto type = jsonVal.type();


			if (type == json::value_t::string) {
				ComponentID id = findTypeID((string)jsonVal);
				CjAssert(id != kInvalidComponentID, "Component %s does not exist");
				return makeCondition<ExistsCondition>(id);
			}
			else if (type == json::value_t::array) {
				vector<ConditionPtr> children;
				for (size_t i = 0; i < jsonVal.size(); i++) {
					children.push_back(deserializeCondition(jsonVal[i]));
				}
				return makeCondition<AllCondition>(move(children));
			}
			string condStr = jsonVal["condition"];

			if (condStr.compare("modified") == 0) {
				string compName = jsonVal["component"];
				ComponentID id = findTypeID((string)compName);
				CjAssert(id != kInvalidComponentID, "Component %s does not exist", compName.c_str());

				return makeCondition<ModifiedCondition>(id);
			}
			else if (condStr.compare("created") == 0) {
				string compName = jsonVal["component"];
				ComponentID id = findTypeID((string)compName);
				CjAssert(id != kInvalidComponentID, "Component %s does not exist", compName.c_str());

				return makeCondition<CreatedCondition>(id);
			}
			else if (condStr.compare("destroyed") == 0) {
				string compName = jsonVal["component"];
				ComponentID id = findTypeID((string)compName);
				CjAssert(id != kInvalidComponentID, "Component %s does not exist", compName.c_str());

				return makeCondition<DestroyedCondition>(id);
			}
			else if (condStr.compare("exists") == 0) {
				string compName = jsonVal["component"];
				bool negate= false;
				if(jsonVal.find("negate")!=jsonVal.end() && jsonVal["negate"])
					negate = true;
				ComponentID id = findTypeID(compName);
				CjAssert(id != kInvalidComponentID, "Component %s does not exist", compName.c_str());

				return makeCondition<ExistsCondition>(id, negate);
			}
			else if (condStr.compare("all") == 0) {
				vector<ConditionPtr> children;
				for (size_t i = 0; i < jsonVal["children"].size(); i++) {
					children.push_back(deserializeCondition(jsonVal["children"][i]));
				}
				return makeCondition<AllCondition>(move(children));

			}
			else if (condStr.compare("any") == 0) {
				vector<ConditionPtr> children;
				auto& childrenJson = jsonVal["children"];
				for (size_t i = 0; i < childrenJson.size(); i++) {
					children.push_back(deserializeCondition(childrenJson[i]));
				}
				return makeCondition<AnyCondition>(move(children));

			}
			return nullptr;
		}

		void World::step() {
			auto nowTime = std::chrono::steady_clock::now();
			std::chrono::duration<double> nowDuration = nowTime - _startTime;
			std::chrono::duration<float> delta = nowTime - _lastTime;
			_lastTime = nowTime;
			Globals globals = {
					nowDuration.count(),
					delta.count()
			};


			for (int i = 0; i < _systemsOrder.size(); i++) {
				Array<EntityID> selectedEntities;
				auto& system = _systems[_systemsOrder[i]];

				query(system.pCondition, selectedEntities);
				if (selectedEntities.size())
					system.function(globals, selectedEntities);
			}

			_entities.forEach([&](Entity* entity) {
				if (entity->isDestroyed()) {
					entity->doDestroy();
					deleteEntity(entity);
					return true;
				}
				entity->forAllComponents([&](ComponentReference& compRef) {
					compRef.clearMutableFlags();
					return true;
				});
				return true;
			});
		}


		bool operator >(const System& a, const System& b) {
			if (a.priority != b.priority)
				return a.priority > b.priority;

			return a.id < b.id;
		}
	}
}


std::size_t std::hash<Cj::Framework::String>::operator()(Cj::Framework::String const& val) const {
	return std::hash<std::string>()(val.c_str());
}