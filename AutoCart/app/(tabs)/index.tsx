// app/index.tsx
import LottieView from 'lottie-react-native';

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  StatusBar,
  TextInput,
  TouchableOpacity,
  Platform, // <-- NEW
  AppState,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BleManager, Device, State } from 'react-native-ble-plx'; // <-- NEW: Added State & Device
import { PERMISSIONS, requestMultiple, RESULTS } from 'react-native-permissions'; // <-- NEW

// Initialize BLE manager once
const bleManager = new BleManager();

// (Your styles are perfect, so I'm hiding them for space)
const styles = StyleSheet.create({
  /* ... your styles ... */
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  label: {
    fontSize: 20,
    color: '#000000',
    marginRight: 12,
    marginLeft: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    paddingVertical: 16,
    backgroundColor: '#007bffc1',
  },
  headerTitle: {
    width: '100%',
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111111',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 30,
  },
  rowTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  switch: {
    transform: [{ scaleX: 1.3 }, { scaleY: 1.3 }],
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  vibrateButton: {
    marginTop: 24,
    backgroundColor: '#34C759',
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    textAlign: 'center',
    overflow: 'hidden',
    elevation: 2,
  },
  stopButtonWrapper: {
    width: '60%',
    alignItems: 'center',
  },
  stopButton: {
    backgroundColor: '#ff3b30',
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 10,
    textAlign: 'center',
    overflow: 'hidden',
    elevation: 2,
  },
  bottomButtonContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 32,
    position: 'absolute',
    bottom: 0,
    left: 0,
  },
  deviceStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginLeft: 28,
  },
  deviceStatusLabel: {
    fontSize: 18,
    color: '#333',
    marginRight: 8,
    fontWeight: '500',
  },
  deviceStatusName: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  uuidInputArea: {
    marginTop: 28,
    marginLeft: 28,
    marginRight: 28,
    padding: 12,
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    elevation: 1,
  },
  uuidInputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 6,
    fontWeight: '500',
  },
  uuidInput: {
    height: 44,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 10,
  },
  scanConnectButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  scanConnectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

// --- NEW PERMISSIONS FUNCTION ---
async function requestBluetoothPermissions() {
  console.log('Requesting BLE permissions...');
  if (Platform.OS === 'android') {
    if (Platform.Version >= 31) { // Android 12+
      const permissions = await requestMultiple([
        PERMISSIONS.ANDROID.BLUETOOTH_SCAN,
        PERMISSIONS.ANDROID.BLUETOOTH_CONNECT,
      ]);
      const isGranted =
        permissions[PERMISSIONS.ANDROID.BLUETOOTH_SCAN] === RESULTS.GRANTED &&
        permissions[PERMISSIONS.ANDROID.BLUETOOTH_CONNECT] === RESULTS.GRANTED;
      if (isGranted) return true;
    } else { // Android 11 and older
      const permission = await requestMultiple([
        PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
      ]);
      if (permission[PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION] === RESULTS.GRANTED) return true;
    }
  }
  console.log('Permissions denied');
  return false;
}

