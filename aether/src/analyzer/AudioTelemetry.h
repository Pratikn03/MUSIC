#pragma once

#include <string>
#include <vector>
#include <sstream>
#include <iomanip>

namespace aether {

struct SpectralBandsDB {
    float sub{-60.0f};      // 20 - 60 Hz
    float bass{-60.0f};     // 60 - 250 Hz
    float low_mid{-60.0f};  // 250 - 500 Hz
    float mid{-60.0f};      // 500 - 2000 Hz
    float high_mid{-60.0f}; // 2000 - 6000 Hz
    float air{-60.0f};      // 6000 - 20000 Hz

    std::string toJSON() const {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(2);
        ss << "{"
           << "\"sub\":" << sub << ","
           << "\"bass\":" << bass << ","
           << "\"low_mid\":" << low_mid << ","
           << "\"mid\":" << mid << ","
           << "\"high_mid\":" << high_mid << ","
           << "\"air\":" << air
           << "}";
        return ss.str();
    }
};

struct AudioTelemetry {
    float lufs_short_term{-70.0f};
    float lufs_integrated{-70.0f};
    float peak_db{-70.0f};
    float rms_db{-70.0f};
    SpectralBandsDB bands_db;
    float stereo_correlation{1.0f};
    float comp_gain_reduction_db{0.0f};
    std::vector<float> fft_magnitudes; // 128 or 256 display bins for spectrum visualizer

    std::string toJSON() const {
        std::ostringstream ss;
        ss << std::fixed << std::setprecision(2);
        ss << "{"
           << "\"lufs_short_term\":" << lufs_short_term << ","
           << "\"lufs_integrated\":" << lufs_integrated << ","
           << "\"peak_db\":" << peak_db << ","
           << "\"rms_db\":" << rms_db << ","
           << "\"bands_db\":" << bands_db.toJSON() << ","
           << "\"stereo_correlation\":" << stereo_correlation << ","
           << "\"comp_gain_reduction_db\":" << comp_gain_reduction_db << ","
           << "\"fft_spectrum\":[";
        for (size_t i = 0; i < fft_magnitudes.size(); ++i) {
            ss << fft_magnitudes[i];
            if (i + 1 < fft_magnitudes.size()) ss << ",";
        }
        ss << "]}";
        return ss.str();
    }
};

} // namespace aether
