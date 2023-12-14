
#include <iostream>
#include <string>
#include <fstream>
#include <streambuf>
#include <map>


#include "PickneyFramework.h"
#include "PickneyComponents.h"
#include "PickneyFrameworkEmscriptenInterface.h"

extern "C" int  initializeHumanIK();


string readFile(const string &filename) {
	std::ifstream t(filename);
	std::string str((std::istreambuf_iterator<char>(t)),
		std::istreambuf_iterator<char>());
    return str;
}

struct Foo {
	map<string, string> stuff;
};
struct Bar {
	string bloop;
};
struct Bloop {
	string x;
};
struct Bleep {
	string y;
};

struct TestCharacterDefinition {
	int mUsedNodes[16];
};

int main() {
	initialize();
	Cj::Framework::World *pWorld = getFrameworkWorld();

	size_t arrayMemSize = sizeof(Cj::Framework::StringArray);
	uint8_t* pStringArrayBuffer = new uint8_t[arrayMemSize];
	memset(pStringArrayBuffer, 0, arrayMemSize);
	Cj::Framework::StringArray* pStringArray = (Cj::Framework::StringArray*)pStringArrayBuffer;

	int n = 10;
	pStringArray->push("Bar!");
	cout << "Bar string:"<<pStringArray->at(0).c_str() << endl;
	pStringArray->reset(n, true);
	pStringArray->at(1).set("Foo", 3);
	cout << "Array location:0 " << pStringArray->at(0).c_str() << endl;
	cout << "Array location:1 " << pStringArray->at(1).c_str() << endl;

	Cj::Framework::Map<Cj::Framework::String> testMap;
	testMap.set("foo", "bar");
	testMap.set("bloop", "bar");
	cout << "Map foo: " << testMap.get("foo")->c_str() << endl;
	testMap.set("foo", "bleep");
	cout << "Map foo: " << testMap.get("foo")->c_str() << endl;
	testMap.remove("bloop");
	cout << "Map bloop: " << testMap.get("bloop") << endl;
	testMap.set("floop", "bleeeep");
	cout << "Map floop: " << testMap.get("floop")->c_str() << endl;
	testMap.set("plooo", "bar");
	testMap.set("blat", "bar");
	testMap.set("flap", "bar");
	testMap.remove("blat");
	testMap.forEach([](const Cj::Framework::String& key, const Cj::Framework::String& val) {
		cout << key.c_str() << " " << val.c_str() << endl;
		return true;
	});
	Cj::Framework::ComponentAllocator<Foo>* foos = new Cj::Framework::ComponentAllocator<Foo>(pWorld, "foo", true);
	Cj::Framework::ComponentAllocator<Bar>* bars = new Cj::Framework::ComponentAllocator<Bar>(pWorld, "bar", true);

	Cj::Framework::ComponentAllocator<Bloop>* bloops = new Cj::Framework::ComponentAllocator<Bloop>(pWorld, "bloop");
	Cj::Framework::ComponentAllocator<Bleep>* bleeps = new Cj::Framework::ComponentAllocator<Bleep>(pWorld, "bleep");

	auto& singletons = pWorld->singletonEntities();
	auto barEntId = singletons[bars->id()];
	auto barHostCompId = pWorld->getHostComponent(barEntId, bars->id());

	auto fooEntId = singletons[foos->id()];
	auto fooHostCompId = pWorld->getHostComponent(fooEntId, foos->id());
    CjAssert(fooEntId != Cj::Framework::kNullEntityID, "Invalid entity");

	//Cj::Framework::ComponentAllocator<TestThreeNode>* threeNodeDefs = new Cj::Framework::ComponentAllocator<TestThreeNode>(pWorld, "threeNode");


	auto pCondFromJSON = pWorld->deserialize(readFile("../src/cond.json"));


	pWorld->addSystem(
		[&](const Cj::Framework::Globals& globals, const Cj::Framework::Array<Cj::Framework::EntityID>& entities) {
			entities.forEach([&](const Cj::Framework::EntityID entID) {
				auto& ent = pWorld->getEntity(entID);
				cout << ent.id() << std::endl;
				return true;
			});
		},
		pCondFromJSON);


	pWorld->addSystem(
		[&](const Cj::Framework::Globals& globals, const Cj::Framework::Array<Cj::Framework::EntityID>& entities) {
			entities.forEach([&](const Cj::Framework::EntityID entID) {
				auto& ent = pWorld->getEntity(entID);
				cout << "High priority! "<<ent.id() << std::endl;
				return true;
				});
		},
		pCondFromJSON, +1);
	Cj::Framework::EntityID charEntId = pWorld->createEntity();
	auto& charDef = pWorld->addComponent<Cj::Framework::Components::CharacterDefinition>(charEntId);
	charDef.nodesUsed.push("Foo");
	charDef.nodesUsed.push("Foot");
	charDef.nodesUsed.push("Toot");
	auto& charComp = pWorld->addComponent<Cj::Framework::Components::Character>(charEntId);
	charComp.definition = charEntId;

	
    vector<Cj::Framework::EntityID> ids;
	Cj::Framework::EntityID parentEntId = pWorld->createEntity();
    for (size_t i = 0; i < 20; i++) {

        Cj::Framework::EntityID testEntId = pWorld->createEntity();
		ids.push_back(testEntId);
		pWorld->addComponent<Cj::Framework::Components::Transform>(testEntId).translation = glm::vec3(i * 0.5, 0, 0);
		pWorld->addComponent<Cj::Framework::Components::Hierarchy>(testEntId).parent = parentEntId;
        pWorld->addComponent(testEntId, bloops->id());
    }
    pWorld->modifyComponent<Cj::Framework::Components::Transform>(ids[3]).scale = glm::vec3(2, 2, 2);

	shared_ptr<Cj::Framework::AllCondition> pCond = make_shared<Cj::Framework::AllCondition>();
    pCond->addChild<Cj::Framework::ExistsCondition>(Cj::Framework::Components::Type::kTransform);

    Cj::Framework::Array<Cj::Framework::EntityID> entities;
    pWorld->query(pCond, entities);

	//initializeHumanIK();

    pWorld->step();
    return 0;
}
