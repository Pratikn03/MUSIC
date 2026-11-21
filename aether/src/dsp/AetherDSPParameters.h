#pragma once

#include <string>
#include <unordered_map>
#include <vector>
#include <algorithm>
#include <cmath>

namespace aether {

struct DSPParamDef {
    std::string id;
    std::string name;
    float minValue;
    float maxValue;
    float defaultValue;
    std::string unit;
    float skewFactor{1.0f}; // For logarithmic frequency scaling
};

inline const std::vector<DSPParamDef>& getParameterDefinitions() {
    static const std::vector<DSPParamDef> defs = {
        // Input stage
        {"input_gain_db", "Input Gain", -36.0f, 36.0f, 0.0f, "dB"},
        {"phase_invert", "Phase Invert", 0.0f, 1.0f, 0.0f, ""},

        // 4-Band Parametric EQ
        // Band 1: Low Shelf
        {"eq_band1_enable", "EQ Band 1 Enable", 0.0f, 1.0f, 1.0f, ""},
        {"eq_band1_freq", "EQ Band 1 Freq", 20.0f, 500.0f, 80.0f, "Hz", 0.35f},
        {"eq_band1_gain", "EQ Band 1 Gain", -24.0f, 24.0f, 0.0f, "dB"},
        {"eq_band1_q", "EQ Band 1 Q", 0.1f, 10.0f, 0.707f, ""},

        // Band 2: Low-Mid Bell
        {"eq_band2_enable", "EQ Band 2 Enable", 0.0f, 1.0f, 1.0f, ""},
        {"eq_band2_freq", "EQ Band 2 Freq", 50.0f, 4000.0f, 350.0f, "Hz", 0.35f},
        {"eq_band2_gain", "EQ Band 2 Gain", -24.0f, 24.0f, 0.0f, "dB"},
        {"eq_band2_q", "EQ Band 2 Q", 0.1f, 10.0f, 1.4f, ""},

        // Band 3: High-Mid Bell
        {"eq_band3_enable", "EQ Band 3 Enable", 0.0f, 1.0f, 1.0f, ""},
        {"eq_band3_freq", "EQ Band 3 Freq", 200.0f, 16000.0f, 2500.0f, "Hz", 0.35f},
        {"eq_band3_gain", "EQ Band 3 Gain", -24.0f, 24.0f, 0.0f, "dB"},
        {"eq_band3_q", "EQ Band 3 Q", 0.1f, 10.0f, 1.4f, ""},

        // Band 4: High Shelf
        {"eq_band4_enable", "EQ Band 4 Enable", 0.0f, 1.0f, 1.0f, ""},
        {"eq_band4_freq", "EQ Band 4 Freq", 1000.0f, 20000.0f, 8500.0f, "Hz", 0.35f},
        {"eq_band4_gain", "EQ Band 4 Gain", -24.0f, 24.0f, 0.0f, "dB"},
        {"eq_band4_q", "EQ Band 4 Q", 0.1f, 10.0f, 0.707f, ""},

        // Dynamics Compressor
        {"comp_enable", "Compressor Enable", 0.0f, 1.0f, 1.0f, ""},
        {"comp_threshold", "Compressor Threshold", -60.0f, 0.0f, -14.0f, "dB"},
        {"comp_ratio", "Compressor Ratio", 1.0f, 30.0f, 2.5f, ":1"},
        {"comp_attack_ms", "Compressor Attack", 0.1f, 200.0f, 15.0f, "ms"},
        {"comp_release_ms", "Compressor Release", 5.0f, 2000.0f, 120.0f, "ms"},
        {"comp_makeup_gain_db", "Compressor Makeup", -12.0f, 24.0f, 0.0f, "dB"},

        // Stereo & Master Stage
        {"stereo_width", "Stereo Width", 0.0f, 2.0f, 1.0f, ""},
        {"pan", "Pan", -1.0f, 1.0f, 0.0f, ""},
        {"limiter_enable", "Limiter Enable", 0.0f, 1.0f, 1.0f, ""},
        {"limiter_ceiling_db", "Limiter Ceiling", -12.0f, 0.0f, -0.2f, "dB"},
        {"output_gain_db", "Output Gain", -36.0f, 36.0f, 0.0f, "dB"}
    };
    return defs;
}

struct ParameterSnapshot {
    std::unordered_map<std::string, float> values;

    ParameterSnapshot() {
        for (const auto& def : getParameterDefinitions()) {
            values[def.id] = def.defaultValue;
        }
    }

    float get(const std::string& id, float fallback = 0.0f) const {
        auto it = values.find(id);
        return it != values.end() ? it->second : fallback;
    }

    void set(const std::string& id, float val) {
        values[id] = val;
    }
};

} // namespace aether
