#include "IPCBridge.h"
#include <sys/socket.h>
#include <netinet/in.h>
#include <unistd.h>
#include <fcntl.h>
#include <iostream>
#include <sstream>
#include <cstring>
#include <vector>

namespace aether {

IPCBridge::IPCBridge(int port) : serverPort(port) {}

IPCBridge::~IPCBridge() {
    stop();
}

void IPCBridge::start() {
    if (isRunning.load()) return;
    isRunning.store(true);
    serverThread = std::thread(&IPCBridge::listenLoop, this);
}

void IPCBridge::stop() {
    if (!isRunning.load()) return;
    isRunning.store(false);
    if (serverThread.joinable()) {
        serverThread.join();
    }
}

std::string IPCBridge::processMessage(const std::string& raw) {
    if (onMessage) {
        // Very fast JSON extraction of "type" and "payload"
        std::string type = "unknown";
        size_t typePos = raw.find("\"type\":");
        if (typePos != std::string::npos) {
            size_t startQuote = raw.find("\"", typePos + 7);
            if (startQuote != std::string::npos) {
                size_t endQuote = raw.find("\"", startQuote + 1);
                if (endQuote != std::string::npos) {
                    type = raw.substr(startQuote + 1, endQuote - startQuote - 1);
                }
            }
        }
        return onMessage(type, raw);
    }
    return "{\"status\":\"ok\"}";
}

void IPCBridge::listenLoop() {
    int serverFd = socket(AF_INET, SOCK_STREAM, 0);
    if (serverFd < 0) return;

    int opt = 1;
    setsockopt(serverFd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

    sockaddr_in address{};
    address.sin_family = AF_INET;
    address.sin_addr.s_addr = INADDR_ANY;
    address.sin_port = htons(serverPort);

    if (bind(serverFd, (struct sockaddr*)&address, sizeof(address)) < 0) {
        close(serverFd);
        return;
    }

    if (listen(serverFd, 5) < 0) {
        close(serverFd);
        return;
    }

    // Set non-blocking on listening socket
    fcntl(serverFd, F_SETFL, O_NONBLOCK);

    while (isRunning.load()) {
        sockaddr_in clientAddr{};
        socklen_t clientLen = sizeof(clientAddr);
        int clientFd = accept(serverFd, (struct sockaddr*)&clientAddr, &clientLen);

        if (clientFd < 0) {
            std::this_thread::sleep_for(std::chrono::milliseconds(20));
            continue;
        }

        // Handle simple HTTP GET / POST request
        std::vector<char> buffer(65536, 0);
        ssize_t bytesRead = read(clientFd, buffer.data(), buffer.size() - 1);

        if (bytesRead > 0) {
            std::string req(buffer.data(), bytesRead);
            std::string responseBody;

            // CORS preflight
            if (req.rfind("OPTIONS ", 0) == 0) {
                std::string res = "HTTP/1.1 204 No Content\r\n"
                                  "Access-Control-Allow-Origin: *\r\n"
                                  "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                                  "Access-Control-Allow-Headers: Content-Type\r\n\r\n";
                write(clientFd, res.c_str(), res.size());
                close(clientFd);
                continue;
            }

            if (req.rfind("POST ", 0) == 0) {
                size_t bodyPos = req.find("\r\n\r\n");
                std::string body = (bodyPos != std::string::npos) ? req.substr(bodyPos + 4) : "";
                responseBody = processMessage(body);
            } else {
                // Default status / ping
                responseBody = processMessage("{\"type\":\"get_telemetry\"}");
            }

            std::ostringstream httpRes;
            httpRes << "HTTP/1.1 200 OK\r\n"
                    << "Content-Type: application/json\r\n"
                    << "Access-Control-Allow-Origin: *\r\n"
                    << "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
                    << "Content-Length: " << responseBody.size() << "\r\n\r\n"
                    << responseBody;

            std::string finalStr = httpRes.str();
            write(clientFd, finalStr.c_str(), finalStr.size());
        }

        close(clientFd);
    }

    close(serverFd);
}

} // namespace aether
