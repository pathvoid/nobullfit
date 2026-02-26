import { useRef, useCallback, useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, BackHandler, Platform, Alert } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { Paths, File as ExpoFile } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useAuth } from '@/contexts/AuthContext';
import { getToken } from '@/services/tokenStorage';
import { WEB_BASE_URL } from '@/constants/Api';

export default function AppScreen() {
  const { logout, user } = useAuth();
  const webViewRef = useRef<WebView>(null);
  const [token, setToken] = useState<string | null>(null);

  // Load the token for injection into WebView localStorage
  useEffect(() => {
    getToken().then(setToken);
  }, []);

  // Handle Android back button to navigate within WebView
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const onBackPress = () => {
      if (webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, []);

  // JavaScript injected before page loads to set auth token
  // and patch blob downloads to work via postMessage to native
  const injectedJS = token
    ? `(function() {
        try {
          localStorage.setItem('auth_token', '${token}');
        } catch(e) {}

        // Patch blob downloads to work in the WebView
        // The website creates a blob, makes a blob URL, sets it as an anchor href,
        // then clicks the anchor. In a WebView this navigates to about:blank instead
        // of downloading. We intercept the anchor click to handle it natively.
        if (window.ReactNativeWebView) {
          // Store blobs by their blob URL so we can retrieve them later
          var blobStore = {};
          var origCreateObjectURL = URL.createObjectURL;
          var origRevokeObjectURL = URL.revokeObjectURL;

          URL.createObjectURL = function(blob) {
            var url = origCreateObjectURL.call(URL, blob);
            if (blob && blob.type && (blob.type === 'application/pdf' || blob.type === 'application/json' || blob.type === 'application/octet-stream')) {
              blobStore[url] = blob;
            }
            return url;
          };

          URL.revokeObjectURL = function(url) {
            delete blobStore[url];
            origRevokeObjectURL.call(URL, url);
          };

          // Intercept clicks on anchor elements with download attribute
          document.addEventListener('click', function(e) {
            var anchor = e.target.closest ? e.target.closest('a[download]') : null;
            if (!anchor) return;

            var href = anchor.href;
            var blob = blobStore[href];
            if (!blob) return;

            // Prevent the WebView from navigating to the blob URL
            e.preventDefault();
            e.stopPropagation();

            var filename = anchor.download || 'download';
            var reader = new FileReader();
            reader.onload = function() {
              var base64 = reader.result.split(',')[1];
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'download',
                data: base64,
                mimeType: blob.type,
                filename: filename
              }));
            };
            reader.readAsDataURL(blob);
          }, true);
        }
        true;
      })();`
    : 'true;';

  // Intercept navigation to detect logout (redirect to sign-in/sign-up)
  const handleNavigationStateChange = useCallback(
    (navState: WebViewNavigation) => {
      const { url } = navState;
      if (url.includes('/sign-in') || url.includes('/sign-up')) {
        logout();
      }
    },
    [logout]
  );

  // Only allow loading URLs within the nobull.fit domain
  const handleShouldStartLoadWithRequest = useCallback(
    (request: { url: string }) => {
      const { url } = request;
      if (url.startsWith(WEB_BASE_URL) || url.startsWith('about:blank')) {
        return true;
      }
      // Open external links in the system browser
      Linking.openURL(url);
      return false;
    },
    []
  );

  // Handle postMessage from WebView (logout, file downloads)
  const handleMessage = useCallback(
    async (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'logout') {
          logout();
          return;
        }

        // Handle file download from WebView
        if (data.type === 'download' && data.data) {
          const extension = data.mimeType === 'application/pdf' ? '.pdf' : '.json';
          const filename = data.filename.endsWith(extension) ? data.filename : data.filename + extension;

          // Decode base64 to bytes and write to cache
          const bytes = Uint8Array.from(atob(data.data), (c) => c.charCodeAt(0));
          const file = new ExpoFile(Paths.cache, filename);
          file.write(bytes);

          // Open the share sheet so user can save/share the file
          if (await Sharing.isAvailableAsync()) {
            await Sharing.shareAsync(file.uri, {
              mimeType: data.mimeType,
              dialogTitle: filename,
            });
          } else {
            Alert.alert('Download Complete', `File saved to cache as ${filename}`);
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    },
    [logout]
  );

  if (!token) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Start on dashboard if user has a plan, otherwise choose-plan
  const startUrl = user?.plan
    ? `${WEB_BASE_URL}/dashboard`
    : `${WEB_BASE_URL}/choose-plan`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WebView
        ref={webViewRef}
        source={{ uri: startUrl }}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        onNavigationStateChange={handleNavigationStateChange}
        onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
        onMessage={handleMessage}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#3B82F6" />
          </View>
        )}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        allowsBackForwardNavigationGestures
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#151718' },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#151718',
  },
});
