# Capacitor Bridge & Plugins
-keep public class * extends com.getcapacitor.Plugin { *; }
-keep public class * extends com.getcapacitor.BridgeActivity { *; }
-keep class com.getcapacitor.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public *;
    @com.getcapacitor.annotation.CapacitorPlugin public *;
    @com.getcapacitor.annotation.Permission public *;
}

# Web Interface & JS
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Google Play Services & AdMob
-keep class com.google.android.gms.ads.** { *; }
-keep interface com.google.android.gms.ads.** { *; }
-keep class com.google.android.gms.common.** { *; }
-keep class com.google.android.gms.internal.ads.** { *; }

# Google ML Kit Barcode
-keep class com.google.mlkit.vision.barcode.** { *; }
-keep class com.google.mlkit.vision.common.** { *; }
-keep class com.google.android.gms.vision.** { *; }

# Native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# AndroidX Core & Splash
-keep class androidx.core.splashscreen.** { *; }

# Ignore third-party library harmless warnings
-dontwarn com.google.android.gms.**
-dontwarn com.getcapacitor.**
-dontwarn org.apache.cordova.**
