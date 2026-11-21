#pragma once

#ifdef JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED
#include <juce_audio_processors/juce_audio_processors.h>
#include <juce_gui_extra/juce_gui_extra.h>
#include "PluginProcessor.h"

namespace aether {

class AetherAudioProcessorEditor;

class AetherAudioProcessor : public juce::AudioProcessor {
public:
    AetherAudioProcessor();
    ~AetherAudioProcessor() override;

    void prepareToPlay(double sampleRate, int samplesPerBlock) override;
    void releaseResources() override;
    void processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer& midiMessages) override;

    juce::AudioProcessorEditor* createEditor() override;
    bool hasEditor() const override { return true; }

    const juce::String getName() const override { return "AETHER Co-Producer"; }
    bool acceptsMidi() const override { return true; }
    bool producesMidi() const override { return false; }
    bool isMidiEffect() const override { return false; }
    double getTailLengthSeconds() const override { return 0.0; }

    int getNumPrograms() override { return 1; }
    int getCurrentProgram() override { return 0; }
    void setCurrentProgram(int) override {}
    const juce::String getProgramName(int) override { return {}; }
    void changeProgramName(int, const juce::String&) override {}

    void getStateInformation(juce::MemoryBlock& destData) override;
    void setStateInformation(const void* data, int sizeInBytes) override;

    AetherProcessor& getEngine() { return engine; }

private:
    AetherProcessor engine;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AetherAudioProcessor)
};

class AetherAudioProcessorEditor : public juce::AudioProcessorEditor {
public:
    explicit AetherAudioProcessorEditor(AetherAudioProcessor& p);
    ~AetherAudioProcessorEditor() override = default;

    void paint(juce::Graphics&) override;
    void resized() override;

private:
    AetherAudioProcessor& audioProcessor;
    juce::WebBrowserComponent webView;
    JUCE_DECLARE_NON_COPYABLE_WITH_LEAK_DETECTOR(AetherAudioProcessorEditor)
};

} // namespace aether

#endif // JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED
