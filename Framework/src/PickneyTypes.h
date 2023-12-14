#pragma once

#include <iostream>
#include <array>
#include <string>
#include <vector>
#include <unordered_map>
#include <assert.h>
#include <functional>
#include <chrono>
#include <list>

#include <chrono>

#include <nlohmann/json.hpp>
using json = nlohmann::json;


#define GLM_FORCE_CTOR_INIT
#pragma warning(push)
#pragma warning(disable : 4127) // nameless struct/union
#pragma warning(disable : 4201) // conditional expression is not constant
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/type_ptr.hpp>
#include <glm/gtc/epsilon.hpp>
#include <glm/gtx/transform.hpp>
#include <glm/gtx/quaternion.hpp>
#include <glm/gtx/matrix_decompose.hpp>
#include  <glm/gtx/euler_angles.hpp>
#pragma warning(pop)

using namespace std;
using namespace glm;

#pragma warning(disable : 4996)

namespace Cj
{
    namespace Framework
    {

		/// Creates a string from variable arguments.
		template <typename... Args>
		std::string stringFormat(const std::string& format, Args... args)
		{
			// Disable the Clang security warning.
			// TODO: Implement a better workaround for this warning.
#if __clang__
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wformat-security"
#endif
		// Calculate the size of the expanded format string.
			const char* formatStr = format.c_str();
			int size = std::snprintf(nullptr, 0, formatStr, args...) + 2;
			if (size <= 0)
			{
				// Report an error if formating fails.
				std::cerr << __FUNCTION__ << " Error during formatting." << std::endl;

				return "";
			}

			// Allocate a buffer for the formatted string and place the expanded string in it.
			std::vector<char> buf(size);
			std::snprintf(buf.data(), size, formatStr, args...);
#if __clang__
#pragma clang diagnostic pop
#endif

			// Add a newline if there is not already one at the end, and terminate the string.
			if (buf[size - 3] != '\n')
			{
				buf[size - 2] = '\n';
				buf[size - 1] = 0;
			}
			else
			{
				buf[size - 2] = 0;
			}

			// Return a new string object from the buffer.
			// TODO: Avoid multiple allocations.
			return std::string(buf.data(), buf.data() + size - 1);
		};

