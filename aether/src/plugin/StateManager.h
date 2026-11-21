#pragma once

#include "../dsp/AetherDSPParameters.h"
#include <vector>
#include <string>
#include <memory>
#include <functional>
#include <mutex>

namespace aether {

struct HistoryAction {
    std::string description;
    std::string timestamp;
    std::unordered_map<std::string, float> changedParams; // ParamId -> NewValue
    ParameterSnapshot beforeSnapshot;
    ParameterSnapshot afterSnapshot;
};

class StateManager {
public:
    using StateChangedCallback = std::function<void(const ParameterSnapshot&)>;

    StateManager();

    void setStateChangedCallback(StateChangedCallback cb) {
        callback = std::move(cb);
    }

    // Surgical, cumulative edit: only parameters present in delta are updated
    void applyDelta(const std::unordered_map<std::string, float>& delta, const std::string& description);
    void setSingleParameter(const std::string& paramId, float value, bool pushUndo = true);

    bool canUndo() const;
    bool canRedo() const;
    bool undo();
    bool redo();

    // A/B Comparison
    void toggleAB();
    char getActiveSlot() const { return activeSlot; }
    void copyCurrentToOppositeSlot();

    ParameterSnapshot getCurrentState() const;
    std::string getCurrentStateJSON() const;

    // Get history log for UI Undo tree
    std::string getHistoryJSON() const;

private:
    void notifyChange();

    mutable std::mutex stateMutex;
    ParameterSnapshot currentState;
    ParameterSnapshot stateA;
    ParameterSnapshot stateB;
    char activeSlot{'A'};

    std::vector<HistoryAction> undoStack;
    std::vector<HistoryAction> redoStack;
    static constexpr size_t MAX_HISTORY = 64;

    StateChangedCallback callback;
};

} // namespace aether
