#ifdef JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED
#include "JucePluginAdapter.h"

namespace aether {

AetherAudioProcessor::AetherAudioProcessor()
    : AudioProcessor(BusesProperties()
                         .withInput("Input", juce::AudioChannelSet::stereo(), true)
                         .withOutput("Output", juce::AudioChannelSet::stereo(), true)) {}

AetherAudioProcessor::~AetherAudioProcessor() = default;

void AetherAudioProcessor::prepareToPlay(double sampleRate, int samplesPerBlock) {
    engine.prepare(sampleRate, samplesPerBlock);
}

void AetherAudioProcessor::releaseResources() {
    engine.reset();
}

void AetherAudioProcessor::processBlock(juce::AudioBuffer<float>& buffer, juce::MidiBuffer&) {
    juce::ScopedNoDenormals noDenormals;
    auto totalNumInputChannels = getTotalNumInputChannels();
    auto totalNumOutputChannels = getTotalNumOutputChannels();

    for (auto i = totalNumInputChannels; i < totalNumOutputChannels; ++i)
        buffer.clear(i, 0, buffer.getNumSamples());

    double hostBpm = 120.0;
    double hostPpq = 0.0;
    bool isPlaying = false;

    if (auto* playHead = getPlayHead()) {
        if (auto pos = playHead->getPosition()) {
            if (pos->getBpm()) hostBpm = *pos->getBpm();
            if (pos->getPpqPosition()) hostPpq = *pos->getPpqPosition();
            if (pos->getIsPlaying()) isPlaying = *pos->getIsPlaying();
        }
    }

    engine.processBlock(buffer.getArrayOfWritePointers(),
                        static_cast<size_t>(totalNumInputChannels),
                        static_cast<size_t>(buffer.getNumSamples()),
                        hostBpm, hostPpq, isPlaying);
}

juce::AudioProcessorEditor* AetherAudioProcessor::createEditor() {
    return new AetherAudioProcessorEditor(*this);
}

void AetherAudioProcessor::getStateInformation(juce::MemoryBlock& destData) {
    std::string xml = engine.getStateXML();
    destData.append(xml.data(), xml.size());
}

void AetherAudioProcessor::setStateInformation(const void* data, int sizeInBytes) {
    std::string xml(static_cast<const char*>(data), static_cast<size_t>(sizeInBytes));
    engine.setStateFromXML(xml);
}

AetherAudioProcessorEditor::AetherAudioProcessorEditor(AetherAudioProcessor& p)
    : AudioProcessorEditor(&p), audioProcessor(p) {
    setSize(1080, 720);
    setResizable(true, true);
    setResizeLimits(800, 600, 1920, 1200);

    addAndMakeVisible(webView);
    // In production, loads local embedded UI or localhost:8998 / localhost:5173
    webView.goToURL("http://localhost:8998/ui");
}

void AetherAudioProcessorEditor::paint(juce::Graphics& g) {
    g.fillAll(juce::Colour(15, 17, 23));
}

void AetherAudioProcessorEditor::resized() {
    webView.setBounds(getLocalBounds());
}

} // namespace aether

juce::AudioProcessor* JUCE_CALLTYPE createPluginFilter() {
    return new aether::AetherAudioProcessor();
}

#endif // JUCE_GLOBAL_MODULE_SETTINGS_INCLUDED