export default function HomeScreen() {
  const [bluetoothOn, setBluetoothOn] = useState<boolean>(false);
  const [connectedDevice, setConnectedDevice] = useState<Device | null>(null); // <-- MODIFIED
  const [vibrating, setVibrating] = useState<boolean>(false);
  const [deviceNameInput, setDeviceNameInput] = useState(''); // <-- MODIFIED
  const [scanning, setScanning] = useState(false);

  // Subscribe to BLE state changes (Your code is perfect)
  useEffect(() => {
    const subscription = bleManager.onStateChange((state) => {
      setBluetoothOn(state === State.PoweredOn); // <-- MODIFIED (use State enum)
    }, true);
    return () => subscription.remove();
  }, []);

  // Listen for BLE device connection/disconnection (Your code is perfect)
  useEffect(() => {
    let disconnectSub: any = null;
    if (connectedDevice) {
      disconnectSub = connectedDevice.onDisconnected((error: any, device: any) => {
        if (AppState.currentState === 'active') {
          Vibration.vibrate([1000, 1000, 1000], true);
          setVibrating(true);
        }
        setConnectedDevice(null);
        if (disconnectSub) disconnectSub.remove();
      });
    }
    return () => {
      if (disconnectSub) disconnectSub.remove();
    };
  }, [connectedDevice]);

  // Stop vibration handler (Your code is perfect)
  const handleStopVibration = () => {
    Vibration.cancel();
    setVibrating(false);
  };

  // Scan and connect handler
  const handleScanAndConnect = async () => {
    // --- THIS IS THE CRITICAL FIX ---
    const hasPermissions = await requestBluetoothPermissions();
    if (!hasPermissions) {
      console.log('No permissions, scan aborted.');
      return;
    }
    // --- END OF FIX ---

    if (!deviceNameInput) return; // <-- MODIFIED
    console.log('Scanning for device name:', deviceNameInput); // <-- MODIFIED

    setScanning(true);
    bleManager.startDeviceScan(null, null, async (error, device) => {
      if (error) {
        bleManager.stopDeviceScan();
        setScanning(false);
        return;
      }

      // --- THIS IS THE BIG SUGGESTION ---
      // We check for name, not ID.
      if (device && device.name === deviceNameInput) { // <-- MODIFIED
        console.log('Found matching device!', device.name);
        bleManager.stopDeviceScan();
        try {
          const connected = await device.connect();
          setConnectedDevice(connected);
        } catch (err) {
          console.error('Failed to connect', err);
        }
        setScanning(false);
      }
      // --- END OF SUGGESTION ---
    });

    // Stop scan after 8 seconds if not found
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setScanning(false);
      console.log('Scan timed out.');
    }, 8000);
  };

  return (
    <SafeAreaView style={styles.container}>
    <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

    {/* Header */}
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Smart Trolley</Text>
    </View>

    {/* Main animation & connect UI */}
    <View style={styles.centerContainer}>

      {/* Show different animations depending on connection & vibration state */}
      {!connectedDevice ? (
        // not connected -> show connect animation
        <LottieView
          source={require('../assets/animations/connect.json')}
          autoPlay
          loop
          style={{ width: 300, height: 300 }}
        />
      ) : (
        // connected -> show connected animation
        <LottieView
          source={require('../assets/animations/connected.json')}
          autoPlay
          loop
          style={{ width: 300, height: 300 }}
        />
      )}

      {/* Connect / Disconnect button */}
      <TouchableOpacity
        style={[
          styles.scanConnectButton,
          { backgroundColor: connectedDevice ? '#FF3B30' : '#007AFF', marginTop: 18 },
        ]}
        onPress={connectedDevice ? async () => {
            // If connected, call disconnect logic (keep your existing disconnect logic)
            try {
              // If you have a disconnect function that uses connectedDevice, call it here.
              // Fallback: calling handleStopVibration to stop vibration then resetting device
              await (async () => {
                if (connectedDevice && connectedDevice.cancelConnection) {
                  // try to disconnect device safely if property available
                  try { await connectedDevice.cancelConnection(); } catch(e){/* ignore */ }
                }
                // your existing cleanup:
                handleStopVibration();
                setConnectedDevice(null);
              })();
            } catch (e) {
              console.warn('Disconnect error', e);
            }
          }
          : handleScanAndConnect
        }
      >
        <Text style={styles.scanConnectButtonText}>
          {connectedDevice ? 'Disconnect' : (scanning ? 'Scanning...' : 'Connect')}
        </Text>
      </TouchableOpacity>
    </View>

    {/* Status & Device info */}
    <View style={styles.deviceStatusRow}>
      <Text style={styles.deviceStatusLabel}>Device:</Text>
      <Text style={styles.deviceStatusName}>
        {connectedDevice ? connectedDevice.name : 'Not connected'}
      </Text>
    </View>

    {/* Vibration animation + Stop button (if vibrating) */}
    {vibrating && (
      <View style={styles.bottomButtonContainer}>
        <LottieView
          source={require('../assets/animations/vibration.json')}
          autoPlay
          loop
          style={{ width: 180, height: 180 }}
        />
        <TouchableOpacity onPress={handleStopVibration} style={{ marginTop: 8 }}>
          <Text style={styles.stopButton}>Stop Vibration</Text>
        </TouchableOpacity>
      </View>
    )}
  </SafeAreaView>
  );
}