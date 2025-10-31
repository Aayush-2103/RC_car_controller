import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  PermissionsAndroid,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import ReactNativeBluetoothClassic from 'react-native-bluetooth-classic';

// Helper function to request Bluetooth permissions
const requestBluetoothPermission = async () => {
  // Only for Android 12 (API 31) and above
  if (Platform.OS === 'android' && Platform.Version >= 31) {
    try {
      const connectGranted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        {
          title: 'Bluetooth Connection Permission',
          message:
            'This app needs Bluetooth permission to show connected devices.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      if (connectGranted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('BLUETOOTH_CONNECT permission granted');
        return true;
      } else {
        console.log('BLUETOOTH_CONNECT permission denied');
        return false;
      }
    } catch (err) {
      console.warn(err);
      return false;
    }
  }
  
  // For Android 11 (API 30) and below, permissions are in app.json
  // but we still need location for scanning/discovery
  try {
     const locationGranted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location Permission',
        message: 'Bluetooth needs Location permission to find devices.',
        buttonPositive: 'OK',
      }
    );
    return locationGranted === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.warn(err);
    return false;
  }
};


export default function App(): any {
  // State to hold the connected device name
  const [connectedDevice, setConnectedDevice] = useState('None');
  // State to manage loading indicator
  const [isLoading, setIsLoading] = useState(false);
  // State to hold permission status
  const [hasPermission, setHasPermission] = useState(false);

  // Check for permissions when the app loads
  useEffect(() => {
    requestBluetoothPermission().then(granted => {
      setHasPermission(granted);
      if (granted) {
        // Automatically refresh if permission is granted on load
        handleRefresh();
      } else {
        Alert.alert(
          'Permission Denied',
          'Cannot check Bluetooth status without permission.',
        );
      }
    });
  }, []);

  // Function to be called on button press
  const handleRefresh = async () => {
    if (!hasPermission) {
      Alert.alert("Permission Error", "No Bluetooth permission granted.");
      return;
    }

    setIsLoading(true);
    setConnectedDevice('Checking...');

    try {
      // Check if Bluetooth is enabled (support multiple library method names)
      let enabled = false;
      const btAny: any = ReactNativeBluetoothClassic as any;
      if (typeof btAny.isBluetoothEnabled === 'function') {
        enabled = await btAny.isBluetoothEnabled();
      } else if (typeof btAny.isEnabled === 'function') {
        enabled = await btAny.isEnabled();
      } else {
        // assume enabled if method not present — library may not support runtime check
        enabled = true;
      }
      if (!enabled) {
        Alert.alert("Bluetooth is Off", "Please turn on Bluetooth to see connections.");
        setConnectedDevice('Bluetooth is off');
        setIsLoading(false);
        return;
      }

      // Get the list of currently connected devices. Different runtimes expose
      // either getConnectedDevices() or getBondedDevices(); try both safely.
      let devices: any[] = [];
      if (typeof btAny.getConnectedDevices === 'function') {
        devices = await btAny.getConnectedDevices();
      } else if (typeof btAny.getBondedDevices === 'function') {
        // bonded = paired devices; may be acceptable fallback
        devices = await btAny.getBondedDevices();
      } else if (typeof btAny.getPairedDevices === 'function') {
        devices = await btAny.getPairedDevices();
      } else {
        // library doesn't expose a known API — throw to surface to user
        throw new Error(
          'Bluetooth library does not expose getConnectedDevices/getBondedDevices API',
        );
      }

        if (devices && devices.length > 0) {
          setConnectedDevice(devices[0].name ?? devices[0].id ?? 'Unknown');
        } else {
          setConnectedDevice('None');
        }
    } catch (error: any) {
      console.error('Error refreshing connection:', error);
      setConnectedDevice('Error');
      Alert.alert('Error', 'Could not check connections: ' + (error?.message ?? String(error)));
    } finally {
      setIsLoading(false);
    }
  };

  return React.createElement(
    View,
    { style: styles.container },
    React.createElement(Text, { style: styles.title }, 'Bluetooth Status'),
    React.createElement(Text, { style: styles.statusLabel }, 'Currently Connected:'),
    React.createElement(
      View,
      { style: styles.deviceContainer },
      isLoading
        ? React.createElement(ActivityIndicator, { size: 'large', color: '#007AFF' })
        : React.createElement(Text, { style: styles.deviceName }, connectedDevice),
    ),
    React.createElement(Button, {
      title: isLoading ? 'Refreshing...' : 'Refresh Connection',
      onPress: handleRefresh,
      disabled: isLoading || !hasPermission,
    }),
  );
}

// Simple styling
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
  },
  deviceContainer: {
    minHeight: 80, // Gives space for the text or activity indicator
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginVertical: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    width: '90%',
  },
  deviceName: {
    fontSize: 22,
    fontWeight: '600',
    color: '#007AFF',
    textAlign: 'center'
  },
});