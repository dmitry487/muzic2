//
//  AppDelegate.swift
//  Muzic2
//
//  Created automatically
//

import Cocoa
import WebKit

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    
    var window: NSWindow!
    var webView: WKWebView!
    var phpServer: Process?
    var serverPort: Int = 8888
    let serverQueue = DispatchQueue(label: "php.server")
    
    func applicationDidFinishLaunching(_ aNotification: Notification) {
        // Create window
        let screenSize = NSScreen.main?.frame.size ?? CGSize(width: 1400, height: 900)
        window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: screenSize.width * 0.8, height: screenSize.height * 0.8),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )
        window.center()
        window.title = "Muzic2"
        window.backgroundColor = NSColor.black
        window.setFrameAutosaveName("Main Window")
        window.makeKeyAndOrderFront(nil)
        
        // Create WebView
        let config = WKWebViewConfiguration()
        config.preferences.setValue(true, forKey: "developerExtrasEnabled")
        webView = WKWebView(frame: window.contentView!.bounds, configuration: config)
        webView.autoresizingMask = [.width, .height]
        webView.navigationDelegate = self
        window.contentView?.addSubview(webView)
        
        // Start PHP server
        startPHPServer()
    }
    
    func applicationWillTerminate(_ aNotification: Notification) {
        stopPHPServer()
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }
    
    func startPHPServer() {
        serverQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Find PHP executable
            let phpPath = self.findPHP()
            guard let php = phpPath else {
                DispatchQueue.main.async {
                    self.showError("PHP не найден. Установите PHP или используйте встроенный.")
                }
                return
            }
            
            // Get app bundle path
            let bundlePath = Bundle.main.bundlePath
            let resourcesPath = Bundle.main.resourcePath ?? bundlePath
            let publicPath = (resourcesPath as NSString).appendingPathComponent("public")
            
            // Check if public directory exists
            let fileManager = FileManager.default
            if !fileManager.fileExists(atPath: publicPath) {
                DispatchQueue.main.async {
                    self.showError("Директория public не найдена: \(publicPath)")
                }
                return
            }
            
            // Create PHP server process
            let process = Process()
            process.executableURL = URL(fileURLWithPath: php)
            process.arguments = ["-S", "localhost:\(self.serverPort)", "-t", publicPath]
            process.currentDirectoryPath = publicPath
            
            // Setup pipes
            let pipe = Pipe()
            process.standardOutput = pipe
            process.standardError = pipe
            
            // Handle output
            pipe.fileHandleForReading.readabilityHandler = { handle in
                let data = handle.availableData
                if !data.isEmpty {
                    if let output = String(data: data, encoding: .utf8) {
                        print("[PHP Server]: \(output)")
                    }
                }
            }
            
            do {
                try process.run()
                self.phpServer = process
                
                // Wait a bit for server to start
                Thread.sleep(forTimeInterval: 1.0)
                
                // Load URL
                DispatchQueue.main.async {
                    let url = URL(string: "http://localhost:\(self.serverPort)/")!
                    let request = URLRequest(url: url)
                    self.webView.load(request)
                }
            } catch {
                DispatchQueue.main.async {
                    self.showError("Ошибка запуска PHP сервера: \(error.localizedDescription)")
                }
            }
        }
    }
    
    func stopPHPServer() {
        if let process = phpServer {
            process.terminate()
            do {
                try process.waitUntilExit()
            } catch {
                print("Ошибка остановки PHP сервера: \(error)")
            }
            phpServer = nil
        }
    }
    
    func findPHP() -> String? {
        // Try common PHP locations
        let paths = [
            "/usr/bin/php",
            "/usr/local/bin/php",
            "/opt/homebrew/bin/php",
            "/Applications/MAMP/bin/php/php8.2.0/bin/php",
            "/Applications/MAMP/bin/php/php8.1.0/bin/php",
            "/Applications/XAMPP/xamppfiles/bin/php"
        ]
        
        for path in paths {
            if FileManager.default.fileExists(atPath: path) {
                return path
            }
        }
        
        // Try to find PHP in PATH
        let process = Process()
        process.executableURL = URL(fileURLWithPath: "/usr/bin/which")
        process.arguments = ["php"]
        
        let pipe = Pipe()
        process.standardOutput = pipe
        
        do {
            try process.run()
            process.waitUntilExit()
            
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            if let output = String(data: data, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
               !output.isEmpty {
                return output
            }
        } catch {
            // Ignore
        }
        
        return nil
    }
    
    func showError(_ message: String) {
        let alert = NSAlert()
        alert.messageText = "Ошибка"
        alert.informativeText = message
        alert.alertStyle = .critical
        alert.addButton(withTitle: "OK")
        alert.runModal()
    }
}

extension AppDelegate: WKNavigationDelegate {
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        print("Navigation error: \(error.localizedDescription)")
    }
    
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        print("Navigation error: \(error.localizedDescription)")
    }
}