		template <typename... Args>
		bool log(std::ostream& stream, const std::string& file, int line,
			const std::string& format, Args... args)
		{

			// Format the message with the variable arguments.
			std::string formattedMsg = stringFormat(format, args...);

			// Get the file and line prefix for non-zero lines and the expanded format string.
			std::string prefix = line > 0 ? (file + " (" + std::to_string(line) + "):\t") : "";
			std::string msg = prefix + formattedMsg;

			// Output to the debug console and the specified output stream.
			stream << msg;

			return true;
		}

#define CjWarning(_msg, ...) Cj::Framework::log(std::cerr, __FILE__, __LINE__, _msg, ##__VA_ARGS__)

#define CjAssert(_check, _msg, ...)                                                              \
    do                                                                                             \
    {                                                                                              \
        if (!(_check))                                                                             \
        {                                                                                          \
            Cj::Framework::log(std::cerr, __FILE__, __LINE__,                                         \
                "CjAssert check failed (%s)!=true - " _msg, #_check, ##__VA_ARGS__);             \
            ::abort();             \
        }                                                                                          \
    } while (false)


		using EntityID = int32_t;
		using SystemID = int32_t;

		using ComponentID = int16_t;
		enum : ComponentID { kInvalidComponentID = -1 };

        using HostComponentID = size_t;

		enum : EntityID { kNullEntityID = -1 };
        class ComponentBase {};
        using ComponentPtr = ComponentBase*;

        template<typename Element>
        class Array {
        public:
            Array(const Array& other) {
                copy(other);
            }

            Array(size_t capacity = 16) {
				reset(capacity);
            }
            Array(size_t capacity, const Element & defaultVal) {
				reset(capacity, true);
                fill(defaultVal);
            }
            ~Array() {
                reset(0);
            }

            Element& operator[](size_t n) { return at(n); }
            const Element& operator[](size_t n) const { return at(n); }

			Element& at(size_t n) { CjAssert(n < _size, "Index %d exceeds array length %d", n, _size);  return elements()[n]; }
			const Element& at(size_t n) const { CjAssert(n < _size, "Index %d exceeds array length %d", n, _size); return elements()[n]; }

            Element*data() { return (Element*)_pData; }
            const Element*data() const { return (const Element*)_pData; }

            size_t size() const { return _size; }
            size_t capacity() const { return _capacity; }
            Element& push(const Element& val = Element()) {
                if (_capacity == _size) {
                    Element* pOldElements = elements();
                    size_t oldCapacity = _capacity;
					_capacity = _capacity ? (_capacity*2) : 16;
					alloc(_capacity);
                    for (size_t i = 0; i < oldCapacity; i++) {
                        elements()[i] = std::move(pOldElements[i]);
                    }
                    if(pOldElements)
                        delete[] pOldElements;
                }
                Element* pElem = elements()+_size;
                *pElem = val;
                _size++;
                return *pElem;
            }

            bool empty() const {
                return size() == 0;
            }

            void remove(int n) {
                Element *pElem = elements();
                for (int i = n; i < _size-1; i++) {
                    pElem[i] = pElem[i + 1];
                }
                pElem[_size - 1] = Element();
                _size--;
            }
            int find(const Element& val) {
                Element *pElem = elements();
                for (int i = 0; i < _size; i++) {
                    if (pElem[i] == val) {
                        return i;
                    }
                }
                return -1;
            }
            void clear() {
                _size = 0;
            }

            void fill(const Element& val) {
                Element *pElem = elements();
                for (size_t i = 0; i < size(); i++) {
                    pElem[i] = val;
                }                
            }

            void reset(size_t capacity=0, bool setSize=false) {
                clear();
                if (elements()) {
                    delete[] elements();
                }
                alloc(capacity);
                _capacity = capacity;
                if(setSize)
                    _size = capacity;
            }

			size_t forEach(function<bool(Element&)> func) {
				for (size_t i = 0; i < size(); i++) {
					if (!func(at(i)))
						return (i - 1);
				}
				return size();
			}

            size_t forEach(function<bool(const Element &)> func) const {
                for (size_t i = 0; i < size(); i++) {
                    if (!func(at(i)))
                        return (i - 1);
                }
                return size();
            }

            Array<Element>& operator = (const Array<Element>& other)
            {
                copy(other);
                return *this;
            }
            
            size_t stride() {
                return sizeof(Element);
            }
        private:
            void copy(const Array<Element>& other)
            {
                reset(other.capacity());
                for (int i = 0; i < other.size(); i++) {
                    push(other[i]);
                }
            }
            void alloc(size_t n) {
                if (n == 0)
                {
                    _pData = nullptr;
                    return;
                }
                _pData = new Element[n];
            }
            Element* elements() { return (Element*)(_pData); }
            const Element* elements() const { return (const Element*)(_pData); }

        private:
            Element* _pData = nullptr;
            size_t _capacity = 0;
            size_t _size = 0;

        };

        class String : public Array<char> {
        public:

            String(const Array& other) :Array<char>(other) { }

            String() : Array<char>(0) { }

            String(const string& str) : Array<char>(0) {
                set(str.c_str(), str.size());
            }

            String(const char *str) : Array<char>(0) {
                size_t len = strlen(str);
                set(str, len);
            }

            void set(const char *str, size_t len) {
                reset(len);
                init(str,len);
            }

            const char* c_str() const {
                if (!size())
                    return _sEmptyString;
                return data();
            }
            bool operator == (const String& str) const
            {
                return std::strcmp(c_str(),str.c_str())==0;
            }

            String & operator = (const String& str)
            {
                init(str.c_str(), str.size());
                return *this;
            }
        private:
            void init(const char *str, size_t n) {                
                if (n == 0) {
                    reset(0);
                    return;
                }
                reset(n, true);
                std::memcpy(data(), str, n);
                if (*(data() + (n - 1)) != 0)
                    push(0);
            }
            static const char _sEmptyString[1];
        };

		using Name = String;
		using Uri = String;
        using Bool = int;

        using StringArray = Cj::Framework::Array<Cj::Framework::String>;
        using EntityIDArray = Cj::Framework::Array<Cj::Framework::EntityID>;
        using IntArray = Cj::Framework::Array<int>;
        using FloatArray = Cj::Framework::Array<float>;
        using Matrix4Array = Cj::Framework::Array<mat4>;
        using Matrix3Array = Cj::Framework::Array<mat3>;
        using Matrix2Array = Cj::Framework::Array<mat2>;
        
        using QuatArray = Cj::Framework::Array<quat>;
        using Float4Array = Cj::Framework::Array<vec4>;
        using Float3Array = Cj::Framework::Array<vec3>;
        using Float2Array = Cj::Framework::Array<vec2>;

        template<typename Value, typename Key=String>
        class Map {
        public:
            Map() {
            }
            ~Map() {
                if(_pLookup)
                    delete _pLookup;
                if (_pFreeList)
                    delete _pFreeList;
            }

            Array<Value>* valueArray() {
                return &_values;
            }
            Array<Key>* keyArray() {
                return &_keys;
            }
            void set(const Key& key, const Value& val) {
                auto &lookupMap = *lookup();
                if (!has(key)) {
                    size_t idx;
                    if (freeList()->size()) {
                        idx = freeList()->back();
                        freeList()->pop_back();
                        _values[idx] = val;
                        _keys[idx] = key;
                    }
                    else {
                        idx = _keys.size();
                        _keys.push(key);
                        _values.push(val);
                    }
                    lookupMap[key] = idx;
                    _count++;
                    return;
                }
                size_t idx = lookupMap[key];
                _values[idx] = val;
            }
            bool has(const Key& key) {
                auto& lookupMap = *lookup();
                return lookupMap.find(key) != lookupMap.end();
            }
            const Value* get(const Key& key) {
                auto iter = lookup()->find(key);
                if (iter == lookup()->end())
                    return nullptr;
                return _values.data() + iter->second;
            }

            void remove(const Key& key) {
                size_t idx = lookup()->at(key);
                freeList()->push_back(idx);
                lookup()->erase(key);
                _values[idx] = Value();
                _keys[idx] = Key();
                _count--;
            }

            void clear() {
                _values.clear();
                _keys.clear();
                _count=0;
                if(_pLookup) {
                    delete _pLookup;
                    _pLookup=nullptr;
                }
                if(_pFreeList) {
                    delete _pFreeList;
                    _pFreeList=nullptr;
                }
            }

            size_t forEach(function<bool(const Key&key, const Value& value)> func) const {
                size_t n = 0;
                for (size_t i = 0; i < _keys.size(); i++) {
                    const Key& k = _keys.at(i);
                    const Value& v = _values.at(i);
                    if (!k.empty()) {
                        n++;
                        if(!func(k, v))
                            return (i - 1);
                    }
                }
                return n;
            }
        private:
            unordered_map<Key, size_t>* lookup() {
                if (!_pLookup)
                    _pLookup = new unordered_map<Key, size_t>();
                return _pLookup;
            }
            vector<size_t>* freeList() {
                if (!_pFreeList)
                    _pFreeList = new vector<size_t>();
                return _pFreeList;
            }
            Array<Value> _values;
            Array<Key> _keys;
            unordered_map<Key, size_t>* _pLookup = nullptr;
            vector<size_t>* _pFreeList = nullptr;
            size_t _count;
        };
        using StringMap = Cj::Framework::Map<Cj::Framework::String,Cj::Framework::String>;
        using EntityIDMap = Cj::Framework::Map<Cj::Framework::EntityID, Cj::Framework::String>;

		struct ComponentDescription {
			string name;
			bool isSingleton;
		};


    }
}

namespace std {
    template <> struct hash<Cj::Framework::String> {
        std::size_t operator()(const Cj::Framework::String& cp) const;
    };
}

