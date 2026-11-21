cmake_minimum_required(VERSION 3.22)
project(AETHER VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Enable aggressive optimizations for real-time DSP
if (CMAKE_CXX_COMPILER_ID MATCHES "Clang|AppleClang|GNU")
    add_compile_options(-O3 -Wall -Wextra -ffast-math)
endif()

# Core sources for DSP engine and analyzer
set(AETHER_CORE_SOURCES
    src/dsp/AetherDSPChain.cpp
    src/dsp/StemPlaybackEngine.cpp
    src/analyzer/TelemetryAnalyzer.cpp
    src/plugin/StateManager.cpp
    src/plugin/IPCBridge.cpp
    src/plugin/PluginProcessor.cpp
)

set(AETHER_CORE_HEADERS
    src/dsp/AetherDSPParameters.h
    src/dsp/AetherDSPChain.h
    src/dsp/SPSCQueue.h
    src/dsp/StemPlaybackEngine.h
    src/analyzer/AudioTelemetry.h
    src/analyzer/TelemetryAnalyzer.h
    src/plugin/StateManager.h
    src/plugin/IPCBridge.h
    src/plugin/PluginProcessor.h
)

# 1. Standalone Native Engine (Zero-dependency C++20 binary)
add_executable(aether_standalone
    src/plugin/StandaloneRunner.cpp
    ${AETHER_CORE_SOURCES}
    ${AETHER_CORE_HEADERS}
)

target_include_directories(aether_standalone PRIVATE
    src
    src/dsp
    src/analyzer
    src/plugin
)

target_link_libraries(aether_standalone PRIVATE pthread)

# 2. JUCE 8 Plugin Targets (VST3, AU, Standalone) if JUCE is present
option(AETHER_BUILD_JUCE_PLUGIN "Build JUCE VST3/AU Plugins" OFF)

if (AETHER_BUILD_JUCE_PLUGIN)
    find_package(JUCE 8 QUIET CONFIG)
    if (JUCE_FOUND)
        juce_add_plugin(AETHER
            COMPANY_NAME "AETHER Audio"
            IS_SYNTH FALSE
            NEEDS_MIDI_INPUT TRUE
            NEEDS_MIDI_OUTPUT FALSE
            IS_MIDI_EFFECT FALSE
            EDITOR_WANTS_KEYBOARD_FOCUS TRUE
            COPY_PLUGIN_AFTER_BUILD TRUE
            PLUGIN_MANUFACTURER_CODE Aeth
            PLUGIN_CODE Aeth
            FORMATS VST3 AU Standalone
            PRODUCT_NAME "AETHER Co-Producer"
        )

        target_sources(AETHER PRIVATE
            ${AETHER_CORE_SOURCES}
            src/plugin/JucePluginAdapter.cpp
        )

        target_include_directories(AETHER PRIVATE
            src
            src/dsp
            src/analyzer
            src/plugin
        )

        target_compile_definitions(AETHER PRIVATE
            JUCE_WEB_BROWSER=1
            JUCE_USE_CURL=0
            JUCE_VST3_CAN_REPLACE_VST2=0
        )

        target_link_libraries(AETHER PRIVATE
            juce::juce_audio_utils
            juce::juce_audio_processors
            juce::juce_dsp
            juce::juce_gui_extra
        )
    endif()
endif()
