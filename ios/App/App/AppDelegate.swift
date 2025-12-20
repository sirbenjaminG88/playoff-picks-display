import UIKit
import Capacitor
import WebKit
import UserNotifications
import FirebaseCore

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var warmupWebView: WKWebView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Initialize Firebase
        FirebaseApp.configure()

        // Pre-warm WebKit processes to reduce cold-start delay
        warmUpWebView()

        // Set up notification delegate
        UNUserNotificationCenter.current().delegate = self

        return true
    }
    
    /// Creates a dummy WKWebView to initialize WebKit processes early
    /// This runs while the native splash screen is still visible
    private func warmUpWebView() {
        let config = WKWebViewConfiguration()
        warmupWebView = WKWebView(frame: .zero, configuration: config)
        warmupWebView?.loadHTMLString("<html></html>", baseURL: nil)
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused while the application was inactive.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    // MARK: - Push Notification Handlers

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // Post notification for our custom bridge
        NotificationCenter.default.post(
            name: Notification.Name.capacitorDidRegisterForRemoteNotifications,
            object: deviceToken
        )

        print("[AppDelegate] Device token forwarded to bridge")
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        // Post notification for our custom bridge
        NotificationCenter.default.post(
            name: Notification.Name.capacitorDidFailToRegisterForRemoteNotifications,
            object: error
        )

        print("[AppDelegate] Registration error: \(error.localizedDescription)")
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension AppDelegate: UNUserNotificationCenterDelegate {

    // Called when a notification is delivered to a foreground app
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show notification even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }

    // Called when user taps on a notification
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap
        completionHandler()
    }
}

