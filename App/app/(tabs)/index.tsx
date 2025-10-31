import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Text,
  Button,
  Vibration,
  PermissionsAndroid,
  Alert,
  Linking,
} from 'react-native';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
// Link removed — home screen simplified

import { BleManager } from 'react-native-ble-plx';
import * as Notifications from 'expo-notifications';

// Configure notification handler for foreground (optional simple behavior)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen() {
  const managerRef = useRef<any>(null);
  const [connectedDeviceName, setConnectedDeviceName] = useState<string | null>(null);
  const [bluetoothState, setBluetoothState] = useState<string | null>(null);

  useEffect(() => {
    managerRef.current = new BleManager();

    // Watch Bluetooth power state and prompt user to enable if it's off
    const manager = managerRef.current;
    let stateSubscription: any = null;
    if (manager) {
  stateSubscription = manager.onStateChange((state: string) => {
        setBluetoothState(state);
        if (state === 'PoweredOff') {
          if (Platform.OS === 'android') {
            Alert.alert('Bluetooth is off', 'Please turn on Bluetooth to use this app.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Turn on',
                onPress: async () => {
                  try {
                    // enable() is Android-only and prompts the user to turn on bluetooth
                    // @ts-ignore
                    await manager.enable();
                  } catch (e) {
                    // fallback: open system settings
                    try {
                      Linking.openSettings();
                    } catch (err) {
                      console.warn('Failed to open settings', err);
                    }
                  }
                },
              },
            ]);
          } else {
            Alert.alert('Bluetooth is off', 'Please enable Bluetooth in Settings to use this app.', [
              { text: 'OK' },
              {
                text: 'Open Settings',
                onPress: () => {
                  try {
                    Linking.openSettings();
                  } catch (err) {
                    console.warn('Failed to open settings', err);
                  }
                },
              },
            ]);
          }
        }
      }, true);
    }

  // Setup notifications permission and Android channel
  (async () => {
      try {
        await Notifications.requestPermissionsAsync();
      } catch (e) {
        console.warn('Notification permission request failed', e);
      }

      if (Platform.OS === 'android') {
        try {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'Default',
            importance: Notifications.AndroidImportance.MAX,
            sound: 'default',
            vibrationPattern: [0, 250, 250, 250],
          });
        } catch (e) {
          console.warn('Unable to set Android notification channel', e);
        }
      }
    })();

    const requestAndroidPermissions = async () => {
      if (Platform.OS !== 'android') return true;

      try {
        const perms: Array<string> = [];

        // Location is commonly required for BLE scanning on older Android versions
        if (PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION) {
          perms.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION as string);
        }

        // On newer Android versions, BLUETOOTH_SCAN and BLUETOOTH_CONNECT exist
        if ('BLUETOOTH_SCAN' in PermissionsAndroid.PERMISSIONS) {
          // @ts-ignore
          perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN);
        }
        if ('BLUETOOTH_CONNECT' in PermissionsAndroid.PERMISSIONS) {
          // @ts-ignore
          perms.push(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT);
        }

        if (perms.length === 0) return true;

        // requestMultiple expects Permission[]; cast to any to satisfy TS for now
        const results = await PermissionsAndroid.requestMultiple(perms as any);

        const allGranted = Object.values(results).every((v) => v === PermissionsAndroid.RESULTS.GRANTED);
        if (!allGranted) {
          Alert.alert(
            'Permissions required',
            'Bluetooth and location permissions are required to scan/connect to devices. Please enable them in settings.'
          );
        }

        return allGranted;
      } catch (e) {
        console.warn('Permission request failed', e);
        return false;
      }
    };

    // On mount, refresh currently connected device (if any) and poll periodically.
    const refreshConnectedDevice = async () => {
      try {
        const mgr = managerRef.current;
        if (!mgr) return;
        // Try to get connected devices. Passing empty array may return connected devices on some platforms
        // If the native implementation requires service UUIDs, this may return an empty array; we keep a poll fallback.
        // @ts-ignore
        const connected = await mgr.connectedDevices([]);
        if (connected && connected.length > 0) {
          const d = connected[0];
          setConnectedDeviceName(d.name ?? d.id ?? null);
          return;
        }
        setConnectedDeviceName(null);
      } catch (e) {
        // ignore errors — set no connected device
        setConnectedDeviceName(null);
      }
    };

    // initial refresh using service-based detection
    refreshConnectedDevice();

    // poll every 5 seconds to update connected device state (covers external connects)
    const pollId = setInterval(refreshConnectedDevice, 5000);

    // also auto-refresh when bluetooth becomes PoweredOn
    const onStateChangeRefresh = (state: string) => {
      if (state === 'PoweredOn') refreshConnectedDevice();
    };
    // attach an extra listener for state changes
    // @ts-ignore
    const extraStateSub = manager.onStateChange(onStateChangeRefresh, true);

    return () => {
      try {
        if (stateSubscription && typeof stateSubscription.remove === 'function') stateSubscription.remove();
      } catch (e) {
        // ignore
      }
      try {
        if (extraStateSub && typeof extraStateSub.remove === 'function') extraStateSub.remove();
      } catch (e) {
        // ignore
      }

      clearInterval(pollId);

      if (managerRef.current) {
        try {
          // stop any scanning activity and destroy manager
          // @ts-ignore
          if (typeof managerRef.current.stopDeviceScan === 'function') managerRef.current.stopDeviceScan();
          // @ts-ignore
          if (typeof managerRef.current.destroy === 'function') managerRef.current.destroy();
        } catch (e) {
          console.warn('Error cleaning up BLE manager', e);
        }
      }
    };
  }, []);

  const detectConnectedDeviceByServices = async () => {
    const mgr = managerRef.current;
    if (!mgr) return null;
    // Common BLE service UUIDs (16-bit) many devices implement at least one of these.
    const commonServices = ['1800', '1801', '180a', '180f', '1812'];
    try {
      // @ts-ignore
      const connected = await mgr.connectedDevices(commonServices);
      if (connected && connected.length > 0) {
        const d = connected[0];
        const name = d.name ?? d.id ?? null;
        setConnectedDeviceName(name);
        return name;
      }
    } catch (e) {
      console.warn('connectedDevices call failed', e);
    }
    // no connected device found by services
    setConnectedDeviceName(null);
    return null;
  };

  // We poll for connected devices (refreshConnectedDevice) and expose a refresh button.

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Your Connected device</ThemedText>
        <ThemedText>{connectedDeviceName ?? 'none'}</ThemedText>

        <View style={{ marginTop: 8 }}>
          <Text style={{ color: '#666' }}>{`Bluetooth: ${bluetoothState ?? 'unknown'}`}</Text>
          {bluetoothState === 'PoweredOff' && (
            <View style={{ width: 160, marginTop: 8 }}>
              <Button
                title="Turn Bluetooth On"
                onPress={async () => {
                  try {
                    // @ts-ignore
                    await managerRef.current?.enable();
                  } catch (e) {
                    try {
                      Linking.openSettings();
                    } catch (err) {
                      console.warn('Failed to open settings', err);
                    }
                  }
                }}
              />
            </View>
          )}

        </View>
          {/* Scan & Connect and Disconnect buttons removed — this screen only displays the connected device name. */}

          <View style={{ marginTop: 12 }}>
            <Button
              title="Refresh connected device"
              onPress={() => {
                // run service-based detection
                detectConnectedDeviceByServices();
              }}
            />
          </View>
      </ThemedView>

      {/* Removed extra tutorial sections to keep home screen focused on Bluetooth controls */}
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
