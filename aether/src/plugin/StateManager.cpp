#include "StateManager.h"
#include <sstream>
#include <chrono>
#include <ctime>
#include <iomanip>

namespace aether {

static std::string getCurrentTimestampString() {
    auto now = std::chrono::system_clock::now();
    auto in_time_t = std::chrono::system_clock::to_time_t(now);
    std::stringstream ss;
    ss << std::put_time(std::localtime(&in_time_t), "%H:%M:%S");
    return ss.str();
}

StateManager::StateManager() {
    stateA = currentState;
    stateB = currentState;
}

void StateManager::notifyChange() {
    if (callback) {
        callback(currentState);
    }
}

void StateManager::applyDelta(const std::unordered_map<std::string, float>& delta, const std::string& description) {
    if (delta.empty()) return;

    std::lock_guard<std::mutex> lock(stateMutex);

    HistoryAction action;
    action.description = description.empty() ? "AI Parameter Edit" : description;
    action.timestamp = getCurrentTimestampString();
    action.beforeSnapshot = currentState;

    for (const auto& [id, val] : delta) {
        currentState.set(id, val);
        action.changedParams[id] = val;
    }

    action.afterSnapshot = currentState;

    undoStack.push_back(std::move(action));
    if (undoStack.size() > MAX_HISTORY) {
        undoStack.erase(undoStack.begin());
    }
    redoStack.clear();

    if (activeSlot == 'A') stateA = currentState;
    else stateB = currentState;

    notifyChange();
}

void StateManager::setSingleParameter(const std::string& paramId, float value, bool pushUndo) {
    std::lock_guard<std::mutex> lock(stateMutex);

    if (pushUndo) {
        HistoryAction action;
        action.description = "Manual knob adjustment: " + paramId;
        action.timestamp = getCurrentTimestampString();
        action.beforeSnapshot = currentState;
        currentState.set(paramId, value);
        action.afterSnapshot = currentState;
        action.changedParams[paramId] = value;

        undoStack.push_back(std::move(action));
        if (undoStack.size() > MAX_HISTORY) {
            undoStack.erase(undoStack.begin());
        }
        redoStack.clear();
    } else {
        currentState.set(paramId, value);
    }

    if (activeSlot == 'A') stateA = currentState;
    else stateB = currentState;

    notifyChange();
}

bool StateManager::canUndo() const {
    std::lock_guard<std::mutex> lock(stateMutex);
    return !undoStack.empty();
}

bool StateManager::canRedo() const {
    std::lock_guard<std::mutex> lock(stateMutex);
    return !redoStack.empty();
}

bool StateManager::undo() {
    std::lock_guard<std::mutex> lock(stateMutex);
    if (undoStack.empty()) return false;

    HistoryAction action = std::move(undoStack.back());
    undoStack.pop_back();

    currentState = action.beforeSnapshot;
    redoStack.push_back(std::move(action));

    if (activeSlot == 'A') stateA = currentState;
    else stateB = currentState;

    notifyChange();
    return true;
}

bool StateManager::redo() {
    std::lock_guard<std::mutex> lock(stateMutex);
    if (redoStack.empty()) return false;

    HistoryAction action = std::move(redoStack.back());
    redoStack.pop_back();

    currentState = action.afterSnapshot;
    undoStack.push_back(std::move(action));

    if (activeSlot == 'A') stateA = currentState;
    else stateB = currentState;

    notifyChange();
    return true;
}

void StateManager::toggleAB() {
    std::lock_guard<std::mutex> lock(stateMutex);
    if (activeSlot == 'A') {
        stateA = currentState;
        activeSlot = 'B';
        currentState = stateB;
    } else {
        stateB = currentState;
        activeSlot = 'A';
        currentState = stateA;
    }
    notifyChange();
}

void StateManager::copyCurrentToOppositeSlot() {
    std::lock_guard<std::mutex> lock(stateMutex);
    if (activeSlot == 'A') {
        stateB = currentState;
    } else {
        stateA = currentState;
    }
}

ParameterSnapshot StateManager::getCurrentState() const {
    std::lock_guard<std::mutex> lock(stateMutex);
    return currentState;
}

std::string StateManager::getCurrentStateJSON() const {
    std::lock_guard<std::mutex> lock(stateMutex);
    std::ostringstream ss;
    ss << "{";
    bool first = true;
    for (const auto& [id, val] : currentState.values) {
        if (!first) ss << ",";
        ss << "\"" << id << "\":" << std::fixed << std::setprecision(2) << val;
        first = false;
    }
    ss << "}";
    return ss.str();
}

std::string StateManager::getHistoryJSON() const {
    std::lock_guard<std::mutex> lock(stateMutex);
    std::ostringstream ss;
    ss << "{\"can_undo\":" << (!undoStack.empty() ? "true" : "false")
       << ",\"can_redo\":" << (!redoStack.empty() ? "true" : "false")
       << ",\"active_slot\":\"" << activeSlot << "\""
       << ",\"history\":[";

    for (size_t i = 0; i < undoStack.size(); ++i) {
        const auto& item = undoStack[i];
        ss << "{\"desc\":\"" << item.description << "\","
           << "\"time\":\"" << item.timestamp << "\"}";
        if (i + 1 < undoStack.size()) ss << ",";
    }
    ss << "]}";
    return ss.str();
}

} // namespace aether
