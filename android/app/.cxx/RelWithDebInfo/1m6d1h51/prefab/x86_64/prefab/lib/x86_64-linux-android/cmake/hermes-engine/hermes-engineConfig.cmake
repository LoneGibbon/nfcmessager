if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "/Users/lonegibbon/.gradle/caches/8.14.3/transforms/0e0f0bc16ce71b4bb1635bc077939c32/transformed/hermes-android-0.81.0-release/prefab/modules/libhermes/libs/android.x86_64/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "/Users/lonegibbon/.gradle/caches/8.14.3/transforms/0e0f0bc16ce71b4bb1635bc077939c32/transformed/hermes-android-0.81.0-release/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

